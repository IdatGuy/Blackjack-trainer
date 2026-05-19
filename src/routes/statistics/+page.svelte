<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import TimeFilter from '$lib/components/stats/TimeFilter.svelte';
	import StatSection from '$lib/components/stats/StatSection.svelte';
	import HandsSection from '$lib/components/stats/HandsSection.svelte';
	import BankrollSection from '$lib/components/stats/BankrollSection.svelte';
	import StrategySection from '$lib/components/stats/StrategySection.svelte';
	import {
		getHandsStats,
		getBankrollStats,
		getStrategyStats,
		filterSince,
		type HandsStats,
		type BankrollStats,
		type StrategyStats
	} from '$lib/db/queries.js';

	type Filter = 'today' | 'week' | 'month' | 'all';

	let filter = $state<Filter>('all');
	let handsStats = $state<HandsStats | null>(null);
	let bankrollStats = $state<BankrollStats | null>(null);
	let strategyStats = $state<StrategyStats | null>(null);

	async function load(f: Filter) {
		if (!browser) return;
		const since = filterSince(f);
		try {
			[handsStats, bankrollStats, strategyStats] = await Promise.all([
				getHandsStats(since),
				getBankrollStats(since),
				getStrategyStats(since)
			]);
		} catch (e) {
			console.error('[stats] load failed:', e);
		}
	}

	$effect(() => {
		load(filter);
	});
</script>

<div class="flex h-full flex-col bg-[#111]">
	<!-- Header -->
	<header class="flex items-center gap-3 border-b border-white/8 bg-[#111] px-4 py-3">
		<button onclick={() => goto('/')} class="text-lg leading-none text-green-400" aria-label="Back">
			←
		</button>
		<span class="text-lg font-semibold text-green-400">Statistics</span>
	</header>

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
	</div>
</div>
