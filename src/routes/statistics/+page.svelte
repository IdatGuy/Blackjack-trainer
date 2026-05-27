<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { clearDecisions } from '$lib/db/index.js';
	import { game } from '$lib/stores/game.svelte.js';
	import TimeFilter from '$lib/components/stats/TimeFilter.svelte';
	import StatSection from '$lib/components/stats/StatSection.svelte';
	import HandsSection from '$lib/components/stats/HandsSection.svelte';
	import BankrollSection from '$lib/components/stats/BankrollSection.svelte';
	import StrategySection from '$lib/components/stats/StrategySection.svelte';
	import {
		getHandsStats,
		getBankrollStats,
		getStrategyStats,
		getBetRampStats,
		filterSince,
		type HandsStats,
		type BankrollStats,
		type StrategyStats,
		type BetRampTCStat
	} from '$lib/db/queries.js';
	import BetRampSection from '$lib/components/stats/BetRampSection.svelte';
	import { settings } from '$lib/stores/settings.svelte.js';

	type Filter = 'today' | 'week' | 'month' | 'all';

	let filter = $state<Filter>('all');
	let showResetWarning = $state(false);
	let handsStats = $state<HandsStats | null>(null);
	let bankrollStats = $state<BankrollStats | null>(null);
	let strategyStats = $state<StrategyStats | null>(null);
	let betRampStats = $state<BetRampTCStat[] | null>(null);

	async function load(f: Filter) {
		if (!browser) return;
		const since = filterSince(f);
		const threshold = settings.betRamp?.feedbackThreshold ?? 2;
		try {
			[handsStats, bankrollStats, strategyStats, betRampStats] = await Promise.all([
				getHandsStats(since),
				getBankrollStats(since),
				getStrategyStats(since),
				getBetRampStats(since, threshold)
			]);
		} catch (e) {
			console.error('[stats] load failed:', e);
		}
	}

	$effect(() => {
		load(filter);
	});

	async function handleReset() {
		await clearDecisions();
		if (browser) localStorage.removeItem('bj-hands-dealt');
		game.resetBankroll();
		showResetWarning = false;
		await load(filter);
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<header class="flex items-center gap-3 border-b border-zinc-800 bg-black/40 px-4 py-3">
		<button onclick={() => goto('/')} class="text-lg leading-none text-green-400" aria-label="Back">
			←
		</button>
		<span class="flex-1 text-lg font-semibold text-green-400">Statistics</span>
		<button
			onclick={() => (showResetWarning = true)}
			class="rounded-md px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-400/10 active:bg-red-400/20"
		>
			Reset
		</button>
	</header>

	<!-- Reset warning bottom sheet -->
	{#if showResetWarning}
		<button class="fixed inset-0 z-40 bg-black/50" onclick={() => (showResetWarning = false)} aria-label="Cancel"></button>
		<div class="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-[#1a1a1a] px-4 pb-8 pt-4 shadow-xl">
			<div class="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20"></div>
			<h3 class="mb-2 text-base font-semibold text-white">Reset All Statistics</h3>
			<p class="mb-6 text-sm text-white/60">This will permanently delete all statistics history and reset your bankroll to $1,000. This cannot be undone.</p>
			<div class="flex gap-3">
				<button
					onclick={() => (showResetWarning = false)}
					class="flex-1 rounded-lg bg-white/10 py-3 text-sm font-semibold text-white hover:bg-white/15"
				>
					Cancel
				</button>
				<button
					onclick={handleReset}
					class="flex-1 rounded-lg bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-500"
				>
					Reset
				</button>
			</div>
		</div>
	{/if}

	<!-- Scrollable content -->
	<div class="flex-1 overflow-y-auto px-4 pb-8 pt-4">
		<TimeFilter value={filter} onchange={(v) => (filter = v)} />

		<StatSection title="Hands">
			<HandsSection stats={handsStats} />
		</StatSection>

		<StatSection title="Bankroll">
			<BankrollSection stats={bankrollStats} />
		</StatSection>

		<StatSection title="Strategy">
			<StrategySection stats={strategyStats} />
		</StatSection>

		{#if settings.betRampEnabled && settings.betRamp}
			<StatSection title="Bet Ramp">
				<BetRampSection
					stats={betRampStats ?? []}
					threshold={settings.betRamp.feedbackThreshold}
					unitSize={settings.betRamp.unitSize}
				/>
			</StatSection>
		{/if}
	</div>
</div>
