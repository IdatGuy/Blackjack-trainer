export interface SettingsPreset {
	id: string;
	label: string;
	description: string;
	settings: {
		showFeedback: boolean;
		bettingEnabled: boolean;
		showHandTotal: boolean;
		showHintButton: boolean;
		showStrategyChart: boolean;
		countingEnabled: boolean;
		countDisplay: { rc: boolean; tc: boolean; div: boolean };
		highlightActiveDeviations: boolean;
		countPopupEnabled: boolean;
		countPopupFrequency: number;
		countPopupWindow: number;
		weaknessWeighting: boolean;
		animationSpeed: number;
	};
}

export const PRESETS: SettingsPreset[] = [
	{
		id: 'beginner',
		label: 'Beginner',
		description: 'All training aids on. Learn basic strategy at your own pace.',
		settings: {
			showFeedback: true,
			bettingEnabled: false,
			showHandTotal: true,
			showHintButton: true,
			showStrategyChart: true,
			countingEnabled: false,
			countDisplay: { rc: false, tc: false, div: false },
			highlightActiveDeviations: false,
			countPopupEnabled: false,
			countPopupFrequency: 5,
			countPopupWindow: 2,
			weaknessWeighting: false,
			animationSpeed: 3
		}
	},
	{
		id: 'basic-strategy',
		label: 'Basic Strategy',
		description: 'Feedback on, no hints. Practice decisions without counting.',
		settings: {
			showFeedback: true,
			bettingEnabled: true,
			showHandTotal: false,
			showHintButton: false,
			showStrategyChart: true,
			countingEnabled: false,
			countDisplay: { rc: false, tc: false, div: false },
			highlightActiveDeviations: false,
			countPopupEnabled: false,
			countPopupFrequency: 5,
			countPopupWindow: 2,
			weaknessWeighting: false,
			animationSpeed: 3
		}
	},
	{
		id: 'card-counter',
		label: 'Card Counter',
		description: 'Count display, deviations, and count challenges enabled.',
		settings: {
			showFeedback: true,
			bettingEnabled: true,
			showHandTotal: false,
			showHintButton: false,
			showStrategyChart: true,
			countingEnabled: true,
			countDisplay: { rc: true, tc: true, div: false },
			highlightActiveDeviations: true,
			countPopupEnabled: true,
			countPopupFrequency: 5,
			countPopupWindow: 2,
			weaknessWeighting: false,
			animationSpeed: 3
		}
	},
	{
		id: 'advanced',
		label: 'Advanced',
		description: 'No feedback or aids. Full simulation with no assists.',
		settings: {
			showFeedback: false,
			bettingEnabled: true,
			showHandTotal: false,
			showHintButton: false,
			showStrategyChart: false,
			countingEnabled: true,
			countDisplay: { rc: false, tc: false, div: false },
			highlightActiveDeviations: false,
			countPopupEnabled: false,
			countPopupFrequency: 5,
			countPopupWindow: 2,
			weaknessWeighting: false,
			animationSpeed: 2
		}
	}
];
