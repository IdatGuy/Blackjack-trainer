<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { settings } from '$lib/stores/settings.svelte.js';

	let { children } = $props();

	const SPEEDS = [0, 80, 160, 250, 400, 600];
	const animDuration = $derived(SPEEDS[settings.animationSpeed] ?? 0);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<div class="phone-frame" style="--anim-duration: {animDuration}ms">{@render children()}</div>
