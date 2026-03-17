import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { polls } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { isValidUUID, safeCompareHashes } from '$lib/server/validation';
import { rateLimit } from '$lib/server/rateLimit';

export const GET: RequestHandler = async ({ params, getClientAddress }) => {
	const { allowed } = rateLimit(getClientAddress(), { maxRequests: 60, windowMs: 60_000 });
	if (!allowed) error(429, 'Too many requests');

	if (!isValidUUID(params.id)) error(400, 'Invalid poll ID');

	const [poll] = await db
		.select({
			id: polls.id,
			encryptedData: polls.encryptedData,
			expiresAt: polls.expiresAt,
			createdAt: polls.createdAt
		})
		.from(polls)
		.where(eq(polls.id, params.id))
		.limit(1);

	if (!poll) error(404, 'Poll not found');

	if (new Date(poll.expiresAt) < new Date()) {
		error(404, 'Poll not found');
	}

	return json(poll);
};

export const DELETE: RequestHandler = async ({ params, request, getClientAddress }) => {
	const { allowed } = rateLimit(getClientAddress(), { maxRequests: 10, windowMs: 60_000 });
	if (!allowed) error(429, 'Too many requests');

	if (!isValidUUID(params.id)) error(400, 'Invalid poll ID');

	const adminTokenHash = request.headers.get('x-admin-token-hash');
	if (!adminTokenHash) error(401, 'Admin token required');

	const [poll] = await db
		.select({ adminTokenHash: polls.adminTokenHash })
		.from(polls)
		.where(eq(polls.id, params.id))
		.limit(1);

	if (!poll) error(404, 'Poll not found');

	if (!safeCompareHashes(poll.adminTokenHash, adminTokenHash!)) {
		error(403, 'Invalid admin token');
	}

	await db.delete(polls).where(eq(polls.id, params.id));

	return json({ deleted: true });
};
