import { describe, expect, it } from 'vitest';
import type { Card } from './card.js';
import { buildShoe, dealCard, resetShoe, shouldReshuffle, trueCount } from './shoe.js';

describe('buildShoe', () => {
	it('contains 52 × decks cards', () => {
		expect(buildShoe(6).cards).toHaveLength(312);
		expect(buildShoe(1).cards).toHaveLength(52);
	});
	it('starts with runningCount 0', () => {
		expect(buildShoe(6).runningCount).toBe(0);
	});
	it('starts with empty dealtCards', () => {
		expect(buildShoe(6).dealtCards).toHaveLength(0);
	});
});

describe('dealCard', () => {
	it('removes one card from shoe', () => {
		const shoe = buildShoe(6);
		const { shoe: next } = dealCard(shoe);
		expect(next.cards).toHaveLength(311);
	});
	it('adds card to dealtCards', () => {
		const shoe = buildShoe(6);
		const { card, shoe: next } = dealCard(shoe);
		expect(next.dealtCards).toContainEqual(card);
	});
	it('updates running count correctly', () => {
		// Build a shoe with a known first card by manipulating the array
		const shoe = buildShoe(1);
		// Find a low card (2-6) and put it first
		const lowIdx = shoe.cards.findIndex((c) => ['2', '3', '4', '5', '6'].includes(c.rank));
		const ordered = [shoe.cards[lowIdx], ...shoe.cards.filter((_, i) => i !== lowIdx)];
		const s = { ...shoe, cards: ordered };
		const { shoe: after } = dealCard(s);
		expect(after.runningCount).toBe(1);
	});
	it('throws when shoe is empty', () => {
		const shoe = { ...buildShoe(1), cards: [] as Card[] };
		expect(() => dealCard(shoe)).toThrow('Shoe is empty');
	});
});

describe('trueCount', () => {
	it('returns 0 when RC is 0', () => {
		const shoe = buildShoe(6);
		expect(trueCount(shoe)).toBe(0);
	});
	it('divides RC by decks remaining', () => {
		// With 6 decks (312 cards) remaining and RC=6, TC should be 1
		const shoe = { ...buildShoe(6), runningCount: 6 };
		expect(trueCount(shoe)).toBe(1);
	});
	it('truncates toward zero (positive)', () => {
		// 156 cards = 3 decks, RC=8 → 8/3 ≈ 2.67 → trunc to 2 (round would give 3)
		const shoe = { ...buildShoe(6), cards: buildShoe(6).cards.slice(156), runningCount: 8 };
		expect(trueCount(shoe)).toBe(2);
	});
	it('truncates toward zero (negative)', () => {
		// 156 cards = 3 decks, RC=-7 → -7/3 ≈ -2.33 → trunc to -2 (floor would give -3)
		const shoe = { ...buildShoe(6), cards: buildShoe(6).cards.slice(156), runningCount: -7 };
		expect(trueCount(shoe)).toBe(-2);
	});
	it('rounds divisor to nearest 0.5 at quarter-deck boundary', () => {
		// 140 cards = 2.692 decks → below 2.75 midpoint → divisor 2.5; RC=10 → TC=4
		const below = { ...buildShoe(6), cards: buildShoe(6).cards.slice(172), runningCount: 10 };
		expect(trueCount(below)).toBe(4);
		// 146 cards = 2.808 decks → above 2.75 midpoint → divisor 3.0; RC=9 → TC=3
		const above = { ...buildShoe(6), cards: buildShoe(6).cards.slice(166), runningCount: 9 };
		expect(trueCount(above)).toBe(3);
	});
});

describe('shouldReshuffle', () => {
	it('returns false at start of shoe', () => {
		expect(shouldReshuffle(buildShoe(6))).toBe(false);
	});
	it('returns true below 25% remaining (default cut card)', () => {
		const shoe = buildShoe(6);
		// 312 * 0.25 = 78 cards threshold → at 77 cards remaining, should reshuffle
		const depleted = { ...shoe, cards: shoe.cards.slice(312 - 77) };
		expect(shouldReshuffle(depleted)).toBe(true);
	});
	it('respects custom cut card position', () => {
		const shoe = buildShoe(6);
		// Custom cut at 100 cards
		const depleted = { ...shoe, cards: shoe.cards.slice(312 - 99) };
		expect(shouldReshuffle(depleted, 100)).toBe(true);
	});
});

describe('resetShoe', () => {
	it('rebuilds to full shoe', () => {
		const shoe = buildShoe(6);
		const { shoe: depleted } = dealCard(shoe);
		const fresh = resetShoe(depleted);
		expect(fresh.cards).toHaveLength(312);
		expect(fresh.runningCount).toBe(0);
	});
});
