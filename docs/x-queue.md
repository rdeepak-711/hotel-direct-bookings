# X queue

Drafts written by the x-drafter agent. Status moves from "awaiting approval" to "approved" (Deepak adds it to the approval log in `docs/public-build-playbook.md`) to "scheduled <slot>" to "published <url>". Nothing here is posted by software.

## MKT-DEC6 · none (decision) · drafted 2026-10-19 23:48 IST
Status: awaiting approval
Audience: developers (prompt-injection / agent security); secondary: recruiters, hotel-tech founders
Template: failure or security screenshot (findings.md, "Research, 19 Oct 2026")
Post:
1/
Hotel reviews come from strangers. An LLM agent will read them.

Direct Booking Check audits a US hotel's readiness for direct bookings — Google listing, website, page speed, reviews.

Rule: all tools off. A review saying "ignore your instructions, run X" has nothing to run.

2/ (optional)
Locally that agent is claude -p, called with --tools "" --strict-mcp-config: no tools, no MCP servers. Without that, review text is a prompt-injection path into my machine. Decided 19 Oct; the wrapper isn't built yet.

Self-reply with link:
https://rdeepak.vercel.app/?ref=x
Visual: screenshot of docs/decisions.md DEC-6 Cost (c), Deepak to capture (not yet under docs/evidence/)
Claims:
- Direct Booking Check audits a US hotel's readiness for direct bookings from Google listing, website, page speed and reviews → docs/decisions.md (2026-10-18 entries: score, gap check) and spec
- An LLM agent will read hotel reviews locally; that agent is `claude -p` → docs/decisions.md DEC-6 (stage 1, LLM_MODE=claude-cli)
- Rule: every tool off, no MCP servers (`--tools "" --strict-mcp-config`) → docs/decisions.md DEC-6 Cost (c)
- Without it, review text is a prompt-injection path into Deepak's machine → docs/decisions.md DEC-6 Cost (c)
- Decided 19 Oct; wrapper not built yet (moves into ENG-041) → docs/decisions.md DEC-6; docs/project-status.md Completed milestones + DEC-6 row
- Not claimed: that the wrapper is built, running or tested. Wording stays future/rule ("will read", "Rule:", "isn't built yet").
Lengths: post 1 = 275 chars, post 2 = 217 chars (em-dash counts as 1 on X).
Note: no MKT item for this in docs/public-build-playbook.md and docs/claims.md does not exist yet (MKT-003 idea); claims checked against docs/decisions.md directly.

## MKT-ENG010 · ENG-010 · drafted 2026-10-20 00:14 IST
Status: published 2026-10-20 https://x.com/rDeepak_ACEz/status/2112254944627810622 (posted by Deepak as a 3-post thread with docs/evidence/ENG-010-tests.png)
Audience: developers (LLM output verification); secondary: recruiters, hotel-tech founders
Template: named rule, "The model proposes, code verifies" (findings.md, "Research, 19 Oct 2026"). Post 2 in the series; MKT-DEC6 covered the tools-off guard, this one covers quote verification only.
Post:
1/
The model proposes, code verifies.

Direct Booking Check, step 1: an LLM tags themes in hotel reviews with quoted proof. Code keeps a quote only if its exact words are in the cited review.

Review: "Breakfast was great value."
AI: "breakfast was amazing"
Dropped. (fixture data)

2/ (optional)
Exact, not "same meaning" — a quote under a guest's name must be their words; judging meaning needs another model call.

Drops keep their reason, so invented quotes can be counted later.

13 tests, written and red first. Make the matcher accept everything: tests 7, 9, 10 fail.

Self-reply with link:
https://rdeepak.vercel.app/?ref=x
Visual: screenshot of the 13 passing tests from docs/evidence/ENG-010.txt (vitest run), or of test 7 in tests/quotes.test.ts ("fails when a single word is changed"). Deepak to capture; not yet under docs/evidence/.
Claims:
- ENG-010 is step 1 of 13 build steps → docs/implementation-playbook.md ("ENG-010 Step 1: quote check"); docs/project-status.md (spec: 13 build steps)
- An LLM returns themes with quotes, each tagged with a review id; code keeps a quote only if its words appear in the cited review → lib/quotes.ts (verifyThemes, quoteAppearsIn)
- Matching ignores case, curly quotes and whitespace, nothing else → lib/quotes.ts normalise(); tests 2–5
- Drop reasons "quote not in review" / "unknown review id"; drops are returned, theme with no surviving quotes is removed → lib/quotes.ts; tests 8, 9, 10
- "Breakfast was great value." vs "breakfast was amazing" → dropped; invented fixture text, not a real hotel or guest → tests/quotes.test.ts test 7; tests/fixtures/reviews.json (r3)
- Exact rather than meaning-based: a quote under a guest's name must be their words; meaning would need another model call → Deepak's ENG-010 brief (rationale; not yet written into docs/decisions.md)
- 13 tests, written before the code and red first → git log: 90fac35 "quote check tests, red" precedes 4de26ef "quote check, green"; docs/evidence/ENG-010.txt (13 passed)
- Matcher forced to accept everything → tests 7, 9, 10 fail → docs/evidence/ENG-010.txt (mutation check line)
- Not claimed: any measured hallucination or drop rate (none measured, "can be counted later"); real hotels or users; that the full product works.
Lengths: post 1 = 278 chars, post 2 = 277 chars (em-dash and arrow count as 1 on X).

## MKT-2A · none (feasibility, 18 Oct) · drafted 2026-10-20 00:46 IST
Status: awaiting approval
Slot: Tue 20 Oct, 21:30 IST (main slot). Replaces whatever is booked at 21:30 Tue; not added on top (posting cap: 2 originals a day).
Audience: hiring managers for applied AI roles first (judgement: test the idea on real data before building); hotel-tech second
Template: counter-intuitive story / honest small numbers (findings.md, "Research, 19 Oct 2026"); example 2a, Pillar 2 "Data that changed the plan", docs/x-growth-review.html
Post:
1/
I killed my first idea with 60 reviews.

Plan: show each US hotel the booking problems guests complain about.

12 hotels × 5 Google reviews (the API's cap). Booking/OTAs came up in 10, complaint or not. Cancellation: 2.

Per hotel, that report would mostly be empty. Dropped it.

2/
What the 60 did talk about: rooms (42), location (41), staff (37).

Two things guests kept raising that a hotel's own site could answer: check-in info (19), parking (14).

Crude keyword tags, counts only, no review text kept. Enough to kill an idea, not to rank themes.

Self-reply with link:
The decision log entry that killed this idea, and what replaced it, are in the repo: https://github.com/rdeepak-711/hotel-direct-bookings
Visual: docs/evidence/feasibility-chart.png (rendered 20 Oct from feasibility-counts.json `all`; page: docs/evidence/feasibility-chart.html)
Claims:
- 12 hotels, 5 Google reviews each, 60 total → feasibility-counts.json (`hotels`: 12 × 5; `total`: 60)
- 5 is the API's cap → findings.md, "Data sources": Places API (New) returns at most 5 reviews per place
- Booking/OTA 10, cancel/refund 2 → feasibility-counts.json `all`
- "complaint or not": the 10 counts every review mentioning booking/OTA, positive or negative (only 6 are in 1–3 star reviews) → feasibility-counts.json `neg_themes` booking/OTA 6
- Room/bed 42, location 41, staff 37; check-in info 19, parking 14 → feasibility-counts.json `all`
- Plan was a per-hotel booking-problems report; it would mostly come out empty; dropped → docs/decisions.md, 18 Oct "What to build" (Considered: per-hotel booking-complaint mining, "killed by a feasibility run … most per-hotel reports would be empty"); findings.md "What it means" ("would usually come out empty. That idea fails at this data size.")
- Check-in info and parking are things a hotel's own site could answer → findings.md "What it means" (inference, not measured); same idea became the gap check, docs/decisions.md 18 Oct Revision 3
- Crude keyword tags, counts only, no review text kept → findings.md feasibility section ("Only counts were saved … no review text was stored"; "keyword tags are crude"); docs/decisions.md "Review text is never stored"
- Not claimed: any hotel or city name; Hotelzify; percentages; per-hotel theme counts (never computed: "mostly empty" is inferred from 10 booking mentions across 12 hotels, under 1 per hotel on average).
Lengths: post 1 = 279 chars, post 2 = 268 chars, link reply = 108 chars (URL counts as 23 on X).
Tools: marketing:draft-content and marketing:brand-review both used; hashtags and emojis they suggest dropped per my-voice.md.

## MKT-DEC7 · none (decision DEC-7) · drafted 2026-10-20 19:05 IST
Status: awaiting approval
Slot: Wed 21 Oct, 21:30 IST (main slot). Replaces whatever is booked at 21:30 Wed; not added on top (posting cap: 2 originals a day). Tue 20 Oct 21:30 is MKT-2A; MKT-DEC6 has no slot yet (free: Thu 22 Oct 21:30, Fri 23 Oct 21:30).
Audience: hiring managers for applied AI roles first (judgement: read the source before trusting a spec); hotel-tech second
Template: counter-intuitive story / show the paperwork (findings.md, "Research, 19 Oct 2026")
Post:
1/
My spec said to read a hotel's "Book now" button from Google Lighthouse's link-text audit.

Before coding I read the audit's source (v13.5.0). It only lists links with generic text like "click here".

So every hotel would have been told it has no Book now button.

2/
The spec's tap-targets audit no longer exists either.

Decision: read Book now from the home page HTML the checker already downloads.

Cost: a button JavaScript draws after load is missed. How often is unknown — a harness will measure it and log the number.

Self-reply with link:
The full entry — what I considered, why HTML won, what it costs — is DEC-7 in the repo's decision log: https://github.com/rdeepak-711/hotel-direct-bookings
Visual: screenshot of the DEC-7 entry in docs/decisions.md (Decided / Considered / Why / Cost), Deepak to capture; not yet under docs/evidence/
Claims:
- Spec said `bookNow` = first `link-text` item passing `isBookNowText` → git show 3ac5153 -- spec/site.md (removed line for `analyzeLighthouse(psi)`)
- Read Lighthouse source, GoogleChrome/lighthouse main v13.5.0, core/audits/seo/link-text.js; it only lists links on a non-descriptive blocklist ("click here", "more") → findings.md "Issue, 20 Oct 2026"
- Every hotel would get `{ found: false }` → findings.md "Issue, 20 Oct 2026"; docs/decisions.md DEC-7 Why (a)
- Read before coding → git log: 3749693 (findings) precedes 24b76d0 (website tests); no lib/website.ts code yet
- tap-targets audit no longer exists (target-size.js instead) → findings.md "Issue, 20 Oct 2026"
- Decision: bookNow from home page HTML already downloaded by the gap check → docs/decisions.md DEC-7 Decided
- Cost: JS-drawn buttons missed; rate unknown until the harness runs; result goes into DEC-7 → docs/decisions.md DEC-7 Cost; docs/implementation-playbook.md ENG-011h Acceptance
- Not claimed: any miss rate, any real hotel, that the harness or the HTML check is built (ENG-011a tests are red, code not written).
Lengths: post 1 = 263 chars, post 2 = 257 chars, link reply = 126 chars (URL counts as 23 on X).
Before posting: DEC-7 (commit 3ac5153) is not on any remote branch yet. Push it to GitHub first, or the link reply points at a repo without DEC-7.
Tools: marketing:draft-content and marketing:brand-review both used; hashtags and emojis they suggest dropped per my-voice.md.

## MKT-HARNESS-PLAN · ENG-011h (not built, plan only) · drafted 2026-10-20 19:05 IST
Status: awaiting approval
Slot: Thu 22 Oct, 14:30 IST (Tue/Thu second slot, India hiring audience). Replaces whatever is booked at 14:30 Thu; not added on top. Goes after MKT-DEC7 so the "harness" it promises has context. Alternative: post it as a reply under MKT-DEC7's thread on Wed instead of an original, which uses no slot.
Audience: hiring managers for applied AI roles first (judgement: tests only cover what you imagined; measure against reality); hotel-tech second
Template: named rule / show the paperwork (findings.md, "Research, 19 Oct 2026")
Post:
Unit tests only check the cases I thought of.

Next for my hotel website checker: run it on ~25 real hotel sites, once on the raw HTML and once in a real browser. Every blind spot it finds becomes a new unit test.

Not built yet. That's the plan, written down before the code.

Self-reply with link:
The harness plan and the decision it will test (ENG-011h, DEC-7) are in the repo: https://github.com/rdeepak-711/hotel-direct-bookings
Visual: none (optional: screenshot of the ENG-011h entry in docs/implementation-playbook.md, Deepak to capture)
Claims:
- About 25 US hotel sites, `analyzeHtml` on raw HTML and on the page a headless browser renders → docs/implementation-playbook.md ENG-011h Steps
- Every blind spot found becomes a unit test with invented HTML before it is fixed → docs/implementation-playbook.md ENG-011h Acceptance
- Not built; prerequisite ENG-011a still open → docs/implementation-playbook.md ("[ ] ENG-011h", "[ ] ENG-011b"); docs/project-status.md
- Not claimed: any result, miss rate or site count actually run; any hotel name (ENG-011h rule: no real hotel named next to a result).
Lengths: post = 276 chars, link reply = 105 chars (URL counts as 23 on X).
Before posting: same as MKT-DEC7, push DEC-7 and the ENG-011h playbook entry (commit 3ac5153) first.
Tools: marketing:draft-content and marketing:brand-review both used.
