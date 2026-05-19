import type { DBSchema } from 'idb';
import type { Action } from '$lib/engine/rules.js';
import type { Rank } from '$lib/engine/card.js';
import type { HandResult } from '$lib/engine/game.js';

export type DecisionRecord = {
	id?: number;
	timestamp: number;
	sessionId: string;
	handId: string;
	handIndex: number;
	ruleSetId: string;
	mode: 'standard' | 'holeCard';
	playMode: 'shoe' | 'drill';
	handType: 'hard' | 'soft' | 'pair';
	playerTotal: number | string;
	dealerUp: Rank;
	trueCount: number;
	expected: Action;
	actual: Action;
	correct: boolean;
	hintShown: boolean;
	category: 'hit-stand' | 'double' | 'split' | 'surrender' | 'deviation';
	handResult: HandResult;
	betAmount: number;
	outcomeChips: number;
	bankrollTracked: boolean;
};

export interface BjDB extends DBSchema {
	decisions: {
		key: number;
		value: DecisionRecord;
		indexes: {
			'by-timestamp': number;
			'by-session': string;
			'by-ruleset': string;
		};
	};
}
