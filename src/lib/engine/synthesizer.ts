import type { Card, Rank } from './card.js';
import type { ChartCell, StrategyChart } from './strategy.js';

export type DrillFilter = {
	handType: 'all' | 'hard' | 'soft' | 'pair';
	hardMin: number;
	hardMax: number;
	softMin: number; // soft total (13 = A2, 20 = A9)
	softMax: number;
	pairRanks: Rank[];
};

export type SynthesizedCell = {
	handType: 'hard' | 'soft' | 'pair';
	playerKey: string;
	dealerUp: Rank;
};

// Pair ranks that appear in the strategy chart (J/Q/K treated as T)
export const PAIR_RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'A'];

export const DEFAULT_DRILL_FILTER: DrillFilter = {
	handType: 'all',
	hardMin: 5,
	hardMax: 21,
	softMin: 13,
	softMax: 20,
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

// Pick a TC near a deviation threshold: 50/50 whether it fires or not
export function synthesizeTC(cell: ChartCell): number {
	if (!cell.deviations || cell.deviations.length === 0) return 0;
	const dev = cell.deviations[Math.floor(Math.random() * cell.deviations.length)];
	if (Math.random() < 0.5) {
		return dev.tc; // exactly at threshold — deviation fires
	}
	return dev.above ? dev.tc - 1 : dev.tc + 1; // just outside — basic strategy
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
	if (filter.handType !== 'all' && filter.handType !== handType) return false;
	if (handType === 'hard') {
		const total = parseInt(playerKey, 10);
		return total >= filter.hardMin && total <= filter.hardMax;
	}
	if (handType === 'soft') {
		const total = softTotalFromKey(playerKey);
		return total >= filter.softMin && total <= filter.softMax;
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
	type Candidate = { handType: 'hard' | 'soft' | 'pair'; playerKey: string; dealerUp: Rank; weight: number };
	const candidates: Candidate[] = [];

	function addSection(
		section: Record<string, Record<string, ChartCell>>,
		ht: 'hard' | 'soft' | 'pair'
	) {
		for (const [playerKey, upCards] of Object.entries(section)) {
			if (!passesFilter(ht, playerKey, filter)) continue;
			for (const dealerUp of UPCARDS) {
				if (!upCards[dealerUp]) continue;
				const key = `${ht}:${playerKey}:${dealerUp}`;
				const weight = weights.get(key) ?? 1.0; // unplayed = max priority
				candidates.push({ handType: ht, playerKey, dealerUp, weight });
			}
		}
	}

	addSection(chart.hard, 'hard');
	addSection(chart.soft, 'soft');
	addSection(chart.pairs, 'pair');

	if (candidates.length === 0) {
		return { handType: 'hard', playerKey: '16', dealerUp: 'T' };
	}

	const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);

	// If all cells mastered (total weight = 0), sample uniformly
	if (totalWeight === 0) {
		const c = candidates[Math.floor(Math.random() * candidates.length)];
		return { handType: c.handType, playerKey: c.playerKey, dealerUp: c.dealerUp };
	}

	let rand = Math.random() * totalWeight;
	for (const c of candidates) {
		rand -= c.weight;
		if (rand <= 0) {
			return { handType: c.handType, playerKey: c.playerKey, dealerUp: c.dealerUp };
		}
	}

	const last = candidates[candidates.length - 1];
	return { handType: last.handType, playerKey: last.playerKey, dealerUp: last.dealerUp };
}
