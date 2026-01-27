import type { PageServerLoad } from './$types';
import { DAVClient } from 'tsdav';
import {
	PRIVATE_ICLOUD_PASSWORD,
	PRIVATE_ICLOUD_SERVER_URL,
	PRIVATE_ICLOUD_USERNAME
} from '$env/static/private';

const DEFAULT_ICLOUD_CALDAV_URL = 'https://caldav.icloud.com';

export const load: PageServerLoad = async () => {
	const username = (PRIVATE_ICLOUD_USERNAME ?? '').trim();
	const password = PRIVATE_ICLOUD_PASSWORD ?? '';
	const serverUrl = (PRIVATE_ICLOUD_SERVER_URL ?? DEFAULT_ICLOUD_CALDAV_URL).trim();

	if (!username || !password) {
		return {
			error: 'Missing iCloud credentials. Set PRIVATE_ICLOUD_USERNAME and PRIVATE_ICLOUD_PASSWORD.',
			serverUrl: serverUrl || DEFAULT_ICLOUD_CALDAV_URL
		};
	}

	try {
		const client = new DAVClient({
			serverUrl: serverUrl || DEFAULT_ICLOUD_CALDAV_URL,
			credentials: {
				username,
				password
			},
			authMethod: 'Basic',
			defaultAccountType: 'caldav'
		});

		await client.login();

		const calendars = await client.fetchCalendars();
		const rangeStart = new Date();
		const rangeEnd = new Date(rangeStart.getTime());
		rangeEnd.setDate(rangeEnd.getDate() + 28);

		const calendarsWithEvents = await Promise.all(
			calendars.map(async (calendar) => {
				try {
					const objects = await client.fetchCalendarObjects({
						calendar,
						timeRange: {
							start: rangeStart.toISOString(),
							end: rangeEnd.toISOString()
						}
					});

					return {
						calendar,
						hasUpcomingEvents: objects.length > 0,
						checkFailed: false
					};
				} catch {
					return {
						calendar,
						hasUpcomingEvents: false,
						checkFailed: true
					};
				}
			})
		);

		const filteredCalendars = calendarsWithEvents
			.filter((entry) => entry.checkFailed || entry.hasUpcomingEvents)
			.map((entry) => entry.calendar);

		const formatted = filteredCalendars.map((calendar) => ({
			displayName: calendar.displayName || calendar.url || 'Untitled calendar',
			url: calendar.url,
			description: calendar.description || null,
			color: calendar.color || null,
			timezone: calendar.timezone || null
		}));

		return {
			calendars: formatted,
			serverUrl: serverUrl || DEFAULT_ICLOUD_CALDAV_URL
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return {
			error: 'Unable to fetch calendars. Double-check your Apple ID and app password.',
			details: message,
			serverUrl: serverUrl || DEFAULT_ICLOUD_CALDAV_URL
		};
	}
};
