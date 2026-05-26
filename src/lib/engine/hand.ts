import { rankValue, type Card, type Rank } from './card.js';

export type Hand = {
	cards: Card[];
	bet: number;
	isSplit: boolean;
	isDoubled: boolean;
	isSurrendered: boolean;
	isResolved: boolean;
	splitDepth: number;
};

export function handValue(cards: Card[]): number {
	let total = 0;
	let aces = 0;
	for (const card of cards) {
		total += rankValue(card.rank);
		if (card.rank === 'A') aces++;
	}
	while (total > 21 && aces > 0) {
		total -= 10;
		aces--;
	}
	return total;
}

export function isSoft(cards: Card[]): boolean {
	let total = 0;
	let aces = 0;
	for (const card of cards) {
		total += rankValue(card.rank);
		if (card.rank === 'A') aces++;
	}
	// Still soft if we have an ace counted as 11 (i.e., no reductions needed)
	while (total > 21 && aces > 0) {
		total -= 10;
		aces--;
	}
	return aces > 0;
}

export function isBlackjack(cards: Card[]): boolean {
	if (cards.length !== 2) return false;
	return handValue(cards) === 21;
}

export function isBust(cards: Card[]): boolean {
	return handValue(cards) > 21;
}

const TEN_RANKS: Rank[] = ['T', 'J', 'Q', 'K'];

function splitRank(rank: Rank): Rank {
	// T/J/Q/K all treated as the same "ten" for split purposes
	return TEN_RANKS.includes(rank) ? 'T' : rank;
}

export function isPair(cards: Card[]): boolean {
	if (cards.length !== 2) return false;
	return splitRank(cards[0].rank) === splitRank(cards[1].rank);
}

export type HandType = 'hard' | 'soft' | 'pair';

export function handType(cards: Card[], allowPair = true): HandType {
	if (allowPair && isPair(cards)) return 'pair';
	if (isSoft(cards)) return 'soft';
	return 'hard';
}

export function handKey(cards: Card[], type: HandType): string {
	if (type === 'pair') {
		const r = splitRank(cards[0].rank);
		return `${r}${r}`;
	}
	if (type === 'soft') {
		// Key like "A7" representing ace + non-ace total
		const nonAceTotal = handValue(cards) - 11;
		return `A${nonAceTotal}`;
	}
	return String(handValue(cards));
}

export function makeHand(cards: Card[], bet: number, isSplit = false, splitDepth = 0): Hand {
	return {
		cards,
		bet,
		isSplit,
		isDoubled: false,
		isSurrendered: false,
		isResolved: false,
		splitDepth
	};
}
