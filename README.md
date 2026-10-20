# Direct Booking Check

A tool that audits how ready a US hotel is to take bookings directly, instead of through booking sites. It reads the hotel's Google listing, website, page speed and guest reviews, and returns a score out of 100, the evidence behind it, and the top three fixes.

**Status: being built in public, steps 1 and 2a of 13 done.** Nothing is deployed yet. Progress is posted on X: [@rDeepak_ACEz](https://x.com/rDeepak_ACEz).

## The one rule the product rests on

The model proposes, code verifies. An LLM reads the reviews and returns themes ("guests praise the breakfast") with quotes as proof. Code keeps a quote only if its exact words appear in the review it cites, and drops it with a reason otherwise. A theme with no surviving quotes is removed. The score itself comes from fixed rules, not from the model.

Built so far, each with tests written before the code: `lib/quotes.ts`, 13 tests ([evidence](docs/evidence/ENG-010.txt)); `lib/website.ts`, the website checks, 20 tests ([evidence](docs/evidence/ENG-011a.txt)).

## Run the tests

Needs Node 22 and npm 11 (npm 10.9 crashes on this dependency set; see `findings.md`).

```
npm ci
npx vitest run
npx tsc --noEmit
```

## How the repo is organised

| Path | What it is |
|---|---|
| `spec/site.md` | The full spec: types, the 13 build steps, edge cases |
| `docs/decisions.md` | Every decision, with what was rejected and what it costs |
| `docs/mental-model.md` | The system explained in plain words |
| `docs/flow.md` | How execution moves between files, for the code that exists |
| `docs/implementation-playbook.md` | The task list (`ENG-nnn`) with verification steps |
| `docs/project-status.md` | What is done, with evidence |
| `lib/`, `tests/` | The code and its tests |

## Rules

- Review text is fetched live and never stored. Test fixtures use invented text.
- No real hotel is named with a score in public.
- No numbers are claimed without evidence in `docs/evidence/`.

Built by Deepak R. Not affiliated with any company.
