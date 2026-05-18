import { browser } from '$app/environment';

const SPEEDS = [0, 80, 160, 250, 400, 600];

class SettingsStore {
	animationSpeed = $state(3); // 0=instant, 1–5
	showFeedback = $state(true);

	constructor() {
		if (browser) {
			const raw = localStorage.getItem('bj-settings');
			if (raw) {
				try {
					const data = JSON.parse(raw);
					if (typeof data.animationSpeed === 'number') this.animationSpeed = data.animationSpeed;
					if (typeof data.showFeedback === 'boolean') this.showFeedback = data.showFeedback;
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

	private persist() {
		if (browser) {
			localStorage.setItem(
				'bj-settings',
				JSON.stringify({ animationSpeed: this.animationSpeed, showFeedback: this.showFeedback })
			);
		}
	}
}

export const settings = new SettingsStore();
