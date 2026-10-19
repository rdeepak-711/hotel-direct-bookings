# Direct Booking Check: public-build and distribution playbook

Owner: Agent B (build-in-public and distribution). Written 19 Oct 2026. Every item here depends on a verified engineering task in `docs/implementation-playbook.md`; the dependency is named on each item. Nothing is posted without Deepak's explicit approval of the exact text, and nothing is claimed that engineering has not ticked.

Standing rules, from Deepak's own notes:
- **X is the channel.** Job-search outreach stays on x.com; LinkedIn gets the two long-form posts only (launch, case study). No YC, Wellfound, email or DM campaigns from this playbook.
- **Four posts a day at most on X**, through the X scheduler at 14:30, 18:30, 21:30, 23:30 IST. Check the scheduled list before adding. Never script posting.
- **Every post about the project carries the project link**, full URL with `?ref=x`, in the post or the immediate self-reply.
- **Replies need context**: say what was built before quoting a result.
- **No fabricated metrics, users, testimonials or results.** Fixture data is always labelled "fixture data" or "sample data".
- **No real hotel is named in public** with a bad score. Real reports go privately to Hotelzify.
- **Nothing claims the score measures lost bookings.**

Status values: idea · draft · awaiting verification · approved · published.

---

## A. Positioning

### [ ] MKT-001 Positioning sheet
**Depends on:** nothing (spec is final). **Files:** `docs/positioning.md` (new).
**Content, each as one or two sentences:**
- Problem: independent US hotels pay 15–25% commission when a guest who already wanted them books through Expedia instead; they know it happens and not why it happens to them.
- User: the owner or GM of an independent US hotel. Buyer, in the product version: booking-engine vendors, hotel marketing agencies and PMS resellers who use the report as a sales tool. Hotelzify is the model buyer.
- Difference from a generic website audit: two cross-source inferences nobody else makes, the gap check (guest questions from reviews vs the hotel's own site text) and the neighbour comparison (every number against the 5 nearest hotels, counted and never named).
- Evidence-backed: every AI quote is verified in code against the original review; findings carry evidence and a fix; counts, never percentages.
- What it can claim: public signals that guests are being pushed to booking sites, ranked, with fixes. What it cannot claim: a measurement of lost bookings or revenue; the score is a judgement in code, not a model of bookings.
- Dual positioning: a useful tool for owners and vendors, and an engineering portfolio project with the AI held to a verifiable standard.
**Acceptance:** Deepak reads it and can say the one-line pitch without the sheet. **Status:** idea.

### [ ] MKT-002 Audience map
**Depends on:** MKT-001. **Content:** four audiences and what each one wants from a post. Developers (the verification pattern, the safe fetcher, the test-first build). Founders and hotel-tech teams (the two inferences, the report, the partner mode). Hotel owners (one plain finding they can check on their own site). Recruiters and hiring managers (shipped, tested, deployed, documented, honest about limits). Each post below names its audience. **Status:** idea.

### [ ] MKT-003 Claim register
**Depends on:** MKT-001. **Files:** `docs/claims.md`. A table of every factual claim the content may use, the evidence file, and the date verified. Starts with: 120 tests written before code; 11 test files; five data sources; weights 40/30/30; quotes verified in code; no database; the SSRF controls. Grows only from ticked ENG tasks. **Status:** idea.

---

## B. Content calendar, tied to engineering milestones

Each item is one X post (or short thread) unless marked LinkedIn. Draft text is a starting point for Deepak's voice (`~/claude-work-me/my-voice.md` before any final draft). Visual is named. Claim checklist lists what must be true and where the proof is.

### [ ] MKT-004 "120 failing tests, zero lines of code"
**Depends on:** ENG-001. **Audience:** developers. **Idea:** the spec and the tests are the contract; the builder is a different agent; whatever the discussion left out gets guessed. **Draft:** "Building Direct Booking Check: a tool that reads a US hotel's public signals and says why guests might be booking through Expedia instead. Day 0: 11 test files, 120 tests, all red. No implementation yet. The spec plus the tests are the contract the coding agent builds against." **Visual:** the vitest output screenshot, 11 failed files. **Claims:** 120 `it` blocks (`docs/evidence/ENG-001.txt`). **CTA:** none. **Link:** repo URL once public, else the portfolio. **Status:** idea.

### [ ] MKT-005 CI goes from red to green
**Depends on:** ENG-003 (red) and ENG-060 (green). Two-part. **Audience:** developers, recruiters. **Visual:** the two workflow runs side by side. **Claims:** workflow run URLs. **Status:** idea.

### [ ] MKT-006 Why AI quotes need code verification
**Depends on:** ENG-010 and ENG-041. **Audience:** developers, founders. **Idea:** free models invent quotes; a selling point an owner can't back up is worse than none; normalise and substring; counts recomputed in code. **Visual:** `llm-hallucinated.json` in, the `dropped` array out. Same pattern as escalation-gate, say so in one line with its link. **Claims:** the drop reason strings; the test name. **Status:** idea.

### [ ] MKT-007 How to tell a hotel's booking engine from outside
**Depends on:** ENG-011. **Audience:** hotel-tech teams. **Idea:** PageSpeed's network request list reveals the vendor on JavaScript sites; suffix-match against a vendor list; own-domain path fallback. **Visual:** a redacted request list with `be.synxis.com` highlighted. **Claims:** vendor list from the spec. **Status:** idea.

### [ ] MKT-008 Three answers, not two: the gap check
**Depends on:** ENG-012. **Audience:** developers, founders. **Idea:** "mentioned", "not mentioned", "could not check"; under 200 characters of page text is unknown, never a finding; "Central Park" is not parking. **Visual:** the three-state table. **Claims:** `MIN_PAGE_TEXT = 200`, the excludes. **Status:** idea.

### [ ] MKT-009 A score that doesn't pretend
**Depends on:** ENG-013. **Audience:** founders, hotel owners. **Idea:** 40/30/30, renormalised when data is missing, explainable line by line, not measured against bookings. The Reviews sub-score was dropped because a star rating says nothing about direct booking. **Visual:** the formula as a small table. **Claims:** the fixture score 47 and its three parts. **Status:** idea.

### [ ] MKT-010 Fetching a URL someone else chose
**Depends on:** ENG-020. **Audience:** developers. **Idea:** SSRF in one sentence; the six blocked ranges; re-check on every redirect hop; 8 s, 2 MB, 3 hops. **Visual:** the test that redirects to a private address and gets `blocked:`. **Claims:** the test passes (`tests/safeFetch.test.ts`). **Status:** idea.

### [ ] MKT-011 Comparing against neighbours without exposing them
**Depends on:** ENG-040. **Audience:** founders, hotel owners. **Idea:** rank against the 5 nearest, counted and never named, and the field mask that never asks for their reviews. **Visual:** the field mask string. **Status:** idea.

### [ ] MKT-012 Five jobs at once, one log line
**Depends on:** ENG-050. **Audience:** developers. **Idea:** only the place lookup is fatal; everything else runs in parallel with a budget and degrades to "not available"; one run-log line with no identifiers answers "how often does the AI invent a quote". **Visual:** the `RunLog` JSON. **Claims:** from a real log line (ENG-081), no hotel named. **Status:** idea.

### [ ] MKT-013 Rate limiting on serverless is leaky
**Depends on:** ENG-060. **Audience:** developers. **Idea:** in-memory counters reset per instance; the real cap is the Google Cloud quota; say it in the README. **Status:** idea.

### [ ] MKT-014 First screenshots (fixture data)
**Depends on:** ENG-071. **Audience:** all. **Visual:** the report page at phone width, watermarked "fixture data". **Claims:** labelled sample data; no hotel name beyond the fixture's "Harborside Inn". **Status:** idea.

### [ ] MKT-015 First real run
**Depends on:** ENG-081. **Audience:** founders, hotel-tech. **Idea:** what the first live run got right and what surprised me (from `findings.md`). No hotel named. Wall time from the log line. **Status:** idea.

### [ ] MKT-016 It's live
**Depends on:** ENG-083. **Audience:** all. **Idea:** the public link, what it does, what it doesn't claim, bring your own key. **Visual:** 20-second screen recording of a fixture run. **Link:** production URL with `?ref=x`. **Status:** idea.

### [ ] MKT-017 README as the front door
**Depends on:** ENG-090. **Audience:** recruiters, developers. **Idea:** the README leads with the result and the three calls (verify quotes, never store reviews, detect don't drive). **Status:** idea.

### [ ] MKT-018 Technical case study (LinkedIn long-form, also `docs/case-study.md`)
**Depends on:** ENG-082, ENG-090. **Audience:** recruiters, hiring managers, founders. **Structure:** problem; the two inferences; architecture (the system-design diagram); the AI held to one checked step; security calls; testing without live calls; the ten-hotel hand check with counts; trade-offs and what's deferred; what I'd build next (async jobs, shared cache, batch). **Claims:** every number from `docs/eval.md` and `docs/evidence/`. **Status:** idea.

### [ ] MKT-019 Retrospective thread
**Depends on:** ENG-093. **Audience:** developers. **Idea:** what the spec got wrong, what the hand check changed, what stayed deferred and why. Honest by design. **Status:** idea.

---

## C. Platform plan

**X.** One post per milestone from the list above, in order, never more than the daily cap and never over a scheduled slot. Replies: the daily reply hour goes to hotel-tech founders, direct-booking and PMS accounts, and developers posting about LLM verification, with context before evidence. Each reply that references the project links it.

**LinkedIn.** Two posts only: MKT-016 (short announcement, with the link) and MKT-018 (case study). Written after the X versions have been reviewed.

---

## D. Distribution and feedback

### [ ] MKT-020 Where to share, without spamming
**Depends on:** ENG-083. One list: hotel-tech founders already in warm X threads; developers who engaged with escalation-gate; the Hotelzify CEO (privately, as the challenge answer, never as a public tag). No cold mass-posting in communities; one post in a community only where the project answers a question already being asked there. **Status:** idea.

### [ ] MKT-021 Feedback capture
**Depends on:** ENG-083. GitHub issues are the inbox; a `feedback` label; every useful reply on X becomes an issue with the source link; a weekly five-line summary in `docs/project-status.md` under "Feedback". **Measure:** qualified feedback (someone ran it on a real hotel and said something specific), demo requests, and conversations with hotel-tech people. Not impressions, not follower counts. **Status:** idea.

---

## E. Portfolio and launch assets

- [ ] MKT-022 README polished (ENG-090) with the architecture diagram exported from `docs/system-design.html`.
- [ ] MKT-023 Feature and limitations list, copied from system-design §1 and §13, kept in sync.
- [ ] MKT-024 Reproducible demo: `SOURCES_MODE=fixture LLM_MODE=fake` instructions in the README; one command.
- [ ] MKT-025 Demo video, under 90 seconds, fixture run then one live run with the hotel name blurred; script from ENG-092.
- [ ] MKT-026 Screenshots: `/` and `/report` at 375 px and 1280 px, labelled fixture data (from ENG-071).
- [ ] MKT-027 Case study (MKT-018) linked from the README and the portfolio site.
- [ ] MKT-028 Launch post X (MKT-016) and LinkedIn announcement, both approved in writing before scheduling.
- [ ] MKT-029 Retrospective (MKT-019).
- [ ] MKT-030 Portfolio entry on rdeepak.vercel.app with the production link, the repo, and the case study.

---

## Approval log

| Content ID | Draft date | Approved by Deepak on | Published on | URL |
|---|---|---|---|---|
| | | | | |
