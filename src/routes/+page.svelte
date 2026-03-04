<script lang="ts">
	import { auth, signOut } from '$lib/stores/auth';
	import { files, closeFile, saveFile, saveStatus } from '$lib/stores/files';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import FilterBar, { type Filter } from '$lib/components/FilterBar.svelte';
	import type { Editor as TiptapEditor } from '@tiptap/core';

	let sidebarOpen = $state(true);
	let filter = $state<Filter>('all');
	let editorInstance = $state<TiptapEditor | null>(null);
	let editorTick = $state(0);

	let openFileName = $derived.by(() => {
		if (!$files.openFileId) return null;
		const file = $files.currentFiles.find((f) => f.id === $files.openFileId);
		return file ? file.name.replace(/\.md$/i, '') : 'Untitled';
	});

	function closeSidebarOnMobile() {
		if (window.innerWidth < 768) {
			sidebarOpen = false;
		}
		filter = 'all';
	}

	function handleKeydown(e: KeyboardEvent) {
		const mod = e.ctrlKey || e.metaKey;
		if (mod && e.key === 's') {
			e.preventDefault(); // prevent browser save dialog
		}
		if (e.key === 'Escape' && $files.openFileId) {
			closeFile();
		}
		if (mod && e.key === 'b') {
			// Toggle sidebar
			e.preventDefault();
			sidebarOpen = !sidebarOpen;
		}
	}
</script>

<svelte:head>
	<title>{openFileName ? `Listodo - ${openFileName}` : 'Listodo'}</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="flex h-screen flex-col bg-gray-50">
	<!-- Header -->
	<header class="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
		<div class="flex min-w-0 items-center gap-3">
			<!-- Hamburger button (mobile) -->
			<button
				onclick={() => (sidebarOpen = !sidebarOpen)}
				class="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 md:hidden"
				aria-label="Toggle sidebar"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					{#if sidebarOpen}
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					{:else}
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					{/if}
				</svg>
			</button>
			<div class="flex min-w-0 items-center gap-1.5">
				<h1 class="shrink-0 text-xl font-bold text-gray-900">Listodo</h1>
				{#if openFileName}
					<span class="text-xl text-gray-300">-</span>
					<span class="truncate text-lg text-gray-600">{openFileName}</span>
				{/if}
			</div>
		</div>

		<div class="flex items-center gap-3">
			{#if openFileName}
				<button
					onclick={closeFile}
					class="rounded px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
				>
					Close
				</button>
			{/if}
			{#if $auth.user}
				<img src={$auth.user.picture} alt="" class="h-7 w-7 rounded-full" />
				<span class="hidden text-sm text-gray-600 sm:inline">{$auth.user.name}</span>
			{/if}
			<button
				onclick={signOut}
				class="rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
			>
				Sign out
			</button>
		</div>
	</header>

	<div class="relative flex flex-1 overflow-hidden">
		<!-- Sidebar -->
		<aside
			class="absolute inset-y-0 left-0 z-30 w-full border-r border-gray-200 bg-white p-4 transition-transform duration-200 md:relative md:z-0 md:w-80 md:translate-x-0"
			class:translate-x-0={sidebarOpen}
			class:-translate-x-full={!sidebarOpen}
		>
			<Sidebar onfileopen={closeSidebarOnMobile} />
		</aside>

		<!-- Content Panel -->
		<main class="flex-1 overflow-y-auto p-4 md:p-6">
			{#if $files.openFileId && $files.openFileContent !== null}
				<div class="mx-auto max-w-3xl">
					<FilterBar editor={editorInstance} {filter} onfilterchange={(f) => (filter = f)} tick={editorTick} />
					<Editor
						content={$files.openFileContent}
						onchange={saveFile}
						{filter}
						oneditor={(e) => (editorInstance = e)}
						ontick={() => editorTick++}
					/>
					<p class="mt-2 text-xs text-gray-400">
						{#if $saveStatus === 'saving'}
							Saving...
						{:else if $saveStatus === 'saved'}
							Saved to Google Drive
						{:else if $saveStatus === 'error'}
							<span class="text-red-500">Save failed</span>
						{:else}
							Auto-saves to Google Drive
						{/if}
					</p>
				</div>
			{:else}
				<div class="flex h-full items-center justify-center">
					<div class="text-center">
						<p class="text-lg text-gray-400">Select a list or create a new one</p>
						<button
							onclick={() => (sidebarOpen = true)}
							class="mt-2 text-sm text-blue-600 hover:underline md:hidden"
						>
							Open sidebar
						</button>
					</div>
				</div>
			{/if}
		</main>
	</div>
</div>
