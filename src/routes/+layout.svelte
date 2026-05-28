<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { settings } from '$lib/stores/settings.svelte.js';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';

	let { children } = $props();

	const SPEEDS = [0, 160, 400, 600, 900, 1300, 1800, 2400, 3200];
	const animDuration = $derived(SPEEDS[settings.animationSpeed] ?? 0);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<div class="phone-frame" style="--anim-duration: {animDuration}ms">{@render children()}</div>
<InstallPrompt />
