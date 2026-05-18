import {
	dealHand,
	double,
	hit,
	initialState,
	resolveHands,
	split,
	stand,
	surrender,
	type ResolvedHand
} from '$lib/engine/game.js';
import { handKey, handType, makeHand } from '$lib/engine/hand.js';
import { allowedActions, dealerShouldHit, type Action } from '$lib/engine/rules.js';
import { dealCard, resetShoe, shouldReshuffle } from '$lib/engine/shoe.js';
import { getCorrectAction } from '$lib/engine/strategy.js';
import { settings } from './settings.svelte.js';

export type ActionRecord = {
	expected: Action;
	actual: Action;
	correct: boolean;
	handDesc: string; // e.g. "hard 16 vs 10"
};

const ACTION_PAST: Record<Action, string> = {
	H: 'hit',
	S: 'stood',
	D: 'doubled',
	P: 'split',
	R: 'surrendered'
};

const ACTION_INF: Record<Action, string> = {
	H: 'hit',
	S: 'stand',
	D: 'double',
	P: 'split',
	R: 'surrender'
};

function rankLabel(rank: string): string {
	return rank === 'T' ? '10' : rank;
}

export const MIN_BET = 10;
export const MAX_BET = 1000;

class GameStore {
	state = $state(initialState());
	betAmount = $state(0);
	get showFeedback() { return settings.showFeedback; }
	actionHistory = $state<ActionRecord[]>([]);
	lastResults = $state<ResolvedHand[]>([]);
	bankroll = $state(1000);

	deal() {
		if (this.state.phase !== 'betting') return;
		if (this.betAmount < MIN_BET || this.betAmount > this.bankroll) return;
		this.actionHistory = [];
		this.lastResults = [];
		this.state = dealHand(this.state, [this.betAmount]);
		this._maybeAutoFinish();
	}

	act(action: Action) {
		if (this.state.phase !== 'player') return;
		const activeHand = this.state.playerHands[this.state.activeHandIndex];
		const dealerUp = this.state.dealerHand.cards[0];

		const expected = getCorrectAction(
			activeHand,
			dealerUp,
			this.state.shoe,
			this.state.rules
		);

		const type = handType(activeHand.cards, activeHand.cards.length === 2);
		const key = handKey(activeHand.cards, type);
		const handDesc = `${type} ${key} vs ${rankLabel(dealerUp.rank)}`;

		const record: ActionRecord = {
			expected,
			actual: action,
			correct: expected === action,
			handDesc
		};
		this.actionHistory = [...this.actionHistory, record];

		if (action === 'H') this.state = hit(this.state);
		else if (action === 'S') this.state = stand(this.state);
		else if (action === 'D') this.state = double(this.state);
		else if (action === 'R') this.state = surrender(this.state);
		else if (action === 'P') this.state = split(this.state);

		this._maybeAutoFinish();
	}

	nextHand() {
		const autoReshuffle = shouldReshuffle(this.state.shoe);
		this.state = {
			...this.state,
			shoe: autoReshuffle ? resetShoe(this.state.shoe) : this.state.shoe,
			phase: 'betting',
			playerHands: [],
			dealerHand: makeHand([], 0),
			activeHandIndex: 0
		};
		this.lastResults = [];
		this.actionHistory = [];
		// betAmount intentionally preserved — defaults to last bet
	}

	reshuffle() {
		this.state = {
			...this.state,
			shoe: resetShoe(this.state.shoe),
			phase: 'betting',
			playerHands: [],
			dealerHand: makeHand([], 0),
			activeHandIndex: 0
		};
		this.lastResults = [];
		this.actionHistory = [];
		this.betAmount = 0;
	}

	addChip(value: number) {
		this.betAmount = Math.min(this.betAmount + value, MAX_BET, this.bankroll);
	}

	clearBet() {
		this.betAmount = 0;
	}

	get allowedActions(): Action[] {
		if (this.state.phase !== 'player' || this.state.playerHands.length === 0) return [];
		const activeHand = this.state.playerHands[this.state.activeHandIndex];
		if (!activeHand) return [];
		const splitCount = this.state.playerHands.length - 1;
		return allowedActions(activeHand, this.state.dealerHand.cards[0], this.state.rules, splitCount);
	}

	get reshuffleNeeded(): boolean {
		return shouldReshuffle(this.state.shoe);
	}

	feedbackFor(record: ActionRecord): string {
		if (record.correct) return '';
		return `You ${ACTION_PAST[record.actual]} — should have ${ACTION_INF[record.expected]} (${record.handDesc})`;
	}

	get dealerShouldDraw(): boolean {
		return this.state.phase === 'dealer' &&
			dealerShouldHit(this.state.dealerHand.cards, this.state.rules);
	}

	dealerDraw() {
		if (this.state.phase !== 'dealer') return;
		const { card, shoe } = dealCard(this.state.shoe);
		this.state = {
			...this.state,
			shoe,
			dealerHand: { ...this.state.dealerHand, cards: [...this.state.dealerHand.cards, card] }
		};
	}

	resolveDealer() {
		if (this.state.phase !== 'dealer') return;
		this.state = { ...this.state, phase: 'resolution' };
		const { state, results } = resolveHands(this.state);
		this.state = state;
		this.lastResults = results;
		if (settings.bettingEnabled) {
			this.bankroll = Math.round(
				(this.bankroll + results.reduce((sum, r) => sum + r.netChips, 0)) * 100
			) / 100;
		}
	}

	_maybeAutoFinish() {
		// Auto-stand split aces: one card only, no further action allowed
		if (this.state.phase === 'player') {
			const activeHand = this.state.playerHands[this.state.activeHandIndex];
			if (activeHand && activeHand.isSplit && activeHand.cards[0].rank === 'A' && activeHand.cards.length === 2) {
				this.state = stand(this.state);
				this._maybeAutoFinish();
				return;
			}
		}
		// Dealer phase is driven by the UI animation sequence (startDealerSequence in +page.svelte)

		// Direct resolution (e.g. dealer BJ with peek, all-player BJ)
		if (this.state.phase === 'resolution') {
			const { state, results } = resolveHands(this.state);
			this.state = state;
			this.lastResults = results;
			if (settings.bettingEnabled) {
				this.bankroll = Math.round(
					(this.bankroll + results.reduce((sum, r) => sum + r.netChips, 0)) * 100
				) / 100;
			}
		}
	}
}

export const game = new GameStore();
export { ACTION_PAST, ACTION_INF };
