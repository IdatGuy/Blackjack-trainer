<script lang="ts">
	import type { HandsStats } from '$lib/db/queries.js';

	let { stats }: { stats: HandsStats | null } = $props();

	function pct(n: number, total: number) {
		if (!total) return 0;
		return Math.round((n / total) * 100);
	}
</script>

{#if stats}
	<!-- Count row -->
	<div class="mb-2 flex items-end">
		<div class="flex-1">
			<span class="text-2xl font-bold text-green-400">{stats.won}</span>
		</div>
		<div class="flex-1 text-center">
			<span class="text-2xl font-bold text-gray-400">{stats.push}</span>
		</div>
		<div class="flex-1 text-right">
			<div class="text-xs font-semibold text-purple-400">{stats.surrender}</div>
			<div class="text-2xl font-bold text-red-400">{stats.lost}</div>
		</div>
	</div>

	<!-- Segmented bar -->
	{#if stats.total > 0}
		<div class="mb-2 flex h-2 overflow-hidden rounded-full">
			{#if stats.won > 0}
				<div class="bg-green-500" style="flex: {stats.won}"></div>
			{/if}
			{#if stats.push > 0}
				<div class="bg-gray-500" style="flex: {stats.push}"></div>
			{/if}
			{#if stats.lost > 0}
				<div class="bg-red-400" style="flex: {stats.lost}"></div>
			{/if}
			{#if stats.surrender > 0}
				<div class="bg-purple-500" style="flex: {stats.surrender}"></div>
			{/if}
		</div>
	{:else}
		<div class="mb-2 h-2 rounded-full bg-white/10"></div>
	{/if}

	<!-- Percentage row -->
	<div class="flex items-start">
		<span class="flex-1 text-sm text-green-400">{pct(stats.won, stats.total)}% Won</span>
		<span class="flex-1 text-center text-sm text-gray-400">{pct(stats.push, stats.total)}% Push</span>
		<div class="flex-1 text-right">
			<div class="text-sm text-red-400">{pct(stats.lost, stats.total)}% Lost</div>
			<div class="text-xs text-purple-400">{pct(stats.surrender, stats.total)}% Surrender</div>
		</div>
	</div>
{:else}
	<div class="h-16 animate-pulse rounded-lg bg-white/5"></div>
{/if}
