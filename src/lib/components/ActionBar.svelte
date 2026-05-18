<script lang="ts">
	import type { Action } from '$lib/engine/rules.js';
	import { game } from '$lib/stores/game.svelte.js';
	import { settings } from '$lib/stores/settings.svelte.js';

	const allowed = $derived(game.allowedActions);

	const LABELS: Record<Action, string> = {
		H: 'Hit',
		S: 'Stand',
		D: 'Double',
		P: 'Split',
		R: 'Surrender'
	};

	const STYLES: Record<Action, string> = {
		H: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700',
		S: 'bg-red-700 hover:bg-red-600 active:bg-red-800',
		D: 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700',
		P: 'bg-purple-600 hover:bg-purple-500 active:bg-purple-700',
		R: 'bg-gray-600 hover:bg-gray-500 active:bg-gray-700'
	};

	// ordered display sequence
	const ORDER: Action[] = ['H', 'S', 'D', 'P', 'R'];
	const visible = $derived(ORDER.filter((a) => allowed.includes(a)));
	const topRow = $derived(visible.slice(0, 3));
	const bottomRow = $derived(visible.slice(3));

	const deviationAction = $derived(
		settings.showDeviationHints && game.correctAction !== game.baseAction
			? game.correctAction
			: null
	);
</script>

<div class="flex w-full flex-col gap-2">
	<div class="flex gap-2">
		{#each topRow as action}
			<button
				class="flex-1 rounded-lg px-4 py-3 text-sm font-bold text-white shadow transition-colors {STYLES[action]}
					{deviationAction === action ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-gray-950' : ''}"
				onclick={() => game.act(action)}
			>
				{LABELS[action]}
			</button>
		{/each}
	</div>
	{#if bottomRow.length > 0}
		<div class="flex justify-center gap-2">
			{#each bottomRow as action}
				<button
					class="w-1/3 rounded-lg px-4 py-3 text-sm font-bold text-white shadow transition-colors {STYLES[action]}
						{deviationAction === action ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-gray-950' : ''}"
					onclick={() => game.act(action)}
				>
					{LABELS[action]}
				</button>
			{/each}
		</div>
	{/if}
</div>
