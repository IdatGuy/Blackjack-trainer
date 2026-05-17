<script lang="ts">
	import type { Card } from '$lib/engine/card.js';

	let { card }: { card: Card | null } = $props();

	const SUIT_SYMBOL: Record<string, string> = {
		S: '♠',
		H: '♥',
		D: '♦',
		C: '♣'
	};

	const RANK_LABEL: Record<string, string> = {
		A: 'A',
		'2': '2',
		'3': '3',
		'4': '4',
		'5': '5',
		'6': '6',
		'7': '7',
		'8': '8',
		'9': '9',
		T: '10',
		J: 'J',
		Q: 'Q',
		K: 'K'
	};

	const isRed = $derived(card !== null && (card.suit === 'H' || card.suit === 'D'));
</script>

{#if card === null}
	<!-- Face-down back -->
	<div
		class="card-back relative flex h-[90px] w-[60px] flex-shrink-0 items-center justify-center rounded-lg border border-green-600 bg-green-900 shadow-md"
	>
		<div class="h-10 w-7 rounded border-2 border-green-600 opacity-40"></div>
	</div>
{:else}
	<!-- Face-up card -->
	<div
		class="relative flex h-[90px] w-[60px] flex-shrink-0 flex-col rounded-lg border border-gray-200 bg-white shadow-md"
		class:text-red-600={isRed}
		class:text-gray-900={!isRed}
	>
		<!-- Top-left rank + suit -->
		<div class="flex flex-col items-start px-1 pt-0.5 leading-none">
			<span class="text-xs font-bold leading-none">{RANK_LABEL[card.rank]}</span>
			<span class="text-[10px] leading-none">{SUIT_SYMBOL[card.suit]}</span>
		</div>
		<!-- Center suit -->
		<div class="flex flex-1 items-center justify-center text-2xl">
			{SUIT_SYMBOL[card.suit]}
		</div>
		<!-- Bottom-right rank + suit (rotated) -->
		<div class="flex rotate-180 flex-col items-start px-1 pb-0.5 leading-none">
			<span class="text-xs font-bold leading-none">{RANK_LABEL[card.rank]}</span>
			<span class="text-[10px] leading-none">{SUIT_SYMBOL[card.suit]}</span>
		</div>
	</div>
{/if}
