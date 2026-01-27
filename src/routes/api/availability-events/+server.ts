import { json } from '@sveltejs/kit';
import { fetchAvailabilityEvents } from '$lib/server/availability-events';

export async function GET() {
	try {
		const { events, cached } = await fetchAvailabilityEvents();
		return json({ events, cached });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to fetch availability events.';
		return json({ error: message }, { status: 500 });
	}
}
