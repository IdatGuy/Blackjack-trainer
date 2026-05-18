<script lang="ts">
	import { goto } from '$app/navigation';
	import ActionBar from '$lib/components/ActionBar.svelte';
	import BetInput from '$lib/components/BetInput.svelte';
	import Hand from '$lib/components/Hand.svelte';
	import ResultBanner from '$lib/components/ResultBanner.svelte';
	import { handValue, isBust } from '$lib/engine/hand.js';
	import { trueCount } from '$lib/engine/shoe.js';
	import { game } from '$lib/stores/game.svelte.js';

	const phase = $derived(game.state.phase);
	const playerHands = $derived(game.state.playerHands);
	const playerHand = $derived(playerHands[0]);
	const dealerHand = $derived(game.state.dealerHand);
	const activeIndex = $derived(game.state.activeHandIndex);
	const tc = $derived(trueCount(game.state.shoe));
	const rc = $derived(game.state.shoe.runningCount);

	const isMultiHand = $derived(playerHands.length > 1);

	const activeHand = $derived(playerHands[activeIndex]);
	const activeBust = $derived(activeHand ? isBust(activeHand.cards) : false);

	let showCount = $state(false);

	function signSup(n: number): string {
		return n >= 0 ? '+' : '−';
	}
</script>

<div class="flex h-full flex-col">
	<!-- Top bar: 3-column grid keeps pill perfectly centered -->
	<header class="grid grid-cols-3 items-center border-b border-gray-800 bg-black/40 px-3 py-2">
		<!-- Left: reshuffle button -->
		<div class="flex items-center">
			<button
				onclick={() => game.reshuffle()}
				class="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-colors
					{game.reshuffleNeeded
					? 'bg-amber-400 text-gray-900 hover:bg-amber-300 active:bg-amber-500'
					: 'bg-white/10 text-gray-300 hover:bg-white/20 active:bg-white/30'}"
				aria-label="Reshuffle"
				title={game.reshuffleNeeded ? 'Reshuffle needed' : 'Reshuffle'}
			>
				⟳
			</button>
		</div>

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

		<!-- Right: settings gear -->
		<div class="flex justify-end">
			<button
				onclick={() => goto('/settings')}
				class="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg text-gray-900 hover:bg-gray-100 active:bg-gray-200"
				aria-label="Settings"
			>
				⚙
			</button>
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
			{#if activeBust}
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
		{#if isMultiHand}
			<!-- Multi-hand split layout -->
			<div class="flex items-start justify-center gap-3">
				{#each playerHands as hand, i}
					<div
						class="flex flex-col items-center gap-1 rounded-xl p-1 transition-all
							{i === activeIndex && phase === 'player'
							? 'ring-2 ring-white'
							: hand.isResolved
								? 'opacity-50'
								: ''}"
					>
						<Hand cards={hand.cards} showTotal={true} />
						<span class="text-[10px] text-gray-400">
							{hand.isSurrendered ? 'Surrendered' : hand.isDoubled ? 'Doubled' : ''}
						</span>
					</div>
				{/each}
			</div>
		{:else if playerHand}
			<Hand cards={playerHand.cards} label="Player" showTotal={true} />
			<span class="mt-1 text-xs text-gray-400">
				{playerHand.isSurrendered ? 'Surrendered' : ''}
				{playerHand.isDoubled ? 'Doubled' : ''}
			</span>
		{:else}
			<div class="flex flex-col items-center gap-2">
				<span class="text-sm uppercase tracking-widest text-gray-600">Player</span>
				<div class="h-[140px] w-[96px] rounded-lg border-2 border-dashed border-gray-700"></div>
			</div>
		{/if}
	</div>
</div>
