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

	let showCount = $state(false);

	function signSup(n: number): string {
		return n >= 0 ? '+' : '−';
	}
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
	<!-- Top bar: 3-column grid keeps pill perfectly centered -->
	<header
		class="grid grid-cols-3 items-center border-b border-gray-800 bg-black/40 px-3 py-2"
	>
		<!-- Left: reserved for future logo -->
		<div></div>

		<!-- Center: toggleable bankroll / count pill -->
		<div class="flex justify-center">
			<button
				onclick={() => (showCount = !showCount)}
				class="rounded-full bg-white px-5 py-1.5 text-sm font-semibold text-gray-900 shadow transition-colors hover:bg-gray-100 active:bg-gray-200"
			>
				{#if showCount}
					<span class="text-[9px] font-normal opacity-60">RC</span>
					{rc}<sup class="text-[9px] opacity-70">{signSup(rc)}</sup>
					<span class="mx-1 opacity-30">|</span>
					<span class="text-[9px] font-normal opacity-60">TC</span>
					{tc}<sup class="text-[9px] opacity-70">{signSup(tc)}</sup>
				{:else}
					${game.bankroll}
				{/if}
			</button>
		</div>

		<!-- Right: ellipsis menu -->
		<div class="flex justify-end">
			<div class="relative">
				<button
					class="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white text-xl font-bold text-gray-900 hover:bg-gray-100 active:bg-gray-200"
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
						class="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl bg-gray-900 shadow-2xl ring-1 ring-gray-700"
					>
						<button
							class="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold hover:bg-gray-800 active:bg-gray-950"
							class:text-amber-400={game.reshuffleNeeded}
							class:text-gray-100={!game.reshuffleNeeded}
							onclick={() => { game.reshuffle(); closeMenu(); }}
						>
							<span class="text-base">⟳</span>
							{game.reshuffleNeeded ? 'Reshuffle ⚠' : 'Reshuffle'}
						</button>

						<div class="border-t border-gray-700"></div>

						<div class="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
							Settings
						</div>
						<label
							class="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800"
						>
							<input
								type="checkbox"
								class="h-4 w-4 accent-gray-400"
								bind:checked={game.showFeedback}
							/>
							Show feedback
						</label>
					</div>
				{/if}
			</div>
		</div>
	</header>

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
			<span class="mt-1 text-xs text-gray-400">
				{playerHand.isSurrendered ? 'Surrendered' : ''}
				{playerHand.isDoubled ? 'Doubled' : ''}
			</span>
		{:else}
			<div class="flex flex-col items-center gap-2">
				<span class="text-sm uppercase tracking-widest text-gray-600">Player</span>
				<div class="h-[130px] w-[90px] rounded-lg border-2 border-dashed border-gray-700"></div>
			</div>
		{/if}
	</div>
</div>
