import { fetchDecisionsSince } from './index.js';
import type { DecisionRecord } from './schema.js';

export type CellAccuracy = {
	correct: number;
	total: number;
};

// playerKey → dealerUp → accuracy
export type HeatmapData = Record<string, Record<string, CellAccuracy>>;

export type CategoryStat = {
	category: DecisionRecord['category'];
	correct: number;
	total: number;
};

export type CellDetail = {
	basic: CellAccuracy;
	deviation: CellAccuracy;
};

// Converts a DecisionRecord's playerTotal to the chart key used in strategy.ts
function toPlayerKey(r: Pick<DecisionRecord, 'handType' | 'playerTotal'>): string {
	if (r.handType === 'soft') {
		// playerTotal is numeric (e.g. 18 for A7 = soft 18); chart key is "A7"
		return `A${Number(r.playerTotal) - 11}`;
	}
	return String(r.playerTotal); // hard number or pair key ("AA", "TT", etc.)
}

export async function getHeatmapData(
	handType: 'hard' | 'soft' | 'pair',
	since: number
): Promise<HeatmapData> {
	const records = await fetchDecisionsSince(since);
	const out: HeatmapData = {};
	for (const r of records) {
		if (r.handType !== handType) continue;
		const pk = toPlayerKey(r);
		const dk = r.dealerUp;
		if (!out[pk]) out[pk] = {};
		if (!out[pk][dk]) out[pk][dk] = { correct: 0, total: 0 };
		out[pk][dk].total++;
		if (r.correct) out[pk][dk].correct++;
	}
	return out;
}

export async function getCategoryStats(since: number): Promise<CategoryStat[]> {
	const records = await fetchDecisionsSince(since);
	const map = new Map<DecisionRecord['category'], CellAccuracy>();
	for (const r of records) {
		const s = map.get(r.category) ?? { correct: 0, total: 0 };
		s.total++;
		if (r.correct) s.correct++;
		map.set(r.category, s);
	}
	return [...map.entries()].map(([category, s]) => ({ category, ...s }));
}

// Returns accuracy keyed by "handType:playerKey:dealerUp" for deviation decisions only
export async function getDeviationAccuracy(since: number): Promise<Map<string, CellAccuracy>> {
	const records = await fetchDecisionsSince(since);
	const map = new Map<string, CellAccuracy>();
	for (const r of records) {
		if (r.category !== 'deviation') continue;
		const key = `${r.handType}:${toPlayerKey(r)}:${r.dealerUp}`;
		const s = map.get(key) ?? { correct: 0, total: 0 };
		s.total++;
		if (r.correct) s.correct++;
		map.set(key, s);
	}
	return map;
}

export async function getWeaknessWeights(): Promise<Map<string, number>> {
	const records = await fetchDecisionsSince(0);
	const counts = new Map<string, { correct: number; total: number }>();
	for (const r of records) {
		const baseKey = `${r.handType}:${toPlayerKey(r)}:${r.dealerUp}`;
		const key = r.category === 'deviation' ? `${baseKey}:dev` : baseKey;
		const s = counts.get(key) ?? { correct: 0, total: 0 };
		s.total++;
		if (r.correct) s.correct++;
		counts.set(key, s);
	}
	const weights = new Map<string, number>();
	for (const [key, s] of counts) {
		weights.set(key, s.total > 0 ? 1 - s.correct / s.total : 1.0);
	}
	return weights;
}

export async function getCellDetail(
	handType: 'hard' | 'soft' | 'pair',
	playerKey: string,
	dealerUp: string,
	since: number
): Promise<CellDetail> {
	const records = await fetchDecisionsSince(since);
	const basic: CellAccuracy = { correct: 0, total: 0 };
	const deviation: CellAccuracy = { correct: 0, total: 0 };
	for (const r of records) {
		if (r.handType !== handType) continue;
		if (toPlayerKey(r) !== playerKey) continue;
		if (r.dealerUp !== dealerUp) continue;
		const bucket = r.category === 'deviation' ? deviation : basic;
		bucket.total++;
		if (r.correct) bucket.correct++;
	}
	return { basic, deviation };
}
