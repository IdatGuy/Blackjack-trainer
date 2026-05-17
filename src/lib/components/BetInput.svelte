<script lang="ts">
	import { game } from '$lib/stores/game.svelte.js';
</script>

<div class="flex flex-col items-center gap-3">
	<span class="text-xs font-semibold uppercase tracking-widest text-green-300">Bet</span>
	<div class="flex items-center gap-4">
		<button
			class="flex h-10 w-10 items-center justify-center rounded-full bg-green-700 text-xl font-bold text-white shadow hover:bg-green-600 active:bg-green-800 disabled:opacity-40"
			onclick={() => game.adjustBet(-5)}
			disabled={game.betAmount <= 5}
		>
			−
		</button>
		<span class="w-20 text-center text-2xl font-bold text-white">${game.betAmount}</span>
		<button
			class="flex h-10 w-10 items-center justify-center rounded-full bg-green-700 text-xl font-bold text-white shadow hover:bg-green-600 active:bg-green-800 disabled:opacity-40"
			onclick={() => game.adjustBet(5)}
			disabled={game.betAmount + 5 > game.bankroll}
		>
			+
		</button>
	</div>
	<button
		class="w-full rounded-xl bg-yellow-500 px-8 py-4 text-lg font-bold text-gray-900 shadow-lg hover:bg-yellow-400 active:bg-yellow-600 disabled:opacity-40"
		onclick={() => game.deal()}
		disabled={game.betAmount > game.bankroll}
	>
		Deal
	</button>
</div>
