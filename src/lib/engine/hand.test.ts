import { describe, expect, it } from 'vitest';
import type { Card } from './card.js';
import { handKey, handType, handValue, isBlackjack, isBust, isPair, isSoft, makeHand } from './hand.js';

function card(rank: Card['rank'], suit: Card['suit'] = 'S'): Card {
	return { rank, suit };
}

describe('handValue', () => {
	it('sums basic cards', () => {
		expect(handValue([card('5'), card('6')])).toBe(11);
	});
	it('ace counts as 11 when safe', () => {
		expect(handValue([card('A'), card('6')])).toBe(17);
	});
	it('reduces ace from 11 to 1 when bust', () => {
		expect(handValue([card('A'), card('6'), card('9')])).toBe(16);
	});
	it('handles multi-ace reduction: A+A+9 = 21', () => {
		expect(handValue([card('A'), card('A'), card('9')])).toBe(21);
	});
	it('handles A+A+A+8 = 21', () => {
		expect(handValue([card('A'), card('A'), card('A'), card('8')])).toBe(21);
	});
	it('handles A+A+A+A+8 = 12 (all aces reduce to 1)', () => {
		expect(handValue([card('A'), card('A'), card('A'), card('A'), card('8')])).toBe(12);
	});
	it('handles A+A+A+A+7 = 21 (three aces reduce, one stays 11)', () => {
		expect(handValue([card('A'), card('A'), card('A'), card('A'), card('7')])).toBe(21);
	});
	it('busts correctly when all aces reduced', () => {
		expect(handValue([card('9'), card('9'), card('9')])).toBe(27);
	});
	it('T+K = 20', () => {
		expect(handValue([card('T'), card('K')])).toBe(20);
	});
});

describe('isSoft', () => {
	it('A+6 is soft', () => expect(isSoft([card('A'), card('6')])).toBe(true));
	it('A+6+9 is hard (ace reduced)', () => expect(isSoft([card('A'), card('6'), card('9')])).toBe(false));
	it('7+8 is hard', () => expect(isSoft([card('7'), card('8')])).toBe(false));
	it('A+A+9 is soft (one ace still 11)', () => expect(isSoft([card('A'), card('A'), card('9')])).toBe(true));
});

describe('isBlackjack', () => {
	it('A+K = blackjack', () => expect(isBlackjack([card('A'), card('K')])).toBe(true));
	it('A+T = blackjack', () => expect(isBlackjack([card('A'), card('T')])).toBe(true));
	it('A+K+small is not blackjack', () => {
		expect(isBlackjack([card('A'), card('K'), card('2')])).toBe(false);
	});
	it('5+5+A+A = 21 but not blackjack', () => {
		expect(isBlackjack([card('5'), card('5'), card('A'), card('A')])).toBe(false);
	});
	it('T+J = 20, not blackjack', () => {
		expect(isBlackjack([card('T'), card('J')])).toBe(false);
	});
});

describe('isBust', () => {
	it('22 is bust', () => expect(isBust([card('9'), card('6'), card('7')])).toBe(true));
	it('21 is not bust', () => expect(isBust([card('A'), card('K')])).toBe(false));
});

describe('isPair', () => {
	it('8+8 is a pair', () => expect(isPair([card('8'), card('8')])).toBe(true));
	it('A+A is a pair', () => expect(isPair([card('A'), card('A')])).toBe(true));
	it('T+J is a pair (both tens)', () => expect(isPair([card('T'), card('J')])).toBe(true));
	it('Q+K is a pair (both tens)', () => expect(isPair([card('Q'), card('K')])).toBe(true));
	it('5+6 is not a pair', () => expect(isPair([card('5'), card('6')])).toBe(false));
	it('three cards is not a pair', () => {
		expect(isPair([card('8'), card('8'), card('2')])).toBe(false);
	});
});

describe('handType', () => {
	it('detects pair', () => expect(handType([card('8'), card('8')])).toBe('pair'));
	it('detects soft', () => expect(handType([card('A'), card('6')])).toBe('soft'));
	it('detects hard', () => expect(handType([card('7'), card('9')])).toBe('hard'));
	it('after split, 3-card hand with ace is soft not pair', () => {
		expect(handType([card('A'), card('6'), card('2')], false)).toBe('soft');
	});
});

describe('handKey', () => {
	it('pair key for 88', () => {
		expect(handKey([card('8'), card('8')], 'pair')).toBe('88');
	});
	it('pair key for AA', () => {
		expect(handKey([card('A'), card('A')], 'pair')).toBe('AA');
	});
	it('pair key for TJ (both tens)', () => {
		expect(handKey([card('T'), card('J')], 'pair')).toBe('TT');
	});
	it('soft key for A7 = "A7"', () => {
		expect(handKey([card('A'), card('7')], 'soft')).toBe('A7');
	});
	it('hard key for 16', () => {
		expect(handKey([card('9'), card('7')], 'hard')).toBe('16');
	});
	it('hard key for 12', () => {
		expect(handKey([card('T'), card('2')], 'hard')).toBe('12');
	});
});

describe('makeHand', () => {
	it('creates hand with defaults', () => {
		const h = makeHand([card('A'), card('K')], 10);
		expect(h.bet).toBe(10);
		expect(h.isDoubled).toBe(false);
		expect(h.isSurrendered).toBe(false);
		expect(h.isResolved).toBe(false);
	});
});
