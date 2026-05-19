<script lang="ts">
	let { title, children }: { title: string; children: import('svelte').Snippet } = $props();
</script>

<section class="mb-8">
	<h2 class="mb-2 text-xl font-semibold text-white">{title}</h2>
	<hr class="mb-4 border-white/10" />
	{@render children()}
</section>
