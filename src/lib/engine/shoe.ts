import { buildDeck, hiLoValue, shuffle, type Card } from './card.js';

export type Shoe = {
	cards: Card[];
	decks: number;
	dealtCards: Card[];
	runningCount: number;
};

export function buildShoe(decks: number): Shoe {
	const cards: Card[] = [];
	for (let i = 0; i < decks; i++) {
		cards.push(...buildDeck());
	}
	return {
		cards: shuffle(cards),
		decks,
		dealtCards: [],
		runningCount: 0
	};
}

export function dealCard(shoe: Shoe, skipCount = false): { card: Card; shoe: Shoe } {
	if (shoe.cards.length === 0) throw new Error('Shoe is empty');
	const [card, ...remaining] = shoe.cards;
	return {
		card,
		shoe: {
			...shoe,
			cards: remaining,
			dealtCards: [...shoe.dealtCards, card],
			runningCount: shoe.runningCount + (skipCount ? 0 : hiLoValue(card.rank))
		}
	};
}

export function countCard(shoe: Shoe, card: Card): Shoe {
	return { ...shoe, runningCount: shoe.runningCount + hiLoValue(card.rank) };
}

export function trueCount(shoe: Shoe): number {
	const decksRemaining = shoe.cards.length / 52;
	if (decksRemaining < 0.5) return shoe.runningCount; // avoid division by near-zero
	// Round to nearest 0.5 deck for standard TC calculation
	const rounded = Math.round(decksRemaining * 2) / 2;
	return Math.round(shoe.runningCount / rounded);
}

export function shouldReshuffle(shoe: Shoe, cutCardPosition?: number): boolean {
	const totalCards = shoe.decks * 52;
	const threshold = cutCardPosition ?? Math.floor(totalCards * 0.25); // cut at 75% penetration
	return shoe.cards.length <= threshold;
}

export function resetShoe(shoe: Shoe): Shoe {
	return buildShoe(shoe.decks);
}
