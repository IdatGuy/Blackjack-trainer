<script lang="ts">
	import { game } from '$lib/stores/game.svelte.js';
	import { settings } from '$lib/stores/settings.svelte.js';

	let { ondeal }: { ondeal: () => void } = $props();

	const CHIPS: { value: number; color: string; label: string }[] = [
		{ value: 5,   color: 'bg-red-600   ring-red-400',    label: '$5'   },
		{ value: 10,  color: 'bg-blue-600  ring-blue-400',   label: '$10'  },
		{ value: 25,  color: 'bg-green-600 ring-green-400',  label: '$25'  },
		{ value: 100, color: 'bg-gray-800  ring-gray-500',   label: '$100' },
		{ value: 500, color: 'bg-purple-700 ring-purple-500', label: '$500' }
	];

	const cap = $derived(Math.min(settings.maxBet, game.bankroll));

	function fmt(n: number) {
		return n >= 1000 ? `$${(n / 1000).toLocaleString()}K` : `$${n}`;
	}
</script>

<div class="flex flex-col items-center gap-3">
	<!-- Chip row -->
	<div class="flex items-center gap-2">
		{#each CHIPS as chip}
			{@const tooSmall = chip.value < settings.minBet && game.betAmount === 0}
			{@const wouldExceed = game.betAmount + chip.value > cap}
			<button
				class="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-lg ring-2 ring-inset transition-opacity {chip.color}"
				disabled={wouldExceed || tooSmall}
				onclick={() => game.addChip(chip.value)}
			>
				<!-- Inner ring detail -->
				<span class="pointer-events-none absolute inset-[5px] rounded-full ring-1 ring-white/30"></span>
				{chip.label}
			</button>
		{/each}
	</div>

	<!-- Current bet display -->
	<span class="text-2xl font-bold text-white">${game.betAmount}</span>

	<!-- Table limits -->
	<p class="text-[11px] text-gray-500">Table min {fmt(settings.minBet)} · max {fmt(settings.maxBet)}</p>

	<!-- Action buttons -->
	<div class="flex w-full gap-3">
		<button
			class="flex-1 rounded-xl bg-gray-600 py-3 text-sm font-bold text-white shadow hover:bg-gray-500 active:bg-gray-700 disabled:opacity-40"
			disabled={game.betAmount === 0}
			onclick={() => game.clearBet()}
		>
			Clear
		</button>
		<button
			class="flex-1 rounded-xl bg-yellow-500 py-3 text-sm font-bold text-gray-900 shadow-lg hover:bg-yellow-400 active:bg-yellow-600 disabled:opacity-40"
			disabled={game.betAmount < settings.minBet}
			onclick={() => ondeal()}
		>
			Deal
		</button>
	</div>
</div>
