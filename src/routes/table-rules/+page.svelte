<script lang="ts">
	import { goto } from '$app/navigation';
	import { game } from '$lib/stores/game.svelte.js';
	import {
		settings,
		MIN_BET_OPTIONS,
		MAX_BET_OPTIONS,
		type MinBetOption,
		type MaxBetOption
	} from '$lib/stores/settings.svelte.js';

	const DECK_OPTIONS = [1, 2, 4, 6, 8] as const;

	function selectDecks(n: 1 | 2 | 4 | 6 | 8) {
		settings.setDeckCount(n);
		game.reshuffle();
	}

	function fmtBet(n: number) {
		return n >= 1000 ? `$${n / 1000}K` : `$${n}`;
	}
</script>

<div class="flex h-full flex-col">
	<header class="flex items-center gap-3 border-b border-gray-800 bg-black/40 px-3 py-2">
		<button
			onclick={() => goto('/')}
			class="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg font-bold text-gray-900 hover:bg-gray-100 active:bg-gray-200"
			aria-label="Back"
		>
			←
		</button>
		<span class="text-base font-semibold text-white">Table Rules</span>
	</header>

	<div class="flex-1 overflow-y-auto px-4 py-4">
		<div class="mb-6">
			<p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Shoe</p>
			<div class="overflow-hidden rounded-xl bg-gray-900 px-4 py-3.5">
				<div class="mb-3 flex items-center justify-between">
					<span class="text-sm font-medium text-gray-100">Decks</span>
					<span class="text-xs text-gray-500">{settings.deckCount * 52} cards</span>
				</div>
				<div class="flex gap-1 rounded-lg bg-gray-800 p-0.5">
					{#each DECK_OPTIONS as n}
						<button
							onclick={() => selectDecks(n)}
							class="flex-1 rounded-md py-1.5 text-sm font-semibold transition-colors
								{settings.deckCount === n
									? 'bg-white text-gray-900'
									: 'text-gray-400 hover:text-gray-200'}"
						>{n}</button>
					{/each}
				</div>
				<p class="mt-2 text-[11px] text-gray-600">Changing decks reshuffles the shoe</p>
			</div>
		</div>

		<div class="mb-6">
			<p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Betting Limits</p>
			<div class="overflow-hidden rounded-xl bg-gray-900 px-4 py-3.5 space-y-4">
				<!-- Min bet -->
				<div>
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm font-medium text-gray-100">Minimum Bet</span>
					</div>
					<div class="flex gap-1 rounded-lg bg-gray-800 p-0.5">
						{#each MIN_BET_OPTIONS as n}
							<button
								onclick={() => settings.setMinBet(n as MinBetOption)}
								class="flex-1 rounded-md py-1.5 text-sm font-semibold transition-colors
									{settings.minBet === n
										? 'bg-white text-gray-900'
										: 'text-gray-400 hover:text-gray-200'}"
							>{fmtBet(n)}</button>
						{/each}
					</div>
				</div>

				<!-- Max bet -->
				<div>
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm font-medium text-gray-100">Maximum Bet</span>
					</div>
					<div class="flex gap-1 rounded-lg bg-gray-800 p-0.5">
						{#each MAX_BET_OPTIONS as n}
							<button
								onclick={() => settings.setMaxBet(n as MaxBetOption)}
								class="flex-1 rounded-md py-1.5 text-sm font-semibold transition-colors
									{settings.maxBet === n
										? 'bg-white text-gray-900'
										: 'text-gray-400 hover:text-gray-200'}"
							>{fmtBet(n)}</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
