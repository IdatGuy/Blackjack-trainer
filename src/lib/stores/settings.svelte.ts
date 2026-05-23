import { browser } from '$app/environment';
import { DEFAULT_DRILL_FILTER, PAIR_RANKS, type DrillFilter } from '$lib/engine/synthesizer.js';
import type { Rank } from '$lib/engine/card.js';

export type { DrillFilter };

const SPEEDS = [0, 80, 160, 250, 400, 600];

export const MIN_BET_OPTIONS = [5, 10, 25, 50] as const;
export const MAX_BET_OPTIONS = [100, 250, 500, 1000, 2000] as const;

export type MinBetOption = (typeof MIN_BET_OPTIONS)[number];
export type MaxBetOption = (typeof MAX_BET_OPTIONS)[number];

class SettingsStore {
	animationSpeed = $state(3); // 0=instant, 1–5
	showFeedback = $state(true);
	bettingEnabled = $state(true);
	countingEnabled = $state(true);
	countDisplay = $state<'off' | 'running' | 'true' | 'both'>('off');
	showHintButton = $state(false);
	showStrategyChart = $state(true);
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
	weaknessWeighting = $state(false);
	drillFilter = $state<DrillFilter>({ ...DEFAULT_DRILL_FILTER, pairRanks: [...PAIR_RANKS] });
	countPopupEnabled = $state(true);
	countPopupFrequency = $state(5);
	countPopupWindow = $state(2);

	constructor() {
		if (browser) {
			const raw = localStorage.getItem('bj-settings');
			if (raw) {
				try {
					const data = JSON.parse(raw);
					if (typeof data.animationSpeed === 'number') this.animationSpeed = data.animationSpeed;
					if (typeof data.showFeedback === 'boolean') this.showFeedback = data.showFeedback;
					if (typeof data.bettingEnabled === 'boolean') this.bettingEnabled = data.bettingEnabled;
					if (typeof data.countingEnabled === 'boolean') this.countingEnabled = data.countingEnabled;
					if (['off', 'running', 'true', 'both'].includes(data.countDisplay)) {
						this.countDisplay = data.countDisplay;
					}
					const hintBtn = data.showHintButton ?? data.showDeviationHints;
					if (typeof hintBtn === 'boolean') this.showHintButton = hintBtn;
						if (typeof data.showStrategyChart === 'boolean') this.showStrategyChart = data.showStrategyChart;
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
					if (typeof data.weaknessWeighting === 'boolean') {
						this.weaknessWeighting = data.weaknessWeighting;
					}
					if (data.drillFilter && typeof data.drillFilter === 'object') {
						const f = data.drillFilter;
						const VALID_TYPES = ['hard', 'soft', 'pair'] as const;
						let handTypes: Array<'hard' | 'soft' | 'pair'>;
						if (Array.isArray(f.handTypes)) {
							const filtered = (f.handTypes as unknown[]).filter(
								(t): t is 'hard' | 'soft' | 'pair' => VALID_TYPES.includes(t as 'hard' | 'soft' | 'pair')
							);
							handTypes = filtered.length > 0 ? filtered : [...DEFAULT_DRILL_FILTER.handTypes];
						} else if (['all', 'hard', 'soft', 'pair'].includes(f.handType)) {
							// migrate old single-select format
							handTypes = f.handType === 'all' ? [...VALID_TYPES] : [f.handType as 'hard' | 'soft' | 'pair'];
						} else {
							handTypes = [...DEFAULT_DRILL_FILTER.handTypes];
						}
						this.drillFilter = {
							handTypes,
							hardMin: typeof f.hardMin === 'number' ? f.hardMin : DEFAULT_DRILL_FILTER.hardMin,
							hardMax: typeof f.hardMax === 'number' ? f.hardMax : DEFAULT_DRILL_FILTER.hardMax,
							softMin: typeof f.softMin === 'number' ? f.softMin : DEFAULT_DRILL_FILTER.softMin,
							softMax: typeof f.softMax === 'number' ? f.softMax : DEFAULT_DRILL_FILTER.softMax,
							pairRanks: Array.isArray(f.pairRanks) ? (f.pairRanks as Rank[]).filter(r => PAIR_RANKS.includes(r)) : [...PAIR_RANKS]
						};
					}
					if (typeof data.countPopupEnabled === 'boolean') this.countPopupEnabled = data.countPopupEnabled;
					if (typeof data.countPopupFrequency === 'number' && data.countPopupFrequency >= 1) {
						this.countPopupFrequency = Math.min(20, data.countPopupFrequency);
					}
					if (typeof data.countPopupWindow === 'number' && data.countPopupWindow >= 0) {
						this.countPopupWindow = Math.min(5, data.countPopupWindow);
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

	setCountingEnabled(v: boolean) {
		this.countingEnabled = v;
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

	setShowStrategyChart(v: boolean) {
		this.showStrategyChart = v;
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

	setWeaknessWeighting(v: boolean) {
		this.weaknessWeighting = v;
		this.persist();
	}

	setDrillFilter(partial: Partial<DrillFilter>) {
		this.drillFilter = { ...this.drillFilter, ...partial };
		this.persist();
	}

	setCountPopupEnabled(v: boolean) {
		this.countPopupEnabled = v;
		this.persist();
	}

	setCountPopupFrequency(v: number) {
		this.countPopupFrequency = Math.max(1, Math.min(20, Math.round(v)));
		this.persist();
	}

	setCountPopupWindow(v: number) {
		this.countPopupWindow = Math.max(0, Math.min(5, Math.round(v)));
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
					countingEnabled: this.countingEnabled,
					countDisplay: this.countDisplay,
					showHintButton: this.showHintButton,
					showStrategyChart: this.showStrategyChart,
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
					spotCount: this.spotCount,
					weaknessWeighting: this.weaknessWeighting,
					drillFilter: this.drillFilter,
					countPopupEnabled: this.countPopupEnabled,
					countPopupFrequency: this.countPopupFrequency,
					countPopupWindow: this.countPopupWindow
				})
			);
		}
	}
}

export const settings = new SettingsStore();
