export type AvailabilityEvent = {
	start: string;
	end: string;
	title?: string;
	id?: string;
};

export async function loadAvailabilityEvents(): Promise<AvailabilityEvent[]> {
	const response = await fetch('/api/availability-events', { cache: 'no-store' });
	if (!response.ok) {
		throw new Error(`Failed to load availability events (${response.status})`);
	}
	const payload = await response.json();
	return Array.isArray(payload?.events) ? payload.events : [];
}
