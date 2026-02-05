# Family OS - 90 Day MVP Plan

**Goal:** Ship a working MVP by May 5, 2026 that Adrian and Nicole actually use for their Sunday planning ritual.

**Time Budget:** 5-8 hours/week (protect Tuesday and Thursday evenings)

---

## Phase 1: Foundation (Weeks 1-3)

### Week 1: Project Setup
- [ ] Initialize Next.js 14 with App Router
- [ ] Configure TypeScript strict mode
- [ ] Set up Tailwind with calm color palette
- [ ] Create Supabase project
- [ ] Define database schema (Prisma or Drizzle)
- [ ] Configure Vercel deployment
- [ ] Push initial commit

### Week 2: Authentication
- [ ] Install and configure Auth.js (NextAuth)
- [ ] Set up Google OAuth provider
- [ ] Request Google Calendar API scopes
- [ ] Store tokens securely in Supabase
- [ ] Build login/logout flow
- [ ] Create protected route middleware

### Week 3: Calendar Connection
- [ ] Build Google Calendar API client
- [ ] Implement calendar list fetch
- [ ] Create calendar selection UI
- [ ] Set up event sync (initial pull)
- [ ] Store events in database
- [ ] Handle token refresh

**Phase 1 Milestone:** Can log in and see own calendar events in app.

---

## Phase 2: Intelligence (Weeks 4-6)

### Week 4: Multi-Calendar Merge
- [ ] Support connecting multiple calendars
- [ ] Build merged calendar view (week view)
- [ ] Color-code by calendar source
- [ ] Handle all-day vs timed events
- [ ] Time zone handling

### Week 5: Conflict Detection
- [ ] Define conflict types (overlap, handoff, overload)
- [ ] Build conflict detection algorithm
- [ ] Create conflict data model
- [ ] Visual conflict indicators
- [ ] Conflict detail view

### Week 6: AI Integration
- [ ] Set up Claude API client
- [ ] Design prompt template with household context
- [ ] Build weekly summary generation
- [ ] Create summary display component
- [ ] Add manual regenerate trigger
- [ ] Store summaries in database

**Phase 2 Milestone:** AI generates useful weekly summary with conflict awareness.

---

## Phase 3: Polish (Weeks 7-9)

### Week 7: UX Refinement
- [ ] Apply calm design principles
- [ ] Generous whitespace, muted palette
- [ ] Mobile-responsive layout
- [ ] Loading states and skeletons
- [ ] Error handling with friendly messages

### Week 8: Notification System
- [ ] Design notification strategy (minimal)
- [ ] Sunday reminder for planning session
- [ ] Conflict alerts (same-day only)
- [ ] Email digest option
- [ ] Notification preferences

### Week 9: Data & Edge Cases
- [ ] Recurring event handling
- [ ] Event updates and deletes sync
- [ ] Offline resilience
- [ ] Rate limiting for Google API
- [ ] Data cleanup and optimization

**Phase 3 Milestone:** App feels calm and handles real-world calendar complexity.

---

## Phase 4: Ship (Weeks 10-12)

### Week 10: Production Hardening
- [ ] Security audit (tokens, auth, API)
- [ ] Error monitoring (Sentry or similar)
- [ ] Performance check (Core Web Vitals)
- [ ] Environment variable audit
- [ ] Backup strategy for user data

### Week 11: Dogfooding
- [ ] Connect Adrian + Nicole's real calendars
- [ ] Use for actual Sunday planning
- [ ] Document friction points
- [ ] Quick fixes based on usage
- [ ] Iterate on AI prompt based on real output

### Week 12: Launch Prep
- [ ] Final bug fixes
- [ ] Create simple landing page
- [ ] Write launch LinkedIn post (if building in public)
- [ ] Invite 2-3 beta families
- [ ] Celebrate shipping 🎉

**Phase 4 Milestone:** MVP is live, you're using it, 2+ beta families onboarded.

---

## Success Criteria

1. ✅ Can connect Google Calendars from both partners
2. ✅ Merged view shows all family events
3. ✅ Conflicts are detected and highlighted
4. ✅ AI generates weekly summary we find useful
5. ✅ We use it for 2+ Sunday planning sessions before "launch"

---

## Weekly Rhythm

| Day | Activity | Time |
|-----|----------|------|
| Tuesday | Build session (heavy lifting) | 2-3 hrs |
| Thursday | Fix and refine session | 1-2 hrs |
| Sunday | Review, check boxes, plan next week | 30 min |

---

## Tech Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 14 App Router | Server components, streaming |
| Auth | Auth.js (not Supabase Auth) | Better Google Calendar scope handling |
| AI | Claude API | Already in ecosystem, good summaries |
| DB | Supabase Postgres | Simple, realtime if needed later |
| ORM | Prisma or Drizzle | Type-safe queries |
| Hosting | Vercel | Zero-config Next.js |

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Salesforce ramp eats evenings | High | Block Tues/Thurs now, treat as sacred |
| Google OAuth complexity | Medium | Use Auth.js, manual Cloud Console setup |
| Scope creep | Medium | Stick to checklist, no new features until MVP |
| AI output quality | Low | Iterate on prompt, household context helps |

---

## Resources

- [Next.js 14 Docs](https://nextjs.org/docs)
- [Auth.js Google Provider](https://authjs.dev/reference/core/providers/google)
- [Google Calendar API](https://developers.google.com/calendar/api)
- [Claude API Docs](https://docs.anthropic.com/claude/reference)
- [Supabase Docs](https://supabase.com/docs)

---

_Last updated: February 2026_
