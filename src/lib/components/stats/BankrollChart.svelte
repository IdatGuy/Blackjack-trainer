<script lang="ts">
	let {
		series,
		height = 220
	}: {
		series: Array<{ hand: number; pl: number }>;
		height?: number;
	} = $props();

	let container: HTMLDivElement | undefined = $state();
	let width = $state(300);

	$effect(() => {
		if (!container) return;
		const ro = new ResizeObserver(([e]) => {
			width = e.contentRect.width || 300;
		});
		ro.observe(container);
		return () => ro.disconnect();
	});

	const PAD_LEFT = 44;
	const PAD_RIGHT = 8;
	const PAD_TOP = 18;
	const PAD_BOTTOM = 24;

	const MAX_POINTS = 400;

	function downsample(pts: typeof series): typeof series {
		if (pts.length <= MAX_POINTS) return pts;
		const stride = Math.ceil(pts.length / MAX_POINTS);
		const result = [];
		for (let i = 0; i < pts.length; i += stride) result.push(pts[i]);
		if (result[result.length - 1] !== pts[pts.length - 1]) result.push(pts[pts.length - 1]);
		return result;
	}

	const points = $derived(downsample(series));
	const n = $derived(points.length);

	const innerW = $derived(width - PAD_LEFT - PAD_RIGHT);
	const innerH = $derived(height - PAD_TOP - PAD_BOTTOM);

	const minPL = $derived(n > 0 ? Math.min(0, ...points.map((p) => p.pl)) : 0);
	const maxPL = $derived(n > 0 ? Math.max(0, ...points.map((p) => p.pl)) : 1);
	const range = $derived(maxPL - minPL || 1);

	function xScale(i: number): number {
		if (n <= 1) return PAD_LEFT;
		return PAD_LEFT + (i / (n - 1)) * innerW;
	}

	function yScale(v: number): number {
		return PAD_TOP + ((maxPL - v) / range) * innerH;
	}

	const zeroY = $derived(yScale(0));

	const linePath = $derived(
		n === 0
			? ''
			: points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(p.pl).toFixed(1)}`).join(' ')
	);

	const areaPath = $derived(
		n === 0
			? ''
			: `${linePath} L ${xScale(n - 1).toFixed(1)} ${zeroY.toFixed(1)} L ${xScale(0).toFixed(1)} ${zeroY.toFixed(1)} Z`
	);

	function fmt(v: number): string {
		if (v === 0) return '0';
		const abs = Math.abs(v);
		const s = abs >= 1000 ? `${(abs / 1000).toFixed(1)}k` : String(Math.round(abs));
		return v < 0 ? `-${s}` : s;
	}

	const gradId = 'bankroll-area-grad';
</script>

<div bind:this={container} class="w-full">
	{#if n === 0}
		<div
			class="flex items-center justify-center rounded-lg bg-white/5"
			style="height:{height}px"
		>
			<span class="text-sm text-white/30">No bankroll data yet</span>
		</div>
	{:else}
		<svg
			{width}
			{height}
			viewBox="0 0 {width} {height}"
			class="overflow-visible"
			aria-label="Profit/Loss chart"
		>
			<defs>
				<linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="rgb(34,197,94)" stop-opacity="0.4" />
					<stop offset="100%" stop-color="rgb(34,197,94)" stop-opacity="0.04" />
				</linearGradient>
				<clipPath id="above-zero">
					<rect x={PAD_LEFT} y={PAD_TOP} width={innerW} height={zeroY - PAD_TOP} />
				</clipPath>
				<clipPath id="below-zero">
					<rect x={PAD_LEFT} y={zeroY} width={innerW} height={PAD_TOP + innerH - zeroY} />
				</clipPath>
			</defs>

			<!-- Zero baseline -->
			<line
				x1={PAD_LEFT}
				y1={zeroY}
				x2={PAD_LEFT + innerW}
				y2={zeroY}
				stroke="rgba(255,255,255,0.15)"
				stroke-width="1"
			/>

			<!-- Area fill -->
			<path d={areaPath} fill="url(#{gradId})" />

			<!-- Line stroke -->
			<path d={linePath} fill="none" stroke="rgb(34,197,94)" stroke-width="1.5" stroke-linejoin="round" />

			<!-- Y axis labels -->
			{#if maxPL !== 0}
				<text
					x={PAD_LEFT - 4}
					y={PAD_TOP + 4}
					text-anchor="end"
					class="fill-white/40"
					style="font-size:10px">{fmt(maxPL)}</text
				>
			{/if}
			<text
				x={PAD_LEFT - 4}
				y={zeroY + 4}
				text-anchor="end"
				class="fill-white/40"
				style="font-size:10px">0</text
			>
			{#if minPL !== 0}
				<text
					x={PAD_LEFT - 4}
					y={PAD_TOP + innerH + 4}
					text-anchor="end"
					class="fill-white/40"
					style="font-size:10px">{fmt(minPL)}</text
				>
			{/if}

			<!-- X axis label -->
			<text
				x={PAD_LEFT + innerW / 2}
				y={height - 4}
				text-anchor="middle"
				class="fill-white/40"
				style="font-size:10px">Hands Played</text
			>

			<!-- Y axis label (rotated) -->
			<text
				x={10}
				y={PAD_TOP + innerH / 2}
				text-anchor="middle"
				transform="rotate(-90, 10, {PAD_TOP + innerH / 2})"
				class="fill-white/30"
				style="font-size:9px">Profit / Loss</text
			>
		</svg>
	{/if}
</div>
