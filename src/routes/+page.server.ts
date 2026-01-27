import type { PageServerLoad } from './$types';
import { fetchAvailabilityEvents } from '$lib/server/availability-events';
import { Redis } from '@upstash/redis';
import { KV_REST_API_TOKEN, KV_REST_API_URL } from '$env/static/private';

export const prerender = false;

const redis = new Redis({
	url: KV_REST_API_URL || '',
	token: KV_REST_API_TOKEN || ''
});

const STORAGE_KEY = 'icloud:selectedCalendars';
const CACHE_KEY = 'icloud:selectedCalendars:cache';
const CACHE_TTL_SECONDS = 600;

export const load: PageServerLoad = async () => {
	let events: Awaited<ReturnType<typeof fetchAvailabilityEvents>>['events'] = [];
	let error: string | null = null;
	let workStart: string | null = null;
	let workEnd: string | null = null;

	try {
		const result = await fetchAvailabilityEvents();
		events = result.events;
	} catch (err) {
		error = err instanceof Error ? err.message : 'Unable to load events.';
	}

	try {
		if (KV_REST_API_URL && KV_REST_API_TOKEN) {
			const cached = await redis.get<any>(CACHE_KEY);
			const stored = cached ?? (await redis.get<any>(STORAGE_KEY));
			if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
				workStart = typeof stored.workStart === 'string' ? stored.workStart : null;
				workEnd = typeof stored.workEnd === 'string' ? stored.workEnd : null;
				if (!cached) {
					await redis.set(CACHE_KEY, stored, { ex: CACHE_TTL_SECONDS });
				}
			}
		}
	} catch {
		// ignore
	}

	return { events, error, workStart, workEnd };
};
