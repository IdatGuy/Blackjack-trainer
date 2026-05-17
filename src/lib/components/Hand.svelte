<script lang="ts">
	import type { Card } from '$lib/engine/card.js';
	import { handValue, isBlackjack } from '$lib/engine/hand.js';
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

	const total = $derived(cards.length > 0 ? handValue(cards) : null);
	const bj = $derived(cards.length === 2 && isBlackjack(cards));
	// During hideSecond, only count the visible card for the total display
	const visibleTotal = $derived(hideSecond && cards.length >= 2 ? handValue([cards[0]]) : total);
</script>

<div class="flex flex-col items-center gap-2">
	{#if label}
		<span class="text-sm font-semibold uppercase tracking-widest text-green-200">{label}</span>
	{/if}

	<div class="flex items-end gap-[-8px] justify-center" style="gap: -8px;">
		{#each cards as card, i}
			<div class="-ml-3 first:ml-0">
				<CardComp card={hideSecond && i === 1 ? null : card} />
			</div>
		{/each}
		{#if cards.length === 0}
			<!-- empty placeholder to keep height -->
			<div class="h-[90px] w-[60px]"></div>
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
