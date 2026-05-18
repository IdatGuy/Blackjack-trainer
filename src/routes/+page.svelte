<script lang="ts">
	import { goto } from '$app/navigation';
	import ActionBar from '$lib/components/ActionBar.svelte';
	import BetInput from '$lib/components/BetInput.svelte';
	import Hand from '$lib/components/Hand.svelte';
	import ResultBanner from '$lib/components/ResultBanner.svelte';
	import StrategyChart from '$lib/components/StrategyChart.svelte';
	import { handValue, isBust } from '$lib/engine/hand.js';
	import { trueCount } from '$lib/engine/shoe.js';
	import { MIN_BET, game } from '$lib/stores/game.svelte.js';
	import { settings } from '$lib/stores/settings.svelte.js';

	const SPEEDS = [0, 80, 160, 250, 400, 600];

	const phase = $derived(game.state.phase);
	const playerHands = $derived(game.state.playerHands);
	const playerHand = $derived(playerHands[0]);
	const dealerHand = $derived(game.state.dealerHand);
	const activeIndex = $derived(game.state.activeHandIndex);
	const tc = $derived(trueCount(game.state.shoe));
	const rc = $derived(game.state.shoe.runningCount);
	const shoePenetration = $derived(
		game.state.shoe.dealtCards.length / (game.state.shoe.decks * 52)
	);

	const isMultiHand = $derived(playerHands.length > 1);

	const activeHand = $derived(playerHands[activeIndex]);
	const activeBust = $derived(activeHand ? isBust(activeHand.cards) : false);

	let showCount = $state(false);
	let menuOpen = $state(false);
	let chartOpen = $state(false);
	let addFundsOpen = $state(false);

	const ADD_FUND_CHIPS: { value: number; color: string; label: string }[] = [
		{ value: 100,  color: 'bg-gray-800  ring-gray-500',   label: '$100'  },
		{ value: 500,  color: 'bg-purple-700 ring-purple-500', label: '$500'  },
		{ value: 1000, color: 'bg-yellow-600 ring-yellow-400', label: '$1K'   },
	];


	// Initial deal animation state
	let isDealing = $state(false);
	let playerVisible = $state(0);
	let dealerVisible = $state(0);
	let dealTimers: ReturnType<typeof setTimeout>[] = [];

	// Dealer reveal animation state
	let isDealerAnimating = $state(false);
	let dealerTimers: ReturnType<typeof setTimeout>[] = [];

	// During the deal sequence, show slices; otherwise show full arrays
	const visiblePlayerCards = $derived(
		isDealing ? (playerHand?.cards.slice(0, playerVisible) ?? []) : (playerHand?.cards ?? [])
	);
	const visibleDealerCards = $derived(
		isDealing ? dealerHand.cards.slice(0, dealerVisible) : dealerHand.cards
	);

	function handleDeal() {
		if (!settings.bettingEnabled && game.betAmount < MIN_BET) {
			game.addChip(MIN_BET);
		}

		const dur = SPEEDS[settings.animationSpeed] ?? 0;

		if (dur > 0) {
			// Set BEFORE game.deal() so Svelte batches them into one DOM update
			isDealing = true;
			playerVisible = 0;
			dealerVisible = 0;
		}

		game.deal();

		if (dur > 0) {
			// Reveal cards in deal order: player[0], dealer[0], player[1], dealer[1]
			dealTimers = [
				setTimeout(() => { playerVisible = 1; }, 0),
				setTimeout(() => { dealerVisible = 1; }, dur),
				setTimeout(() => { playerVisible = 2; }, 2 * dur),
				setTimeout(() => { dealerVisible = 2; }, 3 * dur),
				setTimeout(() => { isDealing = false; }, 4 * dur + 50)
			];
		}
	}

	function skipDeal() {
		dealTimers.forEach(clearTimeout);
		dealTimers = [];
		playerVisible = 99;
		dealerVisible = 99;
		isDealing = false;
	}

	// Dealer reveal sequence: flip hole card, then draw cards one at a time
	$effect(() => {
		if (phase === 'dealer' && !isDealerAnimating && !isDealing) {
			startDealerSequence();
		}
	});

	function startDealerSequence() {
		const dur = SPEEDS[settings.animationSpeed] ?? 0;

		if (dur === 0) {
			while (game.dealerShouldDraw) game.dealerDraw();
			game.resolveDealer();
			return;
		}

		isDealerAnimating = true;

		function drawOrResolve() {
			if (game.dealerShouldDraw) {
				game.dealerDraw();
				dealerTimers.push(setTimeout(drawOrResolve, dur));
			} else {
				game.resolveDealer();
				isDealerAnimating = false;
			}
		}

		// Wait one dur for the hole card flip to complete, then start drawing
		dealerTimers.push(setTimeout(drawOrResolve, dur));
	}

	function cancelDealerAnimation() {
		dealerTimers.forEach(clearTimeout);
		dealerTimers = [];
		isDealerAnimating = false;
	}

	function signSup(n: number): string {
		return n >= 0 ? '+' : '−';
	}
</script>

<div class="relative flex h-full flex-col">
	{#if isDealing}
		<button
			onclick={skipDeal}
			class="absolute inset-0 z-50 cursor-pointer"
			aria-label="Skip deal animation"
		></button>
	{/if}

	<!-- Top bar: 3-column grid keeps pill perfectly centered -->
	<header class="grid grid-cols-3 items-center border-b border-gray-800 bg-black/40 px-3 py-2">
		<!-- Left: reshuffle button -->
		<div class="flex items-center">
			<button
				onclick={() => { cancelDealerAnimation(); game.reshuffle(); }}
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
		<div class="flex items-center justify-center gap-1.5">
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
				{:else if settings.bettingEnabled}
					${game.bankroll}
				{:else}
					Count
				{/if}
			</button>
			{#if settings.bettingEnabled && !showCount}
				<button
					onclick={() => (addFundsOpen = true)}
					class="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 active:bg-white/40"
					aria-label="Add funds"
				>
					<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
						<path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
				</button>
			{/if}
		</div>

		<!-- Right: chart button + menu -->
		<div class="relative flex items-center justify-end gap-2">
			<button
				onclick={() => (chartOpen = true)}
				class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 active:bg-white/30"
				aria-label="Strategy chart"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<rect x="3" y="3" width="7" height="7" rx="1" stroke-linejoin="round"/>
					<rect x="14" y="3" width="7" height="7" rx="1" stroke-linejoin="round"/>
					<rect x="3" y="14" width="7" height="7" rx="1" stroke-linejoin="round"/>
					<rect x="14" y="14" width="7" height="7" rx="1" stroke-linejoin="round"/>
				</svg>
			</button>
			<button
				onclick={() => (menuOpen = !menuOpen)}
				class="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-xl font-bold leading-none text-gray-900 hover:bg-gray-100 active:bg-gray-200"
				aria-label="Menu"
			>
				⋯
			</button>
			{#if menuOpen}
				<button
					class="fixed inset-0 z-40 cursor-default"
					onclick={() => (menuOpen = false)}
					aria-label="Close menu"
				></button>
				<div class="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-xl">
					<button onclick={() => { menuOpen = false; goto('/settings'); }} class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-100 hover:bg-gray-800 active:bg-gray-700">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="shrink-0 text-gray-400">
							<path stroke-linecap="round" stroke-linejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z"/>
							<circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
						Settings
					</button>
					<button onclick={() => { menuOpen = false; goto('/table-rules'); }} class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-100 hover:bg-gray-800 active:bg-gray-700">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="shrink-0 text-gray-400">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
						</svg>
						Table Rules
					</button>
					<button onclick={() => { menuOpen = false; goto('/accuracy'); }} class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-100 hover:bg-gray-800 active:bg-gray-700">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="shrink-0 text-gray-400">
							<circle cx="12" cy="12" r="9" stroke-linecap="round" stroke-linejoin="round"/>
							<circle cx="12" cy="12" r="4" stroke-linecap="round" stroke-linejoin="round"/>
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2M12 19v2M3 12h2M19 12h2"/>
						</svg>
						Accuracy
					</button>
					<button onclick={() => { menuOpen = false; goto('/statistics'); }} class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-100 hover:bg-gray-800 active:bg-gray-700">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="shrink-0 text-gray-400">
							<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"/>
						</svg>
						Statistics
					</button>
				</div>
			{/if}
		</div>
	</header>

	<!-- Shoe penetration bar -->
	<div class="h-[3px] w-full bg-white/10">
		<div
			class="h-full transition-all duration-300
				{shoePenetration < 0.6 ? 'bg-green-500/70' : shoePenetration < 0.75 ? 'bg-amber-400/80' : 'bg-red-500/80'}"
			style="width: {shoePenetration * 100}%"
		></div>
	</div>

	<!-- Dealer area -->
	<div class="flex flex-1 flex-col items-center justify-center py-6">
		<Hand
			cards={visibleDealerCards}
			hideSecond={phase === 'player'}
			label="Dealer"
			showTotal={phase !== 'player'}
		/>
	</div>

	<!-- Center action zone (fixed height) -->
	<div class="flex min-h-[160px] flex-col items-center justify-center gap-3 px-4 py-4">
		{#if phase === 'betting'}
			{#if settings.bettingEnabled}
				<BetInput ondeal={handleDeal} />
			{:else}
				<button
					class="rounded-xl bg-yellow-500 px-10 py-3 text-base font-bold text-gray-900 shadow-lg hover:bg-yellow-400 active:bg-yellow-600"
					onclick={handleDeal}
				>
					Deal
				</button>
			{/if}
		{:else if phase === 'player' && !isDealing}
			<ActionBar />
			{#if activeBust}
				<span class="text-sm font-bold text-red-400">Bust!</span>
			{/if}
		{:else if phase === 'resolution'}
			<ResultBanner />
			<button
				class="rounded-xl bg-yellow-500 px-8 py-3 text-base font-bold text-gray-900 shadow-lg hover:bg-yellow-400 active:bg-yellow-600"
				onclick={() => { cancelDealerAnimation(); game.nextHand(); }}
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
			<Hand cards={visiblePlayerCards} label="Player" showTotal={true} />
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

{#if addFundsOpen}
	<!-- Backdrop -->
	<button
		class="fixed inset-0 z-40 bg-black/60"
		onclick={() => (addFundsOpen = false)}
		aria-label="Close"
	></button>
	<!-- Panel -->
	<div class="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-gray-900 px-6 pb-8 pt-5 shadow-2xl">
		<p class="mb-4 text-center text-sm font-semibold tracking-widest text-white">Add Funds</p>
		<div class="flex items-center justify-center gap-4">
			{#each ADD_FUND_CHIPS as chip}
				<button
					class="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-lg ring-2 ring-inset transition-opacity {chip.color}"
					onclick={() => game.addFunds(chip.value)}
				>
					<span class="pointer-events-none absolute inset-[5px] rounded-full ring-1 ring-white/30"></span>
					{chip.label}
				</button>
			{/each}
		</div>
	</div>
{/if}

<StrategyChart open={chartOpen} onclose={() => (chartOpen = false)} />
