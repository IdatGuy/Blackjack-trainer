<script lang="ts">
	type Filter = 'today' | 'week' | 'month' | 'all';

	let {
		value,
		onchange
	}: {
		value: Filter;
		onchange: (v: Filter) => void;
	} = $props();

	const options: { label: string; value: Filter }[] = [
		{ label: 'Today', value: 'today' },
		{ label: 'Week', value: 'week' },
		{ label: 'Month', value: 'month' },
		{ label: 'All Time', value: 'all' }
	];
</script>

<div class="mb-6 flex gap-2">
	{#each options as opt}
		<button
			onclick={() => onchange(opt.value)}
			class="flex-1 rounded-lg border px-2 py-1.5 text-sm font-medium transition-colors
				{value === opt.value
				? 'border-white/20 bg-white/15 text-white'
				: 'border-white/15 bg-transparent text-white/50'}"
		>
			{opt.label}
		</button>
	{/each}
</div>
