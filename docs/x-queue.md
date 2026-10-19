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
