import { KV_REST_API_TOKEN, KV_REST_API_URL } from '$env/static/private';
import { json } from '@sveltejs/kit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
	url: KV_REST_API_URL || '',
	token: KV_REST_API_TOKEN || ''
});

const STORAGE_KEY = 'icloud:selectedCalendars';

function ensureRedisConfigured() {
	if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
		return json(
			{
				error: 'Missing KV_REST_API_URL or KV_REST_API_TOKEN in environment variables.'
			},
			{ status: 500 }
		);
	}
	return null;
}

export async function GET() {
	const configError = ensureRedisConfigured();
	if (configError) return configError;

	const result = await redis.get<string[] | null>(STORAGE_KEY);
	const selection = Array.isArray(result) ? result.filter((item) => typeof item === 'string') : [];

	return json({ result: selection });
}

export async function POST({ request }: { request: Request }) {
	const configError = ensureRedisConfigured();
	if (configError) return configError;

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'Invalid JSON payload.' }, { status: 400 });
	}

	const selection =
		payload && typeof payload === 'object' && Array.isArray((payload as any).selection)
			? (payload as any).selection.filter((item: unknown) => typeof item === 'string')
			: [];

	await redis.set(STORAGE_KEY, selection);

	return json({ result: selection });
}
