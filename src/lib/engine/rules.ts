import type { Card } from './card.js';
import type { Hand } from './hand.js';
import { handValue, isPair, isSoft } from './hand.js';

export type Action = 'H' | 'S' | 'D' | 'P' | 'R' | 'I' | 'N'; // hit/stand/double/split/surrender/insurance/no-insurance

export type RuleSet = {
	id: string;
	name: string;
	decks: 1 | 2 | 4 | 6 | 8;
	dealerHitsSoft17: boolean;
	doubleAfterSplit: boolean;
	resplitAces: boolean;
	surrender: 'none' | 'late' | 'early';
	peek: boolean;
	blackjackPays: '3:2' | '6:5';
	maxSplits: number;
};

export const DEFAULT_RULESET: RuleSet = {
	id: '6d-s17-das-ls',
	name: '6 Deck S17 DAS Late Surrender',
	decks: 6,
	dealerHitsSoft17: false, // S17 = dealer stands on soft 17
	doubleAfterSplit: true,
	resplitAces: false,
	surrender: 'late',
	peek: true,
	blackjackPays: '3:2',
	maxSplits: 3
};

export function allowedActions(
	hand: Hand,
	_dealerUp: Card,
	rules: RuleSet,
	splitCount = 0
): Action[] {
	const actions: Action[] = ['H', 'S'];

	const isFirstTwoCards = hand.cards.length === 2;
	const isSplitHand = hand.isSplit;

	if (isFirstTwoCards) {
		// Double: allowed on first two cards; if split, only with DAS
		if (!isSplitHand || rules.doubleAfterSplit) {
			actions.push('D');
		}

		// Split: pair, and haven't hit max splits
		if (isPair(hand.cards) && splitCount < rules.maxSplits) {
			// Aces: no resplit unless rule allows
			const isAcePair = hand.cards[0].rank === 'A';
			if (!isAcePair || rules.resplitAces || splitCount === 0) {
				actions.push('P');
			}
		}

		// Surrender: late only on first two cards (not after split in most rules)
		if (rules.surrender !== 'none' && !isSplitHand) {
			actions.push('R');
		}
	}

	// After split aces: typically only one card drawn, no further action
	// (handled by game engine; allowedActions returns base set)

	return actions;
}

export function dealerShouldHit(dealerCards: Card[], rules: RuleSet): boolean {
	const value = handValue(dealerCards);
	if (value < 17) return true;
	if (value === 17 && rules.dealerHitsSoft17 && isSoft(dealerCards)) return true;
	return false;
}
