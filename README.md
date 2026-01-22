# m.lnd_ — Availability Calendar

A mobile-friendly availability calendar for personal training sessions.

It shows unavailable time, clearly communicates working hours, and lets visitors request a session via WhatsApp by tapping an empty slot.

**Live demo:** https://mlnd-cal.vercel.app/

---

## Tech stack

- **SvelteKit**
- **Schedule-X** (calendar)
- **shadcn/ui (Svelte)**
- **Tailwind CSS**
- **Vercel** (hosting)

---

## How it works

- Busy / unavailable time is rendered on a weekly calendar
- Empty slots can be tapped to request a session
- Requests are sent via WhatsApp with a prefilled message
- There is no booking logic yet (read-only MVP)

---

## Availability data

Availability is driven by a simple `events.json` file containing busy time intervals (ISO timestamps, Dubai timezone).

The file is currently generated from Apple Calendar via an Apple Shortcut and committed to this repo. The app fetches it directly.

---

## Running locally

```bash
npm install
npm run dev