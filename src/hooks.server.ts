import type { Handle } from '@sveltejs/kit';
import { PRIVATE_ICLOUD_AUTH_PASS, PRIVATE_ICLOUD_AUTH_USER } from '$env/static/private';

const PROTECTED_PREFIXES = ['/icloud', '/api/icloud-selection'];

function isProtectedPath(pathname: string): boolean {
	return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function unauthorized(): Response {
	return new Response('Unauthorized', {
		status: 401,
		headers: {
			'WWW-Authenticate': 'Basic realm="iCloud"'
		}
	});
}

export const handle: Handle = async ({ event, resolve }) => {
	if (!isProtectedPath(event.url.pathname)) {
		return resolve(event);
	}

	if (!PRIVATE_ICLOUD_AUTH_USER || !PRIVATE_ICLOUD_AUTH_PASS) {
		return new Response('Auth not configured', { status: 500 });
	}

	const header = event.request.headers.get('authorization');
	if (!header || !header.startsWith('Basic ')) {
		return unauthorized();
	}

	const encoded = header.slice(6);
	const decoded = typeof atob === 'function'
		? atob(encoded)
		: Buffer.from(encoded, 'base64').toString('utf-8');
	const [user, pass] = decoded.split(':');

	if (user !== PRIVATE_ICLOUD_AUTH_USER || pass !== PRIVATE_ICLOUD_AUTH_PASS) {
		return unauthorized();
	}

	return resolve(event);
};
