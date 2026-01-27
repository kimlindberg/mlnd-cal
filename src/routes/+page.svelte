<script lang="ts">
	import AvailabilityCalendar from '$lib/AvailabilityCalendar.svelte';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { MessageCircle, ExternalLink } from '@lucide/svelte';
	import { buildWhatsAppUrl } from '$lib/config';

	const whatsappUrl = buildWhatsAppUrl(
		"Hi! I'd like to book a personal training session. Are you available?"
	);
</script>

<div class="mx-auto max-w-5xl px-4 py-8 space-y-4">
	<!-- Page header -->
	<div class="flex items-center gap-3">
		<Avatar class="h-12 w-12">
			<AvatarImage src="/avatar.png" alt="m.lnd_ avatar" />
			<AvatarFallback>ML</AvatarFallback>
		</Avatar>
		<div class="space-y-1">
			<h1 class="text-3xl font-semibold tracking-tight">m.lnd_ calendar</h1>
			<p class="text-sm text-muted-foreground">
				Personal training availability. Click anywhere in the calendar to request a session.
			</p>
		</div>
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
				<span>WhatsApp</span>
				<ExternalLink size={13} class="opacity-80" />
			</Badge>
		</a>
	</div>

	<!-- Calendar -->
	<AvailabilityCalendar />	
</div>
