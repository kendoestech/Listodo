const FOLDER_NAME = 'Listodo';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

let rootFolderId: string | null = null;
let discoveryLoaded = false;

export interface DriveFile {
	id: string;
	name: string;
	mimeType: string;
	parents?: string[];
	modifiedTime?: string;
}

export async function loadDriveApi(): Promise<void> {
	if (discoveryLoaded) return;
	await gapi.client.load(DISCOVERY_DOC);
	discoveryLoaded = true;
}

export async function ensureRootFolder(): Promise<string> {
	if (rootFolderId) return rootFolderId;

	// Search for existing Listodo folder in root
	const response = await gapi.client.drive.files.list({
		q: `name='${FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and 'root' in parents and trashed=false`,
		fields: 'files(id, name)',
		spaces: 'drive'
	});

	const files = response.result.files;
	if (files && files.length > 0) {
		rootFolderId = files[0].id!;
		return rootFolderId;
	}

	// Create it
	const created = await gapi.client.drive.files.create({
		resource: {
			name: FOLDER_NAME,
			mimeType: FOLDER_MIME
		},
		fields: 'id'
	});

	rootFolderId = created.result.id!;
	return rootFolderId;
}

export async function listFiles(folderId: string): Promise<DriveFile[]> {
	const allFiles: DriveFile[] = [];
	let pageToken: string | undefined;

	do {
		const response = await gapi.client.drive.files.list({
			q: `'${folderId}' in parents and trashed=false`,
			fields: 'nextPageToken, files(id, name, mimeType, parents, modifiedTime)',
			orderBy: 'folder,name',
			pageSize: 100,
			pageToken
		});

		const files = response.result.files;
		if (files) {
			allFiles.push(
				...files.map((f) => ({
					id: f.id!,
					name: f.name!,
					mimeType: f.mimeType!,
					parents: f.parents as string[] | undefined,
					modifiedTime: f.modifiedTime
				}))
			);
		}

		pageToken = response.result.nextPageToken as string | undefined;
	} while (pageToken);

	return allFiles;
}

export async function getFileContent(fileId: string): Promise<string> {
	const response = await gapi.client.drive.files.get({
		fileId,
		alt: 'media'
	});

	return response.body;
}

export async function createFile(
	name: string,
	content: string,
	parentFolderId: string
): Promise<DriveFile> {
	// Use multipart upload for file + metadata
	const metadata = {
		name: name.endsWith('.md') ? name : `${name}.md`,
		mimeType: 'text/markdown',
		parents: [parentFolderId]
	};

	const boundary = '---listodo-boundary';
	const body =
		`--${boundary}\r\n` +
		`Content-Type: application/json; charset=UTF-8\r\n\r\n` +
		`${JSON.stringify(metadata)}\r\n` +
		`--${boundary}\r\n` +
		`Content-Type: text/markdown\r\n\r\n` +
		`${content}\r\n` +
		`--${boundary}--`;

	const response = await gapi.client.request({
		path: '/upload/drive/v3/files',
		method: 'POST',
		params: {
			uploadType: 'multipart',
			fields: 'id,name,mimeType,parents,modifiedTime'
		},
		headers: {
			'Content-Type': `multipart/related; boundary=${boundary}`
		},
		body
	});

	const f = response.result as gapi.client.drive.File;
	return {
		id: f.id!,
		name: f.name!,
		mimeType: f.mimeType!,
		parents: f.parents as string[] | undefined,
		modifiedTime: f.modifiedTime
	};
}

export async function updateFileContent(fileId: string, content: string): Promise<void> {
	await gapi.client.request({
		path: `/upload/drive/v3/files/${fileId}`,
		method: 'PATCH',
		params: { uploadType: 'media' },
		headers: { 'Content-Type': 'text/markdown' },
		body: content
	});
}

export async function createFolder(name: string, parentFolderId: string): Promise<DriveFile> {
	const response = await gapi.client.drive.files.create({
		resource: {
			name,
			mimeType: FOLDER_MIME,
			parents: [parentFolderId]
		},
		fields: 'id,name,mimeType,parents,modifiedTime'
	});

	const f = response.result;
	return {
		id: f.id!,
		name: f.name!,
		mimeType: f.mimeType!,
		parents: f.parents as string[] | undefined,
		modifiedTime: f.modifiedTime
	};
}

export async function deleteFile(fileId: string): Promise<void> {
	await gapi.client.drive.files.update({
		fileId,
		resource: { trashed: true }
	});
}

export async function renameFile(fileId: string, newName: string): Promise<void> {
	await gapi.client.drive.files.update({
		fileId,
		resource: { name: newName }
	});
}

export async function moveFile(fileId: string, newParentId: string): Promise<void> {
	// Get current parents first
	const file = await gapi.client.drive.files.get({
		fileId,
		fields: 'parents'
	});

	const previousParents = (file.result.parents as string[] | undefined)?.join(',') || '';

	await gapi.client.drive.files.update({
		fileId,
		addParents: newParentId,
		removeParents: previousParents,
		resource: {}
	});
}

export function isFolder(file: DriveFile): boolean {
	return file.mimeType === FOLDER_MIME;
}

export function getRootFolderId(): string | null {
	return rootFolderId;
}
