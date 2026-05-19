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
	showDeviationHints = $state(false);
	showHandTotal = $state(false);
	deckCount = $state<1 | 2 | 4 | 6 | 8>(6);
	minBet = $state<MinBetOption>(10);
	maxBet = $state<MaxBetOption>(1000);

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
					if (typeof data.showDeviationHints === 'boolean') {
						this.showDeviationHints = data.showDeviationHints;
					}
					if (typeof data.showHandTotal === 'boolean') {
						this.showHandTotal = data.showHandTotal;
					}
					if ([1, 2, 4, 6, 8].includes(data.deckCount)) {
						this.deckCount = data.deckCount;
					}
					if ((MIN_BET_OPTIONS as readonly number[]).includes(data.minBet)) {
						this.minBet = data.minBet;
					}
					if ((MAX_BET_OPTIONS as readonly number[]).includes(data.maxBet)) {
						this.maxBet = data.maxBet;
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

	setShowDeviationHints(v: boolean) {
		this.showDeviationHints = v;
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

	private persist() {
		if (browser) {
			localStorage.setItem(
				'bj-settings',
				JSON.stringify({
					animationSpeed: this.animationSpeed,
					showFeedback: this.showFeedback,
					bettingEnabled: this.bettingEnabled,
					countDisplay: this.countDisplay,
					showDeviationHints: this.showDeviationHints,
					showHandTotal: this.showHandTotal,
					deckCount: this.deckCount,
					minBet: this.minBet,
					maxBet: this.maxBet
				})
			);
		}
	}
}

export const settings = new SettingsStore();
