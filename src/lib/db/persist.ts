import { getDb } from './index.js';
import type { DecisionRecord } from './schema.js';

export async function saveDecisions(records: DecisionRecord[]): Promise<void> {
	if (records.length === 0) return;
	const db = await getDb();
	const tx = db.transaction('decisions', 'readwrite');
	await Promise.all(records.map((r) => tx.store.put(r)));
	await tx.done;
}
