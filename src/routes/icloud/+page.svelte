<script lang="ts">
	import { tick } from 'svelte';
	import { Check, ChevronsUpDown, X } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
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
	let triggerRef = $state<HTMLButtonElement>(null!);

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

	function toggleValue(value: string) {
		selected = selected.includes(value)
			? selected.filter((item) => item !== value)
			: [...selected, value];
	}

	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => {
			triggerRef?.focus();
		});
	}
</script>

<div class="mx-auto max-w-4xl px-4 py-10 space-y-8">
	<header class="space-y-3">
		<h1 class="text-3xl font-semibold tracking-tight">iCloud calendars</h1>
		<p class="text-sm text-muted-foreground">
			Calendars are fetched server-side using credentials stored in Vercel environment variables.
		</p>
	</header>

	<section class="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
		<div class="flex flex-wrap items-center gap-2">
			<Badge variant="secondary" class="cursor-default">
				Uses server-side environment variables
			</Badge>
			<Badge variant="secondary" class="cursor-default">
				PRIVATE_ICLOUD_USERNAME
			</Badge>
			<Badge variant="secondary" class="cursor-default">
				PRIVATE_ICLOUD_PASSWORD
			</Badge>
		</div>
		<p class="text-sm text-muted-foreground">
			Set
			<code class="rounded bg-muted px-1 py-0.5 text-xs">PRIVATE_ICLOUD_SERVER_URL</code>
			if you need a custom CalDAV endpoint.
		</p>
		{#if data?.error}
			<p class="text-sm text-destructive">
				{data.error}
				{#if data.details}
					<span class="block text-xs opacity-80">{data.details}</span>
				{/if}
			</p>
		{/if}
	</section>

	<section class="space-y-4">
		<h2 class="text-lg font-semibold">Choose calendars</h2>
		<Popover.Root bind:open>
			<Popover.Trigger bind:ref={triggerRef}>
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
				<button
					type="button"
					class="text-xs text-muted-foreground underline-offset-4 hover:underline"
					onclick={closeAndFocusTrigger}
				>
					Close
				</button>
			{/if}
		</div>
	</section>
</div>
