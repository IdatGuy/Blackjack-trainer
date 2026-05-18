<script lang="ts">
	import type { HandResult } from '$lib/engine/game.js';
	import { game } from '$lib/stores/game.svelte.js';
	import { settings } from '$lib/stores/settings.svelte.js';

	const OUTCOME_STYLES: Record<HandResult, string> = {
		win: 'bg-green-500 text-white',
		blackjack: 'bg-yellow-400 text-gray-900',
		push: 'bg-gray-400 text-gray-900',
		loss: 'bg-red-600 text-white',
		surrender: 'bg-gray-500 text-white'
	};

	const OUTCOME_LABEL: Record<HandResult, string> = {
		win: 'WIN',
		blackjack: 'BLACKJACK',
		push: 'PUSH',
		loss: 'LOSS',
		surrender: 'SURRENDER'
	};

	function chipLabel(chips: number): string {
		if (chips === 0) return '';
		return chips > 0 ? ` +$${chips}` : ` -$${Math.abs(chips)}`;
	}

	const wrongActions = $derived(game.actionHistory.filter((r) => !r.correct));
	const allCorrect = $derived(game.actionHistory.length > 0 && wrongActions.length === 0);
</script>

{#if game.state.phase === 'resolution' && game.lastResults.length > 0}
	<div class="flex flex-col items-center gap-3">
		{#each game.lastResults as result}
			<div
				class="rounded-xl px-6 py-2 text-center text-xl font-bold shadow-lg {OUTCOME_STYLES[result.result]}"
			>
				{OUTCOME_LABEL[result.result]}{settings.bettingEnabled ? chipLabel(result.netChips) : ''}
			</div>
		{/each}

		{#if game.showFeedback}
			<div class="w-full rounded-lg bg-black/30 px-4 py-3 text-center text-sm">
				{#if allCorrect}
					<span class="font-semibold text-green-300">Perfect play ✓</span>
				{:else}
					<div class="flex flex-col gap-1">
						{#each wrongActions as record}
							<span class="text-red-300">{game.feedbackFor(record)}</span>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}
