<script lang="ts">
	import { goto } from '$app/navigation';
	import { settings } from '$lib/stores/settings.svelte.js';

	const SPEED_LABELS = ['Instant', '1', '2', '3', '4', '5'];
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<header class="flex items-center gap-3 border-b border-gray-800 bg-black/40 px-3 py-2">
		<button
			onclick={() => goto('/')}
			class="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg font-bold text-gray-900 hover:bg-gray-100 active:bg-gray-200"
			aria-label="Back"
		>
			←
		</button>
		<span class="text-base font-semibold text-white">Settings</span>
	</header>

	<!-- Settings content -->
	<div class="flex-1 overflow-y-auto px-4 py-4">
		<!-- Gameplay section -->
		<div class="mb-6">
			<p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
				Gameplay
			</p>
			<div class="overflow-hidden rounded-xl bg-gray-900">
				<label class="flex cursor-pointer items-center justify-between px-4 py-3.5">
					<span class="text-sm font-medium text-gray-100">Show feedback</span>
					<button
						role="switch"
						aria-checked={settings.showFeedback}
						onclick={() => settings.setShowFeedback(!settings.showFeedback)}
						class="relative h-6 w-11 rounded-full transition-colors focus:outline-none {settings.showFeedback
							? 'bg-green-500'
							: 'bg-gray-600'}"
					>
						<span
							class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform {settings.showFeedback
								? 'translate-x-5'
								: 'translate-x-0'}"
						></span>
					</button>
				</label>
			</div>
		</div>

		<!-- Appearance section -->
		<div class="mb-6">
			<p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
				Appearance
			</p>
			<div class="overflow-hidden rounded-xl bg-gray-900 px-4 py-3.5">
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
