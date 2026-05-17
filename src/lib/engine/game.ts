import type { Card } from './card.js';
import { type Hand, handValue, isBlackjack, isBust, makeHand } from './hand.js';
import { type RuleSet, dealerShouldHit, DEFAULT_RULESET } from './rules.js';
import { buildShoe, dealCard, type Shoe } from './shoe.js';

export type GamePhase = 'betting' | 'dealing' | 'player' | 'dealer' | 'resolution';

export type HandResult = 'win' | 'loss' | 'push' | 'blackjack' | 'surrender';

export type ResolvedHand = Hand & {
	result: HandResult;
	netChips: number; // net gain/loss in chips (positive = win, negative = loss)
};

export type GameState = {
	shoe: Shoe;
	rules: RuleSet;
	playerHands: Hand[];
	dealerHand: Hand;
	activeHandIndex: number;
	phase: GamePhase;
};

export function initialState(rules: RuleSet = DEFAULT_RULESET, decks?: number): GameState {
	return {
		shoe: buildShoe(decks ?? rules.decks),
		rules,
		playerHands: [],
		dealerHand: makeHand([], 0),
		activeHandIndex: 0,
		phase: 'betting'
	};
}

export function dealHand(state: GameState, bets: number[]): GameState {
	if (bets.length === 0 || bets.some((b) => b <= 0)) {
		throw new Error('Each bet must be positive');
	}

	// Deal order: player card 1, dealer card 1, player card 2, dealer card 2
	let shoe = state.shoe;
	const playerCards: Card[][] = bets.map(() => []);
	const dealerCards: Card[] = [];

	// card 1 to each player
	for (let i = 0; i < bets.length; i++) {
		const { card, shoe: s } = dealCard(shoe);
		playerCards[i].push(card);
		shoe = s;
	}
	// card 1 to dealer
	{
		const { card, shoe: s } = dealCard(shoe);
		dealerCards.push(card);
		shoe = s;
	}
	// card 2 to each player
	for (let i = 0; i < bets.length; i++) {
		const { card, shoe: s } = dealCard(shoe);
		playerCards[i].push(card);
		shoe = s;
	}
	// card 2 to dealer (hole card)
	{
		const { card, shoe: s } = dealCard(shoe);
		dealerCards.push(card);
		shoe = s;
	}

	const playerHands = bets.map((bet, i) => makeHand(playerCards[i], bet));
	const dealerHand = makeHand(dealerCards, 0);

	// Check for dealer blackjack (if peek rule, game skips to resolution)
	const dealerBJ = isBlackjack(dealerCards);
	const allPlayerBJ = playerHands.every((h) => isBlackjack(h.cards));

	let phase: GamePhase = 'player';
	if (dealerBJ) {
		// Peek: if dealer has BJ, skip to resolution immediately
		phase = state.rules.peek ? 'resolution' : 'dealer';
	}
	if (allPlayerBJ && !dealerBJ) {
		phase = 'resolution'; // all players have BJ, dealer doesn't
	}

	return {
		...state,
		shoe,
		playerHands,
		dealerHand,
		activeHandIndex: 0,
		phase
	};
}

function withActiveHand(state: GameState, update: (h: Hand) => Hand): GameState {
	const hands = state.playerHands.map((h, i) =>
		i === state.activeHandIndex ? update(h) : h
	);
	return { ...state, playerHands: hands };
}

function advanceActive(state: GameState): GameState {
	// Find the next unresolved hand
	const next = state.playerHands.findIndex(
		(h, i) => i > state.activeHandIndex && !h.isResolved && !h.isSurrendered
	);
	if (next === -1) {
		// All hands done — move to dealer phase
		return { ...state, phase: 'dealer' };
	}
	return { ...state, activeHandIndex: next };
}

export function hit(state: GameState): GameState {
	if (state.phase !== 'player') throw new Error('Not in player phase');
	const { card, shoe } = dealCard(state.shoe);
	let next = withActiveHand(state, (h) => ({ ...h, cards: [...h.cards, card] }));
	next = { ...next, shoe };

	const activeHand = next.playerHands[next.activeHandIndex];
	if (isBust(activeHand.cards) || handValue(activeHand.cards) === 21) {
		next = withActiveHand(next, (h) => ({ ...h, isResolved: true }));
		next = advanceActive(next);
	}
	return next;
}

export function stand(state: GameState): GameState {
	if (state.phase !== 'player') throw new Error('Not in player phase');
	let next = withActiveHand(state, (h) => ({ ...h, isResolved: true }));
	next = advanceActive(next);
	return next;
}

export function double(state: GameState): GameState {
	if (state.phase !== 'player') throw new Error('Not in player phase');
	const activeHand = state.playerHands[state.activeHandIndex];
	if (activeHand.cards.length !== 2) throw new Error('Can only double on first two cards');

	const { card, shoe } = dealCard(state.shoe);
	let next = withActiveHand(state, (h) => ({
		...h,
		cards: [...h.cards, card],
		bet: h.bet * 2,
		isDoubled: true,
		isResolved: true // one card then done
	}));
	next = { ...next, shoe };
	next = advanceActive(next);
	return next;
}

export function surrender(state: GameState): GameState {
	if (state.phase !== 'player') throw new Error('Not in player phase');
	const activeHand = state.playerHands[state.activeHandIndex];
	if (activeHand.cards.length !== 2) throw new Error('Can only surrender on first two cards');

	let next = withActiveHand(state, (h) => ({
		...h,
		isSurrendered: true,
		isResolved: true
	}));
	next = advanceActive(next);
	return next;
}

export function split(state: GameState): GameState {
	if (state.phase !== 'player') throw new Error('Not in player phase');
	const activeHand = state.playerHands[state.activeHandIndex];
	if (activeHand.cards.length !== 2) throw new Error('Can only split first two cards');

	const [c1, c2] = activeHand.cards;
	let shoe = state.shoe;

	const { card: newCard1, shoe: s1 } = dealCard(shoe);
	shoe = s1;
	const { card: newCard2, shoe: s2 } = dealCard(shoe);
	shoe = s2;

	const hand1 = makeHand([c1, newCard1], activeHand.bet, true);
	const hand2 = makeHand([c2, newCard2], activeHand.bet, true);

	// Replace active hand with two new hands
	const newHands = [
		...state.playerHands.slice(0, state.activeHandIndex),
		hand1,
		hand2,
		...state.playerHands.slice(state.activeHandIndex + 1)
	];

	return { ...state, shoe, playerHands: newHands };
}

export function playDealer(state: GameState): GameState {
	if (state.phase !== 'dealer') throw new Error('Not in dealer phase');

	let { shoe, dealerHand, rules } = state;

	while (dealerShouldHit(dealerHand.cards, rules)) {
		const { card, shoe: s } = dealCard(shoe);
		dealerHand = { ...dealerHand, cards: [...dealerHand.cards, card] };
		shoe = s;
	}

	return { ...state, shoe, dealerHand, phase: 'resolution' };
}

export function resolveHands(state: GameState): { state: GameState; results: ResolvedHand[] } {
	if (state.phase !== 'resolution') throw new Error('Not in resolution phase');

	const dealerValue = handValue(state.dealerHand.cards);
	const dealerBJ = isBlackjack(state.dealerHand.cards);
	const dealerBust = isBust(state.dealerHand.cards);

	const results: ResolvedHand[] = state.playerHands.map((hand): ResolvedHand => {
		const playerValue = handValue(hand.cards);
		const playerBJ = isBlackjack(hand.cards);

		let result: HandResult;
		let netChips: number;

		if (hand.isSurrendered) {
			result = 'surrender';
			netChips = -(hand.bet / 2);
		} else if (playerBJ && dealerBJ) {
			result = 'push';
			netChips = 0;
		} else if (playerBJ) {
			result = 'blackjack';
			netChips = state.rules.blackjackPays === '3:2' ? hand.bet * 1.5 : hand.bet * 1.2;
		} else if (dealerBJ) {
			result = 'loss';
			netChips = -hand.bet;
		} else if (isBust(hand.cards)) {
			result = 'loss';
			netChips = -hand.bet;
		} else if (dealerBust) {
			result = 'win';
			netChips = hand.bet;
		} else if (playerValue > dealerValue) {
			result = 'win';
			netChips = hand.bet;
		} else if (playerValue === dealerValue) {
			result = 'push';
			netChips = 0;
		} else {
			result = 'loss';
			netChips = -hand.bet;
		}

		return { ...hand, result, netChips };
	});

	const resolvedState: GameState = {
		...state,
		playerHands: results.map((r) => ({ ...r, isResolved: true }))
	};

	return { state: resolvedState, results };
}
