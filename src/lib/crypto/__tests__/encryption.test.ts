import { describe, it, expect } from 'vitest';
import {
	generateEncryptionKey,
	exportKey,
	importKey,
	encrypt,
	decrypt,
	DecryptionError,
	InvalidKeyError
} from '../encryption.js';

describe('encryption', () => {
	describe('generateEncryptionKey', () => {
		it('should generate a 256-bit AES-GCM key', async () => {
			const key = await generateEncryptionKey();
			expect(key.algorithm).toEqual({ name: 'AES-GCM', length: 256 });
			expect(key.extractable).toBe(true);
			expect(key.usages).toContain('encrypt');
			expect(key.usages).toContain('decrypt');
		});
	});

	describe('key export/import round-trip', () => {
		it('should export and re-import a key correctly', async () => {
			const original = await generateEncryptionKey();
			const exported = await exportKey(original);
			const reimported = await importKey(exported);

			// Verify by encrypting with original and decrypting with reimported
			const data = { test: 'round-trip' };
			const encrypted = await encrypt(original, data);
			const decrypted = await decrypt(reimported, encrypted);
			expect(decrypted).toEqual(data);
		});

		it('should produce a URL-safe base64 string', async () => {
			const key = await generateEncryptionKey();
			const exported = await exportKey(key);
			expect(exported).toMatch(/^[A-Za-z0-9_-]+$/);
			// 256-bit key = 32 bytes = 43 base64url chars (no padding)
			expect(exported.length).toBe(43);
		});
	});

	describe('encrypt/decrypt round-trip', () => {
		it('should encrypt and decrypt arbitrary JSON data', async () => {
			const key = await generateEncryptionKey();
			const data = {
				title: 'Team Meeting',
				location: 'Zürich',
				timeslots: [
					{ start: '2026-03-17T09:00:00Z', end: '2026-03-17T10:00:00Z' },
					{ start: '2026-03-18T14:00:00Z', end: '2026-03-18T15:00:00Z' }
				],
				unicode: 'Ärger mit Ümlauten 🇨🇭'
			};

			const encrypted = await encrypt(key, data);
			const decrypted = await decrypt(key, encrypted);
			expect(decrypted).toEqual(data);
		});

		it('should produce different ciphertexts for the same plaintext (random IV)', async () => {
			const key = await generateEncryptionKey();
			const data = { same: 'data' };
			const encrypted1 = await encrypt(key, data);
			const encrypted2 = await encrypt(key, data);
			expect(encrypted1).not.toBe(encrypted2);
		});

		it('should use iv.ciphertext format', async () => {
			const key = await generateEncryptionKey();
			const encrypted = await encrypt(key, { a: 1 });
			const parts = encrypted.split('.');
			expect(parts.length).toBe(2);
			// IV is 12 bytes = 16 base64url chars
			expect(parts[0].length).toBe(16);
		});
	});

	describe('error handling', () => {
		it('should throw DecryptionError with wrong key', async () => {
			const key1 = await generateEncryptionKey();
			const key2 = await generateEncryptionKey();
			const encrypted = await encrypt(key1, { secret: 'data' });

			await expect(decrypt(key2, encrypted)).rejects.toThrow(DecryptionError);
		});

		it('should throw DecryptionError with manipulated ciphertext', async () => {
			const key = await generateEncryptionKey();
			const encrypted = await encrypt(key, { data: 'test' });

			// Flip a character in the ciphertext part
			const parts = encrypted.split('.');
			const tampered = parts[0] + '.' + parts[1].slice(0, -1) + (parts[1].slice(-1) === 'A' ? 'B' : 'A');

			await expect(decrypt(key, tampered)).rejects.toThrow(DecryptionError);
		});

		it('should throw DecryptionError with invalid format', async () => {
			const key = await generateEncryptionKey();
			await expect(decrypt(key, 'not-valid-format')).rejects.toThrow(DecryptionError);
		});

		it('should throw InvalidKeyError for wrong key length', async () => {
			await expect(importKey('dG9vc2hvcnQ')).rejects.toThrow(InvalidKeyError);
		});
	});
});
