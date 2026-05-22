<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	const DISMISSED_KEY = 'bj-pwa-install-dismissed';

	let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);
	let show = $state(false);

	onMount(() => {
		if (!browser) return;
		if (localStorage.getItem(DISMISSED_KEY)) return;
		if (window.matchMedia('(display-mode: standalone)').matches) return;

		const handler = (e: Event) => {
			e.preventDefault();
			deferredPrompt = e as BeforeInstallPromptEvent;
			show = true;
		};

		window.addEventListener('beforeinstallprompt', handler);
		return () => window.removeEventListener('beforeinstallprompt', handler);
	});

	async function install() {
		if (!deferredPrompt) return;
		deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;
		deferredPrompt = null;
		show = false;
		if (outcome === 'dismissed') persist();
	}

	function dismiss() {
		show = false;
		persist();
	}

	function persist() {
		if (browser) localStorage.setItem(DISMISSED_KEY, '1');
	}
</script>

{#if show}
	<div
		class="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-4 shadow-2xl"
		role="banner"
		aria-label="Install app"
	>
		<div class="flex items-start gap-3">
			<img
				src="/pwa-192x192.png"
				alt=""
				class="h-10 w-10 flex-shrink-0 rounded-xl"
				aria-hidden="true"
			/>
			<div class="min-w-0 flex-1">
				<p class="text-sm font-semibold text-white">Install Blackjack Trainer</p>
				<p class="mt-0.5 text-xs text-gray-400">Add to home screen for offline play</p>
			</div>
			<button
				onclick={dismiss}
				class="flex-shrink-0 p-1 text-gray-500 hover:text-gray-300"
				aria-label="Dismiss"
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 14 14"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
				>
					<path d="M1 1l12 12M13 1L1 13" />
				</svg>
			</button>
		</div>
		<button
			onclick={install}
			class="mt-3 w-full rounded-xl bg-white py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-100 active:bg-gray-200"
		>
			Install
		</button>
	</div>
{/if}
