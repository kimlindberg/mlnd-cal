<script lang="ts">
	import { onMount } from 'svelte';
	import { Check, ChevronsUpDown, X } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import * as Command from '$lib/components/ui/command';
	import * as Popover from '$lib/components/ui/popover';
	import { cn } from '$lib/utils';

	type CalendarOption = {
		displayName: string;
		url: string;
		description?: string | null;
		color?: string | null;
		timezone?: string | null;
	};

	const { data } = $props();

	const calendars = $derived((data?.calendars ?? []) as CalendarOption[]);

	let open = $state(false);
	let selected = $state<string[]>([]);
	let loadError = $state<string | null>(null);
	let saveError = $state<string | null>(null);
	let saveState = $state<'idle' | 'saving' | 'saved'>('idle');
	let isLoading = $state(false);

	const DEFAULT_WORK_START = '06:00';
	const DEFAULT_WORK_END = '15:00';
	const DEFAULT_BOOKED_TITLE = 'Booked';

	let workStart = $state(DEFAULT_WORK_START);
	let workEnd = $state(DEFAULT_WORK_END);
	let bookedTitle = $state(DEFAULT_BOOKED_TITLE);

	const selectedCalendars = $derived(
		calendars.filter((calendar) => selected.includes(calendar.url))
	);

	const buttonLabel = $derived(
		selectedCalendars.length
			? `${selectedCalendars.length} selected`
			: calendars.length
					? 'Select calendars...'
					: 'No calendars available'
	);

	function normalizeTime(value: unknown, fallback: string): string {
		if (typeof value !== 'string') return fallback;
		const match = value.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
		if (!match) return fallback;
		const hours = Number(match[1]);
		const minutes = Number(match[2]);
		if (Number.isNaN(hours) || Number.isNaN(minutes)) return fallback;
		return `${match[1]}:${match[2]}`;
	}

	function toggleValue(value: string) {
		selected = selected.includes(value)
			? selected.filter((item) => item !== value)
			: [...selected, value];
	}


	async function loadSelection() {
		isLoading = true;
		loadError = null;
		try {
			const response = await fetch('/api/icloud-selection');
			if (!response.ok) {
				loadError = 'Unable to load saved calendar selection.';
				return;
			}
			const payload = await response.json();
			const valid = new Set(calendars.map((calendar) => calendar.url));
			selected = Array.isArray(payload?.selection)
				? payload.selection.filter((value: unknown) => typeof value === 'string' && valid.has(value))
				: [];
			workStart = normalizeTime(payload?.workStart, DEFAULT_WORK_START);
			workEnd = normalizeTime(payload?.workEnd, DEFAULT_WORK_END);
			bookedTitle = typeof payload?.bookedTitle === 'string' && payload.bookedTitle.trim()
				? payload.bookedTitle.trim()
				: DEFAULT_BOOKED_TITLE;
		} catch {
			loadError = 'Unable to load saved calendar selection.';
		} finally {
			isLoading = false;
		}
	}

	async function saveSelection() {
		saveState = 'saving';
		saveError = null;
		try {
			const response = await fetch('/api/icloud-selection', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					selection: selected,
					workStart,
					workEnd,
					bookedTitle
				})
			});
			if (!response.ok) {
				saveError = 'Unable to save selection.';
				saveState = 'idle';
				return;
			}
			saveState = 'saved';
		} catch {
			saveError = 'Unable to save selection.';
			saveState = 'idle';
		}
	}

	onMount(() => {
		loadSelection();
	});

	$effect(() => {
		if (saveState !== 'saved') return;
		const timeout = setTimeout(() => {
			saveState = 'idle';
		}, 2000);
		return () => clearTimeout(timeout);
	});
</script>

<div class="mx-auto max-w-4xl px-4 py-10 space-y-8">
	<header class="space-y-3">
		<h1 class="text-3xl font-semibold tracking-tight">iCloud calendars</h1>
	</header>
	<Separator />

	<section class="space-y-6">
		<Card>
			<CardHeader>
				<CardTitle>Availability settings</CardTitle>
				<CardDescription>
					Set your working hours and the label shown for booked slots.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if data?.error}
					<p class="text-sm text-destructive">
						{data.error}
						{#if data.details}
							<span class="block text-xs opacity-80">{data.details}</span>
						{/if}
					</p>
				{/if}

				<div class="grid gap-4 sm:grid-cols-3">
					<div class="flex flex-col gap-2">
						<label class="text-sm font-medium">Start time</label>
						<input
							type="time"
							step="900"
							class="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none h-9 w-full rounded-md border border-input px-3 text-sm"
							value={workStart}
							oninput={(event) => (workStart = event.currentTarget.value)}
						/>
					</div>

					<div class="flex flex-col gap-2">
						<label class="text-sm font-medium">End time</label>
						<input
							type="time"
							step="900"
							class="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none h-9 w-full rounded-md border border-input px-3 text-sm"
							value={workEnd}
							oninput={(event) => (workEnd = event.currentTarget.value)}
						/>
					</div>

					<div class="flex flex-col gap-2">
						<label class="text-sm font-medium">Booked label</label>
						<input
							class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
							value={bookedTitle}
							oninput={(event) => (bookedTitle = event.currentTarget.value)}
							placeholder="Booked"
						/>
					</div>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Calendar selection</CardTitle>
				<CardDescription>Select which iCloud calendars to include in availability.</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex flex-wrap items-center gap-3">
					<Popover.Root bind:open>
						<Popover.Trigger>
							{#snippet child({ props })}
								<Button
									{...props}
									variant="outline"
									class="w-full justify-between sm:w-[320px]"
									role="combobox"
									aria-expanded={open}
									disabled={calendars.length === 0}
								>
									{buttonLabel}
									<ChevronsUpDown class="ms-2 size-4 shrink-0 opacity-50" />
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="w-full p-0 sm:w-[320px]">
							<Command.Root>
								<Command.Input placeholder="Search calendars..." />
								<Command.List>
									<Command.Empty>No calendar found.</Command.Empty>
									<Command.Group>
										{#each calendars as calendar (calendar.url)}
											<Command.Item
												value={calendar.url}
												onSelect={() => {
													toggleValue(calendar.url);
												}}
											>
												<Check
													class={cn(
														"me-2 size-4",
														selected.includes(calendar.url)
															? "opacity-100"
															: "opacity-0"
													)}
												/>
												{#if calendar.color}
													<span
														class="me-2 h-2.5 w-2.5 rounded-full"
														style={`background:${calendar.color}`}
													></span>
												{/if}
												{calendar.displayName}
											</Command.Item>
										{/each}
									</Command.Group>
								</Command.List>
							</Command.Root>
						</Popover.Content>
					</Popover.Root>

				</div>

				<div class="flex flex-wrap gap-2">
					{#if selectedCalendars.length === 0}
						<span class="text-xs text-muted-foreground">No calendars selected.</span>
					{:else}
						{#each selectedCalendars as calendar (calendar.url)}
							<Badge variant="secondary" class="flex items-center gap-2">
								{#if calendar.color}
									<span
										class="h-2.5 w-2.5 rounded-full"
										style={`background:${calendar.color}`}
									></span>
								{/if}
								<span>{calendar.displayName}</span>
								<button
									type="button"
									class="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
									onclick={() => toggleValue(calendar.url)}
									aria-label={`Remove ${calendar.displayName}`}
								>
									<X class="h-3 w-3" />
								</button>
							</Badge>
						{/each}
					{/if}
				</div>
			</CardContent>
		</Card>
	</section>

	<div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm">
		<div class="text-sm">
			<div class="font-medium">Save settings</div>
			<p class="text-xs text-muted-foreground">Applies to calendar selection and availability rules.</p>
		</div>
		<div class="flex items-center gap-3">
			<Button
				variant="default"
				size="sm"
				class="bg-primary text-primary-foreground hover:bg-primary/90"
				onclick={saveSelection}
				disabled={calendars.length === 0 || saveState === 'saving'}
			>
				{saveState === 'saving' ? 'Saving...' : 'Save settings'}
			</Button>
			{#if saveState === 'saved'}
				<span class="text-xs text-muted-foreground">Saved</span>
			{/if}
			{#if isLoading}
				<span class="text-xs text-muted-foreground">Loading saved selection...</span>
			{/if}
			{#if loadError}
				<span class="text-xs text-destructive">{loadError}</span>
			{/if}
			{#if saveError}
				<span class="text-xs text-destructive">{saveError}</span>
			{/if}
		</div>
	</div>
</div>
