<script lang="ts">
	import { fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import ActionBar from '$lib/components/ActionBar.svelte';
	import BetInput from '$lib/components/BetInput.svelte';
	import Hand from '$lib/components/Hand.svelte';
	import StrategyChart from '$lib/components/StrategyChart.svelte';
	import type { HandResult } from '$lib/engine/game.js';
	import { handValue, isBust } from '$lib/engine/hand.js';
	import { deckDivisor, trueCount } from '$lib/engine/shoe.js';
	import { game } from '$lib/stores/game.svelte.js';
	import type { Action } from '$lib/engine/rules.js';
	import { settings } from '$lib/stores/settings.svelte.js';
	import { browser } from '$app/environment';
	import { saveCountGuess } from '$lib/db/persist.js';

	const OUTCOME_TEXT: Record<HandResult, string> = {
		win: 'You Win',
		blackjack: 'Blackjack!',
		push: 'Push',
		loss: 'You Lose',
		surrender: 'Surrendered'
	};

	const OUTCOME_COLOR: Record<HandResult, string> = {
		win: 'text-white',
		blackjack: 'text-white',
		push: 'text-white',
		loss: 'text-white',
		surrender: 'text-white'
	};

	const SPEEDS = [0, 80, 160, 250, 400, 600];

	const animDuration = $derived(SPEEDS[settings.animationSpeed] ?? 0);

	const phase = $derived(game.state.phase);
	const playerHands = $derived(game.state.playerHands);
	const playerHand = $derived(playerHands[0]);
	const dealerHand = $derived(game.state.dealerHand);
	const activeIndex = $derived(game.state.activeHandIndex);
	const tc = $derived(trueCount(game.state.shoe));
	const rc = $derived(game.state.shoe.runningCount);
	const div = $derived(deckDivisor(game.state.shoe));
	const shoePenetration = $derived(
		game.state.shoe.dealtCards.length / (game.state.shoe.decks * 52)
	);

	const bettingActive = $derived(settings.bettingEnabled && !settings.weaknessWeighting);
	const countActive = $derived(
		settings.countingEnabled &&
		(settings.weaknessWeighting
			? true
			: settings.countDisplay.rc || settings.countDisplay.tc || settings.countDisplay.div)
	);

	const isMultiHand = $derived(playerHands.length > 1);

	const activeHand = $derived(playerHands[activeIndex]);

	let handEls: (HTMLElement | null)[] = $state([]);

	$effect(() => {
		const el = handEls[activeIndex];
		if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
	});

	let insuranceHintUsed = $state(false);

	// Count challenge popup state
	let countPopupOpen = $state(false);
	let countEntry = $state(0);
	let countPopupResult = $state<'correct' | 'wrong' | null>(null);
	let countPopupExpected = $state(0);
	let handsSincePopup = $state(0);
	let nextPopupAt = $state(0);

	function nextPopupInterval(): number {
		const base = settings.countPopupFrequency;
		const win = settings.countPopupWindow;
		return Math.max(1, base + Math.round((Math.random() * 2 - 1) * win));
	}

	$effect(() => {
		// Initialize (or reset) the popup counter whenever the feature is toggled
		if (settings.countPopupEnabled) {
			handsSincePopup = 0;
			nextPopupAt = nextPopupInterval();
		}
	});

	function handleNextHand() {
		cancelDealerAnimation();
		if (settings.countPopupEnabled && settings.countingEnabled && !settings.weaknessWeighting) {
			handsSincePopup++;
			if (handsSincePopup >= nextPopupAt) {
				handsSincePopup = 0;
				nextPopupAt = nextPopupInterval();
				countEntry = 0;
				countPopupResult = null;
				countPopupExpected = game.state.shoe.runningCount;
				countPopupOpen = true;
				return;
			}
		}
		game.nextHand();
	}

	async function submitCountGuess() {
		const correct = countEntry === countPopupExpected;
		countPopupResult = correct ? 'correct' : 'wrong';
		if (browser) saveCountGuess({
			timestamp: Date.now(),
			sessionId: game.sessionId,
			playMode: settings.weaknessWeighting ? 'drill' : 'shoe',
			actualRC: countPopupExpected,
			guessedRC: countEntry,
			correct,
			error: countEntry - countPopupExpected
		});
		await new Promise(r => setTimeout(r, correct ? 800 : 2000));
		countPopupOpen = false;
		game.nextHand();
	}

	let menuOpen = $state(false);
	let chartOpen = $state(false);
	let addFundsOpen = $state(false);
	let lastFundsAdded = $state<number | null>(null);
	let fundsAddedTimer: ReturnType<typeof setTimeout> | null = null;

	function onAddFunds(amount: number) {
		game.addFunds(amount);
		lastFundsAdded = amount;
		if (fundsAddedTimer) clearTimeout(fundsAddedTimer);
		fundsAddedTimer = setTimeout(() => { lastFundsAdded = null; }, 1500);
	}

	const ADD_FUND_CHIPS: { value: number; color: string; label: string }[] = [
		{ value: 100,  color: 'bg-zinc-800  ring-gray-500',   label: '$100'  },
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

	// Split animation state
	let isSplitting = $state(false);
	let splitVisibleCounts = $state<number[]>([]);
	let splitHandStartIdx = $state(0);
	let splitTimers: ReturnType<typeof setTimeout>[] = [];

	// During the deal sequence, show slices; otherwise show full arrays
	const visiblePlayerCards = $derived(
		isDealing ? (playerHand?.cards.slice(0, playerVisible) ?? []) : (playerHand?.cards ?? [])
	);
	const visibleDealerCards = $derived(
		isDealing ? dealerHand.cards.slice(0, dealerVisible) : dealerHand.cards
	);

	function handleDeal() {
		if ((!settings.bettingEnabled || settings.weaknessWeighting) && game.betAmount < settings.minBet) {
			game.addChip(settings.minBet);
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

	function handleAction(action: Action, hintUsed: boolean) {
		if (action !== 'P') { game.act(action, hintUsed); return; }

		const dur = SPEEDS[settings.animationSpeed] ?? 0;
		splitHandStartIdx = game.state.activeHandIndex;
		game.act('P', hintUsed);

		if (dur === 0) return;

		const n = game.state.playerHands.length;
		const idx = splitHandStartIdx;
		splitVisibleCounts = Array.from({ length: n }, (_, i) =>
			i === idx || i === idx + 1 ? 1 : 99
		);
		isSplitting = true;

		splitTimers = [
			setTimeout(() => {
				splitVisibleCounts = splitVisibleCounts.map((c, i) => i === idx ? 2 : c);
			}, dur),
			setTimeout(() => {
				splitVisibleCounts = splitVisibleCounts.map((c, i) => i === idx + 1 ? 2 : c);
			}, 2 * dur),
			setTimeout(() => { isSplitting = false; splitVisibleCounts = []; }, 2 * dur + 50),
		];
	}


</script>

{#snippet bankrollContent()}
	{#if game.bankrollFlash !== null}
		<span class={game.bankrollFlash > 0 ? 'text-green-600' : 'text-red-500'}>
			{game.bankrollFlash > 0 ? `+$${game.bankrollFlash}` : `-$${Math.abs(game.bankrollFlash)}`}
		</span>
	{:else}
		${game.bankroll}
	{/if}
{/snippet}

{#snippet countContent()}
	{#if settings.weaknessWeighting}
		<span class="text-[9px] font-normal opacity-60">TC</span>
		{game.synthesizedTC! >= 0 ? '+' : ''}{game.synthesizedTC}
	{:else}
		{#if settings.countDisplay.rc}
			<span class="text-[9px] font-normal opacity-60">RC</span>{rc > 0 ? '+' : ''}{rc}
		{/if}
		{#if settings.countDisplay.rc && (settings.countDisplay.tc || settings.countDisplay.div)}
			<span class="mx-1 opacity-30">|</span>
		{/if}
		{#if settings.countDisplay.tc}
			<span class="text-[9px] font-normal opacity-60">TC</span>{tc > 0 ? '+' : ''}{tc}
		{/if}
		{#if settings.countDisplay.tc && settings.countDisplay.div}
			<span class="mx-1 opacity-30">|</span>
		{/if}
		{#if settings.countDisplay.div}
			<span class="text-[9px] font-normal opacity-60">Div</span>{div}
		{/if}
	{/if}
{/snippet}

<div class="relative flex h-full flex-col">
	{#if isDealing}
		<button
			onclick={skipDeal}
			class="absolute inset-0 z-50 cursor-pointer"
			aria-label="Skip deal animation"
		></button>
	{/if}

	<!-- Top bar: 3-column grid keeps pill perfectly centered -->
	<header class="grid grid-cols-3 items-center border-b border-zinc-800 bg-black/40 px-3 py-2">
		<!-- Left: reshuffle button -->
		<div class="flex items-center">
			<button
				onclick={() => { cancelDealerAnimation(); game.reshuffle(); handsSincePopup = 0; nextPopupAt = nextPopupInterval(); }}
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

		<!-- Center: count pill + bankroll pill (independent) -->
		<div class="flex items-center justify-center gap-1.5">
			{#if countActive}
				<div class="flex items-center rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-gray-900 shadow">
					{@render countContent()}
				</div>
			{/if}
			{#if bettingActive}
				<div class="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-gray-900 shadow">
					{@render bankrollContent()}
				</div>
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
			{#if settings.showStrategyChart}
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
			{/if}
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
				<div class="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
					<button onclick={() => { menuOpen = false; goto('/settings'); }} class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-100 hover:bg-zinc-800 active:bg-zinc-700">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="shrink-0 text-gray-600">
							<path stroke-linecap="round" stroke-linejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z"/>
							<circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
						Settings
					</button>
					<button onclick={() => { menuOpen = false; goto('/table-rules'); }} class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-100 hover:bg-zinc-800 active:bg-zinc-700">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="shrink-0 text-gray-600">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
						</svg>
						Table Rules
					</button>
					<button onclick={() => { menuOpen = false; goto('/accuracy'); }} class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-100 hover:bg-zinc-800 active:bg-zinc-700">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="shrink-0 text-gray-600">
							<circle cx="12" cy="12" r="9" stroke-linecap="round" stroke-linejoin="round"/>
							<circle cx="12" cy="12" r="4" stroke-linecap="round" stroke-linejoin="round"/>
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2M12 19v2M3 12h2M19 12h2"/>
						</svg>
						Accuracy
					</button>
					<button onclick={() => { menuOpen = false; goto('/statistics'); }} class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-100 hover:bg-zinc-800 active:bg-zinc-700">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="shrink-0 text-gray-600">
							<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"/>
						</svg>
						Statistics
					</button>
				</div>
			{/if}
		</div>
	</header>

	<!-- Shoe penetration bar -->
	{#if settings.countingEnabled && !settings.weaknessWeighting}
		<div class="relative h-[3px] w-full bg-white/10">
			<div
				class="h-full transition-all duration-300
					{shoePenetration < 0.6 ? 'bg-green-500/70' : shoePenetration < 0.75 ? 'bg-amber-400/80' : 'bg-red-500/80'}"
				style="width: {shoePenetration * 100}%"
			></div>
			{#each Array.from({ length: game.state.shoe.decks - 1 }, (_, i) => i + 1) as i}
				<div class="absolute top-0 h-full w-px bg-white/30" style="left: {(i / game.state.shoe.decks) * 100}%"></div>
			{/each}
		</div>
	{/if}

	<!-- Dealer area -->
	<div class="flex flex-1 flex-col items-center justify-center py-6">
		<Hand
			cards={visibleDealerCards}
			hideSecond={phase === 'player' || phase === 'insurance'}
			label="Dealer"
			showTotal={phase !== 'player' && phase !== 'insurance'}
		/>
	</div>

	<!-- Center action zone (fixed height) -->
	<div class="flex w-full min-h-[160px] flex-col items-center justify-center gap-3 px-4 py-4 {phase === 'betting' || (phase === 'player' && !isDealing) || phase === 'insurance' || phase === 'resolution' ? 'bg-black/20 border-t border-b border-white/10' : ''}">
		{#if phase === 'betting'}
			{#if settings.weaknessWeighting}
				<div class="flex flex-col items-center gap-2">
					<span class="rounded-full bg-zinc-700 px-3 py-0.5 text-[11px] font-semibold text-gray-300">
						Weak Hands
					</span>
					<button
						class="rounded-xl bg-yellow-500 px-10 py-3 text-base font-bold text-gray-900 shadow-lg hover:bg-yellow-400 active:bg-yellow-600"
						onclick={handleDeal}
					>
						Deal
					</button>
				</div>
			{:else if settings.bettingEnabled}
				<BetInput ondeal={handleDeal} />
			{:else}
				<button
					class="rounded-xl bg-yellow-500 px-10 py-3 text-base font-bold text-gray-900 shadow-lg hover:bg-yellow-400 active:bg-yellow-600"
					onclick={handleDeal}
				>
					Deal
				</button>
			{/if}
		{:else if phase === 'insurance'}
			{@const insureIsCorrect = game.correctInsuranceAction === 'I'}
			<div class="flex flex-col items-center gap-3 text-center">
				<div>
					<p class="text-sm font-semibold text-white">Dealer shows Ace</p>
					<p class="text-xs text-gray-400">Insurance costs half your bet (${Math.floor(game.state.playerHands[0]?.bet / 2)})</p>
				</div>
				<div class="flex w-full gap-3">
					<button
						class="flex-1 rounded-lg py-3 text-sm font-bold text-white shadow transition-colors bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
							{insuranceHintUsed && insureIsCorrect ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-gray-950' : ''}"
						onclick={() => { game.takeInsurance(insuranceHintUsed); insuranceHintUsed = false; }}
					>Take Insurance</button>
					<button
						class="flex-1 rounded-lg py-3 text-sm font-bold text-white shadow transition-colors bg-gray-600 hover:bg-gray-500 active:bg-zinc-700
							{insuranceHintUsed && !insureIsCorrect ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-gray-950' : ''}"
						onclick={() => { game.declineInsurance(insuranceHintUsed); insuranceHintUsed = false; }}
					>Decline</button>
				</div>
				{#if settings.showHintButton && !insuranceHintUsed}
					<button
						onclick={() => (insuranceHintUsed = true)}
						class="rounded-lg border border-gray-600 px-6 py-2 text-xs font-semibold text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-300 active:bg-zinc-800"
					>Hint</button>
				{/if}
			</div>
		{:else if phase === 'player' && !isDealing}
			<ActionBar onaction={handleAction} />
		{:else if phase === 'resolution'}
			<button
				class="rounded-xl bg-yellow-500 px-8 py-3 text-base font-bold text-gray-900 shadow-lg hover:bg-yellow-400 active:bg-yellow-600"
				onclick={handleNextHand}
			>
				Next Hand
			</button>
		{/if}
	</div>

	<!-- Player area -->
	<div class="flex flex-1 flex-col items-center justify-center py-6">
		{#if playerHands.length > 0}
			{#if playerHands.length > 1}
				<div class="flex justify-center gap-1.5 pb-2">
					{#each playerHands as _, i}
						<button
							onclick={() => handEls[i]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })}
							class="h-2 w-2 rounded-full transition-colors {i === activeIndex ? 'bg-white' : 'bg-gray-600'}"
							aria-label="Hand {i + 1}"
						></button>
					{/each}
				</div>
			{/if}
			<div
				class="hand-scroll w-full overflow-x-auto"
				in:fly={{ y: -12, duration: animDuration }}
			>
				<div class="flex items-start gap-4" style="padding-left: calc(50% - 6rem)">
					{#each playerHands as hand, i}
						{@const lastAct = game.lastActionFor(i)}
						{@const resolved = game.lastResults[i]}
						<div
							bind:this={handEls[i]}
							class="flex w-48 flex-shrink-0 flex-col items-center gap-1 transition-all
								{hand.isResolved && phase === 'player' ? 'opacity-50' : ''}"
							style="scroll-snap-align: center"
						>
							<!-- per-hand badge -->
							<div class="flex w-full flex-col items-center gap-1 pb-1">
								{#if phase === 'resolution' && resolved}
									<span class="text-2xl font-bold {OUTCOME_COLOR[resolved.result]}">{OUTCOME_TEXT[resolved.result]}</span>
									{#if game.showFeedback}
										{@const actionsForHand = game.actionHistory.filter(r => r.handIndex === i)}
										{@const allOk = actionsForHand.length > 0 && actionsForHand.every(r => r.correct)}
										{@const wrong = actionsForHand.filter(r => !r.correct)}
										{#if actionsForHand.length > 0}
											<div class="w-full rounded-lg bg-black/30 px-4 py-3 text-center text-sm">
												{#if allOk}
													<span class="font-semibold text-green-300">Perfect play ✓</span>
												{:else}
													<div class="flex flex-col gap-1">
														{#each wrong as record}
															<span class="text-red-300">{game.feedbackFor(record)}</span>
														{/each}
													</div>
												{/if}
											</div>
										{/if}
									{/if}
								{:else if hand.isSurrendered}
									<span class="text-xs text-gray-400">Surrendered</span>
								{:else if isBust(hand.cards)}
									<span class="text-sm font-bold text-red-400">Bust!</span>
								{:else if lastAct && !lastAct.correct && phase === 'player'}
									<div class="w-full rounded-lg bg-black/30 px-4 py-3 text-center text-sm">
										<span class="text-red-300">{game.shortFeedbackFor(lastAct)}</span>
									</div>
								{/if}
							</div>
							<div class="rounded-xl p-1 transition-all
								{i === activeIndex && phase === 'player'
									? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-gray-950'
									: ''}">
								<Hand
									cards={isSplitting && i < splitVisibleCounts.length
										? hand.cards.slice(0, splitVisibleCounts[i])
										: !isMultiHand && i === 0
											? visiblePlayerCards
											: hand.cards}
									showTotal={settings.showHandTotal}
								/>
							</div>
						</div>
					{/each}
					<!-- spacer forces trailing scroll room so last hand can reach center -->
					<div style="flex-shrink: 0; width: calc(50% - 6rem)"></div>
				</div>
			</div>
		{:else}
			<div class="flex flex-col items-center gap-2">
				<span class="text-sm uppercase tracking-widest text-gray-600">Player</span>
				<div class="h-[140px] w-[96px] rounded-lg border-2 border-dashed border-zinc-700"></div>
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
	<div class="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-t-2xl bg-zinc-900 px-6 pb-8 pt-5 shadow-2xl">
		<p class="mb-3 text-center text-sm font-semibold tracking-widest text-white">Add Funds</p>
		<!-- Bankroll total + flash -->
		<div class="mb-4 flex items-center justify-center gap-2">
			<span class="text-3xl font-bold text-yellow-400">${game.bankroll.toLocaleString()}</span>
			{#if lastFundsAdded !== null}
				<span class="text-base font-bold text-green-400">+${lastFundsAdded.toLocaleString()}</span>
			{/if}
		</div>
		<div class="flex items-center justify-center gap-4">
			{#each ADD_FUND_CHIPS as chip}
				<button
					class="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-lg ring-2 ring-inset transition-opacity active:scale-95 {chip.color}"
					onclick={() => onAddFunds(chip.value)}
				>
					<span class="pointer-events-none absolute inset-[5px] rounded-full ring-1 ring-white/30"></span>
					{chip.label}
				</button>
			{/each}
		</div>
	</div>
{/if}

<StrategyChart open={chartOpen} onclose={() => (chartOpen = false)} trueCount={game.synthesizedTC ?? tc} />

{#if countPopupOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
		<div class="w-full max-w-xs rounded-2xl bg-zinc-900 p-6 shadow-2xl">
			<p class="mb-6 text-center text-base font-semibold text-gray-100">What's the running count?</p>

			{#if countPopupResult === null}
				<!-- Entry UI -->
				<div class="mb-6 flex items-center justify-center gap-4">
					<button
						onclick={() => (countEntry--)}
						class="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-2xl font-bold text-white hover:bg-zinc-700 active:bg-zinc-600"
					>−</button>
					<span class="w-16 text-center text-3xl font-bold tabular-nums text-white">
						{countEntry > 0 ? '+' : ''}{countEntry}
					</span>
					<button
						onclick={() => (countEntry++)}
						class="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-2xl font-bold text-white hover:bg-zinc-700 active:bg-zinc-600"
					>+</button>
				</div>
				<button
					onclick={submitCountGuess}
					class="w-full rounded-xl bg-yellow-500 py-3 text-base font-bold text-gray-900 hover:bg-yellow-400 active:bg-yellow-600"
				>Submit</button>
			{:else}
				<!-- Result UI -->
				<div class="flex flex-col items-center gap-2 py-4">
					{#if countPopupResult === 'correct'}
						<span class="text-4xl">✓</span>
						<span class="text-lg font-bold text-green-400">Correct!</span>
					{:else}
						<span class="text-4xl">✗</span>
						<span class="text-lg font-bold text-red-400">
							Incorrect, the count is: {countPopupExpected > 0 ? '+' : ''}{countPopupExpected}
						</span>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.hand-scroll {
		scrollbar-width: none;
		scroll-snap-type: x mandatory;
		-webkit-overflow-scrolling: touch;
	}
	.hand-scroll::-webkit-scrollbar {
		display: none;
	}
</style>
