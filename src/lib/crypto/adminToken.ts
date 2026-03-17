function toBase64url(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateAdminToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return toBase64url(bytes.buffer as ArrayBuffer);
}

export async function hashAdminToken(token: string): Promise<string> {
	const encoded = new TextEncoder().encode(token);
	const hash = await crypto.subtle.digest('SHA-256', encoded);
	return toBase64url(hash);
}
