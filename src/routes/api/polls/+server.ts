import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { polls } from '$lib/server/schema';
import { rateLimit } from '$lib/server/rateLimit';
import { validateEncryptedData, validateExpiryDays, validateAdminTokenHash } from '$lib/server/validation';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const ip = getClientAddress();
	const { allowed } = rateLimit(ip, { maxRequests: 10, windowMs: 60_000 });
	if (!allowed) {
		error(429, 'Too many requests');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON');
	}

	const { encryptedData, adminTokenHash, expiryDays } = body as Record<string, unknown>;

	if (!validateEncryptedData(encryptedData)) {
		error(400, 'Invalid or missing encryptedData');
	}
	if (!validateAdminTokenHash(adminTokenHash)) {
		error(400, 'Invalid or missing adminTokenHash');
	}

	const days = expiryDays ?? 90;
	if (!validateExpiryDays(days)) {
		error(400, 'expiryDays must be 90 or 365');
	}

	const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

	const [poll] = await db
		.insert(polls)
		.values({
			encryptedData,
			adminTokenHash,
			expiresAt
		})
		.returning({ id: polls.id, createdAt: polls.createdAt, expiresAt: polls.expiresAt });

	return json({ id: poll.id, createdAt: poll.createdAt, expiresAt: poll.expiresAt }, { status: 201 });
};
