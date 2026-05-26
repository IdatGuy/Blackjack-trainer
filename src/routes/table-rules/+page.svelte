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

	let showDeckConfirm = $state(false);
	let pendingDecks = $state<1 | 2 | 4 | 6 | 8 | null>(null);

	function selectDecks(n: 1 | 2 | 4 | 6 | 8) {
		settings.setDeckCount(n);
		if (game.state.phase !== 'betting') {
			pendingDecks = n;
			showDeckConfirm = true;
		} else {
			game.reshuffle();
		}
	}

	function confirmDeckChange() {
		showDeckConfirm = false;
		game.forfeitAndReshuffle();
		pendingDecks = null;
	}

	function applyRule(setter: () => void) {
		setter();
		// Rules take effect on next deal via _rulesFromSettings(); skip reshuffle mid-hand
		if (game.state.phase === 'betting') game.reshuffle();
	}

	function fmtBet(n: number) {
		return n >= 1000 ? `$${n / 1000}K` : `$${n}`;
	}
</script>

<div class="flex h-full flex-col">
	<header class="flex items-center gap-3 border-b border-zinc-800 bg-black/40 px-3 py-2">
		<button
			onclick={() => goto('/')}
			class="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 active:bg-zinc-600"
			aria-label="Back"
		>
			←
		</button>
		<span class="text-base font-semibold text-white">Table Rules</span>
	</header>

	<div class="flex-1 overflow-y-auto px-4 py-4">
	<div class="mx-auto w-full max-w-lg">

		<!-- Shoe -->
		<div class="mb-6">
			<p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Shoe</p>
			<div class="overflow-hidden rounded-xl bg-zinc-900 px-4 py-3.5">
				<div class="mb-3 flex items-center justify-between">
					<span class="text-sm font-medium text-gray-100">Decks</span>
					<span class="text-xs text-gray-500">{settings.deckCount * 52} cards</span>
				</div>
				<div class="flex gap-1 rounded-lg bg-zinc-800 p-0.5">
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
				<p class="mt-2 text-[11px] text-gray-600">Changing any rule reshuffles the shoe</p>
			</div>
		</div>

		<!-- Dealer Rules -->
		<div class="mb-6">
			<p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Dealer Rules</p>
			<div class="overflow-hidden rounded-xl bg-zinc-900 divide-y divide-zinc-800">

				<!-- Soft 17 -->
				<div class="px-4 py-3.5">
					<div class="mb-2.5 flex items-center justify-between">
						<span class="text-sm font-medium text-gray-100">Soft 17</span>
						<span class="text-xs text-gray-500">{settings.dealerHitsSoft17 ? 'Dealer hits' : 'Dealer stands'}</span>
					</div>
					<div class="flex gap-1 rounded-lg bg-zinc-800 p-0.5">
						<button
							onclick={() => applyRule(() => settings.setDealerHitsSoft17(false))}
							class="flex-1 rounded-md py-1.5 text-sm font-semibold transition-colors
								{!settings.dealerHitsSoft17 ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-gray-200'}"
						>S17</button>
						<button
							onclick={() => applyRule(() => settings.setDealerHitsSoft17(true))}
							class="flex-1 rounded-md py-1.5 text-sm font-semibold transition-colors
								{settings.dealerHitsSoft17 ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-gray-200'}"
						>H17</button>
					</div>
				</div>

				<!-- Blackjack pays -->
				<div class="px-4 py-3.5">
					<div class="mb-2.5 flex items-center justify-between">
						<span class="text-sm font-medium text-gray-100">Blackjack pays</span>
					</div>
					<div class="flex gap-1 rounded-lg bg-zinc-800 p-0.5">
						<button
							onclick={() => applyRule(() => settings.setBlackjackPays('3:2'))}
							class="flex-1 rounded-md py-1.5 text-sm font-semibold transition-colors
								{settings.blackjackPays === '3:2' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-gray-200'}"
						>3:2</button>
						<button
							onclick={() => applyRule(() => settings.setBlackjackPays('6:5'))}
							class="flex-1 rounded-md py-1.5 text-sm font-semibold transition-colors
								{settings.blackjackPays === '6:5' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-gray-200'}"
						>6:5</button>
					</div>
				</div>

				<!-- Peek -->
				<label class="flex cursor-pointer items-center justify-between px-4 py-3.5">
					<div>
						<span class="text-sm font-medium text-gray-100">Dealer peek</span>
						<p class="text-[11px] text-gray-500">Dealer checks hole card for blackjack</p>
					</div>
					<button
						role="switch"
						aria-checked={settings.peek}
						onclick={() => applyRule(() => settings.setPeek(!settings.peek))}
						class="relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none {settings.peek
							? 'bg-green-500'
							: 'bg-zinc-600'}"
					>
						<span
							class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform {settings.peek
								? 'translate-x-5'
								: 'translate-x-0'}"
						></span>
					</button>
				</label>
			</div>
		</div>

		<!-- Player Rules -->
		<div class="mb-6">
			<p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Player Rules</p>
			<div class="overflow-hidden rounded-xl bg-zinc-900 divide-y divide-zinc-800">

				<!-- Surrender -->
				<div class="px-4 py-3.5">
					<div class="mb-2.5 flex items-center justify-between">
						<span class="text-sm font-medium text-gray-100">Surrender</span>
					</div>
					<div class="flex gap-1 rounded-lg bg-zinc-800 p-0.5">
						<button
							onclick={() => applyRule(() => settings.setSurrender('none'))}
							class="flex-1 rounded-md py-1.5 text-sm font-semibold transition-colors
								{settings.surrender === 'none' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-gray-200'}"
						>None</button>
						<button
							onclick={() => applyRule(() => settings.setSurrender('late'))}
							class="flex-1 rounded-md py-1.5 text-sm font-semibold transition-colors
								{settings.surrender === 'late' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-gray-200'}"
						>Late</button>
						<button
							onclick={() => applyRule(() => settings.setSurrender('early'))}
							class="flex-1 rounded-md py-1.5 text-sm font-semibold transition-colors
								{settings.surrender === 'early' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-gray-200'}"
						>Early</button>
					</div>
				</div>

				<!-- Double after split -->
				<label class="flex cursor-pointer items-center justify-between px-4 py-3.5">
					<span class="text-sm font-medium text-gray-100">Double after split</span>
					<button
						role="switch"
						aria-checked={settings.doubleAfterSplit}
						onclick={() => applyRule(() => settings.setDoubleAfterSplit(!settings.doubleAfterSplit))}
						class="relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none {settings.doubleAfterSplit
							? 'bg-green-500'
							: 'bg-zinc-600'}"
					>
						<span
							class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform {settings.doubleAfterSplit
								? 'translate-x-5'
								: 'translate-x-0'}"
						></span>
					</button>
				</label>

				<!-- Resplit aces -->
				<label class="flex cursor-pointer items-center justify-between px-4 py-3.5">
					<span class="text-sm font-medium text-gray-100">Resplit aces</span>
					<button
						role="switch"
						aria-checked={settings.resplitAces}
						onclick={() => applyRule(() => settings.setResplitAces(!settings.resplitAces))}
						class="relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none {settings.resplitAces
							? 'bg-green-500'
							: 'bg-zinc-600'}"
					>
						<span
							class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform {settings.resplitAces
								? 'translate-x-5'
								: 'translate-x-0'}"
						></span>
					</button>
				</label>
			</div>
		</div>

		<!-- Betting Limits -->
		<div class="mb-6">
			<p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Betting Limits</p>
			<div class="overflow-hidden rounded-xl bg-zinc-900 px-4 py-3.5 space-y-4">
				<div>
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm font-medium text-gray-100">Minimum Bet</span>
					</div>
					<div class="flex gap-1 rounded-lg bg-zinc-800 p-0.5">
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

				<div>
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm font-medium text-gray-100">Maximum Bet</span>
					</div>
					<div class="flex gap-1 rounded-lg bg-zinc-800 p-0.5">
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
</div>

{#if showDeckConfirm}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
		<div class="w-full max-w-sm rounded-2xl bg-zinc-900 p-6 shadow-xl">
			<p class="text-base font-semibold text-white">Reshuffle mid-hand?</p>
			<p class="mt-1 text-sm text-gray-400">Changing deck count requires a new shoe. Your current bet will be forfeited and recorded as a loss.</p>
			<div class="mt-5 flex gap-3">
				<button
					onclick={() => { showDeckConfirm = false; pendingDecks = null; }}
					class="flex-1 rounded-xl bg-zinc-800 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 active:bg-zinc-600"
				>Cancel</button>
				<button
					onclick={confirmDeckChange}
					class="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500 active:bg-red-700"
				>Reshuffle</button>
			</div>
		</div>
	</div>
{/if}
