# Family OS - Project Context

> Persistent context for Claude Code sessions. Update this file as the project evolves.

## Current Status

**Phase:** 1 - Foundation
**Week:** 1 of 12
**Started:** February 2026
**Ship Date:** May 5, 2026

## What This Is

Family OS is a calm planning system for dual-career parents. It merges multiple Google Calendars into one unified view, detects conflicts, and uses AI to surface what actually matters for the week ahead.

**Core insight:** Busy families don't need more features—they need less noise. The goal is anxiety reduction, not productivity optimization.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 14 (App Router) | Server components, good DX |
| Language | TypeScript | Type safety for calendar data |
| Styling | Tailwind CSS | Fast iteration, calm defaults |
| Database | Supabase (Postgres) | Auth + DB + realtime in one |
| Auth | Auth.js (NextAuth) | Google OAuth with Calendar scopes |
| AI | Claude API (Anthropic) | Already in ecosystem, good at summaries |
| Hosting | Vercel | Zero-config Next.js deploys |
| Calendar | Google Calendar API | Primary user calendar |

## Data Model

```
Household
├── id, name, created_at
├── Users[] (household members)
│   ├── id, email, name, role (admin/member)
│   └── google_tokens (encrypted)
├── Calendars[] (connected calendars)
│   ├── id, google_calendar_id, name, color
│   ├── owner_user_id
│   └── sync_status, last_synced
├── Events[] (cached from Google)
│   ├── id, google_event_id, calendar_id
│   ├── title, start, end, location
│   ├── attendees[], recurrence
│   └── conflict_ids[] (detected conflicts)
└── WeeklySummaries[]
    ├── id, week_start, generated_at
    ├── ai_summary (text)
    ├── conflicts[] (structured)
    └── recommendations[] (structured)
```

## Household Context (for AI prompts)

When generating weekly summaries, include this context:

```
Household: Adrian & Nicole Lumley (NYC area)

PEOPLE:
- Adrian: Director, Product Management @ Salesforce (started Dec 2025)
  - Hybrid: In-office Tues/Thurs, remote Mon/Wed/Fri
  - Side project builder (Family OS, La Carta)
  - Protect Tues/Thurs evenings for coding

- Nicole: VP, Customer Success @ Korro AI (started Nov 2025)
  - Hybrid: In-office 1x/week (usually Mon or Tues)
  - Leading CS org at early-stage AI startup
  - Salesforce alum (they have that in common)

- Child: Toddler
  - Daycare Mon-Fri
  - Pickup usually ~5:30 PM
  - Handoff conflicts = both parents have meetings at pickup time

- Dog: Archie
  - Needs morning/evening walks
  - Occasional vet appointments

CALENDAR SOURCES:
- Adrian Work (Salesforce calendar)
- Adrian Personal
- Nicole Work (Korro AI)
- Nicole Personal
- Family Shared
- Daycare calendar (closures, events)

KNOWN PATTERNS:
- Sunday evening = weekly planning ritual (this is what we're building for)
- Tuesday = potential conflict day (both might be in-office)
- Tuesday/Thursday evenings = Adrian's protected build time
- Daycare pickup (~5:30) = daily coordination point
- Both in new senior roles = extra meeting load, calendar chaos

CONFLICT TYPES TO DETECT:
1. Overlap: Same-time meetings for both parents
2. Handoff: Both have meetings at daycare pickup/dropoff
3. Overload: 6+ meetings in one day for either parent
4. Travel: Either parent out of town
5. Double-booking: Same person, two places
```

## Builder Context

Adrian is a "Builder-in-Residence" — a product leader by day who ships side projects nights and weekends. This shapes the design philosophy:

**Identity patterns discovered:**
- Systems that reduce life friction (not productivity porn)
- AI as thoughtful assistant, not automation engine
- "Calm over busy" as core design principle
- 0-to-1 builder energy, values shipping over planning

**Why Family OS exists:**
Built from lived experience — two demanding careers, a toddler, and the Sunday night panic of "wait, who's picking up the kid on Tuesday?" Google Calendar sharing isn't enough. They need one merged view, conflict detection, and an AI that actually knows their household.

## AI Prompt Structure

```
You are a calm family assistant helping Adrian and Nicole plan their week.

HOUSEHOLD CONTEXT:
{household_context}

THIS WEEK'S EVENTS:
{merged_calendar_events}

DETECTED CONFLICTS:
{conflicts_list}

Generate:
1. A 3-sentence summary of the week ahead (tone: warm, direct, not corporate)
2. Top 3 things to be aware of (specific, not generic)
3. One actionable recommendation to reduce stress

Remember: Calm over busy. Be specific. Don't moralize about priorities.
```

## Design Philosophy

See `/docs/DESIGN_PHILOSOPHY.md` for full principles. Quick reference:

- **Calm over busy** - reduce anxiety, don't amplify it
- **AI as assistant** - enhance judgment, don't replace it
- **Friction reduction** - fewer features, less friction
- **Show, don't overwhelm** - match signal to moment
- **Opinionated defaults** - best config is no config

## File Structure

```
family-os/
├── CLAUDE.md              # You are here
├── docs/
│   ├── PLAN.md            # 90-day MVP plan
│   ├── CHANGELOG.md       # Weekly ship log
│   └── DESIGN_PHILOSOPHY.md
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── (auth)/        # Auth routes
│   │   ├── (dashboard)/   # Main app
│   │   ├── api/           # API routes
│   │   └── layout.tsx
│   ├── components/
│   │   ├── calendar/      # Calendar views
│   │   ├── conflicts/     # Conflict UI
│   │   └── summary/       # AI summary display
│   ├── lib/
│   │   ├── google/        # Google Calendar API
│   │   ├── ai/            # Claude integration
│   │   ├── db/            # Supabase client
│   │   └── utils/
│   └── types/
├── prisma/                # Or drizzle/ for schema
└── public/
```

## Current Week Checklist

### Week 1: Project Setup
- [ ] Initialize Next.js 14 with App Router
- [ ] Configure TypeScript + Tailwind
- [ ] Set up Supabase project
- [ ] Define Prisma/Drizzle schema
- [ ] Configure Vercel deployment
- [ ] Set up environment variables

## Commands

```bash
# Development
npm run dev

# Database
npx prisma db push    # Push schema changes
npx prisma studio     # Visual DB browser

# Deploy
git push origin main  # Auto-deploys to Vercel
```

## Environment Variables

```
# .env.local (never commit)
DATABASE_URL=
DIRECT_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (configured in Google Cloud Console)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Claude API
ANTHROPIC_API_KEY=
```

## Session Notes

_Update this section at the end of each Claude Code session._

**Last session:** Not started yet
**Next up:** Week 1 setup - scaffold Next.js project

---

_Updated: February 2026_
