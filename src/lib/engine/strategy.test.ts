import { describe, expect, it } from 'vitest';
import type { Card } from './card.js';
import { makeHand } from './hand.js';
import { DEFAULT_RULESET } from './rules.js';
import { buildShoe } from './shoe.js';
import { getCorrectAction } from './strategy.js';

function card(rank: Card['rank'], suit: Card['suit'] = 'S'): Card {
	return { rank, suit };
}

function shoe(rc = 0, cardsLeft = 312) {
	const base = buildShoe(6);
	return { ...base, cards: base.cards.slice(0, cardsLeft), runningCount: rc };
}

function hand(cards: Card[], bet = 10, isSplit = false) {
	return makeHand(cards, bet, isSplit);
}

const rules = DEFAULT_RULESET;

// ─── Hard totals ─────────────────────────────────────────────────────────

describe('hard totals — basic strategy', () => {
	it('hard 8 vs 6: hit', () => {
		const action = getCorrectAction(hand([card('5'), card('3')]), card('6'), shoe(), rules);
		expect(action).toBe('H');
	});
	it('hard 9 vs 3: double', () => {
		const action = getCorrectAction(hand([card('5'), card('4')]), card('3'), shoe(), rules);
		expect(action).toBe('D');
	});
	it('hard 9 vs 2: hit (base)', () => {
		const action = getCorrectAction(hand([card('5'), card('4')]), card('2'), shoe(), rules);
		expect(action).toBe('H');
	});
	it('hard 10 vs 9: double', () => {
		const action = getCorrectAction(hand([card('6'), card('4')]), card('9'), shoe(), rules);
		expect(action).toBe('D');
	});
	it('hard 11 vs T: double', () => {
		const action = getCorrectAction(hand([card('6'), card('5')]), card('T'), shoe(), rules);
		expect(action).toBe('D');
	});
	it('hard 11 vs A: hit (6D S17, not double)', () => {
		const action = getCorrectAction(hand([card('6'), card('5')]), card('A'), shoe(), rules);
		expect(action).toBe('H');
	});
	it('hard 12 vs 4: stand', () => {
		const action = getCorrectAction(hand([card('T'), card('2')]), card('4'), shoe(), rules);
		expect(action).toBe('S');
	});
	it('hard 12 vs 2: hit', () => {
		const action = getCorrectAction(hand([card('T'), card('2')]), card('2'), shoe(), rules);
		expect(action).toBe('H');
	});
	it('hard 15 vs 9: hit', () => {
		const action = getCorrectAction(hand([card('T'), card('5')]), card('9'), shoe(), rules);
		expect(action).toBe('H');
	});
	it('hard 15 vs T: surrender', () => {
		const action = getCorrectAction(hand([card('T'), card('5')]), card('T'), shoe(), rules);
		expect(action).toBe('R');
	});
	it('hard 15 vs A: hit (not surrender for 6D S17)', () => {
		const action = getCorrectAction(hand([card('T'), card('5')]), card('A'), shoe(), rules);
		expect(action).toBe('H');
	});
	it('hard 16 vs 7: hit', () => {
		const action = getCorrectAction(hand([card('T'), card('6')]), card('7'), shoe(), rules);
		expect(action).toBe('H');
	});
	it('hard 16 vs 9: surrender', () => {
		const action = getCorrectAction(hand([card('T'), card('6')]), card('9'), shoe(), rules);
		expect(action).toBe('R');
	});
	it('hard 16 vs T: surrender at negative count', () => {
		// I18 deviation stands at TC≥0; below that, base (surrender) applies
		const action = getCorrectAction(hand([card('T'), card('6')]), card('T'), shoe(-6), rules);
		expect(action).toBe('R');
	});
	it('hard 17 vs A: stand', () => {
		const action = getCorrectAction(hand([card('T'), card('7')]), card('A'), shoe(), rules);
		expect(action).toBe('S');
	});
});

// ─── Soft totals ─────────────────────────────────────────────────────────

describe('soft totals — basic strategy', () => {
	it('soft 13 (A2) vs 5: double', () => {
		const action = getCorrectAction(hand([card('A'), card('2')]), card('5'), shoe(), rules);
		expect(action).toBe('D');
	});
	it('soft 13 (A2) vs 4: hit', () => {
		const action = getCorrectAction(hand([card('A'), card('2')]), card('4'), shoe(), rules);
		expect(action).toBe('H');
	});
	it('soft 17 (A6) vs 3: double', () => {
		const action = getCorrectAction(hand([card('A'), card('6')]), card('3'), shoe(), rules);
		expect(action).toBe('D');
	});
	it('soft 18 (A7) vs 2: stand', () => {
		const action = getCorrectAction(hand([card('A'), card('7')]), card('2'), shoe(), rules);
		expect(action).toBe('S');
	});
	it('soft 18 (A7) vs 3: double (Ds)', () => {
		const action = getCorrectAction(hand([card('A'), card('7')]), card('3'), shoe(), rules);
		expect(action).toBe('D');
	});
	it('soft 18 (A7) vs 9: hit', () => {
		const action = getCorrectAction(hand([card('A'), card('7')]), card('9'), shoe(), rules);
		expect(action).toBe('H');
	});
	it('soft 18 (A7) vs T: hit', () => {
		const action = getCorrectAction(hand([card('A'), card('7')]), card('T'), shoe(), rules);
		expect(action).toBe('H');
	});
	it('soft 19 (A8) vs 6: double', () => {
		const action = getCorrectAction(hand([card('A'), card('8')]), card('6'), shoe(), rules);
		expect(action).toBe('D');
	});
	it('soft 20 (A9) vs 6: stand', () => {
		const action = getCorrectAction(hand([card('A'), card('9')]), card('6'), shoe(), rules);
		expect(action).toBe('S');
	});
});

// ─── Pairs ───────────────────────────────────────────────────────────────

describe('pairs — basic strategy', () => {
	it('AA vs T: split', () => {
		const action = getCorrectAction(hand([card('A'), card('A')]), card('T'), shoe(), rules);
		expect(action).toBe('P');
	});
	it('22 vs 7: split', () => {
		const action = getCorrectAction(hand([card('2'), card('2')]), card('7'), shoe(), rules);
		expect(action).toBe('P');
	});
	it('22 vs 8: hit', () => {
		const action = getCorrectAction(hand([card('2'), card('2')]), card('8'), shoe(), rules);
		expect(action).toBe('H');
	});
	it('44 vs 5: split (DAS)', () => {
		const action = getCorrectAction(hand([card('4'), card('4')]), card('5'), shoe(), rules);
		expect(action).toBe('P');
	});
	it('44 vs 6: split (DAS)', () => {
		const action = getCorrectAction(hand([card('4'), card('4')]), card('6'), shoe(), rules);
		expect(action).toBe('P');
	});
	it('44 vs 4: hit', () => {
		const action = getCorrectAction(hand([card('4'), card('4')]), card('4'), shoe(), rules);
		expect(action).toBe('H');
	});
	it('55 vs 6: double (treated as hard 10)', () => {
		const action = getCorrectAction(hand([card('5'), card('5')]), card('6'), shoe(), rules);
		expect(action).toBe('D');
	});
	it('55 vs A: hit', () => {
		const action = getCorrectAction(hand([card('5'), card('5')]), card('A'), shoe(), rules);
		expect(action).toBe('H');
	});
	it('88 vs T: split', () => {
		const action = getCorrectAction(hand([card('8'), card('8')]), card('T'), shoe(), rules);
		expect(action).toBe('P');
	});
	it('88 vs A: split', () => {
		const action = getCorrectAction(hand([card('8'), card('8')]), card('A'), shoe(), rules);
		expect(action).toBe('P');
	});
	it('99 vs 7: stand', () => {
		const action = getCorrectAction(hand([card('9'), card('9')]), card('7'), shoe(), rules);
		expect(action).toBe('S');
	});
	it('99 vs 8: split', () => {
		const action = getCorrectAction(hand([card('9'), card('9')]), card('8'), shoe(), rules);
		expect(action).toBe('P');
	});
	it('TT vs 5: stand (base strategy)', () => {
		const action = getCorrectAction(hand([card('T'), card('T')]), card('5'), shoe(), rules);
		expect(action).toBe('S');
	});
	it('TJ treated same as TT', () => {
		const action = getCorrectAction(hand([card('T'), card('J')]), card('7'), shoe(), rules);
		expect(action).toBe('S');
	});
});

// ─── TC deviations ───────────────────────────────────────────────────────

describe('Illustrious 18 deviations', () => {
	it('16 vs T: surrender at TC -1 (base, deviation fires at TC≥0)', () => {
		// shoe(-6) with 312 cards → TC = round(-6/6) = -1
		const action = getCorrectAction(hand([card('T'), card('6')]), card('T'), shoe(-6), rules);
		expect(action).toBe('R'); // below TC 0 threshold, base surrender applies
	});
	it('16 vs T: stand at TC 0 (deviation)', () => {
		const action = getCorrectAction(hand([card('T'), card('6')]), card('T'), shoe(0), rules);
		expect(action).toBe('S');
	});
	it('16 vs T: stand at TC +2 (deviation)', () => {
		const action = getCorrectAction(hand([card('T'), card('6')]), card('T'), shoe(12), rules);
		expect(action).toBe('S');
	});
	it('11 vs A: hit at TC 0 (base)', () => {
		const action = getCorrectAction(hand([card('6'), card('5')]), card('A'), shoe(0), rules);
		expect(action).toBe('H');
	});
	it('11 vs A: double at TC +1 (deviation)', () => {
		const action = getCorrectAction(hand([card('6'), card('5')]), card('A'), shoe(6), rules);
		expect(action).toBe('D');
	});
	it('12 vs 4: stand at TC 0 (base)', () => {
		const action = getCorrectAction(hand([card('T'), card('2')]), card('4'), shoe(0), rules);
		expect(action).toBe('S');
	});
	it('12 vs 4: hit at TC -1 (deviation)', () => {
		const action = getCorrectAction(hand([card('T'), card('2')]), card('4'), shoe(-6), rules);
		expect(action).toBe('H');
	});
	it('9 vs 2: hit at TC 0 (base)', () => {
		const action = getCorrectAction(hand([card('5'), card('4')]), card('2'), shoe(0), rules);
		expect(action).toBe('H');
	});
	it('9 vs 2: double at TC +1 (deviation)', () => {
		const action = getCorrectAction(hand([card('5'), card('4')]), card('2'), shoe(6), rules);
		expect(action).toBe('D');
	});
	it('TT vs 5: stand at TC +4 (base — deviation fires at TC≥5)', () => {
		const action = getCorrectAction(hand([card('T'), card('T')]), card('5'), shoe(24), rules);
		expect(action).toBe('S'); // TC=4, threshold is 5
	});
	it('TT vs 5: split at TC +5 (deviation)', () => {
		const action = getCorrectAction(hand([card('T'), card('T')]), card('5'), shoe(30), rules);
		expect(action).toBe('P');
	});
});

describe('Fab 4 surrender deviations', () => {
	it('15 vs T: hit at TC -1 (base was surrender, fab3 threshold is 0)', () => {
		// base is R (surrender), fab3 fires at TC≥0; at TC=-1 surrender applies (base)
		const action = getCorrectAction(hand([card('T'), card('5')]), card('T'), shoe(-6), rules);
		expect(action).toBe('R');
	});
	it('15 vs 9: hit at TC +1 (base, fab2 threshold is +2)', () => {
		const action = getCorrectAction(hand([card('T'), card('5')]), card('9'), shoe(6), rules);
		expect(action).toBe('H'); // base is H, dev fires at TC≥2
	});
	it('15 vs 9: surrender at TC +2 (deviation)', () => {
		const action = getCorrectAction(hand([card('T'), card('5')]), card('9'), shoe(12), rules);
		expect(action).toBe('R');
	});
	it('15 vs A: surrender at TC +1 (deviation)', () => {
		const action = getCorrectAction(hand([card('T'), card('5')]), card('A'), shoe(6), rules);
		expect(action).toBe('R');
	});
	it('14 vs T: surrender at TC +3 (deviation)', () => {
		const action = getCorrectAction(hand([card('T'), card('4')]), card('T'), shoe(18), rules);
		expect(action).toBe('R');
	});
	it('14 vs T: hit at TC +2 (base)', () => {
		const action = getCorrectAction(hand([card('T'), card('4')]), card('T'), shoe(12), rules);
		expect(action).toBe('H');
	});
});

// ─── Fallback resolution ─────────────────────────────────────────────────

describe('fallback when action not allowed', () => {
	it('Ds (soft 18 vs 3) falls back to stand when double not allowed after split', () => {
		// Simulate a split hand where DAS is off
		const nodasRules = { ...rules, doubleAfterSplit: false };
		const splitHand = makeHand([card('A'), card('7')], 10, true);
		const action = getCorrectAction(splitHand, card('3'), shoe(), nodasRules, undefined, 1);
		expect(action).toBe('S');
	});
});
