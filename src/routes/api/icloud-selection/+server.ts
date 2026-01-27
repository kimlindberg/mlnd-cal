import { KV_REST_API_TOKEN, KV_REST_API_URL } from '$env/static/private';
import { json } from '@sveltejs/kit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
	url: KV_REST_API_URL || '',
	token: KV_REST_API_TOKEN || ''
});

const STORAGE_KEY = 'icloud:selectedCalendars';
const DEFAULT_WORK_START = '06:00';
const DEFAULT_WORK_END = '15:00';
const DEFAULT_BOOKED_TITLE = 'Booked';

type SelectionPayload = {
	selection: string[];
	workStart: string;
	workEnd: string;
	bookedTitle: string;
};

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

function isValidTime(value: unknown): value is string {
	return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value);
}

function normalizePayload(payload: unknown): SelectionPayload {
	const selection =
		payload && typeof payload === 'object' && Array.isArray((payload as any).selection)
			? (payload as any).selection.filter((item: unknown) => typeof item === 'string')
			: [];

	const workStart = isValidTime((payload as any)?.workStart)
		? (payload as any).workStart
		: DEFAULT_WORK_START;
	const workEnd = isValidTime((payload as any)?.workEnd)
		? (payload as any).workEnd
		: DEFAULT_WORK_END;
	const bookedTitle =
		typeof (payload as any)?.bookedTitle === 'string' && (payload as any).bookedTitle.trim()
			? (payload as any).bookedTitle.trim()
			: DEFAULT_BOOKED_TITLE;

	return { selection, workStart, workEnd, bookedTitle };
}

export async function GET() {
	const configError = ensureRedisConfigured();
	if (configError) return configError;

	const result = await redis.get<SelectionPayload | string[] | null>(STORAGE_KEY);

	if (Array.isArray(result)) {
		return json({
			selection: result.filter((item) => typeof item === 'string'),
			workStart: DEFAULT_WORK_START,
			workEnd: DEFAULT_WORK_END,
			bookedTitle: DEFAULT_BOOKED_TITLE
		});
	}

	if (result && typeof result === 'object') {
		const normalized = normalizePayload(result);
		return json(normalized);
	}

	return json({
		selection: [],
		workStart: DEFAULT_WORK_START,
		workEnd: DEFAULT_WORK_END,
		bookedTitle: DEFAULT_BOOKED_TITLE
	});
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

	const normalized = normalizePayload(payload);

	await redis.set(STORAGE_KEY, normalized);

	return json(normalized);
}
