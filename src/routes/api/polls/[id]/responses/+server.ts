import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { polls, responses } from '$lib/server/schema';
import { eq, count } from 'drizzle-orm';
import { isValidUUID, validateEncryptedData, MAX_RESPONSES_PER_POLL } from '$lib/server/validation';
import { rateLimit } from '$lib/server/rateLimit';

export const POST: RequestHandler = async ({ params, request, getClientAddress }) => {
	const { allowed } = rateLimit(getClientAddress(), { maxRequests: 20, windowMs: 60_000 });
	if (!allowed) error(429, 'Too many requests');

	if (!isValidUUID(params.id)) error(400, 'Invalid poll ID');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON');
	}

	const { encryptedData } = body as Record<string, unknown>;

	if (!validateEncryptedData(encryptedData)) {
		error(400, 'Invalid or missing encryptedData');
	}

	// Check poll exists and is not expired
	const [poll] = await db
		.select({ id: polls.id, expiresAt: polls.expiresAt })
		.from(polls)
		.where(eq(polls.id, params.id))
		.limit(1);

	if (!poll) error(404, 'Poll not found');
	if (new Date(poll.expiresAt) < new Date()) error(404, 'Poll not found');

	// H-002: Limit responses per poll
	const [{ total }] = await db
		.select({ total: count() })
		.from(responses)
		.where(eq(responses.pollId, params.id));

	if (total >= MAX_RESPONSES_PER_POLL) {
		error(400, 'Maximum number of responses reached');
	}

	const [response] = await db
		.insert(responses)
		.values({
			pollId: params.id,
			encryptedData
		})
		.returning({ id: responses.id, createdAt: responses.createdAt });

	return json({ id: response.id, createdAt: response.createdAt }, { status: 201 });
};

export const GET: RequestHandler = async ({ params, getClientAddress }) => {
	const { allowed } = rateLimit(getClientAddress(), { maxRequests: 60, windowMs: 60_000 });
	if (!allowed) error(429, 'Too many requests');

	if (!isValidUUID(params.id)) error(400, 'Invalid poll ID');

	// No admin token required – responses are encrypted blobs,
	// only clients with the encryption key (from the URL fragment) can decrypt them.
	const [poll] = await db
		.select({ id: polls.id })
		.from(polls)
		.where(eq(polls.id, params.id))
		.limit(1);

	if (!poll) error(404, 'Poll not found');

	const allResponses = await db
		.select({
			id: responses.id,
			encryptedData: responses.encryptedData,
			createdAt: responses.createdAt
		})
		.from(responses)
		.where(eq(responses.pollId, params.id));

	return json(allResponses);
};
