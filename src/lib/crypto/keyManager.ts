import { importKey, exportKey, generateEncryptionKey } from './encryption.js';

export function extractKeyFromHash(): { key: string; adminToken?: string } | null {
	if (typeof window === 'undefined') return null;

	const hash = window.location.hash.slice(1);
	if (!hash) return null;

	// Format: #encryptionKey or #encryptionKey&adminToken
	const parts = hash.split('&');
	const key = parts[0] || null;
	const adminToken = parts[1] || undefined;

	if (!key) return null;

	// Remove key from URL bar immediately
	window.history.replaceState(null, '', window.location.pathname + window.location.search);

	return { key, adminToken };
}

export function buildShareLink(
	pollId: string,
	key: string,
	adminToken?: string
): string {
	const origin = typeof window !== 'undefined' ? window.location.origin : '';
	const base = `${origin}/poll/${pollId}`;

	if (adminToken) {
		return `${base}/admin#${key}&${adminToken}`;
	}
	return `${base}#${key}`;
}

export { generateEncryptionKey, exportKey, importKey };
