<script lang="ts">
	import AvailabilityCalendar from '$lib/AvailabilityCalendar.svelte';

	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';

	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
</script>

<div class="mx-auto max-w-5xl px-4 py-8 space-y-6">
	<!-- Page header -->
	<div class="space-y-1">
		<h1 class="text-3xl font-semibold tracking-tight">m.lnd_</h1>
		<p class="text-sm text-muted-foreground">
			Personal training availability
		</p>
	</div>

	<!-- Working hours info -->
	<Card>
		<CardHeader class="pb-3">
			<CardTitle>Working hours</CardTitle>
			<CardDescription>
				This calendar shows my availability during working hours only, for booking - please get in touch via WhatsApp.
			</CardDescription>
		</CardHeader>

		<CardContent class="flex flex-wrap items-center gap-2">
			<Badge variant="secondary">Availability</Badge>
			<Badge>6:00 AM – 3:00 PM</Badge>
			<span class="text-sm text-muted-foreground">
				Dubai time
			</span>
		</CardContent>
	</Card>

	<Separator />

	<!-- Calendar -->
	<div class="rounded-lg border bg-background p-2">
		<AvailabilityCalendar />
	</div>
</div>