<script lang="ts">
	import type { ShoppingListMeta } from '$lib/utils/shopping-list';

	interface Props {
		meta: ShoppingListMeta;
		onsearch: () => void;
		onconfigure: () => void;
		searching?: boolean;
	}

	let { meta, onsearch, onconfigure, searching = false }: Props = $props();
	let menuOpen = $state(false);

	function handleSearch() {
		menuOpen = false;
		onsearch();
	}

	function handleConfigure() {
		menuOpen = false;
		onconfigure();
	}
</script>

<div class="relative inline-block">
	<button
		onclick={() => (menuOpen = !menuOpen)}
		class="flex items-center gap-1.5 rounded border border-purple-300 bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100"
		disabled={searching}
	>
		{#if searching}
			<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
				<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-25" />
				<path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="3" stroke-linecap="round" class="opacity-75" />
			</svg>
			Searching...
		{:else}
			<!-- Sparkle icon -->
			<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
				<path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
			</svg>
			AI · {meta.storeName}
		{/if}
	</button>

	{#if menuOpen && !searching}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="fixed inset-0 z-40"
			onclick={() => (menuOpen = false)}
		></div>
		<div class="absolute right-0 z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
			<button
				onclick={handleSearch}
				class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
			>
				<svg class="h-4 w-4 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="11" cy="11" r="8" />
					<path d="M21 21l-4.35-4.35" />
				</svg>
				Search for prices
			</button>
			<button
				onclick={handleConfigure}
				class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
			>
				<svg class="h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
					<path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
				</svg>
				Configure Shopping List
			</button>
		</div>
	{/if}
</div>
