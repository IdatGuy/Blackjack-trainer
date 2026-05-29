import { browser } from '$app/environment';
import { DEFAULT_DRILL_FILTER, HARD_TOTALS, PAIR_RANKS, SOFT_TOTALS, type DrillFilter } from '$lib/engine/synthesizer.js';
import type { Rank } from '$lib/engine/card.js';
import type { SettingsPreset } from '$lib/presets.js';
import type { BetRamp } from '$lib/engine/betRamp.js';

export type { DrillFilter };

const SPEEDS = [0, 160, 400, 600, 900, 1300, 1800, 2400, 3200];

export const MIN_BET_OPTIONS = [5, 10, 25, 50] as const;
export const MAX_BET_OPTIONS = [100, 250, 500, 1000, 2000] as const;

export type MinBetOption = (typeof MIN_BET_OPTIONS)[number];
export type MaxBetOption = (typeof MAX_BET_OPTIONS)[number];

class SettingsStore {
	animationSpeed = $state(3); // 0=instant, 1–5
	showFeedback = $state(true);
	bettingEnabled = $state(true);
	countingEnabled = $state(true);
	countDisplay = $state<{ rc: boolean; tc: boolean; div: boolean }>({ rc: false, tc: false, div: false });
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
	betRampEnabled = $state(false);
	betRamp = $state<BetRamp | null>(null);
	autoPlayEnabled = $state(false);
	autoPlaySpeed = $state(2); // 0=instant, 1–5

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
					const legacyMap: Record<string, { rc: boolean; tc: boolean; div: boolean }> = {
						off:     { rc: false, tc: false, div: false },
						running: { rc: true,  tc: false, div: false },
						true:    { rc: false, tc: true,  div: false },
						both:    { rc: true,  tc: true,  div: false },
					};
					if (typeof data.countDisplay === 'string' && legacyMap[data.countDisplay]) {
						this.countDisplay = legacyMap[data.countDisplay];
					} else if (data.countDisplay && typeof data.countDisplay === 'object') {
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
						// Migrate old min/max format to explicit arrays
							let hardTotals: number[];
							if (Array.isArray(f.hardTotals)) {
								hardTotals = (f.hardTotals as unknown[]).filter((n): n is number => HARD_TOTALS.includes(n as number));
								if (hardTotals.length === 0) hardTotals = [...HARD_TOTALS];
							} else if (typeof f.hardMin === 'number' && typeof f.hardMax === 'number') {
								hardTotals = HARD_TOTALS.filter(n => n >= f.hardMin && n <= f.hardMax);
							} else {
								hardTotals = [...HARD_TOTALS];
							}
							let softTotals: number[];
							if (Array.isArray(f.softTotals)) {
								softTotals = (f.softTotals as unknown[]).filter((n): n is number => SOFT_TOTALS.includes(n as number));
								if (softTotals.length === 0) softTotals = [...SOFT_TOTALS];
							} else if (typeof f.softMin === 'number' && typeof f.softMax === 'number') {
								softTotals = SOFT_TOTALS.filter(n => n >= f.softMin && n <= f.softMax);
							} else {
								softTotals = [...SOFT_TOTALS];
							}
							this.drillFilter = {
								handTypes,
								hardTotals,
								softTotals,
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
					if (typeof data.betRampEnabled === 'boolean') {
						this.betRampEnabled = data.betRampEnabled;
					}
					if (data.betRamp && typeof data.betRamp === 'object') {
						this.betRamp = data.betRamp as BetRamp;
					}
					if (typeof data.autoPlayEnabled === 'boolean') this.autoPlayEnabled = data.autoPlayEnabled;
					if (typeof data.autoPlaySpeed === 'number') {
						this.autoPlaySpeed = Math.max(0, Math.min(8, Math.round(data.autoPlaySpeed)));
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

	get autoPlayDuration(): number {
		return SPEEDS[this.autoPlaySpeed] ?? 0;
	}

	setAnimationSpeed(v: number) {
		this.animationSpeed = Math.max(0, Math.min(8, Math.round(v)));
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
		if (!v) this.betRampEnabled = false;
		this.persist();
	}

	toggleCountDisplay(key: 'rc' | 'tc' | 'div') {
		this.countDisplay = { ...this.countDisplay, [key]: !this.countDisplay[key] };
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

	toggleHardTotal(total: number) {
		const cur = this.drillFilter.hardTotals;
		const next = cur.includes(total) ? cur.filter(n => n !== total) : [...cur, total];
		if (next.length > 0) this.setDrillFilter({ hardTotals: next });
	}

	toggleSoftTotal(total: number) {
		const cur = this.drillFilter.softTotals;
		const next = cur.includes(total) ? cur.filter(n => n !== total) : [...cur, total];
		if (next.length > 0) this.setDrillFilter({ softTotals: next });
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

	setBetRampEnabled(v: boolean) {
		this.betRampEnabled = v;
		this.persist();
	}

	setBetRamp(ramp: BetRamp) {
		this.betRamp = ramp;
		this.persist();
	}

	setAutoPlayEnabled(v: boolean) {
		this.autoPlayEnabled = v;
		this.persist();
	}

	setAutoPlaySpeed(v: number) {
		this.autoPlaySpeed = Math.max(0, Math.min(8, Math.round(v)));
		this.persist();
	}

	applyPreset(preset: SettingsPreset) {
		const s = preset.settings;
		this.showFeedback = s.showFeedback;
		this.bettingEnabled = s.bettingEnabled;
		this.showHandTotal = s.showHandTotal;
		this.showHintButton = s.showHintButton;
		this.showStrategyChart = s.showStrategyChart;
		this.countingEnabled = s.countingEnabled;
		this.countDisplay = s.countDisplay;
		this.highlightActiveDeviations = s.highlightActiveDeviations;
		this.countPopupEnabled = s.countPopupEnabled;
		this.countPopupFrequency = s.countPopupFrequency;
		this.countPopupWindow = s.countPopupWindow;
		this.weaknessWeighting = s.weaknessWeighting;
		this.animationSpeed = s.animationSpeed;
		this.betRampEnabled = s.betRampEnabled;
		this.autoPlayEnabled = s.autoPlayEnabled;
		this.autoPlaySpeed = s.autoPlaySpeed;
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
					countPopupWindow: this.countPopupWindow,
					betRampEnabled: this.betRampEnabled,
					betRamp: this.betRamp,
					autoPlayEnabled: this.autoPlayEnabled,
					autoPlaySpeed: this.autoPlaySpeed
				})
			);
		}
	}
}

export const settings = new SettingsStore();
