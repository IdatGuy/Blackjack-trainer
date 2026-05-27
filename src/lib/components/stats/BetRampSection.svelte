<script lang="ts">
	import type { BetRampTCStat } from '$lib/db/queries.js';

	let {
		stats,
		threshold,
		unitSize
	}: { stats: BetRampTCStat[]; threshold: number; unitSize: number } = $props();

	const total = $derived(stats.reduce((s, r) => s + r.total, 0));
	const within = $derived(stats.reduce((s, r) => s + r.withinThreshold, 0));
	const overallPct = $derived(total > 0 ? Math.round((within / total) * 100) : null);
	const avgDelta = $derived(
		total > 0 ? stats.reduce((s, r) => s + r.avgDelta * r.total, 0) / total : 0
	);

	function fmtTC(tc: number): string {
		return (tc >= 0 ? '+' : '') + tc;
	}

	function fmtDelta(d: number): string {
		const sign = d > 0 ? '+' : '';
		return sign + d.toFixed(1) + 'u';
	}

	function withinPct(stat: BetRampTCStat): number {
		return stat.total > 0 ? Math.round((stat.withinThreshold / stat.total) * 100) : 0;
	}
</script>

{#if stats.length === 0}
	<p class="py-2 text-xs text-gray-500">No bet ramp data yet. Play hands with bet ramp grading enabled.</p>
{:else}
	<!-- Summary row -->
	<div class="mb-4 flex items-center justify-between">
		<div>
			<span class="text-2xl font-bold {overallPct !== null && overallPct >= 80 ? 'text-green-400' : 'text-yellow-400'}">
				{overallPct !== null ? overallPct + '%' : '—'}
			</span>
			<span class="ml-1.5 text-xs text-gray-500">within {threshold}u</span>
		</div>
		<div class="text-right">
			<span class="text-sm font-semibold {avgDelta > 0 ? 'text-orange-400' : avgDelta < 0 ? 'text-yellow-300' : 'text-gray-400'}">
				avg {fmtDelta(avgDelta)}
			</span>
			<p class="text-[10px] text-gray-500 mt-0.5">{total} hands graded</p>
		</div>
	</div>

	<!-- Per-TC table -->
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="text-[10px] text-gray-500 uppercase">
					<th class="pb-2 text-left font-medium">TC</th>
					<th class="pb-2 text-center font-medium">Correct bet</th>
					<th class="pb-2 text-center font-medium">Within {threshold}u</th>
					<th class="pb-2 text-right font-medium">Bias</th>
				</tr>
			</thead>
			<tbody>
				{#each stats as stat}
					<tr class="border-t border-zinc-800/50">
						<td class="py-1.5 font-mono text-gray-300">{fmtTC(stat.tc)}</td>
						<td class="py-1.5 text-center text-gray-400 font-mono">
							${Math.round((stat.correctMultiple ?? 0) * unitSize)}
						</td>
						<td class="py-1.5 text-center">
							<span class="{withinPct(stat) >= 80 ? 'text-green-400' : 'text-yellow-400'} font-semibold">
								{withinPct(stat)}%
							</span>
							<span class="text-[10px] text-gray-500 ml-1">({stat.withinThreshold}/{stat.total})</span>
						</td>
						<td class="py-1.5 text-right font-mono text-xs">
							{#if stat.avgDelta > 0.05}
								<span class="text-orange-400">↑ {fmtDelta(stat.avgDelta)}</span>
							{:else if stat.avgDelta < -0.05}
								<span class="text-yellow-300">↓ {fmtDelta(stat.avgDelta)}</span>
							{:else}
								<span class="text-gray-500">—</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="mt-3 text-[10px] text-gray-600">↑ orange = chronic over-bet &nbsp;·&nbsp; ↓ yellow = chronic under-bet</p>
{/if}
