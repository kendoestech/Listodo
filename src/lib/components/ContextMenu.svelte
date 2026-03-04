<script lang="ts">
	import type { DriveFile } from '$lib/stores/files';

	interface Props {
		file: DriveFile;
		x: number;
		y: number;
		onrename: (file: DriveFile) => void;
		ondelete: (file: DriveFile) => void;
		onclose: () => void;
	}

	let { file, x, y, onrename, ondelete, onclose }: Props = $props();

	function handleRename() {
		onrename(file);
		onclose();
	}

	function handleDelete() {
		ondelete(file);
		onclose();
	}
</script>

<svelte:window onclick={onclose} onkeydown={(e) => e.key === 'Escape' && onclose()} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed z-50 min-w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
	style="left: {x}px; top: {y}px;"
	onclick={(e) => e.stopPropagation()}
>
	<button
		onclick={handleRename}
		class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
	>
		Rename
	</button>
	<button
		onclick={handleDelete}
		class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
	>
		Delete
	</button>
</div>
