<script lang="ts">
	import { DEFAULT_CHART } from '$lib/engine/strategy.js';
	import type { ChartCell } from '$lib/engine/strategy.js';

	let { open, onclose, trueCount = undefined }: { open: boolean; onclose: () => void; trueCount?: number } = $props();

	type Tab = 'hard' | 'soft' | 'pairs' | 'insurance';
	let activeTab = $state<Tab>('hard');
	let showAllDeviations = $state(false);

	const UPCARDS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'A'] as const;

	const HARD_ROWS = ['5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'];
	const SOFT_ROWS = ['A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9'];
	const PAIR_ROWS = ['AA', '22', '33', '44', '55', '66', '77', '88', '99', 'TT'];

	function rowLabel(tab: Tab, key: string): string {
		if (tab === 'soft') {
			const n = parseInt(key[1]);
			return `A,${n}`;
		}
		if (tab === 'pairs') {
			if (key === 'AA') return 'A,A';
			if (key === 'TT') return 'T,T';
			return `${key[0]},${key[1]}`;
		}
		return key;
	}

	function actionLabel(action: import('$lib/engine/rules.js').Action): string {
		if (action === 'R') return 'Xh';
		return action;
	}

	function cellLabel(cell: ChartCell): string {
		if (cell.base === 'D') return cell.fallback === 'S' ? 'Ds' : 'Dh';
		return actionLabel(cell.base);
	}

	function cellClass(cell: ChartCell): string {
		switch (cell.base) {
			case 'H': return 'bg-amber-300 text-amber-950';
			case 'S': return 'bg-rose-300 text-rose-950';
			case 'D': return 'bg-sky-300 text-sky-950';
			case 'P': return 'bg-teal-300 text-teal-950';
			case 'R': return 'bg-violet-300 text-violet-950';
			default:  return 'bg-gray-300 text-gray-900';
		}
	}

	function hasDeviation(cell: ChartCell): boolean {
		return (cell.deviations?.length ?? 0) > 0;
	}

	function activeDeviation(cell: ChartCell, tc: number | undefined): { tc: number; action: import('$lib/engine/rules.js').Action; above: boolean } | null {
		if (tc === undefined || !cell.deviations?.length) return null;
		for (const dev of cell.deviations) {
			if (dev.above ? tc >= dev.tc : tc <= dev.tc) return dev;
		}
		return null;
	}

	const rows = $derived(
		activeTab === 'hard' ? HARD_ROWS :
		activeTab === 'soft' ? SOFT_ROWS :
		PAIR_ROWS
	);

	const section = $derived(
		activeTab === 'hard' ? DEFAULT_CHART.hard :
		activeTab === 'soft' ? DEFAULT_CHART.soft :
		DEFAULT_CHART.pairs
	);

	const tcActive = $derived(trueCount !== undefined && trueCount >= 3);
</script>

{#if open}
	<!-- Backdrop -->
	<button
		class="fixed inset-0 z-40 cursor-default bg-black/60"
		onclick={onclose}
		aria-label="Close chart"
	></button>

	<!-- Panel -->
	<div class="fixed bottom-0 top-14 left-1/2 z-50 flex w-[calc(100%-1rem)] max-w-[420px] -translate-x-1/2 flex-col overflow-hidden rounded-t-2xl bg-gray-950 shadow-2xl">
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-gray-800 px-4 py-3">
			<span class="text-base font-bold text-green-400">Strategy Chart</span>
			<button
				onclick={onclose}
				class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white active:bg-gray-700"
				aria-label="Close"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/>
				</svg>
			</button>
		</div>

		<!-- Tabs -->
		<div class="flex border-b border-gray-800">
			{#each (['hard', 'soft', 'pairs', 'insurance'] as const) as tab}
				<button
					onclick={() => (activeTab = tab)}
					class="flex-1 py-2.5 text-xs font-semibold capitalize transition-colors
						{activeTab === tab
						? 'border-b-2 border-green-400 text-green-400'
						: 'text-gray-500 hover:text-gray-300'}"
				>
					{tab.charAt(0).toUpperCase() + tab.slice(1)}
				</button>
			{/each}
		</div>

		<!-- Deviation toggle -->
		<div class="flex items-center justify-end border-b border-gray-800 px-4 py-1.5">
			<button
				onclick={() => (showAllDeviations = !showAllDeviations)}
				class="text-xs font-semibold transition-colors {showAllDeviations ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'}"
			>
				Show deviations
			</button>
		</div>

		<!-- Chart body -->
		<div class="flex-1 overflow-y-auto px-2 py-3">
			{#if activeTab === 'insurance'}
				<!-- Insurance reference card -->
				<div class="flex flex-col gap-4 px-2">
					<div class="rounded-xl bg-gray-900 px-4 py-3.5">
						<p class="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">When offered</p>
						<p class="text-sm text-gray-200">Only when the dealer's up card is an <span class="font-bold text-white">Ace</span>. Insurance costs half your original bet and pays 2:1 if the dealer has a natural blackjack.</p>
					</div>

					<div class="rounded-xl bg-gray-900 px-4 py-3.5">
						<p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Basic Strategy</p>
						<div class="flex items-center gap-3">
							<span class="flex h-8 min-w-[3rem] items-center justify-center rounded-lg bg-gray-700 text-sm font-bold text-gray-200">N</span>
							<p class="text-sm text-gray-300"><span class="font-semibold text-white">Always decline.</span> Insurance has a negative expected value at neutral counts.</p>
						</div>
					</div>

					<div class="rounded-xl bg-gray-900 px-4 py-3.5">
						<p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Counting Deviation — Illustrious 18 #1</p>
						<div class="flex flex-col gap-2">
							<div class="flex items-center gap-3">
							<span class="flex h-8 min-w-[3rem] items-center justify-center rounded-lg text-sm font-bold
									{tcActive ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-500 ring-inset' : 'bg-indigo-700 text-indigo-100'}">I</span>
								<p class="text-sm text-gray-300">
									<span class="font-semibold text-white">Take insurance when TC ≥ +3.</span>
									{#if trueCount !== undefined}
										<span class="ml-1 text-xs {tcActive ? 'text-amber-400 font-semibold' : 'text-gray-500'}">
											(current TC: {trueCount >= 0 ? '+' : ''}{trueCount})
										</span>
									{/if}
								</p>
							</div>
							<p class="text-xs text-gray-500 pl-[3.75rem]">At TC ≥ +3 the shoe is rich enough in tens that the insurance bet becomes profitable.</p>
						</div>
					</div>

					<div class="rounded-xl bg-gray-900 px-4 py-3.5">
						<p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Decision Summary</p>
						<div class="overflow-hidden rounded-lg border border-gray-800">
							<table class="w-full border-collapse text-sm">
								<thead>
									<tr class="bg-gray-800/60">
										<th class="px-3 py-2 text-left text-xs font-semibold text-gray-400">True Count</th>
										<th class="px-3 py-2 text-left text-xs font-semibold text-gray-400">Decision</th>
									</tr>
								</thead>
								<tbody>
									<tr class="border-t border-gray-800 {trueCount !== undefined && trueCount < 3 ? 'bg-gray-800/40' : ''}">
										<td class="px-3 py-2 font-mono text-gray-300">TC &lt; +3</td>
										<td class="px-3 py-2 font-semibold text-gray-300">Decline (N)</td>
									</tr>
									<tr class="border-t border-gray-800 {trueCount !== undefined && trueCount >= 3 ? 'bg-amber-900/30' : ''}">
										<td class="px-3 py-2 font-mono text-gray-300">TC ≥ +3</td>
										<td class="px-3 py-2 font-semibold text-indigo-300">Take Insurance (I)</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>
			{:else}
				<div class="flex gap-1">
					<!-- Rotated "Your Hand" label -->
					<div class="flex shrink-0 items-center justify-center" style="writing-mode: vertical-rl; transform: rotate(180deg)">
						<span class="text-[10px] font-semibold uppercase tracking-widest text-green-400">Your Hand</span>
					</div>

					<div class="flex-1 overflow-x-auto">
						<table class="w-full border-collapse">
							<thead>
								<tr>
									<!-- row label spacer -->
									<th class="w-10"></th>
									<th colspan="10" class="pb-1 text-center text-[10px] font-semibold uppercase tracking-widest text-green-400">
										Dealer's Hand
									</th>
								</tr>
								<tr>
									<th class="w-10"></th>
									{#each UPCARDS as up}
										<th class="w-8 pb-1 text-center text-xs font-bold text-green-400">{up}</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each rows as key}
									<tr>
										<td class="pr-1.5 text-right text-[11px] font-semibold text-white/70">{rowLabel(activeTab, key)}</td>
										{#each UPCARDS as up}
											{@const cell = section[key]?.[up]}
											{@const devFiring = cell ? activeDeviation(cell, trueCount) : null}
											{@const hasDev = cell ? hasDeviation(cell) : false}
											<td class="relative h-7 text-center text-[11px] font-semibold
												{devFiring
													? 'bg-amber-400 text-amber-950 ring-2 ring-amber-500 ring-inset'
													: cell ? cellClass(cell) : 'bg-gray-800 text-gray-600'}">
												{#if cell}
													{devFiring ? actionLabel(devFiring.action) : cellLabel(cell)}
													{#if devFiring}
														<span class="block text-[8px] leading-none opacity-75">{devFiring.above ? '≥' : '≤'}{devFiring.tc > 0 ? '+' : ''}{devFiring.tc}</span>
													{:else if hasDev && showAllDeviations}
														{@const firstDev = cell.deviations![0]}
														<span class="block text-[8px] leading-none text-black/70">{actionLabel(firstDev.action)}{firstDev.above ? '≥' : '≤'}{firstDev.tc > 0 ? '+' : ''}{firstDev.tc}</span>
													{:else if hasDev}
														<span class="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-400"></span>
													{/if}
												{/if}
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<!-- Legend -->
				<div class="mt-4 flex flex-wrap gap-x-4 gap-y-2 px-1">
					<div class="flex items-center gap-1.5">
						<span class="flex h-5 w-7 items-center justify-center rounded-sm bg-amber-300 text-[10px] font-bold text-amber-950">H</span>
						<span class="text-xs text-gray-400">Hit</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="flex h-5 w-7 items-center justify-center rounded-sm bg-sky-300 text-[10px] font-bold text-sky-950">Dh</span>
						<span class="text-xs text-gray-400">Double or hit</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="flex h-5 w-7 items-center justify-center rounded-sm bg-sky-300 text-[10px] font-bold text-sky-950">Ds</span>
						<span class="text-xs text-gray-400">Double or stand</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="flex h-5 w-7 items-center justify-center rounded-sm bg-rose-300 text-[10px] font-bold text-rose-950">S</span>
						<span class="text-xs text-gray-400">Stand</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="flex h-5 w-7 items-center justify-center rounded-sm bg-teal-300 text-[10px] font-bold text-teal-950">P</span>
						<span class="text-xs text-gray-400">Split</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="flex h-5 w-7 items-center justify-center rounded-sm bg-violet-300 text-[10px] font-bold text-violet-950">Xh</span>
						<span class="text-xs text-gray-400">Surrender or hit</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="relative flex h-5 w-7 items-center justify-center rounded-sm bg-rose-300 text-[10px] font-bold text-rose-950">
							S<span class="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-400"></span>
						</span>
						<span class="text-xs text-gray-400">Has TC deviation</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="flex h-5 w-7 items-center justify-center rounded-sm bg-amber-400 text-[10px] font-bold text-amber-950 ring-2 ring-amber-500 ring-inset">S</span>
						<span class="text-xs text-gray-400">Deviation active</span>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
