<script lang="ts">
	import type { CellAccuracy } from '$lib/db/accuracy.js';

	export type DeviationEntry = {
		key: string; // "hard:16:T"
		handType: 'hard' | 'soft' | 'pair';
		playerKey: string;
		dealerUp: string;
		tc: number;
		above: boolean;
		action: string;
		label: string; // e.g. "16 vs T"
	};

	let {
		deviations,
		accuracy
	}: {
		deviations: DeviationEntry[];
		accuracy: Map<string, CellAccuracy>;
	} = $props();

	function pct(s: CellAccuracy | undefined): number | null {
		return s && s.total > 0 ? s.correct / s.total : null;
	}

	function accuracyColor(p: number): string {
		const r = Math.round(248 - (248 - 74) * p);
		const g = Math.round(113 + (222 - 113) * p);
		const b = Math.round(113 + (128 - 113) * p);
		return `rgb(${r},${g},${b})`;
	}

	const sorted = $derived(
		[...deviations].sort((a, b) => {
			const pa = pct(accuracy.get(a.key));
			const pb = pct(accuracy.get(b.key));
			// No-data entries go last; otherwise worst (lowest %) first
			if (pa === null && pb === null) return 0;
			if (pa === null) return 1;
			if (pb === null) return -1;
			return pa - pb;
		})
	);
</script>

<div class="space-y-2">
	{#each sorted as d}
		{@const s = accuracy.get(d.key)}
		{@const p = pct(s)}
		<div class="rounded-lg bg-white/5 px-3 py-2.5">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-white">{d.label}</span>
				<span
					class="text-sm font-bold tabular-nums"
					style="color: {p !== null ? accuracyColor(p) : '#6b7280'}"
				>
					{p !== null ? `${Math.round(p * 100)}%` : '--'}
				</span>
			</div>
			<div class="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/40">
				<span>TC {d.above ? '≥' : '≤'} {d.tc} → {d.action}</span>
				{#if s && s.total > 0}
					<span>·</span>
					<span>{s.correct}/{s.total}</span>
				{/if}
			</div>
			<div class="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
				{#if p !== null}
					<div
						class="h-full rounded-full transition-[width]"
						style="width: {p * 100}%; background: {accuracyColor(p)}"
					></div>
				{/if}
			</div>
		</div>
	{/each}

	{#if deviations.length === 0}
		<p class="text-sm text-white/40">No deviation data yet.</p>
	{/if}
</div>
