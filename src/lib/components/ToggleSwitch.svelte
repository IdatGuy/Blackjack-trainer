<script lang="ts">
	let {
		checked,
		onchange,
		class: extraClass = ''
	}: { checked: boolean; onchange: (v: boolean) => void; class?: string } = $props();
</script>

<!-- svelte-ignore a11y_consider_explicit_label -->
<button
	role="switch"
	aria-checked={checked}
	onclick={(e) => { e.stopPropagation(); onchange(!checked); }}
	class="relative h-6 w-11 rounded-full transition-colors focus:outline-none {extraClass} {checked
		? 'bg-green-500'
		: 'bg-zinc-600'}"
>
	<span
		class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform {checked
			? 'translate-x-5'
			: 'translate-x-0'}"
	></span>
</button>
