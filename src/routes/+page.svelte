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
	import { MessageCircle, ExternalLink } from '@lucide/svelte';

  const whatsappUrl =
		'https://wa.me/971585905881?text=' +
		encodeURIComponent("Hi! I'd like to book a personal training session. Are you available?");
</script>

<div class="mx-auto max-w-5xl px-4 py-8 space-y-4">
	<!-- Page header -->
	<div class="space-y-1">
		<h1 class="text-3xl font-semibold tracking-tight">m.lnd_</h1>
		<p class="text-sm text-muted-foreground">
			Personal training availability
		</p>
	</div>

	<!-- Calendar meta row -->
	<div class="flex flex-wrap items-center gap-2">
		<!-- Non-clickable info badge -->
		<Badge variant="secondary" class="cursor-default select-none">
			Working hours · 6:00 AM – 3:00 PM (Dubai time)
		</Badge>

		<!-- Clickable WhatsApp badge -->
		<a
			href={whatsappUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex"
		>
			<Badge class="flex items-center gap-1 cursor-pointer hover:opacity-90">
				<MessageCircle size={14} />
				<span>WhatsApp to book</span>
				<ExternalLink size={13} class="opacity-80" />
			</Badge>
		</a>
	</div>

	<Separator />

	<!-- Calendar -->
	<div class="rounded-lg border bg-background p-2">
		<AvailabilityCalendar />
	</div>
</div>