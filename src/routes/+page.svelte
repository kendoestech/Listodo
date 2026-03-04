<script lang="ts">
	import { auth, signOut } from '$lib/stores/auth';
	import { files, closeFile, saveFile } from '$lib/stores/files';
	import Sidebar from '$lib/components/Sidebar.svelte';

	let sidebarOpen = $state(true);

	function closeSidebarOnMobile() {
		if (window.innerWidth < 768) {
			sidebarOpen = false;
		}
	}
</script>

<div class="flex h-screen flex-col bg-gray-50">
	<!-- Header -->
	<header class="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
		<div class="flex items-center gap-3">
			<!-- Hamburger button (mobile) -->
			<button
				onclick={() => (sidebarOpen = !sidebarOpen)}
				class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 md:hidden"
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
			<h1 class="text-xl font-bold text-gray-900">Listodo</h1>
		</div>

		<div class="flex items-center gap-3">
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
		<!-- Sidebar overlay (mobile) -->
		{#if sidebarOpen}
			<button
				onclick={() => (sidebarOpen = false)}
				class="fixed inset-0 z-20 bg-black/30 md:hidden"
				aria-label="Close sidebar"
			></button>
		{/if}

		<!-- Sidebar -->
		<aside
			class="absolute inset-y-0 left-0 z-30 w-72 border-r border-gray-200 bg-white p-4 transition-transform duration-200 md:relative md:z-0 md:translate-x-0"
			class:translate-x-0={sidebarOpen}
			class:-translate-x-full={!sidebarOpen}
		>
			<Sidebar onfileopen={closeSidebarOnMobile} />
		</aside>

		<!-- Content Panel -->
		<main class="flex-1 overflow-y-auto p-4 md:p-6">
			{#if $files.openFileId && $files.openFileContent !== null}
				<div class="mx-auto max-w-3xl">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-lg font-medium text-gray-800">
							{$files.currentFiles.find((f) => f.id === $files.openFileId)?.name || 'Untitled'}
						</h2>
						<button
							onclick={closeFile}
							class="rounded px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
						>
							Close
						</button>
					</div>
					<textarea
						value={$files.openFileContent}
						oninput={(e) => saveFile(e.currentTarget.value)}
						class="min-h-[60vh] w-full rounded-lg border border-gray-200 bg-white p-4 font-mono text-sm focus:border-blue-400 focus:outline-none"
						placeholder="Start writing..."
					></textarea>
					<p class="mt-2 text-xs text-gray-400">Auto-saves to Google Drive</p>
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
