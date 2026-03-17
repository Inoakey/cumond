import { timingSafeEqual } from 'crypto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ENCRYPTED_SIZE = 512_000; // 500 KB
const MAX_RESPONSES_PER_POLL = 500;

export function isValidUUID(value: string): boolean {
	return UUID_RE.test(value);
}

export function validateEncryptedData(data: unknown): data is string {
	return typeof data === 'string' && data.length > 0 && data.length <= MAX_ENCRYPTED_SIZE;
}

export function validateExpiryDays(days: unknown): days is number {
	return typeof days === 'number' && (days === 90 || days === 365);
}

export function validateAdminTokenHash(hash: unknown): hash is string {
	// base64url SHA-256 hash = 43 chars
	return typeof hash === 'string' && /^[A-Za-z0-9_-]{43}$/.test(hash);
}

/** Timing-safe comparison of two hash strings. Returns false if lengths differ. */
export function safeCompareHashes(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export { MAX_RESPONSES_PER_POLL };
