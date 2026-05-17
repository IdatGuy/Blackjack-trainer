import {
	dealHand,
	double,
	hit,
	initialState,
	playDealer,
	resolveHands,
	stand,
	surrender,
	type ResolvedHand
} from '$lib/engine/game.js';
import { handKey, handType, makeHand } from '$lib/engine/hand.js';
import { allowedActions, type Action } from '$lib/engine/rules.js';
import { resetShoe, shouldReshuffle } from '$lib/engine/shoe.js';
import { getCorrectAction } from '$lib/engine/strategy.js';

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

class GameStore {
	state = $state(initialState());
	betAmount = $state(10);
	showFeedback = $state(true);
	actionHistory = $state<ActionRecord[]>([]);
	lastResults = $state<ResolvedHand[]>([]);
	bankroll = $state(1000);

	deal() {
		if (this.state.phase !== 'betting') return;
		this.actionHistory = [];
		this.lastResults = [];
		this.state = dealHand(this.state, [this.betAmount]);
		this._maybeAutoFinish();
	}

	act(action: 'H' | 'S' | 'D' | 'R') {
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
	}

	adjustBet(delta: number) {
		const next = this.betAmount + delta;
		if (next >= 5 && next <= this.bankroll) this.betAmount = next;
	}

	get allowedActions(): Action[] {
		if (this.state.phase !== 'player' || this.state.playerHands.length === 0) return [];
		const activeHand = this.state.playerHands[this.state.activeHandIndex];
		if (!activeHand) return [];
		return allowedActions(activeHand, this.state.dealerHand.cards[0], this.state.rules).filter(
			(a) => a !== 'P' // split deferred to Phase 3
		);
	}

	get reshuffleNeeded(): boolean {
		return shouldReshuffle(this.state.shoe);
	}

	feedbackFor(record: ActionRecord): string {
		if (record.correct) return '';
		return `You ${ACTION_PAST[record.actual]} — should have ${ACTION_INF[record.expected]} (${record.handDesc})`;
	}

	_maybeAutoFinish() {
		if (this.state.phase === 'dealer') {
			this.state = playDealer(this.state);
		}
		if (this.state.phase === 'resolution') {
			const { state, results } = resolveHands(this.state);
			this.state = state;
			this.lastResults = results;
			this.bankroll = Math.round(
				(this.bankroll + results.reduce((sum, r) => sum + r.netChips, 0)) * 100
			) / 100;
		}
	}
}

export const game = new GameStore();
export { ACTION_PAST, ACTION_INF };
