const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
	ip: string,
	{ maxRequests = 20, windowMs = 60_000 }: { maxRequests?: number; windowMs?: number } = {}
): { allowed: boolean; remaining: number } {
	const now = Date.now();
	const entry = hits.get(ip);

	if (!entry || now > entry.resetAt) {
		hits.set(ip, { count: 1, resetAt: now + windowMs });
		return { allowed: true, remaining: maxRequests - 1 };
	}

	entry.count++;
	const remaining = Math.max(0, maxRequests - entry.count);
	return { allowed: entry.count <= maxRequests, remaining };
}

// Cleanup stale entries periodically
setInterval(() => {
	const now = Date.now();
	for (const [ip, entry] of hits) {
		if (now > entry.resetAt) hits.delete(ip);
	}
}, 60_000);
