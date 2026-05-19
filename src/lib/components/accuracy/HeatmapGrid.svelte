<script lang="ts">
	import type { HeatmapData } from '$lib/db/accuracy.js';

	type Props = {
		rows: string[];
		rowLabels: Record<string, string>;
		columns: string[];
		data: HeatmapData;
		actions: Record<string, Record<string, string>>;
		deviationCells: Set<string>; // "playerKey:dealerUp"
		oncellclick?: (playerKey: string, dealerUp: string) => void;
	};

	let { rows, rowLabels, columns, data, actions, deviationCells, oncellclick }: Props = $props();

	function cellAcc(pk: string, dk: string) {
		const c = data[pk]?.[dk];
		return c && c.total > 0 ? c : null;
	}

	// Interpolates red (#f87171) → green (#4ade80) based on pct 0–1
	function accuracyBg(pct: number): string {
		const r = Math.round(248 - (248 - 74) * pct);
		const g = Math.round(113 + (222 - 113) * pct);
		const b = Math.round(113 + (128 - 113) * pct);
		return `rgb(${r},${g},${b})`;
	}
</script>

<div class="overflow-x-auto">
	<div class="inline-block min-w-full">
		<!-- Column header -->
		<div class="mb-1 flex items-center">
			<div class="w-9 shrink-0"></div>
			{#each columns as col}
				<div class="w-8 shrink-0 text-center text-xs font-medium text-white/50">{col}</div>
			{/each}
		</div>

		<!-- Grid rows -->
		{#each rows as pk}
			<div class="mb-0.5 flex items-center">
				<!-- Row label -->
				<div class="w-9 shrink-0 pr-1 text-right text-xs font-medium text-white/60">
					{rowLabels[pk] ?? pk}
				</div>
				<!-- Cells -->
				{#each columns as dk}
					{@const acc = cellAcc(pk, dk)}
					{@const isDev = deviationCells.has(`${pk}:${dk}`)}
					<button
						class="relative m-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded text-[10px] font-bold leading-none"
						style="background: {acc
							? accuracyBg(acc.correct / acc.total)
							: 'rgba(255,255,255,0.07)'}; color: {acc
							? 'rgba(255,255,255,0.92)'
							: 'rgba(255,255,255,0.22)'}"
						onclick={() => oncellclick?.(pk, dk)}
					>
						{actions[pk]?.[dk] ?? '?'}
						{#if isDev}
							<span
								class="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-yellow-400/90"
							></span>
						{/if}
					</button>
				{/each}
			</div>
		{/each}

		<!-- Legend -->
		<div class="mt-3 flex items-center gap-2 pl-9">
			<div
				class="h-2.5 w-28 rounded-sm"
				style="background: linear-gradient(to right, rgb(248,113,113), rgb(74,222,128))"
			></div>
			<span class="text-[10px] text-white/30">0% → 100%</span>
		</div>
	</div>
</div>
