<script lang="ts">
	import type { BankrollStats } from '$lib/db/queries.js';
	import BankrollChart from './BankrollChart.svelte';

	let { stats }: { stats: BankrollStats | null } = $props();

	function fmt(n: number): string {
		return Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
	}
</script>

{#if stats}
	<!-- P/L headline -->
	<div class="mb-5">
		<div class="text-4xl font-bold {stats.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}">
			{stats.profitLoss >= 0 ? '' : '-'}{fmt(stats.profitLoss)}
		</div>
		<div class="mt-0.5 text-sm text-white/40">Profit / Loss</div>
	</div>

	<!-- Won / Lost tiles -->
	<div class="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10">
		<div class="bg-[#1a1a1a] px-4 py-3">
			<div class="text-xl font-bold text-white">{fmt(stats.amountWon)}</div>
			<div class="text-xs text-white/40">Amount Won</div>
		</div>
		<div class="bg-[#1a1a1a] px-4 py-3">
			<div class="text-xl font-bold text-white">{fmt(stats.amountLost)}</div>
			<div class="text-xs text-white/40">Amount Lost</div>
		</div>
	</div>

	<!-- Chart -->
	<BankrollChart series={stats.bankrollSeries} height={220} />
{:else}
	<div class="h-40 animate-pulse rounded-lg bg-white/5"></div>
{/if}
