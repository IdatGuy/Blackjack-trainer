import { openDB } from 'idb';
import type { BjDB, DecisionRecord } from './schema.js';

let dbPromise: ReturnType<typeof openDB<BjDB>> | null = null;

export function getDb() {
	if (!dbPromise) {
		dbPromise = openDB<BjDB>('bj-trainer', 3, {
			upgrade(db, oldVersion) {
				if (oldVersion < 1) {
					const store = db.createObjectStore('decisions', {
						keyPath: 'id',
						autoIncrement: true
					});
					store.createIndex('by-timestamp', 'timestamp');
					store.createIndex('by-session', 'sessionId');
					store.createIndex('by-ruleset', 'ruleSetId');
				}
				if (oldVersion < 2) {
					const cg = db.createObjectStore('countGuesses', {
						keyPath: 'id',
						autoIncrement: true
					});
					cg.createIndex('by-timestamp', 'timestamp');
					cg.createIndex('by-session', 'sessionId');
				}
				if (oldVersion < 3) {
					const br = db.createObjectStore('betRampDecisions', {
						keyPath: 'id',
						autoIncrement: true
					});
					br.createIndex('by-timestamp', 'timestamp');
					br.createIndex('by-session', 'sessionId');
				}
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
