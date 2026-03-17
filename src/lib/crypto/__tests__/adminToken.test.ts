import { describe, it, expect } from 'vitest';
import { generateAdminToken, hashAdminToken } from '../adminToken.js';

describe('adminToken', () => {
	it('should generate a base64url token from 32 bytes', () => {
		const token = generateAdminToken();
		expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
		// 32 bytes = 43 base64url chars
		expect(token.length).toBe(43);
	});

	it('should generate unique tokens', () => {
		const t1 = generateAdminToken();
		const t2 = generateAdminToken();
		expect(t1).not.toBe(t2);
	});

	it('should hash deterministically', async () => {
		const token = generateAdminToken();
		const hash1 = await hashAdminToken(token);
		const hash2 = await hashAdminToken(token);
		expect(hash1).toBe(hash2);
	});

	it('should produce different hashes for different tokens', async () => {
		const hash1 = await hashAdminToken(generateAdminToken());
		const hash2 = await hashAdminToken(generateAdminToken());
		expect(hash1).not.toBe(hash2);
	});
});
