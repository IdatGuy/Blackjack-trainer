<script lang="ts">
	import type { HandResult } from '$lib/engine/game.js';
	import { game } from '$lib/stores/game.svelte.js';
	import { settings } from '$lib/stores/settings.svelte.js';

	const OUTCOME_TEXT: Record<HandResult, string> = {
		win: 'You Win',
		blackjack: 'Blackjack!',
		push: 'Push',
		loss: 'You Lose',
		surrender: 'Surrendered'
	};

	const OUTCOME_COLOR: Record<HandResult, string> = {
		win: 'text-white',
		blackjack: 'text-white',
		push: 'text-white',
		loss: 'text-white',
		surrender: 'text-white'
	};

	const wrongActions = $derived(game.actionHistory.filter((r) => !r.correct));
	const allCorrect = $derived(game.actionHistory.length > 0 && wrongActions.length === 0);
</script>

{#if game.state.phase === 'resolution' && game.lastResults.length > 0}
	<div class="flex flex-col items-center gap-3">
		<div class="flex items-center gap-3">
			{#each game.lastResults as result, i}
				{#if i > 0}<span class="text-gray-600">·</span>{/if}
				<span class="text-2xl font-bold {OUTCOME_COLOR[result.result]}">
					{OUTCOME_TEXT[result.result]}
				</span>
			{/each}
		</div>

		{#if game.showFeedback && game.actionHistory.length > 0}
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
