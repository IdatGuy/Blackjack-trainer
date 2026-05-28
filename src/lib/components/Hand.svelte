<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { Card } from '$lib/engine/card.js';
	import { handValue, isBlackjack } from '$lib/engine/hand.js';
	import { game } from '$lib/stores/game.svelte.js';
	import CardComp from './Card.svelte';

	let {
		cards,
		hideSecond = false,
		label = '',
		showTotal = true
	}: {
		cards: Card[];
		hideSecond?: boolean;
		label?: string;
		showTotal?: boolean;
	} = $props();

	const animDuration = $derived(game.animDuration);

	const total = $derived(cards.length > 0 ? handValue(cards) : null);
	const bj = $derived(cards.length === 2 && isBlackjack(cards));
	const visibleTotal = $derived(hideSecond && cards.length >= 2 ? handValue([cards[0]]) : total);
</script>

<div class="flex flex-col items-center gap-2">
	{#if label}
		<span class="text-sm font-semibold uppercase tracking-widest text-gray-300">{label}</span>
	{/if}

	<div class="flex items-end justify-center">
		{#each cards as card, i (i)}
			<div class="card-offset" in:fly={{ y: -20, duration: animDuration }}>
				<CardComp {card} faceDown={hideSecond && i === 1} />
			</div>
		{/each}
		{#if cards.length === 0}
			<div style="height: var(--card-h, 140px); width: var(--card-w, 96px)"></div>
		{/if}
	</div>

	{#if showTotal && visibleTotal !== null && cards.length > 0}
		<span class="text-sm font-bold text-white">
			{#if bj && !hideSecond}
				Blackjack!
			{:else if hideSecond}
				{visibleTotal}
			{:else}
				{total}
			{/if}
		</span>
	{/if}
</div>

<style>
	.card-offset {
		margin-left: calc(-1 * var(--card-overlap, 64px));
	}
	.card-offset:first-child {
		margin-left: 0;
	}
</style>
