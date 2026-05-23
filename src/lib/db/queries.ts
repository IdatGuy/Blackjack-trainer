import { fetchDecisionsSince } from './index.js';
import type { DecisionRecord } from './schema.js';

export type HandsStats = {
	won: number;
	push: number;
	lost: number;
	surrender: number;
	total: number;
};

export type BankrollStats = {
	profitLoss: number;
	amountWon: number;
	amountLost: number;
	bankrollSeries: Array<{ hand: number; pl: number }>;
};

export type StrategyStats = {
	handsPlayed: number;
	correct: number;
	correctWithHints: number;
	incorrect: number;
	noActionRequired: number;
};


function uniqueHands(records: DecisionRecord[]): Map<string, DecisionRecord[]> {
	const map = new Map<string, DecisionRecord[]>();
	for (const r of records) {
		const key = `${r.handId}:${r.handIndex}`;
		const arr = map.get(key);
		if (arr) arr.push(r);
		else map.set(key, [r]);
	}
	return map;
}

export async function getHandsStats(since: number): Promise<HandsStats> {
	const records = await fetchDecisionsSince(since);
	const hands = uniqueHands(records);
	let won = 0, push = 0, lost = 0, surrender = 0;
	for (const group of hands.values()) {
		const result = group[0].handResult;
		if (result === 'win' || result === 'blackjack') won++;
		else if (result === 'push') push++;
		else if (result === 'surrender') surrender++;
		else lost++;
	}
	return { won, push, lost, surrender, total: hands.size };
}

export async function getBankrollStats(since: number): Promise<BankrollStats> {
	const records = await fetchDecisionsSince(since);
	const tracked = records.filter((r) => r.bankrollTracked);
	const hands = uniqueHands(tracked);

	// Sort hands chronologically (by first record's timestamp)
	const sortedHands = [...hands.values()].sort((a, b) => a[0].timestamp - b[0].timestamp);

	let runningPL = 0;
	let amountWon = 0;
	let amountLost = 0;
	const bankrollSeries: Array<{ hand: number; pl: number }> = [];

	for (let i = 0; i < sortedHands.length; i++) {
		const chips = sortedHands[i][0].outcomeChips;
		runningPL += chips;
		if (chips > 0) amountWon += chips;
		else if (chips < 0) amountLost += Math.abs(chips);
		bankrollSeries.push({ hand: i + 1, pl: runningPL });
	}

	return {
		profitLoss: runningPL,
		amountWon,
		amountLost,
		bankrollSeries
	};
}

export async function getStrategyStats(since: number): Promise<StrategyStats> {
	const records = await fetchDecisionsSince(since);
	const hands = uniqueHands(records);

	let correct = 0;
	let correctWithHints = 0;
	let incorrect = 0;

	for (const r of records) {
		if (r.correct) {
			correct++;
			if (r.hintShown) correctWithHints++;
		} else {
			incorrect++;
		}
	}

	const handsPlayed = hands.size;
	const totalDealt = parseInt(
		(typeof localStorage !== 'undefined' ? localStorage.getItem('bj-hands-dealt') : null) ?? '0',
		10
	);
	const noActionRequired = Math.max(0, totalDealt - handsPlayed);

	return { handsPlayed, correct, correctWithHints, incorrect, noActionRequired };
}

export function filterSince(filter: 'today' | 'week' | 'month' | 'all'): number {
	if (filter === 'all') return 0;
	const now = Date.now();
	if (filter === 'today') {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d.getTime();
	}
	if (filter === 'week') return now - 7 * 86400000;
	return now - 30 * 86400000;
}
