<script lang="ts">
	import type { CategoryStat } from '$lib/db/accuracy.js';

	let { stats }: { stats: CategoryStat[] } = $props();

	const CATEGORY_ORDER = ['hit-stand', 'double', 'split', 'surrender', 'deviation', 'insurance'];
	const CATEGORY_LABELS: Record<string, string> = {
		'hit-stand': 'Hit / Stand',
		double: 'Double',
		split: 'Split',
		surrender: 'Surrender',
		deviation: 'Deviations',
		insurance: 'Insurance'
	};

	const overall = $derived({
		correct: stats.reduce((s, c) => s + c.correct, 0),
		total: stats.reduce((s, c) => s + c.total, 0)
	});

	const sorted = $derived(
		CATEGORY_ORDER.map((cat) => stats.find((s) => s.category === cat)).filter(Boolean) as CategoryStat[]
	);

	function pctStr(correct: number, total: number): string {
		if (total === 0) return '--';
		return `${((correct / total) * 100).toFixed(1)}%`;
	}

	function pctColor(correct: number, total: number): string {
		if (total === 0) return '#6b7280';
		const p = correct / total;
		const r = Math.round(248 - (248 - 74) * p);
		const g = Math.round(113 + (222 - 113) * p);
		const b = Math.round(113 + (128 - 113) * p);
		return `rgb(${r},${g},${b})`;
	}
</script>

<div class="space-y-8">
	<!-- Overall -->
	<section>
		<h3 class="mb-2 text-lg font-semibold text-white">Overall</h3>
		<hr class="mb-4 border-white/10" />
		<div class="mb-4">
			<div
				class="text-4xl font-bold tabular-nums"
				style="color: {pctColor(overall.correct, overall.total)}"
			>
				{pctStr(overall.correct, overall.total)}
			</div>
			<div class="mt-0.5 text-sm text-white/50">Accuracy</div>
		</div>
		<div class="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
			<div>
				<div class="text-xl font-semibold text-white tabular-nums">{overall.correct}</div>
				<div class="text-sm text-white/50">Correct</div>
			</div>
			<div>
				<div class="text-xl font-semibold text-white tabular-nums">
					{overall.total - overall.correct}
				</div>
				<div class="text-sm text-white/50">Incorrect</div>
			</div>
		</div>
	</section>

	<!-- Per-category -->
	{#each sorted as s}
		<section>
			<h3 class="mb-2 text-lg font-semibold text-white">
				{CATEGORY_LABELS[s.category] ?? s.category}
			</h3>
			<hr class="mb-4 border-white/10" />
			<div class="mb-4">
				<div
					class="text-4xl font-bold tabular-nums"
					style="color: {pctColor(s.correct, s.total)}"
				>
					{pctStr(s.correct, s.total)}
				</div>
				<div class="mt-0.5 text-sm text-white/50">Accuracy</div>
			</div>
			<div class="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
				<div>
					<div class="text-xl font-semibold text-white tabular-nums">{s.correct}</div>
					<div class="text-sm text-white/50">Correct</div>
				</div>
				<div>
					<div class="text-xl font-semibold text-white tabular-nums">{s.total - s.correct}</div>
					<div class="text-sm text-white/50">Incorrect</div>
				</div>
			</div>
		</section>
	{/each}

	{#if stats.length === 0}
		<p class="text-sm text-white/40">No decisions recorded yet.</p>
	{/if}
</div>
