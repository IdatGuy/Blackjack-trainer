import {
	dealHand,
	double,
	hit,
	initialState,
	resolveHands,
	resolveInsurance,
	split,
	stand,
	surrender,
	type HandResult,
	type ResolvedHand
} from '$lib/engine/game.js';
import { handKey, handType, handValue, isBlackjack, makeHand } from '$lib/engine/hand.js';
import { allowedActions, dealerShouldHit, type Action } from '$lib/engine/rules.js';
import { buildShoe, dealCard, resetShoe, shouldReshuffle, trueCount } from '$lib/engine/shoe.js';
import { getBaseAction, getCorrectAction, getInsuranceAction } from '$lib/engine/strategy.js';
import { browser } from '$app/environment';
import { saveDecisions } from '$lib/db/persist.js';
import type { DecisionRecord } from '$lib/db/schema.js';
import { settings } from './settings.svelte.js';

export type ActionRecord = {
	expected: Action;
	actual: Action;
	correct: boolean;
	handDesc: string; // e.g. "hard 16 vs 10"
};

type PendingDecision = Omit<DecisionRecord, 'id' | 'outcomeChips' | 'bankrollTracked' | 'handResult'>;

const ACTION_PAST: Record<Action, string> = {
	H: 'hit',
	S: 'stood',
	D: 'doubled',
	P: 'split',
	R: 'surrendered',
	I: 'took insurance',
	N: 'declined insurance'
};

const ACTION_INF: Record<Action, string> = {
	H: 'hit',
	S: 'stand',
	D: 'double',
	P: 'split',
	R: 'surrender',
	I: 'take insurance',
	N: 'decline insurance'
};

function rankLabel(rank: string): string {
	return rank === 'T' ? '10' : rank;
}

/** @deprecated import settings.minBet / settings.maxBet directly */
export const MIN_BET = 10;
/** @deprecated import settings.minBet / settings.maxBet directly */
export const MAX_BET = 1000;

function generateId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function loadBankroll(): number {
	if (!browser) return 1000;
	const saved = localStorage.getItem('bj-bankroll');
	if (saved) {
		const n = parseFloat(saved);
		if (Number.isFinite(n) && n >= 0) return n;
	}
	return 1000;
}

class GameStore {
	state = $state(initialState());
	betAmount = $state(0);
	get showFeedback() { return settings.showFeedback; }
	actionHistory = $state<ActionRecord[]>([]);
	lastResults = $state<ResolvedHand[]>([]);
	bankroll = $state(loadBankroll());
	bankrollFlash = $state<number | null>(null);
	_flashTimer: ReturnType<typeof setTimeout> | null = null;
	sessionId = $state(browser ? generateId() : 'ssr');
	handId = $state('');
	insuranceBet = $state(0);
	insuranceResult = $state<'win' | 'loss' | null>(null);
	_pending: PendingDecision[] = [];

	_persistBankroll() {
		if (browser) localStorage.setItem('bj-bankroll', String(this.bankroll));
	}

	resetBankroll() {
		this.bankroll = 1000;
		this._persistBankroll();
	}

	_setFlash(delta: number) {
		if (!browser) return;
		if (this._flashTimer) clearTimeout(this._flashTimer);
		if (delta === 0) { this.bankrollFlash = null; return; }
		this.bankrollFlash = delta;
		this._flashTimer = setTimeout(() => {
			this.bankrollFlash = null;
			this._flashTimer = null;
		}, 1400);
	}

	_applyResolution(results: ResolvedHand[]) {
		this.lastResults = results;
		const dealerHadBJ = isBlackjack(this.state.dealerHand.cards);
		if (this.insuranceBet > 0) {
			this.insuranceResult = dealerHadBJ ? 'win' : 'loss';
			if (settings.bettingEnabled && dealerHadBJ) {
				// 2:1 payout; insuranceBet was already deducted, so return bet + profit
				this.bankroll = Math.round((this.bankroll + this.insuranceBet * 3) * 100) / 100;
				this._persistBankroll();
			}
		}
		if (settings.bettingEnabled) {
			let totalReturn = 0;
			let displayFlash = 0;
			for (const r of results) {
				const returnAmount = r.netChips + r.bet;
				totalReturn += returnAmount;
				if (r.netChips > 0) displayFlash += r.netChips;
				else if (returnAmount > 0) displayFlash += returnAmount;
			}
			this.bankroll = Math.round((this.bankroll + totalReturn) * 100) / 100;
			this._persistBankroll();
			this._setFlash(displayFlash);
		}
		this._flushDecisions(results);
	}

	_flushDecisions(results: ResolvedHand[]) {
		if (this._pending.length === 0) return;
		const bankrollTracked = settings.bettingEnabled;
		const completed: DecisionRecord[] = this._pending.map((pd) => {
			if (pd.category === 'insurance') {
				return {
					...pd,
					outcomeChips: bankrollTracked
						? (this.insuranceResult === 'win' ? this.insuranceBet * 2 : -this.insuranceBet)
						: 0,
					bankrollTracked,
					handResult: (this.insuranceResult === 'win' ? 'win' : 'loss') as HandResult
				};
			}
			return {
				...pd,
				outcomeChips: bankrollTracked ? (results[pd.handIndex]?.netChips ?? 0) : 0,
				bankrollTracked,
				handResult: (results[pd.handIndex]?.result ?? 'loss') as HandResult
			};
		});
		this._pending = [];
		if (browser) saveDecisions(completed);
	}

	deal() {
		if (this.state.phase !== 'betting') return;
		if (this.betAmount < settings.minBet || this.betAmount > this.bankroll) return;
		this.actionHistory = [];
		this.lastResults = [];
		this._pending = [];
		this.insuranceBet = 0;
		this.insuranceResult = null;
		const now = Date.now();
		this.handId = `${this.sessionId}-${now}`;
		if (browser) {
			const prev = parseInt(localStorage.getItem('bj-hands-dealt') ?? '0', 10);
			localStorage.setItem('bj-hands-dealt', String(prev + 1));
		}
		if (settings.bettingEnabled) {
			this.bankroll = Math.round((this.bankroll - this.betAmount) * 100) / 100;
			this._persistBankroll();
			this._setFlash(-this.betAmount);
		}
		this.state = dealHand(this.state, [this.betAmount]);
		this._maybeAutoFinish();
	}

	_logInsuranceDecision(actual: 'I' | 'N') {
		const expected = getInsuranceAction(this.state.shoe);
		const activeHand = this.state.playerHands[0];
		const type = handType(activeHand.cards, true);
		const record: ActionRecord = {
			expected,
			actual,
			correct: expected === actual,
			handDesc: 'insurance vs A'
		};
		this.actionHistory = [...this.actionHistory, record];
		this._pending.push({
			timestamp: Date.now(),
			sessionId: this.sessionId,
			handId: this.handId,
			handIndex: 0,
			ruleSetId: this.state.rules.id,
			mode: 'standard',
			playMode: 'shoe',
			handType: type,
			playerTotal: handValue(activeHand.cards),
			dealerUp: 'A',
			trueCount: trueCount(this.state.shoe),
			expected,
			actual,
			correct: expected === actual,
			hintShown: settings.showDeviationHints && expected === 'I',
			category: 'insurance',
			betAmount: activeHand.bet
		});
	}

	takeInsurance() {
		if (this.state.phase !== 'insurance') return;
		const insAmt = Math.floor(this.state.playerHands[0].bet / 2);
		this.insuranceBet = insAmt;
		if (settings.bettingEnabled && insAmt > 0) {
			this.bankroll = Math.round((this.bankroll - insAmt) * 100) / 100;
			this._persistBankroll();
		}
		this._logInsuranceDecision('I');
		this.state = resolveInsurance(this.state);
		this._maybeAutoFinish();
	}

	declineInsurance() {
		if (this.state.phase !== 'insurance') return;
		this.insuranceBet = 0;
		this._logInsuranceDecision('N');
		this.state = resolveInsurance(this.state);
		this._maybeAutoFinish();
	}

	get correctInsuranceAction(): 'I' | 'N' {
		return getInsuranceAction(this.state.shoe);
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
		const base = getBaseAction(activeHand, dealerUp, this.state.shoe, this.state.rules);

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

		const isDeviation = expected !== base;
		const category: DecisionRecord['category'] =
			action === 'P' ? 'split' :
			action === 'D' ? 'double' :
			action === 'R' ? 'surrender' :
			isDeviation ? 'deviation' : 'hit-stand';

		const playerTotal: number | string =
			type === 'pair' ? key : handValue(activeHand.cards);

		this._pending.push({
			timestamp: Date.now(),
			sessionId: this.sessionId,
			handId: this.handId,
			handIndex: this.state.activeHandIndex,
			ruleSetId: this.state.rules.id,
			mode: 'standard',
			playMode: 'shoe',
			handType: type,
			playerTotal,
			dealerUp: dealerUp.rank,
			trueCount: trueCount(this.state.shoe),
			expected,
			actual: action,
			correct: expected === action,
			hintShown: settings.showDeviationHints && isDeviation,
			category,
			betAmount: activeHand.bet
		});

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
		this._pending = [];
		this.insuranceBet = 0;
		this.insuranceResult = null;
		// betAmount intentionally preserved — defaults to last bet
	}

	reshuffle() {
		this.state = {
			...this.state,
			shoe: buildShoe(settings.deckCount),
			rules: { ...this.state.rules, decks: settings.deckCount },
			phase: 'betting',
			playerHands: [],
			dealerHand: makeHand([], 0),
			activeHandIndex: 0
		};
		this.lastResults = [];
		this.actionHistory = [];
		this._pending = [];
		this.betAmount = 0;
		this.sessionId = browser ? crypto.randomUUID() : 'ssr';
	}

	addChip(value: number) {
		this.betAmount = Math.min(this.betAmount + value, settings.maxBet, this.bankroll);
	}

	clearBet() {
		this.betAmount = 0;
	}

	addFunds(amount: number) {
		this.bankroll += amount;
		this._persistBankroll();
	}

	get allowedActions(): Action[] {
		if (this.state.phase !== 'player' || this.state.playerHands.length === 0) return [];
		const activeHand = this.state.playerHands[this.state.activeHandIndex];
		if (!activeHand) return [];
		const splitCount = this.state.playerHands.length - 1;
		return allowedActions(activeHand, this.state.dealerHand.cards[0], this.state.rules, splitCount);
	}

	get correctAction(): Action | null {
		if (this.state.phase !== 'player' || this.state.playerHands.length === 0) return null;
		const activeHand = this.state.playerHands[this.state.activeHandIndex];
		if (!activeHand) return null;
		return getCorrectAction(activeHand, this.state.dealerHand.cards[0], this.state.shoe, this.state.rules);
	}

	get baseAction(): Action | null {
		if (this.state.phase !== 'player' || this.state.playerHands.length === 0) return null;
		const activeHand = this.state.playerHands[this.state.activeHandIndex];
		if (!activeHand) return null;
		return getBaseAction(activeHand, this.state.dealerHand.cards[0], this.state.shoe, this.state.rules);
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
		this._applyResolution(results);
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
			this._applyResolution(results);
		}
	}
}

export const game = new GameStore();
export { ACTION_PAST, ACTION_INF };
