import { getDb } from './index.js';
import type { BetRampRecord, CountGuessRecord, DecisionRecord } from './schema.js';

export async function saveDecisions(records: DecisionRecord[]): Promise<void> {
	if (records.length === 0) return;
	const db = await getDb();
	const tx = db.transaction('decisions', 'readwrite');
	await Promise.all(records.map((r) => tx.store.put(r)));
	await tx.done;
}

export async function saveCountGuess(record: CountGuessRecord): Promise<void> {
	const db = await getDb();
	await db.add('countGuesses', record);
}

export async function saveBetRampRecord(record: Omit<BetRampRecord, 'id'>): Promise<void> {
	const db = await getDb();
	await db.add('betRampDecisions', record);
}
