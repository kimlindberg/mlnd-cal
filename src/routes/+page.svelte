<!-- src/routes/+page.svelte -->
<script lang="ts">
  import AvailabilityCalendar from '$lib/AvailabilityCalendar.svelte';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Separator } from '$lib/components/ui/separator';


  const busy = [
    // Mon 19
    { start: '2026-01-19T07:00:00+04:00', end: '2026-01-19T08:00:00+04:00' },
    { start: '2026-01-19T10:00:00+04:00', end: '2026-01-19T11:30:00+04:00' },
    { start: '2026-01-19T13:30:00+04:00', end: '2026-01-19T14:15:00+04:00' },

    // Tue 20
    { start: '2026-01-20T06:30:00+04:00', end: '2026-01-20T07:15:00+04:00' },
    { start: '2026-01-20T09:00:00+04:00', end: '2026-01-20T10:00:00+04:00' },
    { start: '2026-01-20T12:00:00+04:00', end: '2026-01-20T13:00:00+04:00' },

    // Wed 21
    { start: '2026-01-21T08:30:00+04:00', end: '2026-01-21T09:30:00+04:00' },
    { start: '2026-01-21T11:00:00+04:00', end: '2026-01-21T12:30:00+04:00' },
    { start: '2026-01-21T14:00:00+04:00', end: '2026-01-21T15:00:00+04:00' },

    // Thu 22
    { start: '2026-01-22T07:30:00+04:00', end: '2026-01-22T08:30:00+04:00' },
    { start: '2026-01-22T10:30:00+04:00', end: '2026-01-22T11:15:00+04:00' },
    { start: '2026-01-22T13:00:00+04:00', end: '2026-01-22T14:30:00+04:00' },

    // Fri 23
    { start: '2026-01-23T06:00:00+04:00', end: '2026-01-23T07:00:00+04:00' },
    { start: '2026-01-23T09:30:00+04:00', end: '2026-01-23T10:30:00+04:00' },
    { start: '2026-01-23T12:30:00+04:00', end: '2026-01-23T13:30:00+04:00' },

    // Sat 24
    { start: '2026-01-24T08:00:00+04:00', end: '2026-01-24T09:00:00+04:00' },
    { start: '2026-01-24T11:00:00+04:00', end: '2026-01-24T12:00:00+04:00' },

    // Sun 25
    { start: '2026-01-25T10:00:00+04:00', end: '2026-01-25T11:00:00+04:00' }
  ];
</script>

<div class="w-full max-w-6xl mx-auto p-3 sm:p-6 space-y-4">
  <Card>
    <CardHeader class="space-y-2">
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-1">
          <CardTitle class="text-2xl sm:text-3xl tracking-tight">m.lnd_</CardTitle>
          <CardDescription>
            Dubai time · Week view on desktop, list view on small screens
          </CardDescription>
        </div>

        <div class="flex gap-2">
          <Badge variant="secondary">Read-only</Badge>
          <Badge>POC</Badge>
        </div>
      </div>

      <Separator />

    </CardHeader>

    <CardContent>
      <!-- Wrapper sizing per Schedule-X guidance -->
      <div class="w-full rounded-lg border" style="height: 800px; max-height: 90vh;">
        <AvailabilityCalendar {busy} />
      </div>
    </CardContent>
  </Card>
</div>