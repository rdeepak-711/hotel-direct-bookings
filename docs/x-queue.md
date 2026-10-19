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
Status: awaiting approval
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
