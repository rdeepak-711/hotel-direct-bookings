# Direct Booking Check: project status

Updated 19 Oct 2026, 18:00 IST, at commit `ee503e1` plus the three playbook files. Engineering tasks are `ENG-nnn` in `docs/implementation-playbook.md`; content tasks are `MKT-nnn` in `docs/public-build-playbook.md`.

Status levels, in order of strength: **draft** (text or code exists, unverified) · **local** (works on Deepak's machine) · **tested** (automated tests pass locally) · **CI** (the workflow passed on GitHub) · **deployed** (live on Vercel and checked).

## Current phase

Phase 0 → 1. Spec, 120 failing tests and docs are committed. No implementation code exists.

## Next actionable tasks

| Track | Task | Owner | Blocked by |
|---|---|---|---|
| Engineering | ENG-001 confirm toolchain and failing baseline | Deepak | nothing |
| Engineering | ENG-002 complete `.env.example` | Deepak | DEC-1 approval |
| Engineering | ENG-003 minimal CI | Deepak or Claude | DEC-2 approval |
| Engineering | ENG-010 quote check (`lib/quotes.ts`, `lib/types.ts`) | Codex | ENG-001 |
| Marketing | MKT-001 positioning sheet | Claude drafts, Deepak approves | nothing |
| Marketing | MKT-003 claim register | Claude | nothing |
| Marketing | MKT-004 "120 failing tests" post draft | Claude drafts | ENG-001 evidence file |

## Completed milestones

| Date | Milestone | Evidence |
|---|---|---|
| 18 Oct | Spec v1, decisions, mental model, plan.html | commits up to `6601500` |
| 19 Oct | Spec revision 3 and "fix all" nine review gaps; 11 test files | `4671886` |
| 19 Oct | Decision: v2 in TypeScript, v1 first | `88afeda` |
| 19 Oct | System design doc; decision "detect, never drive" | `ee503e1` |
| 19 Oct | ENG-000 repository assessment | `docs/implementation-playbook.md` |

## Open decisions (need Deepak)

| ID | Decision | Recommendation |
|---|---|---|
| DEC-1 | `.env.example` lists 2 of 9 variables and is on the do-not-change list | Deepak updates it to all nine (ENG-002) |
| DEC-2 | No CI exists | One GitHub Actions workflow: tsc + vitest (ENG-003) |
| DEC-3 | Lint and format | Defer to Phase 9; tsc is the gate |
| DEC-4 | DNS check in safeFetch | After v1 is green (ENG-021) |
| DEC-5 | "~145 tests" in earlier notes | It is 120 `it` blocks; use 120 |

## Blocked tasks

None. Hotelzify's 48-hour challenge invite has not arrived; if it does before ENG-080, the playbook says to stop at whatever is green and write the note from this file.

## Test and CI status

| Check | Status | Evidence |
|---|---|---|
| `npx vitest run` | 11 files fail on missing modules (intended) | run at 15:46 IST, 19 Oct |
| `npx tsc --noEmit` | not yet run in this state | ENG-001 |
| CI | none | DEC-2 |

## Deployment status

Not deployed. No Vercel project linked. Google Cloud quota on the Places key: not set (must be set before ENG-083).

## Public content awaiting approval

None drafted yet. MKT-004 is the first candidate once ENG-001's evidence file exists.

## Known limitations (carried from `docs/system-design.html` §13)

No auth or accounts; no CI yet; no alerting or SLO; no retries or circuit breaker; no DNS check in safeFetch; minimal request validation; limiter and cache per instance; synchronous 60 s request; batch mode designed only; no dependency audit step.

## Evidence for the latest completion claims

- "120 tests, all failing on missing modules": `npx vitest run` output, 19 Oct 15:46 IST, 11 failed files, `Cannot find module '@/lib/…'`.
- "No implementation": `ls app lib` both empty at `ee503e1`.

## Feedback

None yet (opens at MKT-021).
