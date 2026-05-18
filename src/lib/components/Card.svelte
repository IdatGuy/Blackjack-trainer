<script lang="ts">
	import type { Card } from '$lib/engine/card.js';
	import { settings } from '$lib/stores/settings.svelte.js';

	let { card, faceDown = false }: { card: Card | null; faceDown?: boolean } = $props();

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
	const flipMs = $derived(settings.animDuration);
</script>

<div
	class="card-flipper"
	class:is-face-down={faceDown}
	style="--flip-ms: {flipMs}ms"
>
	<!-- Back face — visible when faceDown=true (rotated to front) -->
	<div
		class="card-face card-back relative flex items-center justify-center overflow-hidden rounded-xl border border-gray-700 shadow-md"
		style="background-color: #166534;"
	>
		<div
			class="absolute inset-0 opacity-25"
			style="background-image: repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%), repeating-linear-gradient(-45deg, #fff 0, #fff 1px, transparent 0, transparent 50%); background-size: 12px 12px;"
		></div>
		<div class="relative h-16 w-11 rounded-sm border-2 border-white/30"></div>
	</div>

	<!-- Front face — visible when faceDown=false -->
	{#if card !== null}
		<div
			class="card-face card-front relative flex flex-col rounded-xl border border-gray-200 bg-white shadow-md"
			class:text-red-600={isRed}
			class:text-gray-900={!isRed}
		>
			<div class="flex flex-col items-start px-2 pt-1.5 leading-none">
				<span class="text-sm font-black leading-none">{RANK_LABEL[card.rank]}</span>
				<span class="text-xs font-semibold leading-none">{SUIT_SYMBOL[card.suit]}</span>
			</div>
			<div class="flex flex-1 items-center justify-center text-[38px] leading-none">
				{SUIT_SYMBOL[card.suit]}
			</div>
			<div class="flex rotate-180 flex-col items-start px-2 pb-1.5 leading-none">
				<span class="text-sm font-black leading-none">{RANK_LABEL[card.rank]}</span>
				<span class="text-xs font-semibold leading-none">{SUIT_SYMBOL[card.suit]}</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.card-flipper {
		position: relative;
		width: 96px;
		height: 140px;
		flex-shrink: 0;
		transform-style: preserve-3d;
		transition: transform var(--flip-ms, 250ms) ease;
	}
	.card-flipper.is-face-down {
		transform: rotateY(180deg);
	}
	.card-face {
		position: absolute;
		inset: 0;
		backface-visibility: hidden;
	}
	.card-back {
		transform: rotateY(180deg);
	}
</style>
