import { describe, expect, it } from 'vitest';
import type { Card } from './card.js';
import { buildShoe } from './shoe.js';
import { DEFAULT_RULESET } from './rules.js';
import {
	dealHand,
	hit,
	initialState,
	playDealer,
	resolveHands,
	resolveInsurance,
	stand,
	double,
	surrender,
	split
} from './game.js';

function card(rank: Card['rank'], suit: Card['suit'] = 'S'): Card {
	return { rank, suit };
}

// Build a shoe with a predetermined card order (first card dealt first)
function fixedShoe(cards: Card[]) {
	const base = buildShoe(6);
	return { ...base, cards, dealtCards: [] as Card[], runningCount: 0 };
}

describe('initialState', () => {
	it('starts in betting phase', () => {
		expect(initialState().phase).toBe('betting');
	});
});

describe('dealHand', () => {
	it('deals 2 cards to player and dealer', () => {
		// cards dealt: p1, d1, p2, d2
		const shoe = fixedShoe([card('5'), card('7'), card('6'), card('8'), ...buildShoe(6).cards]);
		const state = { ...initialState(), shoe };
		const next = dealHand(state, [10]);
		expect(next.playerHands[0].cards).toHaveLength(2);
		expect(next.dealerHand.cards).toHaveLength(2);
	});

	it('enters resolution immediately on dealer BJ (peek rule)', () => {
		// Dealer gets A + K = BJ
		const shoe = fixedShoe([
			card('5'), // player card 1
			card('A'), // dealer card 1
			card('6'), // player card 2
			card('K'), // dealer hole card (BJ)
			...buildShoe(6).cards
		]);
		const state = { ...initialState(), shoe };
		const next = dealHand(state, [10]);
		// Insurance is offered first when dealer shows Ace; resolveInsurance transitions to resolution
		expect(next.phase).toBe('insurance');
		const afterInsurance = resolveInsurance(next);
		expect(afterInsurance.phase).toBe('resolution');
	});

	it('enters resolution on player BJ (dealer no BJ)', () => {
		const shoe = fixedShoe([
			card('A'), // player card 1
			card('7'), // dealer card 1
			card('K'), // player card 2 → BJ
			card('8'), // dealer card 2
			...buildShoe(6).cards
		]);
		const state = { ...initialState(), shoe };
		const next = dealHand(state, [10]);
		expect(next.phase).toBe('resolution');
	});

	it('throws on zero bet', () => {
		expect(() => dealHand(initialState(), [0])).toThrow();
	});
});

describe('hit', () => {
	it('adds a card to active hand', () => {
		const shoe = fixedShoe([card('5'), card('7'), card('6'), card('8'), card('3'), ...buildShoe(6).cards]);
		let state = { ...initialState(), shoe };
		state = dealHand(state, [10]);
		const next = hit(state);
		expect(next.playerHands[0].cards).toHaveLength(3);
	});

	it('auto-resolves on bust', () => {
		// player: 9+9, hits T → bust
		const shoe = fixedShoe([card('9'), card('2'), card('9'), card('3'), card('T'), ...buildShoe(6).cards]);
		let state = { ...initialState(), shoe };
		state = dealHand(state, [10]);
		const next = hit(state);
		expect(next.playerHands[0].isResolved).toBe(true);
	});
});

describe('stand', () => {
	it('resolves active hand and advances', () => {
		const shoe = fixedShoe([card('5'), card('7'), card('6'), card('8'), ...buildShoe(6).cards]);
		let state = { ...initialState(), shoe };
		state = dealHand(state, [10]);
		const next = stand(state);
		expect(next.playerHands[0].isResolved).toBe(true);
		expect(next.phase).toBe('dealer');
	});
});

describe('double', () => {
	it('doubles bet and adds one card then resolves', () => {
		const shoe = fixedShoe([card('5'), card('7'), card('6'), card('8'), card('3'), ...buildShoe(6).cards]);
		let state = { ...initialState(), shoe };
		state = dealHand(state, [10]);
		const next = double(state);
		expect(next.playerHands[0].bet).toBe(20);
		expect(next.playerHands[0].cards).toHaveLength(3);
		expect(next.playerHands[0].isDoubled).toBe(true);
		expect(next.playerHands[0].isResolved).toBe(true);
	});
});

describe('surrender', () => {
	it('marks hand as surrendered', () => {
		const shoe = fixedShoe([card('T'), card('T'), card('6'), card('K'), ...buildShoe(6).cards]);
		let state = { ...initialState(), shoe };
		state = dealHand(state, [10]);
		const next = surrender(state);
		expect(next.playerHands[0].isSurrendered).toBe(true);
		expect(next.phase).toBe('dealer');
	});
});

describe('split', () => {
	it('turns one hand into two hands', () => {
		const shoe = fixedShoe([card('8'), card('7'), card('8'), card('6'), card('3'), card('5'), ...buildShoe(6).cards]);
		let state = { ...initialState(), shoe };
		state = dealHand(state, [10]);
		const next = split(state);
		expect(next.playerHands).toHaveLength(2);
		expect(next.playerHands[0].isSplit).toBe(true);
		expect(next.playerHands[1].isSplit).toBe(true);
	});
});

describe('playDealer', () => {
	it('dealer draws until 17+', () => {
		// Force dealer to have a hand that needs hitting
		const shoe = fixedShoe([card('5'), card('6'), card('T'), card('6'), card('5'), ...buildShoe(6).cards]);
		let state = { ...initialState(), shoe };
		state = dealHand(state, [10]);
		// manually set dealer hand so we control it
		state = {
			...state,
			dealerHand: { ...state.dealerHand, cards: [card('6'), card('5')] },
			phase: 'dealer'
		};
		const next = playDealer(state);
		expect(next.dealerHand.cards.length).toBeGreaterThan(2);
		expect(next.phase).toBe('resolution');
	});

	it('dealer stands on 17 (S17 rule)', () => {
		let state = initialState();
		state = {
			...state,
			dealerHand: { ...state.dealerHand, cards: [card('T'), card('7')] },
			phase: 'dealer'
		};
		const next = playDealer(state);
		expect(next.dealerHand.cards).toHaveLength(2); // no additional cards
	});
});

describe('resolveHands', () => {
	it('player BJ pays 3:2', () => {
		let state = initialState();
		state = {
			...state,
			playerHands: [{ cards: [card('A'), card('K')], bet: 10, isSplit: false, isDoubled: false, isSurrendered: false, isResolved: true }],
			dealerHand: { cards: [card('7'), card('T')], bet: 0, isSplit: false, isDoubled: false, isSurrendered: false, isResolved: false },
			phase: 'resolution'
		};
		const { results } = resolveHands(state);
		expect(results[0].result).toBe('blackjack');
		expect(results[0].netChips).toBe(15);
	});

	it('BJ vs BJ is a push', () => {
		let state = initialState();
		state = {
			...state,
			playerHands: [{ cards: [card('A'), card('K')], bet: 10, isSplit: false, isDoubled: false, isSurrendered: false, isResolved: true }],
			dealerHand: { cards: [card('A'), card('T')], bet: 0, isSplit: false, isDoubled: false, isSurrendered: false, isResolved: false },
			phase: 'resolution'
		};
		const { results } = resolveHands(state);
		expect(results[0].result).toBe('push');
		expect(results[0].netChips).toBe(0);
	});

	it('dealer busts, player wins', () => {
		let state = initialState();
		state = {
			...state,
			playerHands: [{ cards: [card('T'), card('8')], bet: 10, isSplit: false, isDoubled: false, isSurrendered: false, isResolved: true }],
			dealerHand: { cards: [card('T'), card('7'), card('9')], bet: 0, isSplit: false, isDoubled: false, isSurrendered: false, isResolved: false },
			phase: 'resolution'
		};
		const { results } = resolveHands(state);
		expect(results[0].result).toBe('win');
		expect(results[0].netChips).toBe(10);
	});

	it('surrender returns half bet loss', () => {
		let state = initialState();
		state = {
			...state,
			playerHands: [{ cards: [card('T'), card('6')], bet: 10, isSplit: false, isDoubled: false, isSurrendered: true, isResolved: true }],
			dealerHand: { cards: [card('T'), card('7')], bet: 0, isSplit: false, isDoubled: false, isSurrendered: false, isResolved: false },
			phase: 'resolution'
		};
		const { results } = resolveHands(state);
		expect(results[0].result).toBe('surrender');
		expect(results[0].netChips).toBe(-5);
	});

	it('player higher value wins', () => {
		let state = initialState();
		state = {
			...state,
			playerHands: [{ cards: [card('T'), card('9')], bet: 10, isSplit: false, isDoubled: false, isSurrendered: false, isResolved: true }],
			dealerHand: { cards: [card('T'), card('8')], bet: 0, isSplit: false, isDoubled: false, isSurrendered: false, isResolved: false },
			phase: 'resolution'
		};
		const { results } = resolveHands(state);
		expect(results[0].result).toBe('win');
	});

	it('equal value is push', () => {
		let state = initialState();
		state = {
			...state,
			playerHands: [{ cards: [card('T'), card('8')], bet: 10, isSplit: false, isDoubled: false, isSurrendered: false, isResolved: true }],
			dealerHand: { cards: [card('T'), card('8')], bet: 0, isSplit: false, isDoubled: false, isSurrendered: false, isResolved: false },
			phase: 'resolution'
		};
		const { results } = resolveHands(state);
		expect(results[0].result).toBe('push');
	});
});
