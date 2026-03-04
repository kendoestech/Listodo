import { writable } from 'svelte/store';
import {
	initAuth,
	signIn as authSignIn,
	signOut as authSignOut,
	isSignedIn,
	getUserInfo,
	type GoogleUser
} from '$lib/services/auth';

interface AuthState {
	initialized: boolean;
	authenticated: boolean;
	user: GoogleUser | null;
	loading: boolean;
}

const initialState: AuthState = {
	initialized: false,
	authenticated: false,
	user: null,
	loading: true
};

export const auth = writable<AuthState>(initialState);

export async function initialize(): Promise<void> {
	auth.update((s) => ({ ...s, loading: true }));

	await initAuth();

	if (isSignedIn()) {
		const user = await getUserInfo();
		auth.set({ initialized: true, authenticated: true, user, loading: false });
	} else {
		auth.set({ initialized: true, authenticated: false, user: null, loading: false });
	}
}

export async function signIn(): Promise<boolean> {
	auth.update((s) => ({ ...s, loading: true }));

	const success = await authSignIn();

	if (success) {
		const user = await getUserInfo();
		auth.update((s) => ({ ...s, authenticated: true, user, loading: false }));
	} else {
		auth.update((s) => ({ ...s, loading: false }));
	}

	return success;
}

export function signOut(): void {
	authSignOut();
	auth.update((s) => ({ ...s, authenticated: false, user: null }));
}
