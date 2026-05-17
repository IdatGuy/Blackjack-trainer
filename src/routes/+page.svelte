<script lang="ts">
	import ActionBar from '$lib/components/ActionBar.svelte';
	import BetInput from '$lib/components/BetInput.svelte';
	import Hand from '$lib/components/Hand.svelte';
	import ResultBanner from '$lib/components/ResultBanner.svelte';
	import { handValue, isBust } from '$lib/engine/hand.js';
	import { trueCount } from '$lib/engine/shoe.js';
	import { game } from '$lib/stores/game.svelte.js';

	const phase = $derived(game.state.phase);
	const playerHand = $derived(game.state.playerHands[0]);
	const dealerHand = $derived(game.state.dealerHand);
	const tc = $derived(trueCount(game.state.shoe));
	const rc = $derived(game.state.shoe.runningCount);
	const cardsLeft = $derived(game.state.shoe.cards.length);

	const playerBust = $derived(playerHand ? isBust(playerHand.cards) : false);
	const playerTotal = $derived(playerHand ? handValue(playerHand.cards) : null);

	let menuOpen = $state(false);
	function closeMenu() { menuOpen = false; }
</script>

<!-- Backdrop to close menu on outside click -->
{#if menuOpen}
	<div
		class="fixed inset-0 z-40"
		role="presentation"
		onclick={closeMenu}
		onkeydown={(e) => e.key === 'Escape' && closeMenu()}
	></div>
{/if}

<div class="flex h-full flex-col">
	<!-- Top bar -->
	<header
		class="flex items-center justify-between border-b border-green-700 bg-green-950/60 px-4 py-2"
	>
		<div class="flex flex-col">
			<span class="text-lg font-bold text-white">${game.bankroll}</span>
			<span class="text-[10px] text-green-400">Bankroll</span>
		</div>

		<!-- Ellipsis menu -->
		<div class="relative">
			<button
				class="relative flex h-9 w-9 items-center justify-center rounded-lg text-xl font-bold text-white hover:bg-green-700 active:bg-green-800"
				onclick={() => (menuOpen = !menuOpen)}
				aria-label="Menu"
			>
				⋯
				{#if game.reshuffleNeeded}
					<span class="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-400"></span>
				{/if}
			</button>

			{#if menuOpen}
				<div
					class="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl bg-green-900 shadow-2xl ring-1 ring-green-700"
				>
					<!-- Reshuffle -->
					<button
						class="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold hover:bg-green-800 active:bg-green-950"
						class:text-amber-400={game.reshuffleNeeded}
						class:text-white={!game.reshuffleNeeded}
						onclick={() => { game.reshuffle(); closeMenu(); }}
					>
						<span class="text-base">⟳</span>
						{game.reshuffleNeeded ? 'Reshuffle ⚠' : 'Reshuffle'}
					</button>

					<div class="border-t border-green-700"></div>

					<!-- Settings section -->
					<div class="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-green-500">
						Settings
					</div>
					<label
						class="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-green-200 hover:bg-green-800"
					>
						<input
							type="checkbox"
							class="h-4 w-4 accent-green-400"
							bind:checked={game.showFeedback}
						/>
						Show feedback
					</label>
				</div>
			{/if}
		</div>
	</header>

	<!-- Shoe info strip -->
	<div class="flex justify-center gap-4 bg-green-950/30 py-1 text-[11px] text-green-400">
		<span>RC: {rc >= 0 ? '+' : ''}{rc}</span>
		<span>TC: {tc >= 0 ? '+' : ''}{tc}</span>
		<span>{cardsLeft} cards left</span>
	</div>

	<!-- Dealer area -->
	<div class="flex flex-1 flex-col items-center justify-center py-6">
		<Hand
			cards={dealerHand.cards}
			hideSecond={phase === 'player'}
			label="Dealer"
			showTotal={phase !== 'player'}
		/>
	</div>

	<!-- Center action zone (fixed height) -->
	<div class="flex min-h-[160px] flex-col items-center justify-center gap-3 px-4 py-4">
		{#if phase === 'betting'}
			<BetInput />
		{:else if phase === 'player'}
			<ActionBar />
			{#if playerBust}
				<span class="text-sm font-bold text-red-400">Bust!</span>
			{/if}
		{:else if phase === 'resolution'}
			<ResultBanner />
			<button
				class="rounded-xl bg-yellow-500 px-8 py-3 text-base font-bold text-gray-900 shadow-lg hover:bg-yellow-400 active:bg-yellow-600"
				onclick={() => game.nextHand()}
			>
				Next Hand
			</button>
		{/if}
	</div>

	<!-- Player area -->
	<div class="flex flex-1 flex-col items-center justify-center py-6">
		{#if playerHand}
			<Hand cards={playerHand.cards} label="Player" showTotal={true} />
			<span class="mt-1 text-xs text-green-300">
				{playerHand.isSurrendered ? 'Surrendered' : ''}
				{playerHand.isDoubled ? 'Doubled' : ''}
			</span>
		{:else}
			<div class="flex flex-col items-center gap-2">
				<span class="text-sm uppercase tracking-widest text-green-600">Player</span>
				<div class="h-[90px] w-[60px] rounded-lg border-2 border-dashed border-green-700"></div>
			</div>
		{/if}
	</div>
</div>
