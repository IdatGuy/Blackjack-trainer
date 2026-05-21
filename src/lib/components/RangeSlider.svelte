<script lang="ts">
	let { min, max, low, high, onchange }: {
		min: number;
		max: number;
		low: number;
		high: number;
		onchange: (low: number, high: number) => void;
	} = $props();

	const pct = (v: number) => ((v - min) / (max - min)) * 100;

	const trackStyle = $derived(
		`background: linear-gradient(to right, #3f3f46 ${pct(low)}%, white ${pct(low)}%, white ${pct(high)}%, #3f3f46 ${pct(high)}%)`
	);
</script>

<div class="range-slider" style={trackStyle}>
	<input
		type="range" {min} {max} step="1"
		value={low}
		oninput={(e) => {
			const el = e.target as HTMLInputElement;
			const clamped = Math.min(Number(el.value), high);
			el.value = String(clamped);
			onchange(clamped, high);
		}}
		style="z-index: {low >= max ? 5 : 3}"
	/>
	<input
		type="range" {min} {max} step="1"
		value={high}
		oninput={(e) => {
			const el = e.target as HTMLInputElement;
			const clamped = Math.max(Number(el.value), low);
			el.value = String(clamped);
			onchange(low, clamped);
		}}
		style="z-index: 4"
	/>
</div>

<style>
	.range-slider {
		position: relative;
		height: 4px;
		border-radius: 2px;
		margin: 10px 0;
	}

	input[type='range'] {
		position: absolute;
		top: 50%;
		left: 0;
		width: 100%;
		transform: translateY(-50%);
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		pointer-events: none;
		height: 4px;
		margin: 0;
	}

	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: white;
		cursor: pointer;
		pointer-events: all;
	}

	input[type='range']::-moz-range-thumb {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: white;
		cursor: pointer;
		pointer-events: all;
		border: none;
	}
</style>
