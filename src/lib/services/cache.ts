import type { DriveFile } from './drive';

interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

const TTL = 30_000; // 30 seconds

const folderListings = new Map<string, CacheEntry<DriveFile[]>>();
const fileContents = new Map<string, CacheEntry<string>>();

function isValid<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
	return !!entry && Date.now() - entry.timestamp < TTL;
}

// Folder listing cache
export function getCachedListing(folderId: string): DriveFile[] | null {
	const entry = folderListings.get(folderId);
	return isValid(entry) ? entry.data : null;
}

export function setCachedListing(folderId: string, files: DriveFile[]): void {
	folderListings.set(folderId, { data: files, timestamp: Date.now() });
}

export function invalidateListing(folderId: string): void {
	folderListings.delete(folderId);
}

// File content cache
export function getCachedContent(fileId: string): string | null {
	const entry = fileContents.get(fileId);
	return isValid(entry) ? entry.data : null;
}

export function setCachedContent(fileId: string, content: string): void {
	fileContents.set(fileId, { data: content, timestamp: Date.now() });
}

export function invalidateContent(fileId: string): void {
	fileContents.delete(fileId);
}

// Clear everything
export function clearCache(): void {
	folderListings.clear();
	fileContents.clear();
}
