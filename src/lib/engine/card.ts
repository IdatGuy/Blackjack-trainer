export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K';
export type Card = { rank: Rank; suit: Suit };

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];

export function rankValue(rank: Rank): number {
	if (rank === 'A') return 11;
	if (['T', 'J', 'Q', 'K'].includes(rank)) return 10;
	return parseInt(rank, 10);
}

export function hiLoValue(rank: Rank): number {
	if (['2', '3', '4', '5', '6'].includes(rank)) return 1;
	if (['7', '8', '9'].includes(rank)) return 0;
	return -1; // T, J, Q, K, A
}

export function buildDeck(): Card[] {
	const deck: Card[] = [];
	for (const suit of SUITS) {
		for (const rank of RANKS) {
			deck.push({ rank, suit });
		}
	}
	return deck;
}

export function shuffle(cards: Card[]): Card[] {
	const result = [...cards];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}
