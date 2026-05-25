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
const Rs = (): ChartCell => ({ base: 'R', fallback: 'S' }); // surrender else stand
const Rp = (): ChartCell => ({ base: 'R', fallback: 'P' }); // surrender else split

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

// ─── Multi-deck baseline (6D/S17/DAS/LS) — Wizard of Odds ─────────────────
// These factory functions return fresh objects so patches don't mutate shared state.

function makeHard(): Record<string, Record<string, ChartCell>> {
	return {
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
}

function makeSoft(): Record<string, Record<string, ChartCell>> {
	return {
		A2: row([H(), H(), H(), D(), D(), H(), H(), H(), H(), H()]),
		A3: row([H(), H(), H(), D(), D(), H(), H(), H(), H(), H()]),
		A4: row([H(), H(), D(), D(), D(), H(), H(), H(), H(), H()]),
		A5: row([H(), H(), D(), D(), D(), H(), H(), H(), H(), H()]),
		A6: row([H(), D(), D(), D(), D(), H(), H(), H(), H(), H()]),
		A7: row([S(), Ds(), Ds(), Ds(), Ds(), S(), S(), H(), H(), H()]),
		A8: row([S(), S(), S(), S(), S(), S(), S(), S(), S(), S()]),
		A9: row([S(), S(), S(), S(), S(), S(), S(), S(), S(), S()])
	};
}

function makePairs(): Record<string, Record<string, ChartCell>> {
	return {
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
}

// ─── Patch functions (mutate in place) ───────────────────────────────────────

function apply2DPatch(
	hard: Record<string, Record<string, ChartCell>>,
	soft: Record<string, Record<string, ChartCell>>
): void {
	hard['9']['2'] = D();
	hard['11']['A'] = D();
	soft['A2']['4'] = D();
	soft['A3']['4'] = D();
	soft['A6']['2'] = D();
	soft['A7']['2'] = Ds();
}

function apply1DPatch(
	hard: Record<string, Record<string, ChartCell>>,
	soft: Record<string, Record<string, ChartCell>>
): void {
	hard['8']['5'] = D();
	hard['8']['6'] = D();
	hard['9']['2'] = D();
	hard['10']['A'] = D();
	hard['11']['A'] = D();
	soft['A2']['4'] = D();
	soft['A3']['4'] = D();
	soft['A4']['3'] = D();
	soft['A5']['3'] = D();
	soft['A6']['2'] = D();
	soft['A7']['2'] = Ds();
	soft['A8']['4'] = Ds();
	soft['A8']['5'] = Ds();
}

function applyH17Patch(
	hard: Record<string, Record<string, ChartCell>>,
	soft: Record<string, Record<string, ChartCell>>,
	pairs: Record<string, Record<string, ChartCell>>
): void {
	hard['11']['A'] = D();
	hard['15']['A'] = R(); // basic strategy surrender in H17
	hard['17']['A'] = Rs(); // basic strategy surrender in H17
	soft['A7']['2'] = Ds();
	soft['A8']['6'] = Ds();
	pairs['88']['A'] = Rp();
}

function applyNoDASPatch(pairs: Record<string, Record<string, ChartCell>>): void {
	pairs['22']['2'] = H();
	pairs['33']['2'] = H();
	pairs['33']['3'] = H();
	pairs['44']['5'] = H();
	pairs['44']['6'] = H();
	pairs['66']['2'] = H();
}

function applyNoSurrenderPatch(hard: Record<string, Record<string, ChartCell>>): void {
	for (const row of Object.values(hard)) {
		for (const [up, cell] of Object.entries(row)) {
			if (cell.base === 'R') {
				row[up] = { base: cell.fallback ?? 'H' };
			}
		}
	}
}

// ─── Deviations ──────────────────────────────────────────────────────────────

function applyDeviations(chart: StrategyChart, h17 = false, hasSurrender = true): void {
	// Illustrious 18
	dev(chart.hard, '16', 'T', { tc: 0, action: 'S', above: true }); // #2
	dev(chart.hard, '15', 'T', { tc: 4, action: 'S', above: true }); // #3
	dev(chart.pairs, 'TT', '5', { tc: 5, action: 'P', above: true }); // #4
	dev(chart.pairs, 'TT', '6', { tc: 4, action: 'P', above: true }); // #5
	dev(chart.hard, '10', 'T', { tc: 4, action: 'D', above: true }); // #6
	dev(chart.hard, '12', '3', { tc: 2, action: 'S', above: true }); // #7
	dev(chart.hard, '12', '2', { tc: 3, action: 'S', above: true }); // #8
	// #9 — double 11 vs A: only a deviation in S17 (H17 makes it basic strategy)
	if (!h17) dev(chart.hard, '11', 'A', { tc: 1, action: 'D', above: true });
	dev(chart.hard, '9', '2', { tc: 1, action: 'D', above: true }); // #10
	dev(chart.hard, '10', 'A', { tc: 4, action: 'D', above: true }); // #11
	dev(chart.hard, '9', '7', { tc: 3, action: 'D', above: true }); // #12
	dev(chart.hard, '16', '9', { tc: 5, action: 'S', above: true }); // #13
	dev(chart.hard, '13', '2', { tc: -1, action: 'H', above: false }); // #14
	dev(chart.hard, '12', '4', { tc: 0, action: 'H', above: false }); // #15
	dev(chart.hard, '12', '5', { tc: -2, action: 'H', above: false }); // #16
	dev(chart.hard, '12', '6', { tc: -1, action: 'H', above: false }); // #17
	dev(chart.hard, '13', '3', { tc: -2, action: 'H', above: false }); // #18

	// BJA additions
	dev(chart.hard, '8', '7', { tc: 2, action: 'D', above: true});

	// Fab 4 (surrender deviations) — only when surrender is enabled
	if (hasSurrender) {
		dev(chart.hard, '14', 'T', { tc: 3, action: 'R', above: true }); // Fab 1
		dev(chart.hard, '15', '9', { tc: 2, action: 'R', above: true }); // Fab 2
		dev(chart.hard, '15', 'T', { tc: 0, action: 'R', above: true }); // Fab 3
		// Fab 4 — surrender 15 vs A: only a deviation in S17 (H17 makes it basic strategy)
		if (!h17) dev(chart.hard, '15', 'A', { tc: 1, action: 'R', above: true });
	}
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

// ─── Chart builder ────────────────────────────────────────────────────────────

function buildChartForRules(rules: RuleSet): StrategyChart {
	const hard = makeHard();
	const soft = makeSoft();
	const pairs = makePairs();

	if (rules.decks === 1) apply1DPatch(hard, soft);
	else if (rules.decks === 2) apply2DPatch(hard, soft);

	if (rules.dealerHitsSoft17) applyH17Patch(hard, soft, pairs);
	if (!rules.doubleAfterSplit) applyNoDASPatch(pairs);
	if (rules.surrender === 'none') applyNoSurrenderPatch(hard);

	const chart: StrategyChart = {
		ruleSetId: chartCacheKey(rules),
		hard,
		soft,
		pairs
	};

	applyDeviations(chart, rules.dealerHitsSoft17, rules.surrender !== 'none');
	return chart;
}

function chartCacheKey(rules: RuleSet): string {
	const d = rules.decks <= 1 ? '1d' : rules.decks === 2 ? '2d' : 'multi';
	return `${d}-${rules.dealerHitsSoft17 ? 'h17' : 's17'}-${rules.doubleAfterSplit ? 'das' : 'nodas'}-${rules.surrender}`;
}

const chartCache = new Map<string, StrategyChart>();

export function getChartForRules(rules: RuleSet): StrategyChart {
	const key = chartCacheKey(rules);
	if (chartCache.has(key)) return chartCache.get(key)!;
	const chart = buildChartForRules(rules);
	chartCache.set(key, chart);
	return chart;
}

// ─── Lookup ───────────────────────────────────────────────────────────────────

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
	splitCount = 0,
	tcOverride?: number
): Action {
	const chart = overrides
		? mergeChart(getChartForRules(rules), overrides as StrategyChart)
		: getChartForRules(rules);

	const tc = tcOverride !== undefined ? tcOverride : trueCount(shoe);
	const allowed = allowedActions(hand, dealerUp, rules, splitCount);
	const upKey = upCardKey(dealerUp);

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
		return handValue(hand.cards) >= 17 ? 'S' : 'H';
	}

	if (cell.deviations) {
		for (const dev of cell.deviations) {
			const fires = dev.above ? tc >= dev.tc : tc <= dev.tc;
			if (fires && allowed.includes(dev.action)) {
				return dev.action;
			}
		}
	}

	if (allowed.includes(cell.base)) return cell.base;
	if (cell.fallback && allowed.includes(cell.fallback)) return cell.fallback;
	return 'H';
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
		? mergeChart(getChartForRules(rules), overrides as StrategyChart)
		: getChartForRules(rules);

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

export function getInsuranceAction(shoe: Shoe, tcOverride?: number): 'I' | 'N' {
	const tc = tcOverride !== undefined ? tcOverride : trueCount(shoe);
	return tc >= 3 ? 'I' : 'N';
}

import { handValue } from './hand.js';

// Default chart (6D/S17/DAS/LS) for backwards compatibility
export const DEFAULT_CHART = getChartForRules({
	id: '6d-s17-das-ls',
	name: '6 Deck S17 DAS Late Surrender',
	decks: 6,
	dealerHitsSoft17: false,
	doubleAfterSplit: true,
	resplitAces: false,
	surrender: 'late',
	peek: true,
	blackjackPays: '3:2',
	maxSplits: 4
});
