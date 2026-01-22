<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { ScheduleXCalendar } from '@schedule-x/svelte';
	import { createCalendar, viewDay, viewWeek } from '@schedule-x/calendar';
	import { createCalendarControlsPlugin } from '@schedule-x/calendar-controls';
	import '@schedule-x/theme-shadcn/dist/index.css';
	import 'temporal-polyfill/global';

	type AvailabilityEvent = {
		start: string; // ISO with offset, e.g. 2026-01-19T07:00:00+04:00
		end: string;   // ISO with offset, e.g. 2026-01-19T08:00:00+04:00
		title?: string;
		id?: string;
	};

	type CalendarApp = any;

	// Configuration constants
	const TIMEZONE = 'Asia/Dubai';
	const EVENTS_URL = 'https://raw.githubusercontent.com/kimlindberg/mlnd-cal/refs/heads/master/events.json?t=' + Date.now();
	const DAY_START = '05:00';
	const DAY_END = '16:00';
	const WEEK_GRID_HEIGHT = 420;
	const WEEK_DAYS = 5;
	const LOOKAHEAD_WEEKS = 4;

	let calendarApp: CalendarApp | null = null;
	let errorText: string | null = null;
	let themeMediaQuery: MediaQueryList | null = null;
	let calendarControls: ReturnType<typeof createCalendarControlsPlugin> | null = null;

	function toDubaiZdt(isoWithOffset: string): Temporal.ZonedDateTime {
		return Temporal.ZonedDateTime.from(`${isoWithOffset.trim()}[${TIMEZONE}]`);
	}

	function makeSafeId(event: AvailabilityEvent, index: number): string {
		return event.id ?? `event_${index}`;
	}

	function normalizeEvent(event: AvailabilityEvent, index: number) {
		return {
			id: makeSafeId(event, index),
			title: event.title ?? '',
			start: toDubaiZdt(event.start),
			end: toDubaiZdt(event.end)
		};
	}

	function setTheme(isDark: boolean) {
		if (!calendarApp) return;
		calendarApp.setTheme(isDark ? 'dark' : 'light');
	}

	function applySystemTheme() {
		const isDark = themeMediaQuery?.matches ?? false;
		setTheme(isDark);
	}

	async function loadEvents(): Promise<AvailabilityEvent[]> {
		const res = await fetch(EVENTS_URL, { cache: 'no-store' });
		if (!res.ok) {
			throw new Error(`Failed to load ${EVENTS_URL} (${res.status})`);
		}
		return res.json();
	}

	async function initializeCalendar() {
		try {
			const rawEvents = await loadEvents();
			const events = (rawEvents ?? []).map(normalizeEvent);

			calendarControls = createCalendarControlsPlugin();
			calendarApp = createCalendar(
				{
					views: [viewDay, viewWeek],
					theme: 'shadcn',
					timezone: TIMEZONE,
					dayBoundaries: { start: DAY_START, end: DAY_END },
					weekOptions: { gridHeight: WEEK_GRID_HEIGHT, nDays: WEEK_DAYS },
					events
				},
				[calendarControls]
			);

			// Set date constraints
			const today = Temporal.Now.plainDateISO(TIMEZONE);
			const maxDate = today.add({ weeks: LOOKAHEAD_WEEKS });
			calendarControls.setMinDate(today);
			calendarControls.setMaxDate(maxDate);

			// Follow system theme preference
			themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			applySystemTheme();
			themeMediaQuery.addEventListener('change', applySystemTheme);
		} catch (err: any) {
			console.error('Calendar initialization failed:', err);
			errorText = err?.stack ?? String(err);
		}
	}

	onMount(initializeCalendar);

	onDestroy(() => {
		if (themeMediaQuery) {
			themeMediaQuery.removeEventListener('change', applySystemTheme);
		}
	});
</script>

{#if errorText}
	<pre class="rounded border bg-white p-3 text-xs whitespace-pre-wrap">{errorText}</pre>
{:else if calendarApp}
	<ScheduleXCalendar {calendarApp} />
{:else}
	<div class="p-4 text-sm opacity-70">Loading…</div>
{/if}