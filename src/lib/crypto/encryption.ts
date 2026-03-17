export class DecryptionError extends Error {
	constructor(message = 'Decryption failed') {
		super(message);
		this.name = 'DecryptionError';
	}
}

export class InvalidKeyError extends Error {
	constructor(message = 'Invalid encryption key') {
		super(message);
		this.name = 'InvalidKeyError';
	}
}

function toBase64url(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(base64url: string): Uint8Array {
	const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
	const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

export async function generateEncryptionKey(): Promise<CryptoKey> {
	return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
		'encrypt',
		'decrypt'
	]);
}

export async function exportKey(key: CryptoKey): Promise<string> {
	const rawKey = await crypto.subtle.exportKey('raw', key);
	return toBase64url(rawKey);
}

export async function importKey(base64url: string): Promise<CryptoKey> {
	try {
		const keyBytes = fromBase64url(base64url);
		if (keyBytes.length !== 32) {
			throw new InvalidKeyError('Key must be 256 bits (32 bytes)');
		}
		return crypto.subtle.importKey('raw', keyBytes.buffer as ArrayBuffer, { name: 'AES-GCM', length: 256 }, true, [
			'encrypt',
			'decrypt'
		]);
	} catch (e) {
		if (e instanceof InvalidKeyError) throw e;
		throw new InvalidKeyError('Failed to import key');
	}
}

export async function encrypt(key: CryptoKey, data: object): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const plaintext = new TextEncoder().encode(JSON.stringify(data));
	const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
	return toBase64url(iv.buffer as ArrayBuffer) + '.' + toBase64url(ciphertext);
}

export async function decrypt(key: CryptoKey, encryptedString: string): Promise<object> {
	const parts = encryptedString.split('.');
	if (parts.length !== 2) {
		throw new DecryptionError('Invalid encrypted data format');
	}

	const iv = fromBase64url(parts[0]);
	const ciphertext = fromBase64url(parts[1]);

	try {
		const plaintext = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: iv as unknown as Uint8Array<ArrayBuffer> },
			key,
			ciphertext as unknown as Uint8Array<ArrayBuffer>
		);
		return JSON.parse(new TextDecoder().decode(plaintext));
	} catch {
		throw new DecryptionError('Decryption failed – wrong key or corrupted data');
	}
}
