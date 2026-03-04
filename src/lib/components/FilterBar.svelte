<script lang="ts">
	import type { Editor } from '@tiptap/core';

	export type Filter = 'all' | 'incomplete' | 'completed';

	interface Props {
		editor: Editor | null;
		filter: Filter;
		onfilterchange: (filter: Filter) => void;
		tick?: number;
	}

	let { editor, filter, onfilterchange, tick = 0 }: Props = $props();

	let total = $derived.by(() => {
		void tick; // depend on tick to recalculate on every transaction
		if (!editor) return 0;
		let count = 0;
		editor.state.doc.descendants((node) => {
			if (node.type.name === 'taskItem') count++;
		});
		return count;
	});

	let completed = $derived.by(() => {
		void tick;
		if (!editor) return 0;
		let count = 0;
		editor.state.doc.descendants((node) => {
			if (node.type.name === 'taskItem' && node.attrs.checked) count++;
		});
		return count;
	});

	let incomplete = $derived(total - completed);

	let emptyMessage = $derived.by(() => {
		if (filter === 'incomplete' && incomplete === 0) return 'All tasks are done!';
		if (filter === 'completed' && completed === 0) return 'No completed tasks yet.';
		return null;
	});

	const filters: { value: Filter; label: string }[] = [
		{ value: 'all', label: 'All' },
		{ value: 'incomplete', label: 'Incomplete' },
		{ value: 'completed', label: 'Completed' }
	];
</script>

{#if total > 0}
	<div class="mb-2 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
		<div class="flex gap-1">
			{#each filters as f}
				<button
					onclick={() => onfilterchange(f.value)}
					class="rounded-md px-3 py-1 text-sm font-medium transition-colors"
					class:bg-white={filter === f.value}
					class:shadow-sm={filter === f.value}
					class:text-blue-700={filter === f.value}
					class:text-gray-500={filter !== f.value}
					class:hover:text-gray-700={filter !== f.value}
				>
					{f.label}
				</button>
			{/each}
		</div>
		<span class="text-sm text-gray-500">
			{completed} of {total} done
		</span>
	</div>
	{#if emptyMessage}
		<p class="mb-2 text-center text-sm text-gray-400">{emptyMessage}</p>
	{/if}
{/if}
