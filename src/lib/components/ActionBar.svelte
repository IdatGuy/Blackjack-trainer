<script lang="ts">
	import type { Action } from '$lib/engine/rules.js';
	import { game } from '$lib/stores/game.svelte.js';

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
</script>

<div class="flex justify-center gap-3">
	{#each visible as action}
		<button
			class="min-w-[76px] rounded-lg px-4 py-3 text-sm font-bold text-white shadow transition-colors {STYLES[action]}"
			onclick={() => game.act(action)}
		>
			{LABELS[action]}
		</button>
	{/each}
</div>
