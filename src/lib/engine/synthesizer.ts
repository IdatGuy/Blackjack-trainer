import type { Card, Rank } from './card.js';
import type { ChartCell, StrategyChart } from './strategy.js';

export type DrillFilter = {
	handTypes: Array<'hard' | 'soft' | 'pair'>;
	hardTotals: number[];
	softTotals: number[]; // soft total (13 = A2, 20 = A9)
	pairRanks: Rank[];
};

export type SynthesizedCell = {
	handType: 'hard' | 'soft' | 'pair';
	playerKey: string;
	dealerUp: Rank;
	tc: number;
	variant: 'base' | 'dev';
};

// Pair ranks that appear in the strategy chart (J/Q/K treated as T)
export const PAIR_RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'A'];

export const HARD_TOTALS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
export const SOFT_TOTALS = [13, 14, 15, 16, 17, 18, 19, 20]; // 13=A2 … 20=A9

export const DEFAULT_DRILL_FILTER: DrillFilter = {
	handTypes: ['hard', 'soft', 'pair'],
	hardTotals: [...HARD_TOTALS],
	softTotals: [...SOFT_TOTALS],
	pairRanks: [...PAIR_RANKS]
};

// Two-card combos for each hard total that avoid creating a pair or soft hand
const HARD_CARDS: Record<number, [Rank, Rank]> = {
	5: ['2', '3'],
	6: ['2', '4'],
	7: ['3', '4'],
	8: ['3', '5'],
	9: ['4', '5'],
	10: ['4', '6'],
	11: ['5', '6'],
	12: ['T', '2'],
	13: ['T', '3'],
	14: ['T', '4'],
	15: ['T', '5'],
	16: ['T', '6'],
	17: ['T', '7'],
	18: ['T', '8'],
	19: ['T', '9'],
	20: ['T', 'J'], // J ≠ T rank, so not a pair
	21: ['T', 'Q']
};

export function buildPlayerCards(
	handType: 'hard' | 'soft' | 'pair',
	playerKey: string
): [Card, Card] {
	if (handType === 'pair') {
		const rank = playerKey[0] as Rank;
		return [
			{ rank, suit: 'S' },
			{ rank, suit: 'H' }
		];
	}
	if (handType === 'soft') {
		const nonAceRank = playerKey[1] as Rank;
		return [
			{ rank: 'A', suit: 'S' },
			{ rank: nonAceRank, suit: 'H' }
		];
	}
	const total = parseInt(playerKey, 10);
	const ranks = HARD_CARDS[total] ?? ['T', '6'];
	return [
		{ rank: ranks[0], suit: 'S' },
		{ rank: ranks[1], suit: 'H' }
	];
}

export function buildDealerCard(rank: Rank): Card {
	return { rank, suit: 'C' };
}

// Pick a TC that always fires a deviation for this cell
function synthesizeTC(cell: ChartCell): number {
	if (!cell.deviations || cell.deviations.length === 0) return 0;
	const dev = cell.deviations[Math.floor(Math.random() * cell.deviations.length)];
	// above=true fires when tc >= dev.tc; above=false fires when tc < dev.tc
	return dev.above ? (dev.tc === 0 ? 1 : dev.tc) : dev.tc - 1;
}

// Pick a TC that will never fire any deviation for this cell
function synthesizeBaseTC(cell: ChartCell): number {
	if (!cell.deviations || cell.deviations.length === 0) {
		const tcs = [-2, -1, 0, 1, 2];
		return tcs[Math.floor(Math.random() * tcs.length)];
	}
	const aboveDevs = cell.deviations.filter((d) => d.above);
	if (aboveDevs.length > 0) {
		return Math.min(...aboveDevs.map((d) => d.tc)) - 1;
	}
	const belowDevs = cell.deviations.filter((d) => !d.above);
	return Math.max(...belowDevs.map((d) => d.tc)) + 1;
}

const UPCARDS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'A'];

function softTotalFromKey(key: string): number {
	return 11 + parseInt(key[1], 10);
}

function passesFilter(
	handType: 'hard' | 'soft' | 'pair',
	playerKey: string,
	filter: DrillFilter
): boolean {
	if (!filter.handTypes.includes(handType)) return false;
	if (handType === 'hard') {
		const total = parseInt(playerKey, 10);
		return filter.hardTotals.includes(total);
	}
	if (handType === 'soft') {
		const total = softTotalFromKey(playerKey);
		return filter.softTotals.includes(total);
	}
	if (handType === 'pair') {
		return filter.pairRanks.includes(playerKey[0] as Rank);
	}
	return true;
}

export function sampleWeightedCell(
	chart: StrategyChart,
	weights: Map<string, number>,
	filter: DrillFilter
): SynthesizedCell {
	type Candidate = {
		handType: 'hard' | 'soft' | 'pair';
		playerKey: string;
		dealerUp: Rank;
		cell: ChartCell;
		variant: 'base' | 'dev';
		weight: number;
	};
	const candidates: Candidate[] = [];

	function addSection(
		section: Record<string, Record<string, ChartCell>>,
		ht: 'hard' | 'soft' | 'pair'
	) {
		for (const [playerKey, upCards] of Object.entries(section)) {
			if (!passesFilter(ht, playerKey, filter)) continue;
			for (const dealerUp of UPCARDS) {
				const cell = upCards[dealerUp];
				if (!cell) continue;
				const baseKey = `${ht}:${playerKey}:${dealerUp}`;
				candidates.push({
					handType: ht,
					playerKey,
					dealerUp,
					cell,
					variant: 'base',
					weight: weights.get(baseKey) ?? 1.0
				});
				if (cell.deviations?.length) {
					candidates.push({
						handType: ht,
						playerKey,
						dealerUp,
						cell,
						variant: 'dev',
						weight: weights.get(`${baseKey}:dev`) ?? 1.0
					});
				}
			}
		}
	}

	addSection(chart.hard, 'hard');
	addSection(chart.soft, 'soft');
	addSection(chart.pairs, 'pair');

	if (candidates.length === 0) {
		return { handType: 'hard', playerKey: '16', dealerUp: 'T', tc: 0, variant: 'base' };
	}

	const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);

	let chosen: Candidate;
	if (totalWeight === 0) {
		chosen = candidates[Math.floor(Math.random() * candidates.length)];
	} else {
		let rand = Math.random() * totalWeight;
		chosen = candidates[candidates.length - 1];
		for (const c of candidates) {
			rand -= c.weight;
			if (rand <= 0) {
				chosen = c;
				break;
			}
		}
	}

	const tc =
		chosen.variant === 'dev' ? synthesizeTC(chosen.cell) : synthesizeBaseTC(chosen.cell);
	return { handType: chosen.handType, playerKey: chosen.playerKey, dealerUp: chosen.dealerUp, tc, variant: chosen.variant };
}
