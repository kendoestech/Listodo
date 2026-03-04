<script lang="ts">
	import {
		files,
		folderPath,
		navigateToFolder,
		navigateUp,
		navigateToRoot,
		navigateToPathIndex,
		openFile,
		createNewFile,
		createNewFolder,
		removeFile,
		rename,
		type DriveFile
	} from '$lib/stores/files';
	import { isFolder } from '$lib/services/drive';
	import ContextMenu from './ContextMenu.svelte';

	interface Props {
		onfileopen?: () => void;
	}

	let { onfileopen }: Props = $props();

	let newFileName = $state('');
	let newFolderName = $state('');
	let showNewFile = $state(false);
	let showNewFolder = $state(false);

	// Context menu state
	let contextMenu = $state<{ file: DriveFile; x: number; y: number } | null>(null);

	// Rename state
	let renamingId = $state<string | null>(null);
	let renameValue = $state('');

	async function handleCreateFile() {
		if (!newFileName.trim()) return;
		const file = await createNewFile(newFileName.trim());
		if (file) {
			newFileName = '';
			showNewFile = false;
			await openFile(file.id);
			onfileopen?.();
		}
	}

	async function handleCreateFolder() {
		if (!newFolderName.trim()) return;
		await createNewFolder(newFolderName.trim());
		newFolderName = '';
		showNewFolder = false;
	}

	function handleContextMenu(e: MouseEvent, file: DriveFile) {
		e.preventDefault();
		contextMenu = { file, x: e.clientX, y: e.clientY };
	}

	function startRename(file: DriveFile) {
		renamingId = file.id;
		renameValue = file.name;
	}

	async function submitRename() {
		if (!renamingId || !renameValue.trim()) {
			renamingId = null;
			return;
		}
		await rename(renamingId, renameValue.trim());
		renamingId = null;
	}

	function handleRenameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') submitRename();
		if (e.key === 'Escape') renamingId = null;
	}

	async function confirmDelete(file: DriveFile) {
		if (confirm(`Delete "${file.name}"? It will be moved to trash.`)) {
			await removeFile(file.id);
		}
	}

	function displayName(name: string): string {
		return name.replace(/\.md$/i, '');
	}

	async function handleFileClick(file: DriveFile) {
		await openFile(file.id);
		onfileopen?.();
	}
</script>

<div class="flex h-full flex-col">
	<!-- Breadcrumb -->
	<div class="mb-3 flex flex-wrap items-center gap-1 text-sm">
		{#if $folderPath.length > 0}
			<button onclick={navigateToRoot} class="font-medium text-blue-600 hover:underline">
				Drive
			</button>
		{:else}
			<span class="font-medium text-gray-700">Drive</span>
		{/if}
		{#each $folderPath as folder, i}
			<span class="text-gray-400">/</span>
			{#if i < $folderPath.length - 1}
				<button onclick={() => navigateToPathIndex(i)} class="text-blue-600 hover:underline">
					{folder.name}
				</button>
			{:else}
				<span class="font-medium text-gray-700">{folder.name}</span>
			{/if}
		{/each}
	</div>

	{#if $folderPath.length > 0}
		<button
			onclick={navigateUp}
			class="mb-2 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back
		</button>
	{/if}

	<!-- Action buttons -->
	<div class="mb-3 flex gap-2">
		<button
			onclick={() => { showNewFile = !showNewFile; showNewFolder = false; }}
			class="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
		>
			+ List
		</button>
		<button
			onclick={() => { showNewFolder = !showNewFolder; showNewFile = false; }}
			class="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
		>
			+ Folder
		</button>
	</div>

	<!-- New file form -->
	{#if showNewFile}
		<form onsubmit={handleCreateFile} class="mb-3 flex gap-2">
			<input
				bind:value={newFileName}
				placeholder="List name"
				class="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
				autofocus
			/>
			<button type="submit" class="rounded bg-blue-600 px-2 py-1.5 text-sm text-white hover:bg-blue-700">
				OK
			</button>
			<button type="button" onclick={() => { showNewFile = false; newFileName = ''; }} class="text-sm text-gray-400 hover:text-gray-600">
				Cancel
			</button>
		</form>
	{/if}

	<!-- New folder form -->
	{#if showNewFolder}
		<form onsubmit={handleCreateFolder} class="mb-3 flex gap-2">
			<input
				bind:value={newFolderName}
				placeholder="Folder name"
				class="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
				autofocus
			/>
			<button type="submit" class="rounded bg-blue-600 px-2 py-1.5 text-sm text-white hover:bg-blue-700">
				OK
			</button>
			<button type="button" onclick={() => { showNewFolder = false; newFolderName = ''; }} class="text-sm text-gray-400 hover:text-gray-600">
				Cancel
			</button>
		</form>
	{/if}

	<!-- File list -->
	<div class="flex-1 overflow-y-auto">
		{#if $files.loading}
			<div class="space-y-2 py-2">
				{#each Array(4) as _}
					<div class="flex items-center gap-2 rounded-lg px-2 py-2">
						<div class="h-4 w-4 animate-pulse rounded bg-gray-200"></div>
						<div class="h-4 flex-1 animate-pulse rounded bg-gray-200"></div>
					</div>
				{/each}
			</div>
		{:else if $files.currentFiles.length === 0}
			<p class="py-4 text-center text-sm text-gray-400">
				Empty folder.<br />Create a list to get started.
			</p>
		{:else}
			<ul class="space-y-0.5">
				{#each $files.currentFiles as file}
					<li
						class="group flex items-center justify-between rounded-lg px-2 py-2 hover:bg-gray-100"
						class:bg-blue-50={!isFolder(file) && $files.openFileId === file.id}
						oncontextmenu={(e) => handleContextMenu(e, file)}
					>
						{#if renamingId === file.id}
							<input
								bind:value={renameValue}
								onblur={submitRename}
								onkeydown={handleRenameKeydown}
								class="flex-1 rounded border border-blue-400 px-2 py-0.5 text-sm focus:outline-none"
								autofocus
							/>
						{:else if isFolder(file)}
							<button
								onclick={() => navigateToFolder(file)}
								class="flex min-w-0 flex-1 items-center gap-2 text-sm text-gray-800"
							>
								<svg class="h-4 w-4 shrink-0 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
									<path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
								</svg>
								<span class="truncate">{file.name}</span>
							</button>
						{:else}
							<button
								onclick={() => handleFileClick(file)}
								class="flex min-w-0 flex-1 items-center gap-2 text-sm"
								class:text-blue-700={$files.openFileId === file.id}
								class:font-medium={$files.openFileId === file.id}
								class:text-gray-700={$files.openFileId !== file.id}
							>
								<svg class="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
								<span class="truncate">{displayName(file.name)}</span>
							</button>
						{/if}

						<!-- Three-dot menu button -->
						<button
							onclick={(e) => handleContextMenu(e, file)}
							class="shrink-0 rounded p-1 text-gray-400 opacity-0 hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100"
							title="More actions"
						>
							<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
								<path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
							</svg>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#if $files.error}
		<div class="mt-2 flex items-start gap-2 rounded bg-red-50 px-3 py-2">
			<p class="flex-1 text-sm text-red-600">{$files.error}</p>
			<button
				onclick={() => files.update((s) => ({ ...s, error: null }))}
				class="shrink-0 text-red-400 hover:text-red-600"
				aria-label="Dismiss error"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	{/if}
</div>

{#if contextMenu}
	<ContextMenu
		file={contextMenu.file}
		x={contextMenu.x}
		y={contextMenu.y}
		onrename={startRename}
		ondelete={confirmDelete}
		onclose={() => (contextMenu = null)}
	/>
{/if}
