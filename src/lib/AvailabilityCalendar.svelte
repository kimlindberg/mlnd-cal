<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { ScheduleXCalendar } from '@schedule-x/svelte';
	import { createCalendar, viewDay, viewWeek } from '@schedule-x/calendar';
	import { createCalendarControlsPlugin } from '@schedule-x/calendar-controls';
	import '@schedule-x/theme-shadcn/dist/index.css';
	import 'temporal-polyfill/global';

	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { buildWhatsAppUrl } from '$lib/config';

	// ========== Type definitions ==========
	type AvailabilityEvent = {
		start: string;
		end: string;
		title?: string;
		id?: string;
	};

	type CalendarApp = any;

	type PendingSlot = {
		start: Temporal.ZonedDateTime;
		end: Temporal.ZonedDateTime;
		waUrl: string;
	};

	// ========== Configuration constants ==========
	const TIMEZONE = 'Asia/Dubai';
	const EVENTS_URL_BASE =
		'https://raw.githubusercontent.com/kimlindberg/mlnd-cal/refs/heads/master/events.json';

	const DAY_START = '05:00';
	const DAY_END = '16:00';
	const WEEK_GRID_HEIGHT = 420;
	const WEEK_DAYS = 5;
	const LOOKAHEAD_WEEKS = 4;

	const WORK_START_HOUR = 6; // 6:00 AM
	const WORK_END_HOUR = 15; // 3:00 PM
	const SLOT_DURATION_MINUTES = 60;

	const THEME_QUERY = '(prefers-color-scheme: dark)';

	// ========== State ==========

	let calendarApp: CalendarApp | null = null;
	let errorText: string | null = null;
	let themeMediaQuery: MediaQueryList | null = null;
	let calendarControls: ReturnType<typeof createCalendarControlsPlugin> | null = null;
	let busyInstants: Array<{ start: Temporal.Instant; end: Temporal.Instant }> = [];
	let confirmOpen = false;
	let pendingSlot: PendingSlot | null = null;

	// ========== Time conversion & formatting ==========

	function toDubaiZdt(isoWithOffset: string): Temporal.ZonedDateTime {
		return Temporal.ZonedDateTime.from(`${isoWithOffset.trim()}[${TIMEZONE}]`);
	}

	function format12h(zdt: Temporal.ZonedDateTime): string {
		const h24 = zdt.hour;
		const m = String(zdt.minute).padStart(2, '0');
		const suffix = h24 >= 12 ? 'PM' : 'AM';
		const h12 = ((h24 + 11) % 12) + 1;
		return `${h12}:${m} ${suffix}`;
	}

	function snapToNearestQuarter(zdt: Temporal.ZonedDateTime): Temporal.ZonedDateTime {
		const minutes = zdt.minute;
		const snappedMinutes = Math.round(minutes / 15) * 15;

		let snapped = zdt.with({
			minute: snappedMinutes,
			second: 0,
			millisecond: 0,
			microsecond: 0,
			nanosecond: 0
		});

		// Handle 60 → next hour
		if (snappedMinutes === 60) {
			snapped = snapped.add({ hours: 1 }).with({ minute: 0 });
		}

		return snapped;
	}

	// ========== Event management ==========
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

	async function loadEvents(): Promise<AvailabilityEvent[]> {
		const url = `${EVENTS_URL_BASE}?t=${Date.now()}`;
		const res = await fetch(url, { cache: 'no-store' });
		if (!res.ok) throw new Error(`Failed to load events (${res.status})`);
		return res.json();
	}

	// ========== Availability validation ==========
	function isWeekday(date: Temporal.PlainDate): boolean {
		return date.dayOfWeek >= 1 && date.dayOfWeek <= 5;
	}

	function overlaps(
		aStart: Temporal.Instant,
		aEnd: Temporal.Instant,
		bStart: Temporal.Instant,
		bEnd: Temporal.Instant
	): boolean {
		return Temporal.Instant.compare(aStart, bEnd) < 0 && Temporal.Instant.compare(bStart, aEnd) < 0;
	}

	function isWithinWorkingHours(start: Temporal.ZonedDateTime, end: Temporal.ZonedDateTime): boolean {
		const startValid = start.hour >= WORK_START_HOUR && start.hour < WORK_END_HOUR;
		const endValid = end.hour < WORK_END_HOUR || (end.hour === WORK_END_HOUR && end.minute === 0);
		return startValid && endValid;
	}

	function isSlotAvailable(start: Temporal.Instant, end: Temporal.Instant): boolean {
		return !busyInstants.some((busy) => overlaps(busy.start, busy.end, start, end));
	}

	// ========== Slot request handling ==========
	function buildSessionRequestUrl(start: Temporal.ZonedDateTime, end: Temporal.ZonedDateTime): string {
		const date = start.toPlainDate().toString();
		const msg = `Hi! I'd like to request a PT session on ${date}, ${format12h(start)}–${format12h(
			end
		)} (Dubai time). Is this slot available?`;
		return buildWhatsAppUrl(msg);
	}

	function requestSlotAt(zdt: Temporal.ZonedDateTime): void {
		const dt = zdt.withTimeZone(TIMEZONE);

		// Validate: weekday only
		if (!isWeekday(dt.toPlainDate())) return;

		// Snap to nearest 15 minutes and create a 60-minute slot
		const slotStart = snapToNearestQuarter(dt);
		const slotEnd = slotStart.add({ minutes: SLOT_DURATION_MINUTES });

		// Validate: within working hours
		if (!isWithinWorkingHours(slotStart, slotEnd)) return;

		// Validate: no overlaps with busy events
		const startInstant = slotStart.toInstant();
		const endInstant = slotEnd.toInstant();
		if (!isSlotAvailable(startInstant, endInstant)) return;

		// Show confirmation dialog
		pendingSlot = {
			start: slotStart,
			end: slotEnd,
			waUrl: buildSessionRequestUrl(slotStart, slotEnd)
		};
		confirmOpen = true;
	}

	function confirmSlot(): void {
		if (pendingSlot) {
			window.open(pendingSlot.waUrl, '_blank', 'noopener,noreferrer');
		}
		closeDialog();
	}

	function closeDialog(): void {
		confirmOpen = false;
		pendingSlot = null;
	}

	// ========== Theme management ==========
	function setTheme(isDark: boolean): void {
		if (!calendarApp) return;
		calendarApp.setTheme(isDark ? 'dark' : 'light');
	}

	function applySystemTheme(): void {
		const isDark = themeMediaQuery?.matches ?? false;
		setTheme(isDark);
	}

	function attachThemeListener(mq: MediaQueryList): void {
		mq.addEventListener('change', applySystemTheme);
	}

	function detachThemeListener(mq: MediaQueryList): void {
		mq.removeEventListener('change', applySystemTheme);
	}

	// ========== Calendar initialization ==========
	async function initializeCalendar(): Promise<void> {
		try {
			const rawEvents = await loadEvents();
			const events = (rawEvents ?? []).map(normalizeEvent);

			// Cache busy time ranges for quick overlap checking
			busyInstants = events.map((e: any) => ({
				start: e.start.toInstant(),
				end: e.end.toInstant()
			}));

			calendarControls = createCalendarControlsPlugin();
			calendarApp = createCalendar(
				{
					views: [viewDay, viewWeek],
					theme: 'shadcn',
					timezone: TIMEZONE,
					dayBoundaries: { start: DAY_START, end: DAY_END },
					weekOptions: { gridHeight: WEEK_GRID_HEIGHT, nDays: WEEK_DAYS },
					events,
					callbacks: {
						// @ts-ignore (types may lag; runtime works)
						onClickDateTime(dateTime: Temporal.ZonedDateTime) {
							requestSlotAt(dateTime);
						}
					}
				},
				[calendarControls]
			);

			// Set date range constraints
			const today = Temporal.Now.plainDateISO(TIMEZONE);
			const maxDate = today.add({ weeks: LOOKAHEAD_WEEKS });
			calendarControls.setMinDate(today);
			calendarControls.setMaxDate(maxDate);

			// Listen for system theme changes
			themeMediaQuery = window.matchMedia(THEME_QUERY);
			applySystemTheme();
			attachThemeListener(themeMediaQuery);
		} catch (err: any) {
			console.error('Calendar initialization failed:', err);
			errorText = err?.stack ?? String(err);
		}
	}

	// ========== Lifecycle ==========
	onMount(initializeCalendar);

	onDestroy(() => {
		if (themeMediaQuery) {
			detachThemeListener(themeMediaQuery);
		}
	});
</script>

<!-- Confirmation Dialog -->
<Dialog bind:open={confirmOpen}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Request this time?</DialogTitle>
			<DialogDescription>
				We’ll open WhatsApp with a prefilled booking request.
			</DialogDescription>
		</DialogHeader>

		{#if pendingSlot}
			<div class="mt-2 rounded-md border p-3 text-sm">
				<div class="font-medium">
					{pendingSlot.start.toPlainDate().toString()}
				</div>
				<div class="text-muted-foreground">
					{format12h(pendingSlot.start)} – {format12h(pendingSlot.end)} (Dubai time)
				</div>
			</div>
		{/if}

		<DialogFooter class="mt-4">
			<Button variant="outline" onclick={closeDialog}>
				Cancel
			</Button>

			<Button onclick={confirmSlot}>
				Request via WhatsApp
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

{#if errorText}
	<pre class="rounded border bg-white p-3 text-xs whitespace-pre-wrap">{errorText}</pre>
{:else if calendarApp}
	<ScheduleXCalendar {calendarApp} />
{:else}
	<div class="p-4 text-sm opacity-70">Loading…</div>
{/if}