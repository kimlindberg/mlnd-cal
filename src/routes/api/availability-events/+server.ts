import { json } from '@sveltejs/kit';
import { DAVClient } from 'tsdav';
import { Redis } from '@upstash/redis';
import { Temporal } from 'temporal-polyfill';
import {
	KV_REST_API_TOKEN,
	KV_REST_API_URL,
	PRIVATE_ICLOUD_PASSWORD,
	PRIVATE_ICLOUD_SERVER_URL,
	PRIVATE_ICLOUD_USERNAME
} from '$env/static/private';

import { TIMEZONE, LOOKAHEAD_WEEKS } from '$lib/availability/constants';
const DEFAULT_ICLOUD_CALDAV_URL = 'https://caldav.icloud.com';
const STORAGE_KEY = 'icloud:selectedCalendars';
const DEFAULT_WORK_START = '06:00';
const DEFAULT_WORK_END = '15:00';
const DEFAULT_EVENT_TITLE = 'Booked';
const CACHE_TTL_SECONDS = 600;
const CACHE_PREFIX = 'availability:events:';

const redis = new Redis({
	url: KV_REST_API_URL || '',
	token: KV_REST_API_TOKEN || ''
});

type AvailabilityEvent = {
	start: string;
	end: string;
	title?: string;
	id?: string;
};

type SelectionConfig = {
	selection: string[];
	workStart: string;
	workEnd: string;
	bookedTitle: string;
};

function ensureConfig() {
	if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
		return json(
			{ error: 'Missing KV_REST_API_URL or KV_REST_API_TOKEN in environment variables.' },
			{ status: 500 }
		);
	}
	if (!PRIVATE_ICLOUD_USERNAME || !PRIVATE_ICLOUD_PASSWORD) {
		return json(
			{
				error: 'Missing PRIVATE_ICLOUD_USERNAME or PRIVATE_ICLOUD_PASSWORD in environment variables.'
			},
			{ status: 500 }
		);
	}
	return null;
}

function unfoldLines(ics: string): string[] {
	const rawLines = ics.split(/\r?\n/);
	const lines: string[] = [];
	for (const line of rawLines) {
		if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
			lines[lines.length - 1] += line.slice(1);
		} else {
			lines.push(line);
		}
	}
	return lines;
}

function normalizeOffset(offset: string): string {
	if (offset === 'Z') return 'Z';
	return `${offset.slice(0, 3)}:${offset.slice(3)}`;
}

function parseDateTime(
	value: string,
	options: { tzid?: string; valueType?: string }
): Temporal.ZonedDateTime | null {
	if (!value) return null;
	const tzid = options.tzid ?? TIMEZONE;
	const valueType = options.valueType ?? '';

	if (valueType === 'DATE' || /^\d{8}$/.test(value)) {
		const date = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
		return Temporal.ZonedDateTime.from(`${date}T00:00:00[${tzid}]`).withTimeZone(TIMEZONE);
	}

	const match = value.match(
		/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z|[+-]\d{4})?$/
	);
	if (!match) return null;

	const [, y, mo, d, h, mi, s = '00', offset] = match;
	const datePart = `${y}-${mo}-${d}`;
	const timePart = `${h}:${mi}:${s}`;

	if (offset) {
		const iso = `${datePart}T${timePart}${normalizeOffset(offset)}`;
		const instant = Temporal.Instant.from(iso);
		return instant.toZonedDateTimeISO(TIMEZONE);
	}

	return Temporal.ZonedDateTime.from(`${datePart}T${timePart}[${tzid}]`).withTimeZone(TIMEZONE);
}

function parseDuration(duration: string): Temporal.Duration | null {
	try {
		return Temporal.Duration.from(duration);
	} catch {
		return null;
	}
}

function formatOutput(zdt: Temporal.ZonedDateTime): string {
	return zdt.toString().split('[')[0];
}

function parseTimeToMinutes(value: string, fallback: string): number {
	const match = value.match(/^(\d{2}):(\d{2})$/);
	if (!match) {
		return parseTimeToMinutes(fallback, fallback);
	}
	const [, h, m] = match;
	return Number(h) * 60 + Number(m);
}

function timeToMinutes(zdt: Temporal.ZonedDateTime): number {
	return zdt.hour * 60 + zdt.minute;
}

function parseEventsFromIcs(
	ics: string,
	config: { workStartMinutes: number; workEndMinutes: number; bookedTitle: string }
): AvailabilityEvent[] {
	const events: AvailabilityEvent[] = [];
	const lines = unfoldLines(ics);
	let current: {
		start?: Temporal.ZonedDateTime;
		end?: Temporal.ZonedDateTime;
		duration?: Temporal.Duration;
		title?: string;
		id?: string;
		startIsDate?: boolean;
		endIsDate?: boolean;
		isAllDay?: boolean;
	} | null = null;

	for (const line of lines) {
		if (line === 'BEGIN:VEVENT') {
			current = {};
			continue;
		}
		if (line === 'END:VEVENT') {
			if (current?.start) {
				let end = current.end;
				if (!end && current.duration) {
					end = current.start.add(current.duration);
				}
				if (!end && current.startIsDate) {
					end = current.start.add({ days: 1 });
				}
				if (end && !current.isAllDay) {
					const startInTz = current.start.withTimeZone(TIMEZONE);
					const endInTz = end.withTimeZone(TIMEZONE);
					const startMinutes = timeToMinutes(startInTz);
					const endMinutes = timeToMinutes(endInTz);
					if (endMinutes > config.workStartMinutes && startMinutes < config.workEndMinutes) {
						events.push({
							start: formatOutput(startInTz),
							end: formatOutput(endInTz),
							title: config.bookedTitle,
							id: current.id
						});
					}
				}
			}
			current = null;
			continue;
		}
		if (!current || !line) continue;

		const [propPart, ...valueParts] = line.split(':');
		if (!propPart || valueParts.length === 0) continue;
		const value = valueParts.join(':');
		const [name, ...paramParts] = propPart.split(';');
		const params = new Map<string, string>();
		for (const part of paramParts) {
			const [key, paramValue] = part.split('=');
			if (key && paramValue) {
				params.set(key.toUpperCase(), paramValue);
			}
		}

		switch (name.toUpperCase()) {
			case 'DTSTART': {
				const zdt = parseDateTime(value, {
					tzid: params.get('TZID'),
					valueType: params.get('VALUE')
				});
				current.start = zdt ?? undefined;
				current.startIsDate = params.get('VALUE') === 'DATE' || /^\d{8}$/.test(value);
				current.isAllDay = current.startIsDate || current.endIsDate;
				break;
			}
			case 'DTEND': {
				const zdt = parseDateTime(value, {
					tzid: params.get('TZID'),
					valueType: params.get('VALUE')
				});
				current.end = zdt ?? undefined;
				current.endIsDate = params.get('VALUE') === 'DATE' || /^\d{8}$/.test(value);
				current.isAllDay = current.startIsDate || current.endIsDate;
				break;
			}
			case 'DURATION': {
				current.duration = parseDuration(value) ?? undefined;
				break;
			}
			case 'SUMMARY': {
				current.title = value.trim();
				break;
			}
			case 'UID': {
				current.id = value.trim();
				break;
			}
			default:
				break;
		}
	}

	return events;
}

export async function GET() {
	const configError = ensureConfig();
	if (configError) return configError;

	const stored = await redis.get<SelectionConfig | string[] | null>(STORAGE_KEY);
	const selectionPayload: SelectionConfig = Array.isArray(stored)
		? {
				selection: stored.filter((item) => typeof item === 'string'),
				workStart: DEFAULT_WORK_START,
				workEnd: DEFAULT_WORK_END,
				bookedTitle: DEFAULT_EVENT_TITLE
			}
		: stored && typeof stored === 'object'
			? {
					selection: Array.isArray((stored as any).selection)
						? (stored as any).selection.filter((item: unknown) => typeof item === 'string')
						: [],
					workStart: typeof (stored as any).workStart === 'string'
						? (stored as any).workStart
						: DEFAULT_WORK_START,
					workEnd: typeof (stored as any).workEnd === 'string'
						? (stored as any).workEnd
						: DEFAULT_WORK_END,
					bookedTitle:
						typeof (stored as any).bookedTitle === 'string' && (stored as any).bookedTitle.trim()
							? (stored as any).bookedTitle.trim()
							: DEFAULT_EVENT_TITLE
				}
			: {
					selection: [],
					workStart: DEFAULT_WORK_START,
					workEnd: DEFAULT_WORK_END,
					bookedTitle: DEFAULT_EVENT_TITLE
				};

	const selectedIds = selectionPayload.selection;
	const workStartMinutes = parseTimeToMinutes(selectionPayload.workStart, DEFAULT_WORK_START);
	const workEndMinutes = parseTimeToMinutes(selectionPayload.workEnd, DEFAULT_WORK_END);
	const bookedTitle = selectionPayload.bookedTitle || DEFAULT_EVENT_TITLE;

	if (selectedIds.length === 0) {
		return json({ events: [] });
	}

	const cacheKey = `${CACHE_PREFIX}${selectedIds.join('|')}|${selectionPayload.workStart}|${selectionPayload.workEnd}|${bookedTitle}`;
	const cached = await redis.get<AvailabilityEvent[] | null>(cacheKey);
	if (Array.isArray(cached)) {
		return json({ events: cached, cached: true });
	}

	const client = new DAVClient({
		serverUrl: PRIVATE_ICLOUD_SERVER_URL || DEFAULT_ICLOUD_CALDAV_URL,
		credentials: {
			username: PRIVATE_ICLOUD_USERNAME,
			password: PRIVATE_ICLOUD_PASSWORD
		},
		authMethod: 'Basic',
		defaultAccountType: 'caldav'
	});

	await client.login();

	const calendars = await client.fetchCalendars();
	const calendarsByUrl = new Map(calendars.map((calendar) => [calendar.url, calendar]));
	const selectedCalendars = selectedIds
		.map((url) => calendarsByUrl.get(url))
		.filter((calendar): calendar is NonNullable<typeof calendar> => Boolean(calendar));

	if (selectedCalendars.length === 0) {
		return json({ events: [] });
	}

	const now = Temporal.Now.zonedDateTimeISO(TIMEZONE);
	const end = now.add({ weeks: LOOKAHEAD_WEEKS });

	const eventLists = await Promise.all(
		selectedCalendars.map(async (calendar) => {
			const objects = await client.fetchCalendarObjects({
				calendar,
				timeRange: {
					start: now.toInstant().toString(),
					end: end.toInstant().toString()
				},
				expand: true
			});

			return objects
				.map((obj) => (typeof obj.data === 'string' ? obj.data : ''))
				.flatMap((ics) =>
					ics
						? parseEventsFromIcs(ics, {
								workStartMinutes,
								workEndMinutes,
								bookedTitle
							})
						: []
				);
		})
	);

	const events = eventLists.flat();

	await redis.set(cacheKey, events, { ex: CACHE_TTL_SECONDS });

	return json({ events });
}
