const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let onAuthCallback: ((success: boolean) => void) | null = null;

export interface GoogleUser {
	name: string;
	email: string;
	picture: string;
}

function waitForGapi(): Promise<void> {
	return new Promise((resolve) => {
		if (window.gapi) {
			resolve();
			return;
		}
		const check = setInterval(() => {
			if (window.gapi) {
				clearInterval(check);
				resolve();
			}
		}, 100);
	});
}

function waitForGsi(): Promise<void> {
	return new Promise((resolve) => {
		if (window.google?.accounts) {
			resolve();
			return;
		}
		const check = setInterval(() => {
			if (window.google?.accounts) {
				clearInterval(check);
				resolve();
			}
		}, 100);
	});
}

export async function initAuth(): Promise<void> {
	await Promise.all([waitForGapi(), waitForGsi()]);

	await new Promise<void>((resolve) => {
		gapi.load('client', async () => {
			await gapi.client.init({});
			resolve();
		});
	});

	// Restore token from sessionStorage if available
	const saved = sessionStorage.getItem('listodo_token');
	if (saved) {
		try {
			const token = JSON.parse(saved);
			gapi.client.setToken(token);
		} catch {
			sessionStorage.removeItem('listodo_token');
		}
	}

	tokenClient = google.accounts.oauth2.initTokenClient({
		client_id: CLIENT_ID,
		scope: SCOPES,
		callback: (response) => {
			if (response.error) {
				onAuthCallback?.(false);
				return;
			}
			// Persist token to sessionStorage
			const token = gapi.client.getToken();
			if (token) {
				sessionStorage.setItem('listodo_token', JSON.stringify(token));
			}
			onAuthCallback?.(true);
		}
	});
}

export function signIn(): Promise<boolean> {
	return new Promise((resolve) => {
		if (!tokenClient) {
			resolve(false);
			return;
		}
		onAuthCallback = resolve;
		tokenClient.requestAccessToken({ prompt: 'consent' });
	});
}

export function refreshToken(): Promise<boolean> {
	return new Promise((resolve) => {
		if (!tokenClient) {
			resolve(false);
			return;
		}
		onAuthCallback = resolve;
		tokenClient.requestAccessToken({ prompt: '' });
	});
}

export function signOut(): void {
	const token = gapi.client.getToken();
	if (token) {
		google.accounts.oauth2.revoke(token.access_token, () => {});
		gapi.client.setToken(null);
	}
	sessionStorage.removeItem('listodo_token');
}

export function isSignedIn(): boolean {
	return !!gapi.client.getToken();
}

export function getAccessToken(): string | null {
	return gapi.client.getToken()?.access_token ?? null;
}

export async function getUserInfo(): Promise<GoogleUser | null> {
	const token = getAccessToken();
	if (!token) return null;

	const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
		headers: { Authorization: `Bearer ${token}` }
	});

	if (!response.ok) return null;

	const data = await response.json();
	return {
		name: data.name,
		email: data.email,
		picture: data.picture
	};
}
