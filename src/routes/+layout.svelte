<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import LoginPage from '$lib/components/LoginPage.svelte';
	import { auth, initialize } from '$lib/stores/auth';
	import { initializeDrive, resetFiles } from '$lib/stores/files';
	import { onMount } from 'svelte';

	let { children } = $props();
	let driveReady = $state(false);

	onMount(() => {
		initialize();
	});

	// Initialize Drive when auth succeeds
	$effect(() => {
		if ($auth.authenticated && !driveReady) {
			initializeDrive().then(() => {
				driveReady = true;
			});
		}
		if (!$auth.authenticated && driveReady) {
			resetFiles();
			driveReady = false;
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if $auth.loading && !$auth.initialized}
	<div class="flex min-h-screen flex-col items-center justify-center bg-gray-50">
		<div class="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
		<p class="mt-3 text-sm text-gray-500">Loading...</p>
	</div>
{:else if !$auth.authenticated}
	<LoginPage />
{:else if !driveReady}
	<div class="flex min-h-screen flex-col items-center justify-center bg-gray-50">
		<div class="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
		<p class="mt-3 text-sm text-gray-500">Connecting to Google Drive...</p>
	</div>
{:else}
	{@render children()}
{/if}
