<script lang="ts">
	import { auth, signOut } from '$lib/stores/auth';
	import { files, saveFile, saveStatus } from '$lib/stores/files';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import Toolbar from '$lib/components/Toolbar.svelte';
	import FilterBar, { type Filter } from '$lib/components/FilterBar.svelte';
	import ShoppingActions from '$lib/components/ShoppingActions.svelte';
	import type { Editor as TiptapEditor } from '@tiptap/core';
	import { fade } from 'svelte/transition';
	import {
		parseShoppingListMeta,
		extractItems,
		stripEnrichment,
		updateItemsWithResults,
		restoreDocument,
		type ShoppingListMeta
	} from '$lib/utils/shopping-list';

	const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

	let sidebarOpen = $state(true);
	let filter = $state<Filter>('all');
	let editing = $state(false);
	let editorInstance = $state<TiptapEditor | null>(null);
	let editorTick = $state(0);
	let aiSearching = $state(false);

	// Shopping list state — derived from the raw file content
	let shoppingMeta = $state<ShoppingListMeta | null>(null);

	// Parse frontmatter whenever file content changes
	$effect(() => {
		const raw = $files.openFileContent;
		if (raw) {
			shoppingMeta = parseShoppingListMeta(raw);
		} else {
			shoppingMeta = null;
		}
	});

	// Content to show in the editor (body without frontmatter for shopping lists)
	let editorContent = $derived(shoppingMeta ? shoppingMeta.body : ($files.openFileContent ?? ''));

	// Wrap saveFile to restore frontmatter for shopping lists
	function handleEditorChange(markdown: string) {
		if (shoppingMeta) {
			saveFile(restoreDocument(shoppingMeta.rawFrontmatter, markdown));
		} else {
			saveFile(markdown);
		}
	}

	async function handleShoppingSearch() {
		if (!shoppingMeta) return;
		aiSearching = true;
		try {
			// Strip existing enrichment to get clean item names
			const cleanBody = stripEnrichment(shoppingMeta.body);
			const items = extractItems(cleanBody);
			if (items.length === 0) return;

			const res = await fetch(`${BACKEND_URL}/api/shopping/search`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					storeUrl: shoppingMeta.store,
					storeName: shoppingMeta.storeName,
					fields: shoppingMeta.fields,
					items
				})
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: 'Search failed' }));
				throw new Error(err.error || 'Search failed');
			}

			const { results } = await res.json();

			// Update the body with enriched items
			const updatedBody = updateItemsWithResults(cleanBody, shoppingMeta.template, results);
			const fullDoc = restoreDocument(shoppingMeta.rawFrontmatter, updatedBody);
			saveFile(fullDoc);

			// Re-parse so editor picks up the new content
			shoppingMeta = parseShoppingListMeta(fullDoc);
		} catch (e) {
			console.error('Shopping search failed:', e);
			alert(e instanceof Error ? e.message : 'Shopping search failed');
		} finally {
			aiSearching = false;
		}
	}

	const DEFAULT_FRONTMATTER = `---
type: shopping-list
store: https://www.example.com
store-name: Store Name
template: |
  - [ ] {lg}{item}{/lg}\\
    {dim}{sm}{sku}{/sm}{/dim}\\
    {dim}{aisle}{/dim} {price}
---
`;

	function handleMakeShoppingList() {
		const raw = $files.openFileContent;
		if (!raw || shoppingMeta) return;
		const fullDoc = DEFAULT_FRONTMATTER + raw;
		saveFile(fullDoc);
		shoppingMeta = parseShoppingListMeta(fullDoc);
	}

	function handleConfigureShopping() {
		// TODO: Toggle frontmatter editing mode
		alert('Configure Shopping List — coming soon');
	}

	// Reset editing mode when switching files
	let prevFileId: string | null = null;
	$effect(() => {
		const currentId = $files.openFileId;
		if (currentId !== prevFileId) {
			prevFileId = currentId;
			editing = false;
		}
	});

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

<div class="flex h-screen flex-col bg-white md:bg-gray-50">
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
			{#if $auth.user}
				<img src={$auth.user.picture} alt="" class="h-7 w-7 rounded-full" />
				<span class="hidden text-sm text-gray-600 sm:inline">{$auth.user.name}</span>
			{/if}
			{#if shoppingMeta}
				<ShoppingActions
					meta={shoppingMeta}
					onsearch={handleShoppingSearch}
					onconfigure={handleConfigureShopping}
					searching={aiSearching}
				/>
			{:else if openFileName}
				<button
					onclick={handleMakeShoppingList}
					class="rounded border border-gray-300 px-2 py-1 text-sm text-gray-500 hover:bg-gray-50"
					title="Convert to shopping list"
				>
					🛒
				</button>
			{/if}
			{#if openFileName}
				<button
					onclick={() => (editing = !editing)}
					class="rounded border px-3 py-1 text-sm font-medium transition-colors"
					class:bg-blue-600={editing}
					class:text-white={editing}
					class:border-blue-600={editing}
					class:border-gray-300={!editing}
					class:text-gray-600={!editing}
					class:hover:bg-gray-50={!editing}
				>
					{editing ? 'Editing' : 'Edit'}
				</button>
			{/if}
		</div>
	</header>

	<div class="relative flex flex-1 overflow-hidden">
		<!-- Sidebar -->
		<aside
			class="absolute inset-y-0 left-0 z-30 w-full border-r border-gray-200 bg-white p-4 transition-transform duration-200 md:relative md:z-0 md:w-80 md:translate-x-0"
			class:translate-x-0={sidebarOpen}
			class:-translate-x-full={!sidebarOpen}
		>
			<Sidebar onfileopen={closeSidebarOnMobile} onsignout={signOut} />
		</aside>

		<!-- Content Panel -->
		<main class="flex-1 overflow-y-auto">
			{#if $files.openFileId && $files.openFileContent !== null}
				<!-- Sticky filter + toolbar zone -->
				<div class="sticky top-0 z-20 border-b border-gray-200 bg-gray-50">
					<div class="mx-auto max-w-3xl px-4 md:px-6">
						<FilterBar editor={editorInstance} {filter} onfilterchange={(f) => (filter = f)} tick={editorTick} />
						{#if editing}
							<Toolbar editor={editorInstance} />
						{/if}
					</div>
				</div>

				<!-- Document content -->
				<div class="md:px-6 md:pt-6">
					<div class="mx-auto max-w-3xl">
						<Editor
							content={editorContent}
							onchange={handleEditorChange}
							{filter}
							{editing}
							oneditor={(e) => (editorInstance = e)}
							ontick={() => editorTick++}
						/>
					</div>
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
			{#if $saveStatus !== 'idle'}
				<div
					class="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm shadow-lg {$saveStatus === 'error' ? 'bg-red-600/80 text-white' : 'bg-black/60 text-white'}"
					transition:fade={{ duration: 150 }}
				>
					{#if $saveStatus === 'saving'}
						Saving...
					{:else if $saveStatus === 'saved'}
						Saved to Google Drive
					{:else if $saveStatus === 'error'}
						Save failed
					{/if}
				</div>
			{/if}
		</main>
	</div>
</div>
