import { describe, expect, it } from 'vitest';
import { buildDeck, hiLoValue, rankValue, shuffle } from './card.js';

describe('rankValue', () => {
	it('returns 11 for Ace', () => expect(rankValue('A')).toBe(11));
	it('returns 10 for face cards', () => {
		expect(rankValue('T')).toBe(10);
		expect(rankValue('J')).toBe(10);
		expect(rankValue('Q')).toBe(10);
		expect(rankValue('K')).toBe(10);
	});
	it('returns face value for 2-9', () => {
		expect(rankValue('2')).toBe(2);
		expect(rankValue('9')).toBe(9);
	});
});

describe('hiLoValue', () => {
	it('returns +1 for low cards', () => {
		for (const r of ['2', '3', '4', '5', '6'] as const) {
			expect(hiLoValue(r)).toBe(1);
		}
	});
	it('returns 0 for neutral cards', () => {
		for (const r of ['7', '8', '9'] as const) {
			expect(hiLoValue(r)).toBe(0);
		}
	});
	it('returns -1 for high cards', () => {
		for (const r of ['T', 'J', 'Q', 'K', 'A'] as const) {
			expect(hiLoValue(r)).toBe(-1);
		}
	});
});

describe('buildDeck', () => {
	it('produces 52 unique cards', () => {
		const deck = buildDeck();
		expect(deck).toHaveLength(52);
		const keys = deck.map((c) => `${c.rank}${c.suit}`);
		expect(new Set(keys).size).toBe(52);
	});
});

describe('shuffle', () => {
	it('preserves all cards', () => {
		const deck = buildDeck();
		const shuffled = shuffle(deck);
		expect(shuffled).toHaveLength(52);
		const origKeys = deck.map((c) => `${c.rank}${c.suit}`).sort();
		const shuffledKeys = shuffled.map((c) => `${c.rank}${c.suit}`).sort();
		expect(shuffledKeys).toEqual(origKeys);
	});
	it('does not mutate the original array', () => {
		const deck = buildDeck();
		const original = [...deck];
		shuffle(deck);
		expect(deck).toEqual(original);
	});
});
