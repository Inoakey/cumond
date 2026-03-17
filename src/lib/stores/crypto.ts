import { writable } from 'svelte/store';

// Encryption key is ONLY stored in memory – never persisted
export const encryptionKey = writable<CryptoKey | null>(null);
export const adminToken = writable<string | null>(null);
