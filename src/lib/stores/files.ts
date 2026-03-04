import { writable, get } from 'svelte/store';
import {
	loadDriveApi,
	ensureRootFolder,
	listFiles as driveListFiles,
	getFileContent as driveGetContent,
	createFile as driveCreateFile,
	updateFileContent as driveUpdateContent,
	createFolder as driveCreateFolder,
	deleteFile as driveDeleteFile,
	renameFile as driveRenameFile,
	getRootFolderId,
	type DriveFile
} from '$lib/services/drive';
import {
	getCachedListing,
	setCachedListing,
	invalidateListing,
	getCachedContent,
	setCachedContent,
	invalidateContent,
	clearCache
} from '$lib/services/cache';

export type { DriveFile };

interface FilesState {
	rootFolderId: string | null;
	currentFolderId: string | null;
	currentFiles: DriveFile[];
	openFileId: string | null;
	openFileContent: string | null;
	loading: boolean;
	error: string | null;
}

const initialState: FilesState = {
	rootFolderId: null,
	currentFolderId: null,
	currentFiles: [],
	openFileId: null,
	openFileContent: null,
	loading: false,
	error: null
};

export const files = writable<FilesState>(initialState);

// Save status: 'idle' | 'saving' | 'saved' | 'error'
export const saveStatus = writable<'idle' | 'saving' | 'saved' | 'error'>('idle');
let savedTimeout: ReturnType<typeof setTimeout> | null = null;

// Track folder navigation history for breadcrumbs
export const folderPath = writable<DriveFile[]>([]);

export async function initializeDrive(): Promise<void> {
	files.update((s) => ({ ...s, loading: true, error: null }));

	try {
		await loadDriveApi();
		const rootId = await ensureRootFolder();
		files.update((s) => ({ ...s, rootFolderId: rootId, currentFolderId: rootId }));
		await loadFolder(rootId);
	} catch (e) {
		files.update((s) => ({
			...s,
			loading: false,
			error: e instanceof Error ? e.message : 'Failed to initialize Drive'
		}));
	}
}

export async function loadFolder(folderId: string): Promise<void> {
	files.update((s) => ({ ...s, loading: true, error: null }));

	try {
		const cached = getCachedListing(folderId);
		if (cached) {
			files.update((s) => ({
				...s,
				currentFolderId: folderId,
				currentFiles: cached,
				loading: false
			}));
			return;
		}

		const listing = await driveListFiles(folderId);
		setCachedListing(folderId, listing);

		files.update((s) => ({
			...s,
			currentFolderId: folderId,
			currentFiles: listing,
			loading: false
		}));
	} catch (e) {
		files.update((s) => ({
			...s,
			loading: false,
			error: e instanceof Error ? e.message : 'Failed to load folder'
		}));
	}
}

export async function navigateToFolder(folder: DriveFile): Promise<void> {
	folderPath.update((path) => [...path, folder]);
	await loadFolder(folder.id);
}

export async function navigateUp(): Promise<void> {
	const path = get(folderPath);
	if (path.length === 0) return;

	const newPath = path.slice(0, -1);
	folderPath.set(newPath);

	const parentId = newPath.length > 0 ? newPath[newPath.length - 1].id : get(files).rootFolderId;
	if (parentId) {
		await loadFolder(parentId);
	}
}

export async function navigateToRoot(): Promise<void> {
	folderPath.set([]);
	const rootId = get(files).rootFolderId;
	if (rootId) {
		await loadFolder(rootId);
	}
}

export async function openFile(fileId: string): Promise<void> {
	files.update((s) => ({ ...s, loading: true, error: null }));

	try {
		const cached = getCachedContent(fileId);
		if (cached !== null) {
			files.update((s) => ({
				...s,
				openFileId: fileId,
				openFileContent: cached,
				loading: false
			}));
			return;
		}

		const content = await driveGetContent(fileId);
		setCachedContent(fileId, content);

		files.update((s) => ({
			...s,
			openFileId: fileId,
			openFileContent: content,
			loading: false
		}));
	} catch (e) {
		files.update((s) => ({
			...s,
			loading: false,
			error: e instanceof Error ? e.message : 'Failed to open file'
		}));
	}
}

export function closeFile(): void {
	files.update((s) => ({ ...s, openFileId: null, openFileContent: null }));
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export function saveFile(content: string): void {
	const state = get(files);
	if (!state.openFileId) return;

	// Update local state immediately
	files.update((s) => ({ ...s, openFileContent: content }));
	setCachedContent(state.openFileId, content);

	// Debounced save to Drive
	if (saveTimeout) clearTimeout(saveTimeout);
	if (savedTimeout) clearTimeout(savedTimeout);
	saveStatus.set('saving');

	saveTimeout = setTimeout(async () => {
		const fileId = get(files).openFileId;
		if (!fileId) return;

		try {
			await driveUpdateContent(fileId, content);
			saveStatus.set('saved');
			savedTimeout = setTimeout(() => saveStatus.set('idle'), 2000);
		} catch (e) {
			saveStatus.set('error');
			files.update((s) => ({
				...s,
				error: e instanceof Error ? e.message : 'Failed to save'
			}));
		}
	}, 1500);
}

export async function createNewFile(name: string): Promise<DriveFile | null> {
	const state = get(files);
	const parentId = state.currentFolderId;
	if (!parentId) return null;

	try {
		const file = await driveCreateFile(name, `# ${name}\n\n- [ ] \n`, parentId);
		invalidateListing(parentId);
		await loadFolder(parentId);
		return file;
	} catch (e) {
		files.update((s) => ({
			...s,
			error: e instanceof Error ? e.message : 'Failed to create file'
		}));
		return null;
	}
}

export async function createNewFolder(name: string): Promise<DriveFile | null> {
	const state = get(files);
	const parentId = state.currentFolderId;
	if (!parentId) return null;

	try {
		const folder = await driveCreateFolder(name, parentId);
		invalidateListing(parentId);
		await loadFolder(parentId);
		return folder;
	} catch (e) {
		files.update((s) => ({
			...s,
			error: e instanceof Error ? e.message : 'Failed to create folder'
		}));
		return null;
	}
}

export async function removeFile(fileId: string): Promise<void> {
	const state = get(files);

	try {
		await driveDeleteFile(fileId);
		invalidateContent(fileId);
		if (state.currentFolderId) {
			invalidateListing(state.currentFolderId);
			await loadFolder(state.currentFolderId);
		}
		if (state.openFileId === fileId) {
			closeFile();
		}
	} catch (e) {
		files.update((s) => ({
			...s,
			error: e instanceof Error ? e.message : 'Failed to delete'
		}));
	}
}

export async function rename(fileId: string, newName: string): Promise<void> {
	const state = get(files);

	try {
		await driveRenameFile(fileId, newName);
		if (state.currentFolderId) {
			invalidateListing(state.currentFolderId);
			await loadFolder(state.currentFolderId);
		}
	} catch (e) {
		files.update((s) => ({
			...s,
			error: e instanceof Error ? e.message : 'Failed to rename'
		}));
	}
}

export function resetFiles(): void {
	clearCache();
	files.set(initialState);
	folderPath.set([]);
}
