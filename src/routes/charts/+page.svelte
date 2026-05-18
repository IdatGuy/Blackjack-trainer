<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div class="flex h-full flex-col">
	<header class="flex items-center gap-3 border-b border-gray-800 bg-black/40 px-3 py-2">
		<button
			onclick={() => goto('/')}
			class="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg font-bold text-gray-900 hover:bg-gray-100 active:bg-gray-200"
			aria-label="Back"
		>
			←
		</button>
		<span class="text-base font-semibold text-white">Charts</span>
	</header>

	<div class="flex flex-1 items-center justify-center">
		<p class="text-sm text-gray-500">Coming soon</p>
	</div>
</div>
