import { browser } from '$app/environment';

const SPEEDS = [0, 80, 160, 250, 400, 600];

export const MIN_BET_OPTIONS = [5, 10, 25, 50] as const;
export const MAX_BET_OPTIONS = [100, 250, 500, 1000, 2000] as const;

export type MinBetOption = (typeof MIN_BET_OPTIONS)[number];
export type MaxBetOption = (typeof MAX_BET_OPTIONS)[number];

class SettingsStore {
	animationSpeed = $state(3); // 0=instant, 1–5
	showFeedback = $state(true);
	bettingEnabled = $state(true);
	countDisplay = $state<'off' | 'running' | 'true' | 'both'>('both');
	showHintButton = $state(false);
	highlightActiveDeviations = $state(true);
	showHandTotal = $state(false);
	deckCount = $state<1 | 2 | 4 | 6 | 8>(6);
	dealerHitsSoft17 = $state(false);
	doubleAfterSplit = $state(true);
	resplitAces = $state(false);
	surrender = $state<'none' | 'late' | 'early'>('late');
	peek = $state(true);
	blackjackPays = $state<'3:2' | '6:5'>('3:2');
	minBet = $state<MinBetOption>(10);
	maxBet = $state<MaxBetOption>(1000);
	spotCount = $state<1 | 2 | 3>(1);

	constructor() {
		if (browser) {
			const raw = localStorage.getItem('bj-settings');
			if (raw) {
				try {
					const data = JSON.parse(raw);
					if (typeof data.animationSpeed === 'number') this.animationSpeed = data.animationSpeed;
					if (typeof data.showFeedback === 'boolean') this.showFeedback = data.showFeedback;
					if (typeof data.bettingEnabled === 'boolean') this.bettingEnabled = data.bettingEnabled;
					if (['off', 'running', 'true', 'both'].includes(data.countDisplay)) {
						this.countDisplay = data.countDisplay;
					}
					const hintBtn = data.showHintButton ?? data.showDeviationHints;
					if (typeof hintBtn === 'boolean') this.showHintButton = hintBtn;
					if (typeof data.highlightActiveDeviations === 'boolean') {
						this.highlightActiveDeviations = data.highlightActiveDeviations;
					}
					if (typeof data.showHandTotal === 'boolean') {
						this.showHandTotal = data.showHandTotal;
					}
					if ([1, 2, 4, 6, 8].includes(data.deckCount)) {
						this.deckCount = data.deckCount;
					}
					if (typeof data.dealerHitsSoft17 === 'boolean') this.dealerHitsSoft17 = data.dealerHitsSoft17;
					if (typeof data.doubleAfterSplit === 'boolean') this.doubleAfterSplit = data.doubleAfterSplit;
					if (typeof data.resplitAces === 'boolean') this.resplitAces = data.resplitAces;
					if (['none', 'late', 'early'].includes(data.surrender)) this.surrender = data.surrender;
					if (typeof data.peek === 'boolean') this.peek = data.peek;
					if (['3:2', '6:5'].includes(data.blackjackPays)) this.blackjackPays = data.blackjackPays;
					if ((MIN_BET_OPTIONS as readonly number[]).includes(data.minBet)) {
						this.minBet = data.minBet;
					}
					if ((MAX_BET_OPTIONS as readonly number[]).includes(data.maxBet)) {
						this.maxBet = data.maxBet;
					}
					if ([1, 2, 3].includes(data.spotCount)) {
						this.spotCount = data.spotCount;
					}
				} catch {
					/* ignore malformed */
				}
			}
		}
	}

	get animDuration(): number {
		return SPEEDS[this.animationSpeed] ?? 0;
	}

	setAnimationSpeed(v: number) {
		this.animationSpeed = Math.max(0, Math.min(5, Math.round(v)));
		this.persist();
	}

	setShowFeedback(v: boolean) {
		this.showFeedback = v;
		this.persist();
	}

	setBettingEnabled(v: boolean) {
		this.bettingEnabled = v;
		this.persist();
	}

	setCountDisplay(v: 'off' | 'running' | 'true' | 'both') {
		this.countDisplay = v;
		this.persist();
	}

	setShowHintButton(v: boolean) {
		this.showHintButton = v;
		this.persist();
	}

	setHighlightActiveDeviations(v: boolean) {
		this.highlightActiveDeviations = v;
		this.persist();
	}

	setShowHandTotal(v: boolean) {
		this.showHandTotal = v;
		this.persist();
	}

	setDeckCount(v: 1 | 2 | 4 | 6 | 8) {
		this.deckCount = v;
		this.persist();
	}

	setDealerHitsSoft17(v: boolean) {
		this.dealerHitsSoft17 = v;
		this.persist();
	}

	setDoubleAfterSplit(v: boolean) {
		this.doubleAfterSplit = v;
		this.persist();
	}

	setResplitAces(v: boolean) {
		this.resplitAces = v;
		this.persist();
	}

	setSurrender(v: 'none' | 'late' | 'early') {
		this.surrender = v;
		this.persist();
	}

	setPeek(v: boolean) {
		this.peek = v;
		this.persist();
	}

	setBlackjackPays(v: '3:2' | '6:5') {
		this.blackjackPays = v;
		this.persist();
	}

	setMinBet(v: MinBetOption) {
		this.minBet = v;
		if (this.maxBet <= v) this.maxBet = MAX_BET_OPTIONS.find((o) => o > v) ?? MAX_BET_OPTIONS[MAX_BET_OPTIONS.length - 1];
		this.persist();
	}

	setMaxBet(v: MaxBetOption) {
		this.maxBet = v;
		if (this.minBet >= v) this.minBet = MIN_BET_OPTIONS.slice().reverse().find((o) => o < v) ?? MIN_BET_OPTIONS[0];
		this.persist();
	}

	setSpotCount(v: 1 | 2 | 3) {
		this.spotCount = v;
		this.persist();
	}

	private persist() {
		if (browser) {
			localStorage.setItem(
				'bj-settings',
				JSON.stringify({
					animationSpeed: this.animationSpeed,
					showFeedback: this.showFeedback,
					bettingEnabled: this.bettingEnabled,
					countDisplay: this.countDisplay,
					showHintButton: this.showHintButton,
					highlightActiveDeviations: this.highlightActiveDeviations,
					showHandTotal: this.showHandTotal,
					deckCount: this.deckCount,
					dealerHitsSoft17: this.dealerHitsSoft17,
					doubleAfterSplit: this.doubleAfterSplit,
					resplitAces: this.resplitAces,
					surrender: this.surrender,
					peek: this.peek,
					blackjackPays: this.blackjackPays,
					minBet: this.minBet,
					maxBet: this.maxBet,
					spotCount: this.spotCount
				})
			);
		}
	}
}

export const settings = new SettingsStore();
