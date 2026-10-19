# Direct Booking Check: project status

Updated 19 Oct 2026, 18:30 IST, after the reset to documents only. Engineering tasks are `ENG-nnn` in `docs/implementation-playbook.md`; content tasks are `MKT-nnn` in `docs/public-build-playbook.md`.

Status levels, in order of strength: **draft** (text or code exists, unverified) · **local** (works on Deepak's machine) · **tested** (automated tests pass locally) · **CI** (the workflow passed on GitHub) · **deployed** (live on Vercel and checked).

## Current phase

Phase 0, scaffold done (ENG-004). Before that, documents only: spec, decisions, mental model, system design, the three playbooks, findings. No tests, no scaffold, no code. Deepak's call on 19 Oct evening: build from the documents, writing each test file by hand before its module.

## Next actionable tasks

| Track | Task | Owner | Blocked by |
|---|---|---|---|
| Engineering | ENG-011 website checks: test file first, then `lib/website.ts` | Claude after Deepak's go | ENG-010 |
| Marketing | MKT-001 positioning sheet | Claude drafts, Deepak approves | nothing |
| Marketing | MKT-003 claim register | Claude | nothing |
| Marketing | MKT-004 "I deleted the tests" post draft | Claude drafts | ENG-010 red run |

## Completed milestones

| Date | Milestone | Evidence |
|---|---|---|
| 18 Oct | Spec v1, decisions, mental model, plan.html | commits up to `6601500` |
| 19 Oct | Spec revision 3 and "fix all" nine review gaps; 11 test files | `4671886` |
| 19 Oct | Decision: v2 in TypeScript, v1 first | `88afeda` |
| 19 Oct | System design doc; decision "detect, never drive" | `ee503e1` |
| 19 Oct | ENG-000 repository assessment; playbooks and status tracker | `ecdc4e2` |
| 19 Oct | Reset to documents only: tests, fixtures, scaffold removed (Deepak) | `17199a8` |
| 19 Oct | DEC-1 to DEC-4 decided per recommendation (Deepak); ENG-001 toolchain; ENG-002 `.env.example` complete (9 vars) | `docs/evidence/ENG-001.txt`, `.env.example` |
| 20 Oct | ENG-010 quote check: 13 tests green, tsc clean; mutation check shows tests 7, 9, 10 catch a match-everything bug | `docs/evidence/ENG-010.txt` |
| 19 Oct | Repo pushed to GitHub (private); ENG-003 CI green | https://github.com/rdeepak-711/hotel-direct-bookings/actions/runs/39279152782 |
| 19 Oct | ENG-004 scaffold: next 16.3.8, react 19.3.0, typescript 6.0.3, vitest 5.0.3; tsc exit 0, vitest finds no tests; needs npm 11 | `docs/evidence/ENG-004.txt` |
| 19 Oct | DEC-6 recorded: `claude -p` first locally, with tools off and refused on Vercel | `docs/decisions.md` |

## Open decisions (need Deepak)

| ID | Decision | Recommendation |
|---|---|---|
| DEC-1 | `.env.example` | **Decided 19 Oct:** all nine, done (ENG-002) |
| DEC-2 | CI | **Decided 19 Oct:** yes, one workflow (ENG-003, after ENG-004) |
| DEC-3 | Lint and format | **Decided 19 Oct:** defer to Phase 9 |
| DEC-4 | DNS check in safeFetch | **Decided 19 Oct:** after v1 is green (ENG-021) |
| DEC-5 | Test count | Moot |
| DEC-6 | Model order | **Decided 19 Oct:** `claude -p` locally first, OpenRouter free model before publishing, OpenRouter public; wrapper moves into ENG-041 |

## Blocked tasks

None. Hotelzify's 48-hour challenge invite has not arrived; if it does before ENG-080, the playbook says to stop at whatever is green and write the note from this file.

## Test and CI status

| Check | Status | Evidence |
|---|---|---|
| `npx vitest run` | 13 passed (quotes) | `docs/evidence/ENG-010.txt` |
| `npx tsc --noEmit` | exit 0 | `docs/evidence/ENG-004.txt` |
| CI | green on `main`: typecheck + tests, 26 s of steps (runner queue adds minutes) | https://github.com/rdeepak-711/hotel-direct-bookings/actions/runs/39279152782 |

## Deployment status

Not deployed. No Vercel project linked. Google Cloud quota on the Places key: not set (must be set before ENG-083).

## Public content awaiting approval

None drafted yet. MKT-004 is the first candidate once ENG-010's first red run exists.

## Known limitations (carried from `docs/system-design.html` §13)

No auth or accounts; no CI yet; no alerting or SLO; no retries or circuit breaker; no DNS check in safeFetch; minimal request validation; limiter and cache per instance; synchronous 60 s request; batch mode designed only; no dependency audit step.

## Evidence for the latest completion claims

- "Documents only": `ls -A` after the reset shows `.env .env.example .git .gitignore docs feasibility-counts.json findings.md spec tasks`.

## Feedback

None yet (opens at MKT-021).
