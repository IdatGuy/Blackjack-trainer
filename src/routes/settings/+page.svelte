<script lang="ts">
	import { goto } from '$app/navigation';
	import { settings } from '$lib/stores/settings.svelte.js';
	import { PAIR_RANKS } from '$lib/engine/synthesizer.js';
	import type { Rank } from '$lib/engine/card.js';
	import RangeSlider from '$lib/components/RangeSlider.svelte';
	import ToggleSwitch from '$lib/components/ToggleSwitch.svelte';
	import { PRESETS } from '$lib/presets.js';

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
		<!-- Presets section -->
		<div class="mb-6">
			<p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Presets</p>
			<div class="grid grid-cols-2 gap-2">
				{#each PRESETS as preset}
					<button
						onclick={() => settings.applyPreset(preset)}
						class="overflow-hidden rounded-xl bg-zinc-900 px-4 py-3.5 text-left transition-colors hover:bg-zinc-800 active:bg-zinc-700"
					>
						<p class="text-sm font-medium text-gray-100">{preset.label}</p>
						<p class="mt-0.5 text-xs text-gray-500">{preset.description}</p>
					</button>
				{/each}
			</div>
		</div>

		<!-- Gameplay section -->
		<div class="mb-6">
			<p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
				Gameplay
			</p>
			<div class="overflow-hidden rounded-xl bg-zinc-900">
				<label class="flex cursor-pointer items-center justify-between px-4 py-3.5">
					<span class="text-sm font-medium text-gray-100">Show feedback</span>
					<ToggleSwitch checked={settings.showFeedback} onchange={(v) => settings.setShowFeedback(v)} />
				</label>
				<hr class="border-zinc-800" />
				<label class="flex cursor-pointer items-center justify-between px-4 py-3.5 transition-opacity {settings.weaknessWeighting ? 'pointer-events-none opacity-40' : ''}">
					<div>
						<span class="text-sm font-medium text-gray-100">Betting</span>
						{#if settings.weaknessWeighting}
							<p class="text-xs text-gray-500 mt-0.5">Disabled while prioritizing weak hands.</p>
						{/if}
					</div>
					<ToggleSwitch checked={settings.bettingEnabled} onchange={(v) => settings.setBettingEnabled(v)} />
				</label>
				<hr class="border-zinc-800" />
				<label class="flex cursor-pointer items-center justify-between px-4 py-3.5">
					<span class="text-sm font-medium text-gray-100">Show hand total</span>
					<ToggleSwitch checked={settings.showHandTotal} onchange={(v) => settings.setShowHandTotal(v)} />
				</label>
				<hr class="border-zinc-800" />
				<label class="flex cursor-pointer items-center justify-between px-4 py-3.5">
					<span class="text-sm font-medium text-gray-100">Show hint button</span>
					<ToggleSwitch checked={settings.showHintButton} onchange={(v) => settings.setShowHintButton(v)} />
				</label>
				<hr class="border-zinc-800" />
				<label class="flex cursor-pointer items-center justify-between px-4 py-3.5">
					<span class="text-sm font-medium text-gray-100">Show strategy chart button</span>
					<ToggleSwitch checked={settings.showStrategyChart} onchange={(v) => settings.setShowStrategyChart(v)} />
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
					<ToggleSwitch checked={settings.countingEnabled} onchange={(v) => settings.setCountingEnabled(v)} />
				</label>
				<hr class="border-zinc-800" />
				<div class="flex items-center justify-between px-4 py-3.5 transition-opacity {!settings.countingEnabled ? 'pointer-events-none opacity-40' : ''}">
					<span class="text-sm font-medium text-gray-100">Count display</span>
					<div class="flex gap-1 rounded-lg bg-zinc-800 p-0.5">
						{#each ([['rc', 'RC'], ['tc', 'TC'], ['div', 'Div']] as const) as [key, label]}
							<button
								onclick={() => settings.toggleCountDisplay(key)}
								class="rounded-md px-2.5 py-1 text-xs font-semibold transition-colors
									{settings.countDisplay[key]
										? 'bg-white text-gray-900'
										: 'text-gray-400 hover:text-gray-200'}"
							>{label}</button>
						{/each}
					</div>
				</div>
				<hr class="border-zinc-800" />
				<label class="flex cursor-pointer items-center justify-between px-4 py-3.5 transition-opacity {!settings.countingEnabled ? 'pointer-events-none opacity-40' : ''}">
					<span class="text-sm font-medium text-gray-100">Highlight active deviations</span>
					<ToggleSwitch checked={settings.highlightActiveDeviations} onchange={(v) => settings.setHighlightActiveDeviations(v)} />
				</label>
				<hr class="border-zinc-800" />
				<label class="flex cursor-pointer items-center justify-between px-4 py-3.5 transition-opacity {!settings.countingEnabled || settings.weaknessWeighting ? 'pointer-events-none opacity-40' : ''}">
					<div>
						<span class="text-sm font-medium text-gray-100">Count challenge</span>
						<p class="text-xs text-gray-500 mt-0.5">{settings.weaknessWeighting ? 'Disabled while prioritizing weak hands.' : 'Periodically quiz your running count between hands.'}</p>
					</div>
					<ToggleSwitch checked={settings.countPopupEnabled} onchange={(v) => settings.setCountPopupEnabled(v)} class="ml-3 shrink-0" />
				</label>
				{#if settings.countingEnabled && settings.countPopupEnabled}
					<hr class="border-zinc-800" />
					<div class="px-4 py-3.5">
						<div class="flex items-center justify-between mb-2">
							<p class="text-xs font-medium text-gray-400">Frequency</p>
							<span class="text-xs font-semibold text-gray-200">Every ~{settings.countPopupFrequency} hands</span>
						</div>
						<input
							type="range"
							min="1" max="20" step="1"
							value={settings.countPopupFrequency}
							oninput={(e) => settings.setCountPopupFrequency(+(e.target as HTMLInputElement).value)}
							class="w-full accent-white"
						/>
					</div>
					<hr class="border-zinc-800" />
					<div class="px-4 py-3.5">
						<div class="flex items-center justify-between mb-2">
							<p class="text-xs font-medium text-gray-400">Variance</p>
							<span class="text-xs font-semibold text-gray-200">±{settings.countPopupWindow} hands</span>
						</div>
						<input
							type="range"
							min="0" max="5" step="1"
							value={settings.countPopupWindow}
							oninput={(e) => settings.setCountPopupWindow(+(e.target as HTMLInputElement).value)}
							class="w-full accent-white"
						/>
					</div>
				{/if}
			</div>
			<p class="mt-2 px-1 text-xs text-gray-500">
				Hi-Lo system. Decks remaining rounds to the nearest 0.5 using the quarter-deck as the midpoint (e.g. 2.7 remaining &rarr; divisor 2.5; 2.8 remaining &rarr; divisor 3.0). True count truncates toward zero &mdash; RC 8 &divide; 3 decks = TC 2, not 3; RC &minus;7 &divide; 3 = TC &minus;2, not &minus;3.
			</p>
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
					<ToggleSwitch checked={settings.weaknessWeighting} onchange={(v) => settings.setWeaknessWeighting(v)} class="ml-3 shrink-0" />
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
