<script lang="ts">
	import { goto } from '$app/navigation';
	import { settings } from '$lib/stores/settings.svelte.js';
	import { PAIR_RANKS } from '$lib/engine/synthesizer.js';
	import type { Rank } from '$lib/engine/card.js';
	import RangeSlider from '$lib/components/RangeSlider.svelte';

	const SPEED_LABELS = ['Instant', '1', '2', '3', '4', '5'];

	function togglePairRank(rank: Rank) {
		const cur = settings.drillFilter.pairRanks;
		const next = cur.includes(rank) ? cur.filter(r => r !== rank) : [...cur, rank];
		if (next.length > 0) settings.setDrillFilter({ pairRanks: next });
	}

	function toggleHandType(type: 'hard' | 'soft' | 'pair') {
		const cur = settings.drillFilter.handTypes;
		const next = cur.includes(type) ? cur.filter(t => t !== type) : [...cur, type];
		if (next.length > 0) settings.setDrillFilter({ handTypes: next });
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<header class="flex items-center gap-3 border-b border-zinc-800 bg-black/40 px-3 py-2">
		<button
			onclick={() => goto('/')}
			class="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 active:bg-zinc-600"
			aria-label="Back"
		>
			←
		</button>
		<span class="text-base font-semibold text-white">Settings</span>
	</header>

	<!-- Settings content -->
	<div class="flex-1 overflow-y-auto px-4 py-4">
	<div class="mx-auto w-full max-w-lg">
		<!-- Gameplay section -->
		<div class="mb-6">
			<p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
				Gameplay
			</p>
			<div class="overflow-hidden rounded-xl bg-zinc-900">
				<label class="flex cursor-pointer items-center justify-between px-4 py-3.5">
					<span class="text-sm font-medium text-gray-100">Show feedback</span>
					<button
						role="switch"
						aria-checked={settings.showFeedback}
						onclick={() => settings.setShowFeedback(!settings.showFeedback)}
						class="relative h-6 w-11 rounded-full transition-colors focus:outline-none {settings.showFeedback
							? 'bg-green-500'
							: 'bg-zinc-600'}"
					>
						<span
							class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform {settings.showFeedback
								? 'translate-x-5'
								: 'translate-x-0'}"
						></span>
					</button>
				</label>
				<hr class="border-zinc-800" />
				<label class="flex cursor-pointer items-center justify-between px-4 py-3.5">
					<span class="text-sm font-medium text-gray-100">Betting</span>
					<button
						role="switch"
						aria-checked={settings.bettingEnabled}
						onclick={() => settings.setBettingEnabled(!settings.bettingEnabled)}
						class="relative h-6 w-11 rounded-full transition-colors focus:outline-none {settings.bettingEnabled
							? 'bg-green-500'
							: 'bg-zinc-600'}"
					>
						<span
							class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform {settings.bettingEnabled
								? 'translate-x-5'
								: 'translate-x-0'}"
						></span>
					</button>
				</label>
				<hr class="border-zinc-800" />
				<label class="flex cursor-pointer items-center justify-between px-4 py-3.5">
					<span class="text-sm font-medium text-gray-100">Show hand total</span>
					<button
						role="switch"
						aria-checked={settings.showHandTotal}
						onclick={() => settings.setShowHandTotal(!settings.showHandTotal)}
						class="relative h-6 w-11 rounded-full transition-colors focus:outline-none {settings.showHandTotal
							? 'bg-green-500'
							: 'bg-zinc-600'}"
					>
						<span
							class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform {settings.showHandTotal
								? 'translate-x-5'
								: 'translate-x-0'}"
						></span>
					</button>
				</label>
				<hr class="border-zinc-800" />
				<label class="flex cursor-pointer items-center justify-between px-4 py-3.5">
					<span class="text-sm font-medium text-gray-100">Show hint button</span>
					<button
						role="switch"
						aria-checked={settings.showHintButton}
						onclick={() => settings.setShowHintButton(!settings.showHintButton)}
						class="relative h-6 w-11 rounded-full transition-colors focus:outline-none {settings.showHintButton
							? 'bg-green-500'
							: 'bg-zinc-600'}"
					>
						<span
							class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform {settings.showHintButton
								? 'translate-x-5'
								: 'translate-x-0'}"
						></span>
					</button>
				</label>
				<hr class="border-zinc-800" />
				<label class="flex cursor-pointer items-center justify-between px-4 py-3.5">
					<span class="text-sm font-medium text-gray-100">Show strategy chart button</span>
					<button
						role="switch"
						aria-checked={settings.showStrategyChart}
						onclick={() => settings.setShowStrategyChart(!settings.showStrategyChart)}
						class="relative h-6 w-11 rounded-full transition-colors focus:outline-none {settings.showStrategyChart
							? 'bg-green-500'
							: 'bg-zinc-600'}"
					>
						<span
							class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform {settings.showStrategyChart
								? 'translate-x-5'
								: 'translate-x-0'}"
						></span>
					</button>
				</label>
			</div>
		</div>

		<!-- Counting section -->
		<div class="mb-6">
			<p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
				Counting
			</p>
			<div class="overflow-hidden rounded-xl bg-zinc-900">
				<label class="flex cursor-pointer items-center justify-between px-4 py-3.5">
					<span class="text-sm font-medium text-gray-100">Enable card counting</span>
					<button
						role="switch"
						aria-checked={settings.countingEnabled}
						onclick={() => settings.setCountingEnabled(!settings.countingEnabled)}
						class="relative h-6 w-11 rounded-full transition-colors focus:outline-none {settings.countingEnabled
							? 'bg-green-500'
							: 'bg-zinc-600'}"
					>
						<span
							class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform {settings.countingEnabled
								? 'translate-x-5'
								: 'translate-x-0'}"
						></span>
					</button>
				</label>
				<hr class="border-zinc-800" />
				<div class="flex items-center justify-between px-4 py-3.5 transition-opacity {!settings.countingEnabled ? 'pointer-events-none opacity-40' : ''}">
					<span class="text-sm font-medium text-gray-100">Count display</span>
					<div class="flex gap-1 rounded-lg bg-zinc-800 p-0.5">
						{#each ([['off', 'Off'], ['running', 'RC'], ['true', 'TC'], ['both', 'Both']] as const) as [val, label]}
							<button
								onclick={() => settings.setCountDisplay(val)}
								class="rounded-md px-2.5 py-1 text-xs font-semibold transition-colors
									{settings.countDisplay === val
										? 'bg-white text-gray-900'
										: 'text-gray-400 hover:text-gray-200'}"
							>{label}</button>
						{/each}
					</div>
				</div>
				<hr class="border-zinc-800" />
				<label class="flex cursor-pointer items-center justify-between px-4 py-3.5 transition-opacity {!settings.countingEnabled ? 'pointer-events-none opacity-40' : ''}">
					<span class="text-sm font-medium text-gray-100">Highlight active deviations</span>
					<button
						role="switch"
						aria-checked={settings.highlightActiveDeviations}
						onclick={() => settings.setHighlightActiveDeviations(!settings.highlightActiveDeviations)}
						class="relative h-6 w-11 rounded-full transition-colors focus:outline-none {settings.highlightActiveDeviations
							? 'bg-green-500'
							: 'bg-zinc-600'}"
					>
						<span
							class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform {settings.highlightActiveDeviations
								? 'translate-x-5'
								: 'translate-x-0'}"
						></span>
					</button>
				</label>
			</div>
		</div>

		<!-- Drill section -->
		<div class="mb-6">
			<p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
				Training
			</p>
			<div class="overflow-hidden rounded-xl bg-zinc-900">
				<label class="flex cursor-pointer items-center justify-between px-4 py-3.5">
					<div>
						<span class="text-sm font-medium text-gray-100">Prioritize weak hands</span>
						<p class="text-xs text-gray-500 mt-0.5">Hands weighted by heat map accuracy. Betting disabled.</p>
					</div>
					<button
						role="switch"
						aria-checked={settings.weaknessWeighting}
						onclick={() => settings.setWeaknessWeighting(!settings.weaknessWeighting)}
						class="relative ml-3 h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none {settings.weaknessWeighting
							? 'bg-green-500'
							: 'bg-zinc-600'}"
					>
						<span
							class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform {settings.weaknessWeighting
								? 'translate-x-5'
								: 'translate-x-0'}"
						></span>
					</button>
				</label>

				{#if settings.weaknessWeighting}
					<hr class="border-zinc-800" />
					<!-- Hand type filter — multi-select -->
					<div class="px-4 py-3.5">
						<p class="mb-2.5 text-xs font-medium text-gray-400">Filter</p>
						<div class="flex gap-1 rounded-lg bg-zinc-800 p-0.5">
							{#each ([['hard', 'Hard'], ['soft', 'Soft'], ['pair', 'Pairs']] as const) as [val, label]}
								<button
									onclick={() => toggleHandType(val)}
									class="flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors
										{settings.drillFilter.handTypes.includes(val)
											? 'bg-white text-gray-900'
											: 'text-gray-400 hover:text-gray-200'}"
								>{label}</button>
							{/each}
						</div>
					</div>

					{#if settings.drillFilter.handTypes.includes('hard')}
						<hr class="border-zinc-800" />
						<div class="px-4 py-3.5">
							<div class="flex items-center justify-between mb-2">
								<p class="text-xs font-medium text-gray-400">Hard range</p>
								<span class="text-xs font-semibold text-gray-200">
									{settings.drillFilter.hardMin}–{settings.drillFilter.hardMax}
								</span>
							</div>
							<RangeSlider
								min={5} max={21}
								low={settings.drillFilter.hardMin}
								high={settings.drillFilter.hardMax}
								onchange={(lo, hi) => settings.setDrillFilter({ hardMin: lo, hardMax: hi })}
							/>
						</div>
					{/if}

					{#if settings.drillFilter.handTypes.includes('soft')}
						<hr class="border-zinc-800" />
						<div class="px-4 py-3.5">
							<div class="flex items-center justify-between mb-2">
								<p class="text-xs font-medium text-gray-400">Soft range</p>
								<span class="text-xs font-semibold text-gray-200">
									Soft {settings.drillFilter.softMin}–Soft {settings.drillFilter.softMax}
								</span>
							</div>
							<RangeSlider
								min={13} max={20}
								low={settings.drillFilter.softMin}
								high={settings.drillFilter.softMax}
								onchange={(lo, hi) => settings.setDrillFilter({ softMin: lo, softMax: hi })}
							/>
						</div>
					{/if}

					{#if settings.drillFilter.handTypes.includes('pair')}
						<hr class="border-zinc-800" />
						<div class="px-4 py-3.5">
							<p class="mb-2.5 text-xs font-medium text-gray-400">Pair ranks</p>
							<div class="flex flex-wrap gap-1.5">
								{#each PAIR_RANKS as rank}
									<button
										onclick={() => togglePairRank(rank)}
										class="rounded-md px-2.5 py-1 text-xs font-semibold transition-colors
											{settings.drillFilter.pairRanks.includes(rank)
												? 'bg-white text-gray-900'
												: 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'}"
									>{rank === 'T' ? '10' : rank}</button>
								{/each}
							</div>
						</div>
					{/if}
				{/if}
			</div>
		</div>

		<!-- Appearance section -->
		<div class="mb-6">
			<p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
				Appearance
			</p>
			<div class="overflow-hidden rounded-xl bg-zinc-900 px-4 py-3.5">
				<div class="mb-3 flex items-center justify-between">
					<span class="text-sm font-medium text-gray-100">Animation speed</span>
					<span class="text-sm font-semibold text-gray-300">
						{SPEED_LABELS[settings.animationSpeed]}
					</span>
				</div>
				<input
					type="range"
					min="0"
					max="5"
					step="1"
					value={settings.animationSpeed}
					oninput={(e) => settings.setAnimationSpeed(Number((e.target as HTMLInputElement).value))}
					class="w-full accent-white"
				/>
				<div class="mt-1 flex justify-between text-[10px] text-gray-600">
					<span>Instant</span>
					<span>Slowest</span>
				</div>
			</div>
		</div>
	</div>
	</div>
</div>
