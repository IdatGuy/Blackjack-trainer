<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { DEFAULT_CHART } from '$lib/engine/strategy.js';
	import type { ChartCell } from '$lib/engine/strategy.js';
	import {
		getHeatmapData,
		getCategoryStats,
		getDeviationAccuracy,
		getCellDetail,
		type HeatmapData,
		type CategoryStat,
		type CellAccuracy,
		type CellDetail
	} from '$lib/db/accuracy.js';
	import { filterSince } from '$lib/db/queries.js';
	import HeatmapGrid from '$lib/components/accuracy/HeatmapGrid.svelte';
	import DeviationList from '$lib/components/accuracy/DeviationList.svelte';
	import type { DeviationEntry } from '$lib/components/accuracy/DeviationList.svelte';
	import CategoryStats from '$lib/components/accuracy/CategoryStats.svelte';
	import TimeFilter from '$lib/components/stats/TimeFilter.svelte';

	// ─── Chart-derived constants ──────────────────────────────────────────────

	const UPCARDS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'A'] as const;
	const HARD_ROWS = ['5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
	const SOFT_ROWS = ['A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9'];
	const PAIR_ROWS = ['AA', '22', '33', '44', '55', '66', '77', '88', '99', 'TT'];

	function cellLabel(cell: ChartCell): string {
		if (cell.base === 'R') {
			if (cell.fallback === 'S') return 'Rs';
			if (cell.fallback === 'P') return 'Rp';
			return 'Rh';
		}
		if (cell.base === 'D') return cell.fallback === 'S' ? 'Ds' : 'D';
		return cell.base;
	}

	function buildActions(section: Record<string, Record<string, ChartCell>>) {
		const out: Record<string, Record<string, string>> = {};
		for (const [pk, row] of Object.entries(section)) {
			out[pk] = {};
			for (const [dk, cell] of Object.entries(row)) {
				out[pk][dk] = cellLabel(cell);
			}
		}
		return out;
	}

	const HARD_ACTIONS = buildActions(DEFAULT_CHART.hard);
	const SOFT_ACTIONS = buildActions(DEFAULT_CHART.soft);
	const PAIR_ACTIONS = buildActions(DEFAULT_CHART.pairs);

	// Row display labels
	const SOFT_LABELS = Object.fromEntries(SOFT_ROWS.map((k) => [k, k.replace('A', 'A,')]));
	const PAIR_LABELS = Object.fromEntries(
		PAIR_ROWS.map((k) => [k, k === 'AA' ? 'A,A' : k === 'TT' ? 'T,T' : `${k[0]},${k[1]}`])
	);

	// Build set of "playerKey:dealerUp" for each section that has deviations
	function buildDeviationCellSet(section: Record<string, Record<string, ChartCell>>) {
		const set = new Set<string>();
		for (const [pk, row] of Object.entries(section)) {
			for (const [dk, cell] of Object.entries(row)) {
				if (cell.deviations?.length) set.add(`${pk}:${dk}`);
			}
		}
		return set;
	}

	const HARD_DEV_CELLS = buildDeviationCellSet(DEFAULT_CHART.hard);
	const SOFT_DEV_CELLS = buildDeviationCellSet(DEFAULT_CHART.soft);
	const PAIR_DEV_CELLS = buildDeviationCellSet(DEFAULT_CHART.pairs);

	// Build the full I18+F4 deviation list for the Deviations tab
	function buildDeviationEntries(): DeviationEntry[] {
		const entries: DeviationEntry[] = [];
		const sections: Array<[string, Record<string, Record<string, ChartCell>>]> = [
			['hard', DEFAULT_CHART.hard],
			['soft', DEFAULT_CHART.soft],
			['pair', DEFAULT_CHART.pairs]
		];
		for (const [ht, section] of sections) {
			for (const [pk, row] of Object.entries(section)) {
				for (const [dk, cell] of Object.entries(row)) {
					if (!cell.deviations?.length) continue;
					for (const dev of cell.deviations) {
						const handLabel =
							ht === 'pair'
								? `${pk.replace('TT', 'T,T').replace('AA', 'A,A')}`
								: ht === 'soft'
									? pk.replace('A', 'A,')
									: pk;
						entries.push({
							key: `${ht}:${pk}:${dk}`,
							handType: ht as 'hard' | 'soft' | 'pair',
							playerKey: pk,
							dealerUp: dk,
							tc: dev.tc,
							above: dev.above,
							action: dev.action,
							label: `${handLabel} vs ${dk}`
						});
					}
				}
			}
		}
		return entries;
	}

	const DEVIATION_DEFS = buildDeviationEntries();

	// ─── State ────────────────────────────────────────────────────────────────

	type Tab = 'hard' | 'soft' | 'pairs' | 'deviations' | 'all';
	let activeTab = $state<Tab>('hard');
	let timeFilter = $state<'today' | 'week' | 'month' | 'all'>('all');

	let heatmapData = $state<HeatmapData>({});
	let categoryStats = $state<CategoryStat[]>([]);
	let deviationAccuracy = $state(new Map<string, CellAccuracy>());

	let showResetWarning = $state(false);
	let accuracyResetAt = $state(
		browser ? parseInt(localStorage.getItem('bj-accuracy-reset-at') ?? '0', 10) : 0
	);

	function effectiveSince() {
		return Math.max(accuracyResetAt, filterSince(timeFilter));
	}

	function handleReset() {
		const now = Date.now();
		if (browser) localStorage.setItem('bj-accuracy-reset-at', String(now));
		accuracyResetAt = now;
		showResetWarning = false;
		const since = effectiveSince();
		if (activeTab === 'hard') {
			heatmapData = {};
			getHeatmapData('hard', since).then((d) => (heatmapData = d));
		} else if (activeTab === 'soft') {
			heatmapData = {};
			getHeatmapData('soft', since).then((d) => (heatmapData = d));
		} else if (activeTab === 'pairs') {
			heatmapData = {};
			getHeatmapData('pair', since).then((d) => (heatmapData = d));
		} else if (activeTab === 'deviations') {
			deviationAccuracy = new Map();
			getDeviationAccuracy(since).then((m) => (deviationAccuracy = m));
		} else {
			categoryStats = [];
			getCategoryStats(since).then((s) => (categoryStats = s));
		}
	}

	// Cell detail sheet
	let detailCell = $state<{ handType: 'hard' | 'soft' | 'pair'; playerKey: string; dealerUp: string } | null>(null);
	let detailData = $state<CellDetail | null>(null);

	// ─── Data loading ─────────────────────────────────────────────────────────

	$effect(() => {
		const since = effectiveSince();
		if (activeTab === 'hard') {
			getHeatmapData('hard', since).then((d) => (heatmapData = d));
		} else if (activeTab === 'soft') {
			getHeatmapData('soft', since).then((d) => (heatmapData = d));
		} else if (activeTab === 'pairs') {
			getHeatmapData('pair', since).then((d) => (heatmapData = d));
		} else if (activeTab === 'deviations') {
			getDeviationAccuracy(since).then((m) => (deviationAccuracy = m));
		} else if (activeTab === 'all') {
			getCategoryStats(since).then((s) => (categoryStats = s));
		}
	});

	function openCellDetail(pk: string, dk: string) {
		const ht = activeTab === 'pairs' ? 'pair' : (activeTab as 'hard' | 'soft');
		detailCell = { handType: ht, playerKey: pk, dealerUp: dk };
		detailData = null;
		getCellDetail(ht, pk, dk, effectiveSince()).then((d) => (detailData = d));
	}

	function closeDetail() {
		detailCell = null;
		detailData = null;
	}

	// ─── Derived helpers ──────────────────────────────────────────────────────

	const tabs: Array<{ id: Tab; label: string }> = [
		{ id: 'hard', label: 'Hard' },
		{ id: 'soft', label: 'Soft' },
		{ id: 'pairs', label: 'Pairs' },
		{ id: 'deviations', label: 'Deviations' },
		{ id: 'all', label: 'All' }
	];

	function detailPctStr(acc: CellAccuracy): string {
		if (acc.total === 0) return '--';
		return `${Math.round((acc.correct / acc.total) * 100)}%`;
	}

	function detailHandLabel(tab: Tab, pk: string): string {
		if (tab === 'soft') return pk.replace('A', 'A,');
		if (tab === 'pairs') {
			if (pk === 'AA') return 'A,A';
			if (pk === 'TT') return 'T,T';
			return `${pk[0]},${pk[1]}`;
		}
		return pk;
	}

	// Find the deviation entry (TC info) for the current detail cell
	const detailDevEntry = $derived(
		detailCell
			? DEVIATION_DEFS.find(
					(d) =>
						d.handType === detailCell!.handType &&
						d.playerKey === detailCell!.playerKey &&
						d.dealerUp === detailCell!.dealerUp
				)
			: null
	);
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<header class="flex items-center gap-3 border-b border-zinc-800 bg-black/40 px-3 py-2">
		<button
			onclick={() => goto('/')}
			class="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 active:bg-gray-600"
			aria-label="Back"
		>
			←
		</button>
		<span class="flex-1 text-base font-semibold text-white">Accuracy</span>
		<button
			onclick={() => (showResetWarning = true)}
			class="rounded-md px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-400/10 active:bg-red-400/20"
		>
			Reset
		</button>
	</header>

	<!-- Tab bar -->
	<div class="flex border-b border-white/10">
		{#each tabs as tab}
			<button
				onclick={() => (activeTab = tab.id)}
				class="flex-1 py-2.5 text-xs font-semibold transition-colors
					{activeTab === tab.id
					? 'border-b-2 border-green-400 text-green-400'
					: 'border-b-2 border-transparent text-white/40'}"
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- Scrollable content -->
	<div class="flex-1 overflow-y-auto p-3">
	<div class="mx-auto w-full max-w-lg">
		<!-- Time filter (shared across tabs) -->
		<TimeFilter value={timeFilter} onchange={(v) => (timeFilter = v)} />

		{#if activeTab === 'hard'}
			<!-- Axis label -->
			<div class="mb-1 text-xs font-medium text-green-400">Dealer's Hand</div>
			<HeatmapGrid
				rows={HARD_ROWS}
				rowLabels={Object.fromEntries(HARD_ROWS.map((r) => [r, r]))}
				columns={[...UPCARDS]}
				data={heatmapData}
				actions={HARD_ACTIONS}
				deviationCells={HARD_DEV_CELLS}
				oncellclick={openCellDetail}
			/>
			{#if Object.keys(heatmapData).length === 0}
				<p class="mt-4 text-center text-sm text-white/30">Play some hands to see accuracy data.</p>
			{/if}

		{:else if activeTab === 'soft'}
			<div class="mb-1 text-xs font-medium text-green-400">Dealer's Hand</div>
			<HeatmapGrid
				rows={SOFT_ROWS}
				rowLabels={SOFT_LABELS}
				columns={[...UPCARDS]}
				data={heatmapData}
				actions={SOFT_ACTIONS}
				deviationCells={SOFT_DEV_CELLS}
				oncellclick={openCellDetail}
			/>
			{#if Object.keys(heatmapData).length === 0}
				<p class="mt-4 text-center text-sm text-white/30">Play some hands to see accuracy data.</p>
			{/if}

		{:else if activeTab === 'pairs'}
			<div class="mb-1 text-xs font-medium text-green-400">Dealer's Hand</div>
			<HeatmapGrid
				rows={PAIR_ROWS}
				rowLabels={PAIR_LABELS}
				columns={[...UPCARDS]}
				data={heatmapData}
				actions={PAIR_ACTIONS}
				deviationCells={PAIR_DEV_CELLS}
				oncellclick={openCellDetail}
			/>
			{#if Object.keys(heatmapData).length === 0}
				<p class="mt-4 text-center text-sm text-white/30">Play some hands to see accuracy data.</p>
			{/if}

		{:else if activeTab === 'deviations'}
			<DeviationList deviations={DEVIATION_DEFS} accuracy={deviationAccuracy} />

		{:else if activeTab === 'all'}
			<CategoryStats stats={categoryStats} />
		{/if}
	</div>
	</div>
</div>

<!-- Reset warning bottom sheet -->
{#if showResetWarning}
	<button class="fixed inset-0 z-40 bg-black/50" onclick={() => (showResetWarning = false)} aria-label="Cancel"></button>
	<div class="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-zinc-900 px-4 pb-8 pt-4 shadow-xl">
		<div class="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20"></div>
		<h3 class="mb-2 text-base font-semibold text-white">Reset Accuracy Data</h3>
		<p class="mb-6 text-sm text-white/60">This will clear your accuracy history. Your bankroll and hands-played count will not be affected.</p>
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

<!-- Cell detail bottom sheet -->
{#if detailCell}
	<!-- Backdrop -->
	<button
		class="fixed inset-0 z-40 bg-black/50"
		onclick={closeDetail}
		aria-label="Close"
	></button>

	<!-- Sheet -->
	<div class="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-zinc-900 px-4 pb-8 pt-4 shadow-xl">
		<!-- Handle -->
		<div class="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20"></div>

		<h3 class="mb-4 text-base font-semibold text-white">
			{activeTab === 'pairs' ? 'Pair' : activeTab === 'soft' ? 'Soft' : 'Hard'}
			{detailHandLabel(activeTab, detailCell.playerKey)} vs {detailCell.dealerUp}
		</h3>

		{#if detailData === null}
			<p class="text-sm text-white/40">Loading…</p>
		{:else}
			<div class="space-y-4">
				<!-- Basic strategy -->
				<div class="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5">
					<div>
						<div class="text-sm font-medium text-white">Basic Strategy</div>
						<div class="text-xs text-white/40">{detailData.basic.correct}/{detailData.basic.total} correct</div>
					</div>
					<div class="text-lg font-bold text-white">
						{detailPctStr(detailData.basic)}
					</div>
				</div>

				<!-- Deviation (only if this cell has a deviation) -->
				{#if detailDevEntry}
					<div class="flex items-center justify-between rounded-lg bg-yellow-400/10 px-3 py-2.5">
						<div>
							<div class="flex items-center gap-1.5 text-sm font-medium text-white">
								<span class="h-1.5 w-1.5 rounded-full bg-yellow-400"></span>
								Deviation
							</div>
							<div class="text-xs text-white/40">
								TC {detailDevEntry.above ? '≥' : '≤'} {detailDevEntry.tc} → {detailDevEntry.action}
								· {detailData.deviation.correct}/{detailData.deviation.total} correct
							</div>
						</div>
						<div class="text-lg font-bold text-white">
							{detailPctStr(detailData.deviation)}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}
