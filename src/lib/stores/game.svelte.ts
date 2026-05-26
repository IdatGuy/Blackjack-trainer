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
import type { Card } from '$lib/engine/card.js';
import { allowedActions, dealerShouldHit, type Action } from '$lib/engine/rules.js';
import { buildShoe, dealCard, resetShoe, shouldReshuffle, trueCount, type Shoe } from '$lib/engine/shoe.js';
import { getBaseAction, getChartForRules, getCorrectAction, getInsuranceAction } from '$lib/engine/strategy.js';
import {
	buildDealerCard,
	buildPlayerCards,
	sampleWeightedCell
} from '$lib/engine/synthesizer.js';
import { getWeaknessWeights } from '$lib/db/accuracy.js';
import { untrack } from 'svelte';
import { browser } from '$app/environment';
import { saveDecisions } from '$lib/db/persist.js';
import type { DecisionRecord } from '$lib/db/schema.js';
import { settings } from './settings.svelte.js';

export type ActionRecord = {
	expected: Action;
	actual: Action;
	correct: boolean;
	handDesc: string; // e.g. "hard 16 vs 10"
	handIndex: number;
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
	get rules() { return this.state.rules; }
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
	synthesizedTC = $state<number | null>(null);
	_weaknessWeights = $state(new Map<string, number>());
	_regularShoeBackup: Shoe | null = null;

	effectiveTC(): number | undefined {
		if (!settings.countingEnabled) return undefined;
		return this.synthesizedTC !== null ? this.synthesizedTC : trueCount(this.state.shoe);
	}

	constructor() {
		if (browser) {
			this._prefetchWeights();
			$effect.root(() => {
				$effect(() => {
					const isDrill = settings.weaknessWeighting;
					untrack(() => this._syncDrillMode());
				});
			});
			const savedShoe = this._loadShoe();
			if (savedShoe) {
				this.state = { ...this.state, shoe: savedShoe };
			}
		}
	}

	_syncDrillMode() {
		if (settings.weaknessWeighting && this._regularShoeBackup === null) {
			this._regularShoeBackup = this.state.shoe;
			this.state = { ...this.state, shoe: buildShoe(settings.deckCount) };
			this._persistShoe();
		} else if (!settings.weaknessWeighting && this._regularShoeBackup !== null) {
			this.state = { ...this.state, shoe: this._regularShoeBackup };
			this._regularShoeBackup = null;
			this._persistShoe();
		}
	}

	_persistShoe() {
		if (!browser) return;
		const shoe = (settings.weaknessWeighting && this._regularShoeBackup)
			? this._regularShoeBackup
			: this.state.shoe;
		sessionStorage.setItem('bj-shoe', JSON.stringify({
			cards: shoe.cards,
			decks: shoe.decks,
			runningCount: shoe.runningCount
		}));
	}

	_loadShoe(): Shoe | null {
		if (!browser) return null;
		const raw = sessionStorage.getItem('bj-shoe');
		if (!raw) return null;
		try {
			const data = JSON.parse(raw);
			if (data.decks !== settings.deckCount) return null;
			if (!Number.isInteger(data.runningCount)) return null;
			if (!Array.isArray(data.cards)) return null;
			const validRanks = new Set(['A','2','3','4','5','6','7','8','9','T','J','Q','K']);
			const validSuits = new Set(['♠','♥','♦','♣']);
			for (const c of data.cards) {
				if (!validRanks.has(c?.rank) || !validSuits.has(c?.suit)) return null;
			}
			return {
				cards: data.cards as Card[],
				decks: data.decks,
				dealtCards: [],
				runningCount: data.runningCount
			};
		} catch { return null; }
	}

	async _prefetchWeights() {
		this._weaknessWeights = await getWeaknessWeights();
	}

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
		// Push synthetic records for hands with no player decisions logged (e.g. instant dealer BJ)
		const handsWithDecisions = new Set(
			this._pending.filter((pd) => pd.category !== 'insurance').map((pd) => pd.handIndex)
		);
		for (let i = 0; i < results.length; i++) {
			if (!handsWithDecisions.has(i)) {
				const hand = this.state.playerHands[i];
				const dealerUp = this.state.dealerHand.cards[0];
				this._pending.push({
					timestamp: Date.now(),
					sessionId: this.sessionId,
					handId: this.handId,
					handIndex: i,
					ruleSetId: this.state.rules.id,
					mode: 'standard',
					playMode: settings.weaknessWeighting ? 'drill' : 'shoe',
					handType: handType(hand.cards),
					playerTotal: handValue(hand.cards),
					dealerUp: dealerUp.rank,
					trueCount: this.synthesizedTC !== null ? this.synthesizedTC : trueCount(this.state.shoe),
					expected: 'S',
					actual: 'S',
					correct: true,
					hintShown: false,
					category: 'hit-stand',
					betAmount: hand.bet
				});
			}
		}
		const dealerHadBJ = isBlackjack(this.state.dealerHand.cards);
		if (this.insuranceBet > 0) {
			this.insuranceResult = dealerHadBJ ? 'win' : 'loss';
			if (settings.bettingEnabled && !settings.weaknessWeighting && dealerHadBJ) {
				// 2:1 payout; insuranceBet was already deducted, so return bet + profit
				this.bankroll = Math.round((this.bankroll + this.insuranceBet * 3) * 100) / 100;
				this._persistBankroll();
			}
		}
		if (settings.bettingEnabled && !settings.weaknessWeighting) {
			let totalReturn = 0;
			let displayFlash = 0;
			for (const r of results) {
				const returnAmount = r.netChips + r.bet;
				totalReturn += returnAmount;
				if (returnAmount > 0) displayFlash += returnAmount;
			}
			this.bankroll = Math.round((this.bankroll + totalReturn) * 100) / 100;
			this._persistBankroll();
			this._setFlash(displayFlash);
		}
		this._flushDecisions(results);
	}

	private _rulesFromSettings() {
		return {
			dealerHitsSoft17: settings.dealerHitsSoft17,
			doubleAfterSplit: settings.doubleAfterSplit,
			resplitAces: settings.resplitAces,
			surrender: settings.surrender,
			peek: settings.peek,
			blackjackPays: settings.blackjackPays,
		};
	}

	_flushDecisions(results: ResolvedHand[]) {
		if (this._pending.length === 0) return;
		const bankrollTracked = settings.bettingEnabled && !settings.weaknessWeighting;
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
		this._syncDrillMode();
		if (this.betAmount < settings.minBet || this.betAmount * settings.spotCount > this.bankroll) return;
		this.actionHistory = [];
		this.lastResults = [];
		this._pending = [];
		this.insuranceBet = 0;
		this.insuranceResult = null;
		this.state = {
			...this.state,
			rules: { ...this.state.rules, ...this._rulesFromSettings() }
		};
		const now = Date.now();
		this.handId = `${this.sessionId}-${now}`;
		if (browser) {
			const prev = parseInt(localStorage.getItem('bj-hands-dealt') ?? '0', 10);
			localStorage.setItem('bj-hands-dealt', String(prev + 1));
		}
		if (settings.bettingEnabled && !settings.weaknessWeighting) {
			const totalBet = this.betAmount * settings.spotCount;
			this.bankroll = Math.round((this.bankroll - totalBet) * 100) / 100;
			this._persistBankroll();
			this._setFlash(-totalBet);
		}
		if (settings.weaknessWeighting) {
			const chart = getChartForRules(this.state.rules);
			const synthesizedCell = sampleWeightedCell(
				chart,
				this._weaknessWeights,
				settings.drillFilter
			);
			const { handType, playerKey, dealerUp } = synthesizedCell;
			const [p1, p2] = buildPlayerCards(handType, playerKey);
			const dUp = buildDealerCard(dealerUp);
			this.synthesizedTC = settings.countingEnabled ? synthesizedCell.tc : null;
			// Prepend synthesized cards so dealHand picks them in deal order:
			// shoe[0]=p1 (player card 1), shoe[1]=dUp (dealer upcard), shoe[2]=p2 (player card 2)
			let shoeCards = this.state.shoe.cards;
			// Prevent wasted drill reps: 10-value up + ace hole = instant dealer BJ, no player decision.
			// Ace-up hands are kept as-is (insurance decision is still useful practice).
			if (['T', 'J', 'Q', 'K'].includes(dUp.rank) && shoeCards[0]?.rank === 'A') {
				const firstNonAce = shoeCards.findIndex((c) => c.rank !== 'A');
				if (firstNonAce > 0) {
					shoeCards = [...shoeCards];
					[shoeCards[0], shoeCards[firstNonAce]] = [shoeCards[firstNonAce], shoeCards[0]];
				}
			}
			this.state = {
				...this.state,
				shoe: { ...this.state.shoe, cards: [p1, dUp, p2, ...shoeCards] }
			};
		} else {
			this.synthesizedTC = null;
		}
		this.state = dealHand(this.state, Array.from({ length: settings.spotCount }, () => this.betAmount));
		this._maybeAutoFinish();
	}

	_logInsuranceDecision(actual: 'I' | 'N', hintUsed = false) {
		const expected = getInsuranceAction(this.state.shoe, this.effectiveTC());
		const activeHand = this.state.playerHands[0];
		const type = handType(activeHand.cards, true);
		const record: ActionRecord = {
			expected,
			actual,
			correct: expected === actual,
			handDesc: 'insurance vs A',
			handIndex: 0
		};
		this.actionHistory = [...this.actionHistory, record];
		this._pending.push({
			timestamp: Date.now(),
			sessionId: this.sessionId,
			handId: this.handId,
			handIndex: 0,
			ruleSetId: this.state.rules.id,
			mode: 'standard',
			playMode: settings.weaknessWeighting ? 'drill' : 'shoe',
			handType: type,
			playerTotal: handValue(activeHand.cards),
			dealerUp: 'A',
			trueCount: this.synthesizedTC !== null ? this.synthesizedTC : trueCount(this.state.shoe),
			expected,
			actual,
			correct: expected === actual,
			hintShown: hintUsed,
			category: 'insurance',
			betAmount: this.state.playerHands.reduce((sum, h) => sum + h.bet, 0)
		});
	}

	takeInsurance(hintUsed = false) {
		if (this.state.phase !== 'insurance') return;
		const insAmt = Math.floor(this.state.playerHands.reduce((sum, h) => sum + h.bet, 0) / 2);
		this.insuranceBet = insAmt;
		if (settings.bettingEnabled && !settings.weaknessWeighting && insAmt > 0) {
			this.bankroll = Math.round((this.bankroll - insAmt) * 100) / 100;
			this._persistBankroll();
		}
		this._logInsuranceDecision('I', hintUsed);
		this.state = resolveInsurance(this.state);
		this._maybeAutoFinish();
	}

	declineInsurance(hintUsed = false) {
		if (this.state.phase !== 'insurance') return;
		this.insuranceBet = 0;
		this._logInsuranceDecision('N', hintUsed);
		this.state = resolveInsurance(this.state);
		this._maybeAutoFinish();
	}

	get correctInsuranceAction(): 'I' | 'N' {
		return getInsuranceAction(this.state.shoe, this.effectiveTC());
	}

	act(action: Action, hintUsed = false) {
		if (this.state.phase !== 'player') return;
		const activeHand = this.state.playerHands[this.state.activeHandIndex];
		const dealerUp = this.state.dealerHand.cards[0];

		const expected = getCorrectAction(
			activeHand,
			dealerUp,
			this.state.shoe,
			this.state.rules,
			undefined,
			0,
			this.effectiveTC()
		);
		const base = getBaseAction(activeHand, dealerUp, this.state.shoe, this.state.rules);

		const type = handType(activeHand.cards, activeHand.cards.length === 2);
		const key = handKey(activeHand.cards, type);
		const handDesc = `${type} ${key} vs ${rankLabel(dealerUp.rank)}`;

		const record: ActionRecord = {
			expected,
			actual: action,
			correct: expected === action,
			handDesc,
			handIndex: this.state.activeHandIndex
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
			playMode: settings.weaknessWeighting ? 'drill' : 'shoe',
			handType: type,
			playerTotal,
			dealerUp: dealerUp.rank,
			trueCount: this.synthesizedTC !== null ? this.synthesizedTC : trueCount(this.state.shoe),
			expected,
			actual: action,
			correct: expected === action,
			hintShown: hintUsed,
			category,
			betAmount: activeHand.bet
		});

		if (action === 'H') this.state = hit(this.state);
		else if (action === 'S') this.state = stand(this.state);
		else if (action === 'D') {
			this.state = double(this.state);
			if (settings.bettingEnabled && !settings.weaknessWeighting) {
				this.bankroll = Math.round((this.bankroll - activeHand.bet) * 100) / 100;
				this._persistBankroll();
				this._setFlash(-activeHand.bet);
			}
		} else if (action === 'R') this.state = surrender(this.state);
		else if (action === 'P') {
			this.state = split(this.state);
			if (settings.bettingEnabled && !settings.weaknessWeighting) {
				this.bankroll = Math.round((this.bankroll - activeHand.bet) * 100) / 100;
				this._persistBankroll();
				this._setFlash(-activeHand.bet);
			}
		}

		this._maybeAutoFinish();
	}

	nextHand() {
		this._syncDrillMode();
		const autoReshuffle = !settings.weaknessWeighting && shouldReshuffle(this.state.shoe);
		this.state = {
			...this.state,
			shoe: autoReshuffle ? resetShoe(this.state.shoe) : this.state.shoe,
			rules: { ...this.state.rules, ...this._rulesFromSettings() },
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
		this.synthesizedTC = null;
		// betAmount intentionally preserved — defaults to last bet
		if (browser && settings.weaknessWeighting) this._prefetchWeights();
		this._persistShoe();
	}

	reshuffle() {
		this.state = {
			...this.state,
			shoe: buildShoe(settings.deckCount),
			rules: { ...this.state.rules, decks: settings.deckCount, ...this._rulesFromSettings() },
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
		this._persistShoe();
	}

	forfeitAndReshuffle() {
		if (this.state.phase !== 'betting' && this.state.playerHands.length > 0) {
			if (browser && settings.bettingEnabled && !settings.weaknessWeighting) {
				const now = Date.now();
				const dealerUp = this.state.dealerHand.cards[0];
				const forfeited: DecisionRecord[] = this.state.playerHands.map((h, i): DecisionRecord => ({
					timestamp: now,
					sessionId: this.sessionId,
					handId: this.handId,
					handIndex: i,
					ruleSetId: this.state.rules.id,
					mode: 'standard',
					playMode: settings.weaknessWeighting ? 'drill' : 'shoe',
					handType: handType(h.cards),
					playerTotal: handValue(h.cards),
					dealerUp: dealerUp.rank,
					trueCount: trueCount(this.state.shoe),
					expected: 'S',
					actual: 'S',
					correct: true,
					hintShown: false,
					category: 'hit-stand',
					handResult: 'loss',
					betAmount: h.bet,
					outcomeChips: -h.bet,
					bankrollTracked: true
				}));
				saveDecisions(forfeited);
			}
		}
		this._pending = [];
		this.state = {
			...this.state,
			shoe: buildShoe(settings.deckCount),
			rules: { ...this.state.rules, decks: settings.deckCount, ...this._rulesFromSettings() },
			phase: 'betting',
			playerHands: [],
			dealerHand: makeHand([], 0),
			activeHandIndex: 0
		};
		this.lastResults = [];
		this.actionHistory = [];
		this.betAmount = 0;
		this.sessionId = browser ? crypto.randomUUID() : 'ssr';
		this._persistShoe();
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
		const splitCount = activeHand.splitDepth;
		return allowedActions(activeHand, this.state.dealerHand.cards[0], this.state.rules, splitCount);
	}

	get correctAction(): Action | null {
		if (this.state.phase !== 'player' || this.state.playerHands.length === 0) return null;
		const activeHand = this.state.playerHands[this.state.activeHandIndex];
		if (!activeHand) return null;
		return getCorrectAction(
			activeHand,
			this.state.dealerHand.cards[0],
			this.state.shoe,
			this.state.rules,
			undefined,
			0,
			this.effectiveTC()
		);
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

	lastActionFor(handIndex: number): ActionRecord | null {
		const actions = this.actionHistory.filter(r => r.handIndex === handIndex);
		return actions.at(-1) ?? null;
	}

	shortFeedbackFor(record: ActionRecord): string {
		if (record.correct) return '';
		return `Should ${ACTION_INF[record.expected]}`;
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
		if (this.state.phase === 'player') {
			const activeHand = this.state.playerHands[this.state.activeHandIndex];
			// Auto-advance past BJ hands in multi-spot play — push a record so outcome chips are tracked
			if (activeHand && isBlackjack(activeHand.cards)) {
				const dealerUp = this.state.dealerHand.cards[0];
				this._pending.push({
					timestamp: Date.now(),
					sessionId: this.sessionId,
					handId: this.handId,
					handIndex: this.state.activeHandIndex,
					ruleSetId: this.state.rules.id,
					mode: 'standard',
					playMode: settings.weaknessWeighting ? 'drill' : 'shoe',
					handType: handType(activeHand.cards),
					playerTotal: handValue(activeHand.cards),
					dealerUp: dealerUp.rank,
					trueCount: this.synthesizedTC !== null ? this.synthesizedTC : trueCount(this.state.shoe),
					expected: 'S',
					actual: 'S',
					correct: true,
					hintShown: false,
					category: 'hit-stand',
					betAmount: activeHand.bet
				});
				this.state = stand(this.state);
				this._maybeAutoFinish();
				return;
			}
			// Auto-stand split aces: one card only, no further action allowed
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
