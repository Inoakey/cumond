import { error, type Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';

const MAX_BODY_SIZE = 1_048_576; // 1 MB

const securityHeaders: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'X-XSS-Protection': '1; mode=block',
	'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
	'Referrer-Policy': 'no-referrer',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

const productionCSP =
	"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'";

export const handle: Handle = async ({ event, resolve }) => {
	// H-001: Body size limit for API routes
	if (event.url.pathname.startsWith('/api/')) {
		const contentLength = event.request.headers.get('content-length');
		if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
			error(413, 'Request body too large');
		}

		// M-002: Content-Type validation for POST/PUT/PATCH
		if (['POST', 'PUT', 'PATCH'].includes(event.request.method)) {
			const contentType = event.request.headers.get('content-type');
			if (!contentType || !contentType.includes('application/json')) {
				error(415, 'Content-Type must be application/json');
			}
		}

		// M-004: CSRF origin check
		if (!dev && event.request.method !== 'GET' && event.request.method !== 'HEAD') {
			const origin = event.request.headers.get('origin');
			if (!origin || new URL(origin).origin !== event.url.origin) {
				error(403, 'Invalid origin');
			}
		}
	}

	const response = await resolve(event);

	for (const [key, value] of Object.entries(securityHeaders)) {
		response.headers.set(key, value);
	}

	// CSP only in production – Vite dev server needs inline scripts for HMR
	if (!dev) {
		response.headers.set('Content-Security-Policy', productionCSP);
	}

	return response;
};
