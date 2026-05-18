<script lang="ts">
	import { DEFAULT_CHART } from '$lib/engine/strategy.js';
	import type { ChartCell } from '$lib/engine/strategy.js';

	let { open, onclose }: { open: boolean; onclose: () => void } = $props();

	type Tab = 'hard' | 'soft' | 'pairs';
	let activeTab = $state<Tab>('hard');

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

	function cellLabel(cell: ChartCell): string {
		if (cell.base === 'D') return cell.fallback === 'S' ? 'Ds' : 'Dh';
		if (cell.base === 'R') return 'Xh';
		return cell.base;
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
</script>

{#if open}
	<!-- Backdrop -->
	<button
		class="fixed inset-0 z-40 cursor-default bg-black/60"
		onclick={onclose}
		aria-label="Close chart"
	></button>

	<!-- Panel -->
	<div class="fixed inset-x-2 bottom-0 top-14 z-50 flex flex-col overflow-hidden rounded-t-2xl bg-gray-950 shadow-2xl">
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
			{#each (['hard', 'soft', 'pairs'] as const) as tab}
				<button
					onclick={() => (activeTab = tab)}
					class="flex-1 py-2.5 text-sm font-semibold capitalize transition-colors
						{activeTab === tab
						? 'border-b-2 border-green-400 text-green-400'
						: 'text-gray-500 hover:text-gray-300'}"
				>
					{tab.charAt(0).toUpperCase() + tab.slice(1)}
				</button>
			{/each}
		</div>

		<!-- Chart body -->
		<div class="flex-1 overflow-y-auto px-2 py-3">
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
										<td class="h-7 text-center text-[11px] font-semibold {cell ? cellClass(cell) : 'bg-gray-800 text-gray-600'}">
											{cell ? cellLabel(cell) : ''}
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
			</div>
		</div>
	</div>
{/if}
