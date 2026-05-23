import { openDB } from 'idb';
import type { BjDB, DecisionRecord } from './schema.js';

let dbPromise: ReturnType<typeof openDB<BjDB>> | null = null;

export function getDb() {
	if (!dbPromise) {
		dbPromise = openDB<BjDB>('bj-trainer', 1, {
			upgrade(db) {
				const store = db.createObjectStore('decisions', {
					keyPath: 'id',
					autoIncrement: true
				});
				store.createIndex('by-timestamp', 'timestamp');
				store.createIndex('by-session', 'sessionId');
				store.createIndex('by-ruleset', 'ruleSetId');
			}
		});
	}
	return dbPromise;
}

export async function clearDecisions(): Promise<void> {
	const db = await getDb();
	await db.clear('decisions');
}

export async function fetchDecisionsSince(since: number): Promise<DecisionRecord[]> {
	const db = await getDb();
	const range = since > 0 ? IDBKeyRange.lowerBound(since) : undefined;
	return range ? db.getAllFromIndex('decisions', 'by-timestamp', range) : db.getAll('decisions');
}
