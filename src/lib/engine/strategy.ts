import type { Card } from './card.js';
import type { Hand } from './hand.js';
import { handKey, handType, isPair } from './hand.js';
import type { Action, RuleSet } from './rules.js';
import { allowedActions } from './rules.js';
import type { Shoe } from './shoe.js';
import { trueCount } from './shoe.js';

export type ChartCell = {
	base: Action;
	fallback?: Action; // used when base action isn't allowed (e.g., D → fallback H or S)
	deviations?: Array<{ tc: number; action: Action; above: boolean }>; // sorted desc by |tc|
};

export type StrategyChart = {
	ruleSetId: string;
	hard: Record<string, Record<string, ChartCell>>;
	soft: Record<string, Record<string, ChartCell>>;
	pairs: Record<string, Record<string, ChartCell>>;
};

// Helpers for building cells
const H = (): ChartCell => ({ base: 'H' });
const S = (): ChartCell => ({ base: 'S' });
const D = (): ChartCell => ({ base: 'D', fallback: 'H' }); // double else hit
const Ds = (): ChartCell => ({ base: 'D', fallback: 'S' }); // double else stand
const P = (): ChartCell => ({ base: 'P' });
const R = (): ChartCell => ({ base: 'R', fallback: 'H' }); // surrender else hit

// Dealer upcards used as column keys
const UPCARDS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'A'] as const;
type UpCard = (typeof UPCARDS)[number];

function row(cells: ChartCell[]): Record<string, ChartCell> {
	const result: Record<string, ChartCell> = {};
	UPCARDS.forEach((up, i) => {
		result[up] = cells[i];
	});
	return result;
}

// ─── 6D S17 DAS Late Surrender — Wizard of Odds ───────────────────────────

// Hard totals: rows indexed by player total (as string)
const HARD: Record<string, Record<string, ChartCell>> = {
	'5': row([H(), H(), H(), H(), H(), H(), H(), H(), H(), H()]),
	'6': row([H(), H(), H(), H(), H(), H(), H(), H(), H(), H()]),
	'7': row([H(), H(), H(), H(), H(), H(), H(), H(), H(), H()]),
	'8': row([H(), H(), H(), H(), H(), H(), H(), H(), H(), H()]),
	'9': row([H(), D(), D(), D(), D(), H(), H(), H(), H(), H()]),
	'10': row([D(), D(), D(), D(), D(), D(), D(), D(), H(), H()]),
	'11': row([D(), D(), D(), D(), D(), D(), D(), D(), D(), H()]),
	'12': row([H(), H(), S(), S(), S(), H(), H(), H(), H(), H()]),
	'13': row([S(), S(), S(), S(), S(), H(), H(), H(), H(), H()]),
	'14': row([S(), S(), S(), S(), S(), H(), H(), H(), H(), H()]),
	'15': row([S(), S(), S(), S(), S(), H(), H(), H(), R(), H()]),
	'16': row([S(), S(), S(), S(), S(), H(), H(), R(), R(), R()]),
	'17': row([S(), S(), S(), S(), S(), S(), S(), S(), S(), S()]),
	'18': row([S(), S(), S(), S(), S(), S(), S(), S(), S(), S()]),
	'19': row([S(), S(), S(), S(), S(), S(), S(), S(), S(), S()]),
	'20': row([S(), S(), S(), S(), S(), S(), S(), S(), S(), S()]),
	'21': row([S(), S(), S(), S(), S(), S(), S(), S(), S(), S()])
};

// Soft totals: keyed as "A2"–"A9" (A counted as 11, so A2 = soft 13, A9 = soft 20)
const SOFT: Record<string, Record<string, ChartCell>> = {
	A2: row([H(), H(), H(), D(), D(), H(), H(), H(), H(), H()]),
	A3: row([H(), H(), H(), D(), D(), H(), H(), H(), H(), H()]),
	A4: row([H(), H(), D(), D(), D(), H(), H(), H(), H(), H()]),
	A5: row([H(), H(), D(), D(), D(), H(), H(), H(), H(), H()]),
	A6: row([H(), D(), D(), D(), D(), H(), H(), H(), H(), H()]),
	A7: row([S(), Ds(), Ds(), D(), D(), S(), S(), H(), H(), H()]),
	A8: row([S(), S(), S(), S(), Ds(), S(), S(), S(), S(), S()]),
	A9: row([S(), S(), S(), S(), S(), S(), S(), S(), S(), S()])
};

// Pairs: keyed as "AA", "22"…"TT" (T = any ten-value)
const PAIRS: Record<string, Record<string, ChartCell>> = {
	AA: row([P(), P(), P(), P(), P(), P(), P(), P(), P(), P()]),
	'22': row([P(), P(), P(), P(), P(), P(), H(), H(), H(), H()]),
	'33': row([P(), P(), P(), P(), P(), P(), H(), H(), H(), H()]),
	'44': row([H(), H(), H(), P(), P(), H(), H(), H(), H(), H()]),
	'55': row([D(), D(), D(), D(), D(), D(), D(), D(), H(), H()]),
	'66': row([P(), P(), P(), P(), P(), H(), H(), H(), H(), H()]),
	'77': row([P(), P(), P(), P(), P(), P(), H(), H(), H(), H()]),
	'88': row([P(), P(), P(), P(), P(), P(), P(), P(), P(), P()]),
	'99': row([P(), P(), P(), P(), P(), S(), P(), P(), S(), S()]),
	TT: row([S(), S(), S(), S(), S(), S(), S(), S(), S(), S()])
};

// ─── Illustrious 18 + Fab 4 deviations ────────────────────────────────────
// Applied after chart construction. Each deviation: { tc, action, above }
// above=true → fire when trueCount >= tc; above=false → fire when trueCount <= tc

function applyDeviations(chart: StrategyChart): void {
	// Illustrious 18
	dev(chart.hard, '16', 'T', { tc: 0, action: 'S', above: true }); // #2 stand at TC≥0
	dev(chart.hard, '15', 'T', { tc: 4, action: 'S', above: true }); // #3 stand at TC≥4
	dev(chart.pairs, 'TT', '5', { tc: 5, action: 'P', above: true }); // #4 split TT vs 5 at TC≥5
	dev(chart.pairs, 'TT', '6', { tc: 4, action: 'P', above: true }); // #5 split TT vs 6 at TC≥4
	dev(chart.hard, '10', 'T', { tc: 4, action: 'D', above: true }); // #6 double 10 vs T at TC≥4
	dev(chart.hard, '12', '3', { tc: 2, action: 'S', above: true }); // #7 stand 12 vs 3 at TC≥2
	dev(chart.hard, '12', '2', { tc: 3, action: 'S', above: true }); // #8 stand 12 vs 2 at TC≥3
	dev(chart.hard, '11', 'A', { tc: 1, action: 'D', above: true }); // #9 double 11 vs A at TC≥1
	dev(chart.hard, '9', '2', { tc: 1, action: 'D', above: true }); // #10 double 9 vs 2 at TC≥1
	dev(chart.hard, '10', 'A', { tc: 4, action: 'D', above: true }); // #11 double 10 vs A at TC≥4
	dev(chart.hard, '9', '7', { tc: 3, action: 'D', above: true }); // #12 double 9 vs 7 at TC≥3
	dev(chart.hard, '16', '9', { tc: 5, action: 'S', above: true }); // #13 stand 16 vs 9 at TC≥5
	dev(chart.hard, '13', '2', { tc: -1, action: 'H', above: false }); // #14 hit 13 vs 2 at TC≤-1
	dev(chart.hard, '12', '4', { tc: -1, action: 'H', above: false }); // #15 hit 12 vs 4 at TC≤-1
	dev(chart.hard, '12', '5', { tc: -2, action: 'H', above: false }); // #16 hit 12 vs 5 at TC≤-2
	dev(chart.hard, '12', '6', { tc: -1, action: 'H', above: false }); // #17 hit 12 vs 6 at TC≤-1
	dev(chart.hard, '13', '3', { tc: -2, action: 'H', above: false }); // #18 hit 13 vs 3 at TC≤-2

	// Fab 4 (surrender deviations)
	dev(chart.hard, '14', 'T', { tc: 3, action: 'R', above: true }); // Fab 1
	dev(chart.hard, '15', '9', { tc: 2, action: 'R', above: true }); // Fab 2
	dev(chart.hard, '15', 'T', { tc: 0, action: 'R', above: true }); // Fab 3
	dev(chart.hard, '15', 'A', { tc: 1, action: 'R', above: true }); // Fab 4
}

function dev(
	section: Record<string, Record<string, ChartCell>>,
	playerKey: string,
	dealerUp: string,
	deviation: { tc: number; action: Action; above: boolean }
): void {
	const cell = section[playerKey]?.[dealerUp];
	if (!cell) return;
	if (!cell.deviations) cell.deviations = [];
	cell.deviations.push(deviation);
}

// ─── Build the chart ──────────────────────────────────────────────────────

export function buildChart6dS17(): StrategyChart {
	const chart: StrategyChart = {
		ruleSetId: '6d-s17-das-ls',
		hard: HARD,
		soft: SOFT,
		pairs: PAIRS
	};
	applyDeviations(chart);
	return chart;
}

const DEFAULT_CHART = buildChart6dS17();

// ─── Lookup ───────────────────────────────────────────────────────────────

function upCardKey(card: Card): UpCard {
	const r = card.rank;
	if (['J', 'Q', 'K'].includes(r)) return 'T';
	return r as UpCard;
}

export function getCorrectAction(
	hand: Hand,
	dealerUp: Card,
	shoe: Shoe,
	rules: RuleSet,
	overrides?: Partial<StrategyChart>,
	splitCount = 0
): Action {
	const chart = overrides
		? mergeChart(DEFAULT_CHART, overrides as StrategyChart)
		: DEFAULT_CHART;

	const tc = trueCount(shoe);
	const allowed = allowedActions(hand, dealerUp, rules, splitCount);
	const upKey = upCardKey(dealerUp);

	// Determine which section and key to look up
	const type = handType(hand.cards, hand.cards.length === 2);
	const key = handKey(hand.cards, type);

	let section: Record<string, Record<string, ChartCell>>;
	if (type === 'pair') {
		section = chart.pairs;
	} else if (type === 'soft') {
		section = chart.soft;
	} else {
		section = chart.hard;
	}

	const cell = section[key]?.[upKey];
	if (!cell) {
		// Fallback for totals not explicitly charted (e.g., hard 4 not in table)
		return handValue(hand.cards) >= 17 ? 'S' : 'H';
	}

	// Check deviations first (sorted in insertion order; each is independent)
	if (cell.deviations) {
		for (const dev of cell.deviations) {
			const fires = dev.above ? tc >= dev.tc : tc <= dev.tc;
			if (fires && allowed.includes(dev.action)) {
				return dev.action;
			}
		}
	}

	// Return base action, falling back if not allowed
	if (allowed.includes(cell.base)) return cell.base;
	if (cell.fallback && allowed.includes(cell.fallback)) return cell.fallback;
	return 'H'; // ultimate fallback
}

export function getBaseAction(
	hand: Hand,
	dealerUp: Card,
	shoe: Shoe,
	rules: RuleSet,
	overrides?: Partial<StrategyChart>,
	splitCount = 0
): Action {
	const chart = overrides
		? mergeChart(DEFAULT_CHART, overrides as StrategyChart)
		: DEFAULT_CHART;

	const allowed = allowedActions(hand, dealerUp, rules, splitCount);
	const upKey = upCardKey(dealerUp);
	const type = handType(hand.cards, hand.cards.length === 2);
	const key = handKey(hand.cards, type);

	let section: Record<string, Record<string, ChartCell>>;
	if (type === 'pair') section = chart.pairs;
	else if (type === 'soft') section = chart.soft;
	else section = chart.hard;

	const cell = section[key]?.[upKey];
	if (!cell) return handValue(hand.cards) >= 17 ? 'S' : 'H';

	// No deviation check — basic strategy only
	if (allowed.includes(cell.base)) return cell.base;
	if (cell.fallback && allowed.includes(cell.fallback)) return cell.fallback;
	return 'H';
}

function mergeChart(base: StrategyChart, overrides: StrategyChart): StrategyChart {
	return {
		ruleSetId: base.ruleSetId,
		hard: mergeSection(base.hard, overrides.hard),
		soft: mergeSection(base.soft, overrides.soft),
		pairs: mergeSection(base.pairs, overrides.pairs)
	};
}

function mergeSection(
	base: Record<string, Record<string, ChartCell>>,
	overrides?: Record<string, Record<string, ChartCell>>
): Record<string, Record<string, ChartCell>> {
	if (!overrides) return base;
	const result: Record<string, Record<string, ChartCell>> = { ...base };
	for (const [playerKey, cols] of Object.entries(overrides)) {
		result[playerKey] = { ...base[playerKey], ...cols };
	}
	return result;
}

// Re-export for convenience
import { handValue } from './hand.js';
export { DEFAULT_CHART };
