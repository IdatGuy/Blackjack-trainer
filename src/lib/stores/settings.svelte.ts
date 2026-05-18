import { browser } from '$app/environment';

const SPEEDS = [0, 80, 160, 250, 400, 600];

class SettingsStore {
	animationSpeed = $state(3); // 0=instant, 1–5
	showFeedback = $state(true);
	bettingEnabled = $state(true);
	countDisplay = $state<'off' | 'running' | 'true' | 'both'>('off');
	showDeviationHints = $state(false);

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

	private persist() {
		if (browser) {
			localStorage.setItem(
				'bj-settings',
				JSON.stringify({
					animationSpeed: this.animationSpeed,
					showFeedback: this.showFeedback,
					bettingEnabled: this.bettingEnabled,
					countDisplay: this.countDisplay,
					showDeviationHints: this.showDeviationHints
				})
			);
		}
	}
}

export const settings = new SettingsStore();
