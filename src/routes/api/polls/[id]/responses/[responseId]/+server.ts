import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { polls, responses } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { isValidUUID, safeCompareHashes } from '$lib/server/validation';
import { rateLimit } from '$lib/server/rateLimit';

export const DELETE: RequestHandler = async ({ params, request, getClientAddress }) => {
	const { allowed } = rateLimit(getClientAddress(), { maxRequests: 20, windowMs: 60_000 });
	if (!allowed) error(429, 'Too many requests');

	if (!isValidUUID(params.id)) error(400, 'Invalid poll ID');
	if (!isValidUUID(params.responseId)) error(400, 'Invalid response ID');

	// Check poll exists
	const [poll] = await db
		.select({ id: polls.id, adminTokenHash: polls.adminTokenHash })
		.from(polls)
		.where(eq(polls.id, params.id))
		.limit(1);

	if (!poll) error(404, 'Poll not found');

	// Allow delete if: admin token matches OR no admin token (self-delete by responseId knowledge)
	// Response UUIDs are unguessable, so knowing the ID is sufficient proof of ownership
	const adminTokenHash = request.headers.get('x-admin-token-hash');
	if (adminTokenHash && !safeCompareHashes(poll.adminTokenHash, adminTokenHash)) {
		error(403, 'Invalid admin token');
	}

	const result = await db
		.delete(responses)
		.where(and(eq(responses.id, params.responseId), eq(responses.pollId, params.id)))
		.returning({ id: responses.id });

	if (result.length === 0) error(404, 'Response not found');

	return json({ deleted: true });
};
