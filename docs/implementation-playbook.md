# Direct Booking Check: implementation playbook

Written 19 Oct 2026 by Claude (Agent A role) from an inspection of the repository at commit `ee503e1`. Source of truth for scope and decisions: `spec/site.md`, `docs/decisions.md`, `docs/mental-model.md`, `docs/system-design.html`. This playbook orders the work and adds the verification, learning and public-build hooks; it does not change a single product decision. Where it found a contradiction or a missing decision, it says so and asks.

How to use it: open it, take the first unchecked task, hand it to the coding agent (Codex via `handoff`, or Codex in a terminal, per [[codex-builds-claude-reviews-at-gates]]), read the diff, run the verification commands, explain the layer back in your own words, then tick the box. A task is `[x]` only when its completion evidence exists in the repo or in a saved test run.

Who does what, unless a task says otherwise: **Codex** writes implementation code. **Claude** verifies against the spec and writes docs/flow and mental-model updates. **Deepak** reads every diff, runs the verification commands, and owns every decision and every external action (keys, deploys, posts).

## Repository assessment, 19 Oct 2026

| Area | State | Evidence |
|---|---|---|
| Specification | Complete, reviewed twice (18 and 19 Oct), 13 build steps bottom-up, "done" defined | `spec/site.md`, `docs/review-2026-10-19.html` |
| Tests | **Removed 19 Oct evening at Deepak's request** (11 files, 120 `it` blocks, 12 fixtures; recoverable from git history at `ecdc4e2`). Each step now writes its own test file first | `git log -- tests` |
| Fixtures | Removed with the tests; rewritten per step (ENG-005 lists them) | |
| Implementation | **None.** No `app/`, no `lib/` | `ls` |
| Tooling | **Removed.** No `package.json`, `tsconfig.json` or `vitest.config.ts`. Scaffolding is ENG-004 | `ls` |
| CI | None (`.github/` absent) | |
| Deployment | None. Vercel is the decided target; no project linked | `docs/decisions.md` "Stack" |
| README | Absent | |
| `.env.example` | Lists 2 of the 8 variables the spec names, and is on the spec's do-not-change list | `.env.example`, `spec/site.md` "Environment variables" |
| Docs | decisions, mental-model, plan.html, report mock-ups, system-design.html present; `docs/flow.md` absent (it is written as the code lands) | `docs/` |
| Keys | Google Places and Tripadvisor keys exist locally (feasibility run, `findings.md`). PageSpeed key, OpenRouter key, partner token: not confirmed | `.env` is git-ignored; not inspected |

**Status vocabulary used below:** implemented and verified · implemented, under-tested · planned, not implemented · partial · deferred · decision needed. As of today every product step is **planned, not implemented**.

### Contradictions and missing decisions (need Deepak)

- **DEC-1 `.env.example`.** Spec lists `GOOGLE_PLACES_API_KEY`, `TRIPADVISOR_API_KEY`, `PAGESPEED_API_KEY`, `PARTNER_TOKEN`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `LLM_MODE`, `SOURCES_MODE`, `REPORTS_PER_VISITOR_PER_HOUR`. The file has two. Recommendation: Deepak (not Codex) updates `.env.example` to all nine with empty values and the two defaults, in ENG-002. Keeps the do-not-change rule intact.
- **DEC-2 CI.** `docs/system-design.html` lists "no CI" as open. The spec never mentions it. Recommendation: a single GitHub Actions workflow running `npm ci`, `npx tsc --noEmit`, `npx vitest run` on push. Added by Deepak or Claude, never Codex, as ENG-003. Cost: nothing. Approve or strike.
- **DEC-3 Lint and format.** The mission brief asks for them; the spec is silent, and `package.json` scripts may not be changed by Codex. Recommendation: **defer**. Type checking is already a gate (`npx tsc --noEmit` is in "done"), and adding ESLint config mid-build creates diff noise in Codex's PRs. Revisit in Phase 9.
- **DEC-4 DNS check in `safeFetch`.** Spec: "do a lookup in production if simple." Recommendation: build it as a separate task after v1 is green (ENG-021), behind the same `isAllowedUrl` interface, so the v1 tests stay untouched.
- **DEC-5 Test count claim.** Moot: the tests were removed 19 Oct evening. Counts are reported per step as each test file is written.

### Module dependency graph (from the spec; the code does not exist yet)

```
types.ts
  ├── quotes.ts ───────────────┐
  ├── website.ts ──────┐       │
  ├── gaps.ts          │       │
  ├── score.ts ◄───────┘(isRealWebsite)
  ├── match.ts ◄── sources/tripadvisor.ts
  ├── cache.ts ◄── compare.ts (nearbyHotels)      sources/google.ts
  ├── safeFetch.ts                                sources/pagespeed.ts
  ├── llm.ts ◄── quotes.ts (verifyThemes)         sources/fixtures.ts
  ├── report.ts ◄── score.ts, website.ts
  └── pipeline.ts ◄── everything above + ratelimit.ts (route only)
app/api/search/route.ts ◄── sources/*
app/api/report/route.ts ◄── pipeline.ts, ratelimit.ts, llm.ts
app/page.tsx, app/report/page.tsx ◄── the two routes (HTTP only; the page computes nothing)
```

Arrows point from the module that imports to the module it depends on. The spec's build order is a topological sort of this graph. The runtime architecture diagram is in `docs/system-design.html` section 2.

---

## Phase 0: baseline

### [x] ENG-000 Repository assessment
**Purpose:** know what exists before planning. **Completion evidence:** the table above. Done 19 Oct; updated the same evening after the reset to docs-only.

### [ ] ENG-001 Confirm the local toolchain
**Purpose:** know the Node and npm versions every later command assumes. **Prerequisites:** none. **Files:** none changed.
**Verification:** `node -v && npm -v` → saved to `docs/evidence/ENG-001.txt` (create `docs/evidence/`). **Acceptance:** Node 20 or newer. **Evidence:** the file.

### [ ] ENG-004 Scaffold the project by hand (no `create-next-app`)
**Owner:** Deepak types it, Claude dictates and explains each line. **Prerequisites:** ENG-001. **Purpose:** you asked to start from the documents, so the scaffold is the first thing you build and understand, not a template.
**Files:** `package.json`, `tsconfig.json`, `vitest.config.ts`, `next.config.ts`, `.gitignore` (already present).
**Steps:** (1) `package.json` with `name`, `private: true`, scripts `dev`, `build`, `start`, `test: vitest run`, `typecheck: tsc --noEmit`; dependencies `next`, `react`, `react-dom`; devDependencies `typescript`, `vitest`, `@types/node`, `@types/react`, pinned to exact versions Claude gives you. (2) `tsconfig.json` with `strict: true`, `paths: { "@/*": ["./*"] }`, `moduleResolution: "bundler"`, the Next plugin. (3) `vitest.config.ts` with `include: ["tests/**/*.test.ts"]`, `environment: "node"`, and the `@` alias resolved to the repo root. (4) install the dependencies (run it in the background; it can take a minute).
**Verification:** `npx tsc --noEmit` exits 0 on an empty project; `npx vitest run` reports "No test files found". **Learning note:** the `@` alias has to be declared twice, once for TypeScript (`paths`) and once for Vitest (`resolve.alias`), because they are two different module resolvers reading two different configs. This is the single most common "works in the editor, fails in the test" cause in a Next project.
**Public-build:** none. **Evidence:** the two command outputs in `docs/evidence/ENG-004.txt`; commit.

### [ ] ENG-005 Fixtures, written as each step needs them
**Owner:** Deepak with Claude. **Purpose:** deterministic inputs so no test ever makes a network call. **Files:** `tests/fixtures/`. Written per step, not up front: `pagespeed.json` and `pagespeed-no-booking.json` (ENG-011), `home.html` (ENG-012), `llm-good.json` and `llm-hallucinated.json` (ENG-010/ENG-041), `google-search.json`, `google-place.json`, `google-nearby.json` (ENG-030/ENG-040), `tripadvisor-nearby.json`, `tripadvisor-details.json`, `tripadvisor-reviews.json` (ENG-032), `reviews.json` (ENG-010). Shapes follow the real API responses; review text in fixtures is invented, never copied from a real review. **Learning note:** a fixture is a frozen example of what the outside world sends. It is the only way to test an adapter without paying for the call, and the only way a test can be run on stage.

### [ ] ENG-002 Decide and apply DEC-1: complete `.env.example`
**Owner:** Deepak. **Prerequisites:** DEC-1 approved.
**Steps:** list all nine variables with empty values, except `OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free`, `LLM_MODE=openrouter`, `SOURCES_MODE=live`, `REPORTS_PER_VISITOR_PER_HOUR=10`. Add a one-line comment per key saying where to get it. Commit.
**Verification:** `grep -c '=' .env.example` → 9. **Learning note:** `.env.example` is the contract between the code and whoever deploys it; a missing name there is a silent production failure (the spec's own words about `PAGESPEED_API_KEY`). **Evidence:** the commit.

### [ ] ENG-003 Decide and apply DEC-2: minimal CI
**Owner:** Deepak or Claude. **Prerequisites:** DEC-2 approved, ENG-004.
**Files:** `.github/workflows/test.yml` (new).
**Steps:** on push and pull request: checkout, `actions/setup-node@v4` with Node 20 and npm cache, `npm ci`, `npx tsc --noEmit`, `npx vitest run --passWithNoTests` (drop the flag once ENG-010 lands). No secrets; tests must stay offline (fixtures and FakeLLM).
**Verification:** push; the Actions tab shows a green run on the empty scaffold.
**Risks:** `npm ci` needs `package-lock.json` committed (ENG-004 does that). **Learning note:** CI is "someone else's machine runs your verification commands on every push". Its value is not catching bugs you'd catch locally; it's that a green badge is evidence a reviewer or recruiter can trust without cloning.
**Public-build:** MKT-005. **Evidence:** a workflow run URL in `docs/project-status.md`.

---

## Phase 1 and 2: pure logic (spec steps 1, 2, 4, 6)

Each task here is a spec step. The spec already contains the behaviour and the edge cases, so each task points at it instead of restating it. The TDD loop is the same for all of them: **write the test file from the step's behaviour and edge cases → run it and see it fail on the missing module → implement the smallest thing → run → green → refactor → run the full suite.** Who writes the tests: Deepak with Claude (Claude proposes the cases from the spec, Deepak types them and can explain each one). Codex never edits `tests/`.

### [ ] ENG-010 Step 1: quote check, `lib/quotes.ts`
**Purpose:** the single idea the whole product rests on. The model proposes, code verifies. **Prerequisites:** ENG-004. **Files:** `lib/types.ts` (from the spec's block, verbatim), `lib/quotes.ts`. **Tests:** `tests/quotes.test.ts`, written first: normalisation cases (case, curly quotes, whitespace runs, empty quote), unknown review id, quote not in review, theme with no surviving quotes removed, counts and order, stable sort.
**Steps:** create `lib/types.ts` by pasting the spec's "Shared types" block; implement `quoteAppearsIn` and `verifyThemes` to spec step 1.
**Verification:**
```
npx vitest run tests/quotes.test.ts
npx tsc --noEmit
```
**Acceptance:** every test in the file passes; tsc has no errors in `lib/`. **Risks:** curly-quote normalisation is easy to get half right; the test covers `’ ‘ “ ”`. **Learning note:** "normalise both sides, then substring" is a deliberately dumb check. It's dumb so it's explainable to a hotel owner: "the quote is in the review, or it isn't." A fuzzier match would be more lenient and less defensible.
**Public-build:** MKT-006 (why AI quotes need code verification; the `llm-hallucinated.json` fixture is the demo). **Evidence:** green run, diff read by Deepak, Deepak explains verifyThemes aloud.

### [ ] ENG-011 Step 2: website checks, `lib/website.ts`
**Prerequisites:** ENG-010. **Tests:** `tests/website.test.ts`, written first from the step. **Spec:** step 2.
**Steps:** `BOOKING_VENDORS`, `detectBookingEngine`, `isBookNowText`, `analyzeLighthouse`, `NOT_A_WEBSITE_HOSTS`, `isRealWebsite`, `analyzeHtml`.
**Verification:** `npx vitest run tests/website.test.ts && npx tsc --noEmit`.
**Acceptance:** 9 pass. **Risks:** suffix matching on hosts (`be.synxis.com` must match `synxis.com`; `notsynxis.com` must not): check the test, then the implementation uses `host === d || host.endsWith("." + d)`. **Learning note:** PageSpeed's network-request list is how a JavaScript-built site reveals its booking vendor; a plain HTML fetch would miss it. That's why there are two analyzers with one output type.
**Public-build:** MKT-007 (how to tell which booking engine a hotel uses from the outside). **Evidence:** green run, diff read.

### [ ] ENG-012 Step 4: gap check logic, `lib/gaps.ts`
**Prerequisites:** ENG-011. **Tests:** `tests/gaps.test.ts`, written first from the step. **Spec:** step 4.
**Steps:** `extractText`, `TOPICS`, `TOPIC_EXCLUDES`, `topicForTheme`, `siteMentions`, `INTERNAL_PAGE_PATTERN`, `extractInternalLinks`, `MIN_PAGE_TEXT`, `isReadableText`, `findGaps`.
**Verification:** `npx vitest run tests/gaps.test.ts && npx tsc --noEmit`.
**Acceptance:** 12 pass. **Risks:** word boundaries with hyphens ("check-in" vs "checkin"); the excludes must be removed *before* keyword search. **Learning note:** three outcomes, not two. "Unknown" (null) is a first-class answer. A system that only knows yes/no will confidently say "your site never mentions parking" about a page it couldn't read. This is the pattern to name in interviews: *distinguish absence of evidence from evidence of absence*.
**Public-build:** MKT-008. **Evidence:** green run, diff read.

### [ ] ENG-013 Step 6: score, `lib/score.ts`
**Prerequisites:** ENG-011, ENG-012. **Tests:** `tests/score.test.ts`, written first from the step. **Spec:** step 6.
**Verification:** `npx vitest run tests/score.test.ts && npx tsc --noEmit`.
**Acceptance:** 13 pass, including the fixture case `{ website: 23, messaging: 65, listing: 60, overall: 47 }`. **Risks:** renormalisation when a sub-score is null; rounding order (round sub-scores first, then the weighted mean). **Learning note:** the weights are a judgement written in code. The reason they're in code and not in a model prompt: an owner can ask "why 47" and get an answer line by line. Say "not measured against bookings" every time you show the gauge.
**Public-build:** MKT-009 (designing a score that doesn't pretend to measure lost revenue). **Evidence:** green run, diff read, Deepak computes the fixture score by hand once.

### [ ] ENG-014 Step 1-6 regression gate
**Purpose:** prove the pure layer holds together before any network code. **Prerequisites:** ENG-010 to ENG-013.
**Verification:** `npx vitest run tests/quotes.test.ts tests/website.test.ts tests/gaps.test.ts tests/score.test.ts` → all pass. **Claude writes** the first version of `docs/flow.md` covering these four modules. **Deepak explains** the four modules aloud in under five minutes. **Evidence:** `docs/flow.md` committed; status file updated.

---

## Phase 3: outbound fetching and security (spec step 3)

### [ ] ENG-020 Step 3: `lib/safeFetch.ts`
**Prerequisites:** ENG-014. **Tests:** `tests/safeFetch.test.ts`, written first from the step. **Spec:** step 3.
**Steps:** `isAllowedUrl`, `SafeFetchError`, `safeFetch` with manual redirects, per-hop re-check, `AbortSignal` timeout, byte cap with `truncated`.
**Verification:** `npx vitest run tests/safeFetch.test.ts && npx tsc --noEmit`.
**Acceptance:** 6 pass; the test for a redirect to a private address throws `blocked:`. **Risks:** `redirect: "manual"` returns an opaque response in some fetch implementations; the tests inject `fetchImpl`, so the implementation must use the injected one everywhere, never the global. **Learning note:** SSRF in one sentence: your server fetches a URL someone else chose, and that URL points at something only your server can reach (a metadata endpoint, an internal admin page). The defence is to check the destination *every time it changes*, which is every redirect hop.
**Public-build:** MKT-010 (building a safe fetcher; the redirect-to-private test is the demo). **Evidence:** green run; diff read with the six blocked ranges ticked off against the spec.

### [ ] ENG-021 DNS resolution check (post-v1, DEC-4)
**Status:** deferred until ENG-050 is green. **Purpose:** close the DNS-rebinding partial in `docs/system-design.html` §7. **Steps:** add an optional `resolve` dependency to `isAllowedUrl`/`safeFetch`; in production, resolve the host with `dns.promises.lookup` and apply the same IP block-list to the result; write 2 new tests with an injected resolver (public IP passes, private IP blocked). **Verification:** `npx vitest run tests/safeFetch.test.ts`. **Learning note:** a hostname can resolve to a public IP when you check it and to 127.0.0.1 when you fetch it (rebinding). Checking the resolved address closes most of that; pinning the resolved IP for the actual connection closes all of it and is more than v1 needs.

---

## Phase 4: external adapters (spec step 7)

### [ ] ENG-030 Step 7a: `lib/match.ts` and `lib/sources/google.ts`
**Prerequisites:** ENG-020. **Tests:** the Google and match cases in `tests/sources.test.ts`. **Spec:** step 7.
**Steps:** `nameSimilarity`; `searchHotels` (US filter), `getPlace` (review ids `g-1…`, `url` from `googleMapsUri`). All take `{ fetchImpl }`, read keys at call time, throw naming the variable when missing, throw with the status on non-2xx, 10 s timeout.
**Verification:** `npx vitest run tests/sources.test.ts -t "google|similarity"` (adjust `-t` to the describe names in the file) then the whole file.
**Risks:** field masks are exact strings; a typo returns 400 from Google. **Learning note:** an adapter's whole job is to turn someone else's JSON into our `Hotel` type and to fail loudly with a useful message. No business logic lives here.

### [ ] ENG-031 Step 7b: `lib/sources/pagespeed.ts`
**Prerequisites:** ENG-030. **Spec:** step 7. **Steps:** `runPageSpeed` with `allowNoKey` for local experiments only; 45 s timeout. **Verification:** `npx vitest run tests/sources.test.ts`. **Learning note:** without a key PageSpeed throttles silently and the website section degrades without an error. The spec made the key required for that reason; the run log (ENG-050) is how you'd notice if it ever happens anyway.

### [ ] ENG-032 Step 7c: `lib/sources/tripadvisor.ts`
**Prerequisites:** ENG-030. **Spec:** step 7. **Steps:** `findLocation` by coordinates with `nameSimilarity` ≥ 0.5, `getReviews` (`ta-{id}`, title-prefix rule), `getLocationDetails`. **Verification:** `npx vitest run tests/sources.test.ts` → all pass. **Note:** the client is built now; wiring it into the pipeline is optional (ENG-052).

### [ ] ENG-033 Step 7d: `lib/sources/fixtures.ts`
**Prerequisites:** ENG-030 to ENG-032. **Steps:** the same function names returning `tests/fixtures/*.json` when `SOURCES_MODE=fixture`. **Verification:** `SOURCES_MODE=fixture npx vitest run tests/sources.test.ts tests/api.test.ts` (api will still fail until ENG-060; the fixtures module must load). **Learning note:** fixture mode is what makes the preview, the API tests and a demo on stage all deterministic and free. It's not test scaffolding; it's a product feature.

### [ ] ENG-034 Live smoke test (manual, cost-aware)
**Owner:** Deepak. **Prerequisites:** ENG-033, keys in `.env`. **Steps:** a one-off script in `scripts/smoke.mjs` (not under `lib/`) that calls `searchHotels("Harborside Inn Boston")`, `getPlace` on the first result, and `runPageSpeed` on its website, printing only counts and the mobile score. Run once. **Verification:** the script prints a place id, 5 reviews, a mobile score. **Acceptance:** one run, output pasted into `docs/evidence/ENG-034.txt` with the hotel name removed. **Risks:** costs one priced Places call; do not loop it. **Learning note:** automated tests prove the adapter matches *our idea* of the API; one live call proves the idea matches the API.

---

## Phase 5 and 6: comparison, AI, report, pipeline (spec steps 5, 8, 9, 10)

### [ ] ENG-040 Step 5: `lib/compare.ts` and `lib/cache.ts`
**Prerequisites:** ENG-033. **Tests:** `tests/compare.test.ts`, written first from the step, cache cases in `tests/pipeline.test.ts`. **Spec:** steps 5 and 10 (cache).
**Steps:** `TtlCache`; `nearbyHotels` (field mask **without** `reviews`, radius 1500, max 6, drop self, 10-minute cache by placeId); `benchmark`.
**Verification:** `npx vitest run tests/compare.test.ts && npx tsc --noEmit`.
**Risks:** `rank` = 1 + count strictly better; `basis` counts only non-null neighbours. **Learning note:** the field mask is a privacy control, not a performance one. Not asking Google for neighbours' reviews is how the tool keeps the promise "neighbours are counted, never named, never quoted".
**Public-build:** MKT-011 (comparing against neighbours without exposing them).

### [ ] ENG-041 Step 9: `lib/llm.ts`
**Prerequisites:** ENG-010. **Tests:** `tests/llm.test.ts`, written first from the step. **Spec:** step 9.
**Steps:** `LLMClient`, `FakeLLM`, `OpenRouterLLM` (errors never contain the key), `buildThemesPrompt` (review text is data, not instructions), `parseThemesJson` (strict; strip one fence), `extractThemes` (one retry, then throw containing "parse"; verify; headline only if praise survived).
**Verification:** `npx vitest run tests/llm.test.ts && npx tsc --noEmit`.
**Risks:** the hallucinated fixture must produce drops, not errors. **Learning note:** temperature 0 and a strict parser are the two cheapest reliability wins with any model. Retrying once on a parse failure is the third. Everything beyond that (judge models, multi-agent) was considered and rejected for v1 in `decisions.md`.
**Public-build:** MKT-006 pairs with this one.

### [ ] ENG-042 Step 8: `lib/report.ts`
**Prerequisites:** ENG-013, ENG-012. **Tests:** `tests/report.test.ts`, written first from the step. **Spec:** step 8.
**Steps:** labels and partner products; `buildReport` with every finding rule in the spec's order; `topFixes`; quote enrichment with author, date, Google Maps link; `reviewsNotice`; `footnote`; no `\d+%` anywhere.
**Verification:** `npx vitest run tests/report.test.ts && npx tsc --noEmit`.
**Risks:** the longest rule list in the spec; the test checks ids, severities and evidence strings. Never emit both `gap-` and `question-` for one theme. **Learning note:** findings are data (id, category, severity, evidence, fix). The page renders them; nothing in the UI decides what's a problem. That's what lets the partner view be a one-field difference.

### [ ] ENG-050 Step 10: `lib/pipeline.ts`
**Prerequisites:** ENG-020, ENG-033, ENG-040, ENG-041, ENG-042. **Tests:** `tests/pipeline.test.ts`, written first from the step. **Spec:** step 10.
**Steps:** `runCheck`: `getPlace` fatal; five parallel jobs with the 20 s extra-pages budget and 50 s neighbour budget; not-a-real-website skip; `siteText`; cache for PSI and nearby only; exactly one `RunLog` line per run, also on failure, never throwing.
**Verification:** `npx vitest run tests/pipeline.test.ts && npx vitest run && npx tsc --noEmit`.
**Acceptance:** 19 pass and the whole suite is green except `tests/api.test.ts`. **Risks:** `Promise.allSettled` for the parallel jobs; budgets via `Promise.race` with a timer that is cleared on completion (a dangling timer keeps a Vercel function alive). **Learning note:** this is the orchestration layer: it owns order, parallelism, budgets and degradation, and nothing else. If you find yourself writing a scoring rule here, it belongs in `score.ts`.
**Public-build:** MKT-012 (parallel collection and graceful degradation; the run log line is the visual). **Evidence:** green run; Claude updates `docs/flow.md` end to end; Deepak explains the run order aloud.

### [ ] ENG-051 Full-suite gate before UI
**Verification:** `npx vitest run` → everything green except `tests/api.test.ts`; `npx tsc --noEmit` clean. **Evidence:** output saved to `docs/evidence/ENG-051.txt`. **Deepak** reviews `docs/flow.md` and corrects anything he can't re-explain.

### [ ] ENG-052 Optional: wire Tripadvisor into the pipeline (spec step 13a)
**Status:** deferred; only after ENG-080 and only if time remains. The client and its tests already exist (ENG-032).

---

## Phase 7: API routes (spec step 11)

### [ ] ENG-060 `lib/ratelimit.ts` and the two routes
**Prerequisites:** ENG-050. **Tests:** `tests/api.test.ts`, written first from the step. **Spec:** step 11.
**Steps:** `RateLimiter` fixed window; `GET /api/search` (400 on empty); `POST /api/report` (`maxDuration = 120`, 400 without placeId, partner gate against `PARTNER_TOKEN`, 429 from the limiter, LLM selection fake / byok / server key, response never contains a key or a full review).
**Verification:** `SOURCES_MODE=fixture LLM_MODE=fake npx vitest run tests/api.test.ts && npx vitest run && npx tsc --noEmit`.
**Acceptance:** the whole suite green. CI (ENG-003) goes green on push. **Risks:** Next route handlers must export `GET`/`POST` and read the body once. **Learning note:** the route is the only place the outside world touches the server, so it holds the three gates (validation, limiter, partner) and nothing else. The limiter is per instance on Vercel; the Google quota is the real cap. Say that unprompted.
**Public-build:** MKT-013 (rate limiting on serverless is leaky; what actually caps the bill).

---

## Phase 8: pages (spec step 12)

UI has no unit tests in the spec. The verification-first workflow here is: write the acceptance checklist, run the fixture preview, tick each item on a phone-width and a desktop viewport, and save screenshots. Reason: a snapshot test of JSX would test the mock-up, not the behaviour, and the fixture preview *is* the behaviour.

### [ ] ENG-070 `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
**Prerequisites:** ENG-060. **Spec:** step 12 `/`.
**Checklist:** search box; results list from `/api/search`; click goes to `/report?placeId=`; optional OpenRouter key field kept in sessionStorage and sent only in the POST body; footer text verbatim from the spec; usable at 375 px width.
**Verification:** `SOURCES_MODE=fixture LLM_MODE=fake npx next dev -p 3000`, then open `/`, search "Harborside"; screenshots to `docs/evidence/ENG-070-*.png`. **Learning note:** the key never goes in a URL or localStorage: sessionStorage dies with the tab, and the POST body isn't logged by default.

### [ ] ENG-071 `app/report/page.tsx`
**Prerequisites:** ENG-070. **Spec:** step 12 `/report`; layout reference `docs/report-infographic.html`.
**Checklist:** loading state; half-ring gauge with three sub-scores, "no data" for null; sample line; top 3 fixes; listing; website; gap check with "answered on your site" / "not on your site" / unknown; neighbour comparison with rank, neighbours never named; praise quotes with author, date, "Read on Google Maps" link; `reviewsNotice` under praise; headline and ad lines; footnote; `?partner=` forwarded as `partnerToken`; coral = problem, green = good.
**Verification:** open `/report?placeId=ChIJexampleHarborside` in fixture mode: score 47, three fixes including the parking gap, the comparison, the praise quotes. Screenshots at 375 px and 1280 px to `docs/evidence/ENG-071-*.png`. **Public-build:** MKT-014 (first screenshots; labelled "fixture data").

### [ ] ENG-072 Partial-data and error states
**Prerequisites:** ENG-071. **Steps:** temporarily point fixture mode at a broken PageSpeed fixture and at `llm-hallucinated.json` (via env or a test-only switch Codex proposes; must not change `tests/`), confirm the page shows "not available" sections and the dropped-quote count without breaking. **Verification:** screenshots `docs/evidence/ENG-072-*.png`. **Learning note:** the page must be honest about what it couldn't check; that is a product requirement, not polish.

---

## Phase 9: hardening and deploy

### [ ] ENG-080 "Done" check from the spec
**Verification:** `npx vitest run` fully green with no skips; `npx tsc --noEmit` clean; fixture preview shows 47/100, three fixes with the parking gap, comparison, praise. **Evidence:** `docs/evidence/ENG-080.txt` and the ENG-071 screenshots. **Deepak** re-reads `docs/mental-model.md` against the code and corrects it (Claude drafts the corrections, Deepak approves each).

### [ ] ENG-081 First live run on a real hotel
**Owner:** Deepak. **Prerequisites:** ENG-080; all keys in `.env`; PageSpeed key confirmed. **Steps:** `npx next dev` in live mode, one real US hotel, save the run log line (it holds no identifiers) to `docs/evidence/ENG-081.txt`. **Acceptance:** report renders; wall time under 60 s; `quotesDropped` recorded. **Risks:** the first live run is where the 200-character and 20-second guesses get tested. Log what surprised you in `findings.md`. **Public-build:** MKT-015 (first real run; no hotel named publicly, per the fairness rule).

### [ ] ENG-082 Ten-hotel hand check
**Owner:** Deepak with Claude. **Prerequisites:** ENG-081. **Steps:** 10 real hotels, one run each, Deepak grades each finding right / wrong / unknowable before reading the tool's reasoning (the escalation-gate eval pattern). Record in `docs/eval.md` as counts, never percentages. **Acceptance:** every "wrong" has a named cause and either a backlog task or an accepted limitation. **Learning note:** this is the only accuracy measurement v1 has. It is also the strongest interview material in the project.

### [ ] ENG-083 Deploy to Vercel
**Owner:** Deepak. **Prerequisites:** ENG-080, ENG-003 green. **Steps:** `vercel link`, set the nine env vars in the Vercel project (production and preview), confirm Fluid Compute so `maxDuration = 120` is honoured, set the **daily quota on the Google key in Google Cloud** (the real spending guard; record the number in README), deploy. **Verification:** `vercel --prod`; open the production URL; one fixture-mode preview deployment and one live run. **Acceptance:** production URL in `docs/project-status.md`; quota number recorded. **Risks:** a deploy with the demo OpenRouter key and no quota is an open wallet. Set the quota first. **Public-build:** MKT-016 (the public link).

### [ ] ENG-084 Dependency and secret check
**Steps:** `npm audit --omit=dev` and read the result; `git log -p | grep -iE "api_key|sk-or-"` returns nothing; confirm `.env` is ignored. **Evidence:** output in `docs/evidence/ENG-084.txt`.

### [ ] ENG-085 Operations note
**Files:** `docs/operations.md` (new). **Content:** how to read the run log in Vercel logs; what a rising `websiteSource: "html"` rate means; how to rotate each key; how to roll back (`vercel rollback` or redeploy the previous commit); what to do if the Google quota trips (the tool returns 5xx on place lookup; wait for the daily reset or raise the quota). Proportionate: one page.

---

## Phase 10: documentation and release

### [ ] ENG-090 README (spec step 13)
**Steps:** what it is; fixture and live run instructions; the nine env vars with placeholders; the security calls from `docs/plan.html` §6; "Results" section left for Deepak's live numbers; the limiter-is-best-effort line; known limitations from `docs/system-design.html` §13; no invented numbers. **Verification:** a second developer (or Claude in a fresh session) follows it from clone to a fixture preview without asking a question. **Public-build:** MKT-017.

### [ ] ENG-091 `docs/flow.md`, `docs/mental-model.md`, `docs/decisions.md` final pass
**Owner:** Claude drafts, Deepak approves one doc at a time (the project's own rule). Decisions made during the build (anything Codex chose that the spec left open) get entries with alternatives and cost.

### [ ] ENG-092 Demo script
**Files:** `docs/demo-script.md`. **Content:** the 2-minute walkthrough in fixture mode (safe, deterministic), then one live run; the lines to say at the gauge ("not a measure of lost bookings"), at the gap check, at the comparison, and at the dropped-quotes count. Doubles as the Hotelzify voice-note script.

### [ ] ENG-093 Release checklist
Copy the mission brief's definition of done into `docs/project-status.md` and tick only with evidence links.

---

## Definition of done (v1)

- [ ] V1 requirements implemented or documented as deferred (ENG-080; Tripadvisor wiring and batch mode are the deferred items).
- [ ] Domain logic covered by deterministic tests (ENG-014, ENG-051).
- [ ] Critical security controls have dedicated tests (ENG-020; partner gate and key non-echo in ENG-060).
- [ ] Integration and end-to-end tests cover the primary journey (ENG-060 api tests in fixture mode; ENG-071 manual checklist).
- [ ] Scoring and report output conform to the spec (ENG-013, ENG-042, fixture score 47).
- [ ] Quote verification prevents unverified quotes (ENG-010, ENG-041).
- [ ] Partial upstream failures produce safe reports (ENG-050, ENG-072).
- [ ] CI passes on the release candidate (ENG-003, ENG-060).
- [ ] Production configuration and secrets handled safely (ENG-002, ENG-083, ENG-084).
- [ ] Deployment verified (ENG-083).
- [ ] Documentation lets another developer run and test it (ENG-090).
- [ ] Working demonstration on labelled fixture data plus one real run (ENG-081, ENG-092).
- [ ] README and case study match the implementation (ENG-090, MKT-018).
- [ ] Public content prepared, reviewed and approved before publishing (every MKT task).
- [ ] Known limitations and deferred features documented (ENG-090, system-design §13).
- [ ] Final engineering review and presentation rehearsal (ENG-092 run through once aloud).

## Where this plan may need revising

- After ENG-050: the budgets (20 s pages, 50 s neighbours) and `Promise.race` cleanup may need tuning once real PageSpeed times are seen.
- After ENG-081: the 200-character readability threshold and the parking excludes are guesses; the ten-hotel check (ENG-082) is where they get corrected, which may add tests (Deepak or Claude write tests, never Codex).
- If Hotelzify sends the 48-hour challenge before ENG-080: stop at whatever is green, write the challenge note from `docs/project-status.md`, and resume after.
