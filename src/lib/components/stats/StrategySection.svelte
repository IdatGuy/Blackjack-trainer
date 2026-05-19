<script lang="ts">
	import type { StrategyStats } from '$lib/db/queries.js';

	let { stats }: { stats: StrategyStats | null } = $props();

	function pct(n: number, total: number): string {
		if (!total) return '—';
		return `${Math.round((n / total) * 100)}%`;
	}
</script>

{#if stats}
	<!-- Total hands -->
	<div class="mb-5">
		<div class="text-3xl font-bold text-white">{stats.handsPlayed.toLocaleString()}</div>
		<div class="text-xs text-white/40">Hands Played</div>
	</div>

	<!-- 2×2 grid -->
	<div class="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10">
		{#each [
			{ label: 'Correct', value: stats.correct, color: 'text-green-400' },
			{ label: 'Correct (with hints)', value: stats.correctWithHints, color: 'text-blue-400' },
			{ label: 'Incorrect', value: stats.incorrect, color: 'text-red-400' },
			{ label: 'No Action Required', value: stats.noActionRequired, color: 'text-white' }
		] as tile}
			<div class="bg-[#1a1a1a] px-4 py-3">
				<div class="flex items-baseline justify-between">
					<span class="text-xl font-bold {tile.color}">{tile.value.toLocaleString()}</span>
					<span class="text-xs text-white/40">{pct(tile.value, stats.handsPlayed + stats.noActionRequired)}</span>
				</div>
				<div class="mt-0.5 text-xs text-white/40">{tile.label}</div>
			</div>
		{/each}
	</div>
{:else}
	<div class="h-36 animate-pulse rounded-lg bg-white/5"></div>
{/if}
