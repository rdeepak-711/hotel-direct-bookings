# Findings

## Requirements

- Job evidence for Hotelzify, Founding Engineer, US Business. The full job post reading is in `/Volumes/asus/career-ops/research/hotelzify/jd-read.md`.
- Built on real public review data only. No outreach to hotels (Deepak, 18 Oct).
- Version 1 in 2 days.

## Research findings

- Guest problems around booking and contact, with sources: `/Volumes/asus/career-ops/research/hotelzify/guest-problems.md`. Most of them come from OTA bookings: refused cancellations, no room on arrival, hidden fees, hotel unreachable. Cloudbeds' 2026 report says OTA bookings are cancelled 21.8% of the time against 10.6% for direct bookings.
- Hotel-owner problems and Hotelzify's products: `hotelier-problems.md` (agent still running on 18 Oct).

### Data sources (tested 18 Oct 2026)

- **Google Places API (New):** key works. At most 5 reviews per place, the ones Google rates "most relevant". Places content may not be stored or cached; place IDs may be. The Maps Platform terms prohibit scraping, so Playwright scraping of Google Maps is out.
- **Tripadvisor:** the legacy Content API (`api.content.tripadvisor.com`) was retired on 31 Aug 2026; a Terra key returns 403 on it. Terra: base `https://terra.tripadvisor.com/api`, header `X-API-Key`, search `GET /locations/search?query=…`, reviews `GET /locations/{id}/reviews`. The free Discover plan returns only the **3 most recent reviews** per location and allows 1,000 calls a month.
- In the feasibility run below, the Tripadvisor name match returned nothing for all 12 hotels, so all 60 reviews are Google's. This needs debugging; the search probably returns differently named locations.

### Feasibility check: what 60 real reviews talk about

Twelve Portland, Maine hotels, 5 Google reviews each, 16 of them rated 1–3 stars. A crude keyword tag gave this share of reviews per theme. Only counts were saved (`feasibility-counts.json`); no review text was stored.

| Theme | All reviews | 1–3 star reviews (of 16) |
|---|---|---|
| room / bed | 70% | 15 |
| location | 68% | 11 |
| staff | 61% | 12 |
| breakfast / food | 43% | 7 |
| clean | 38% | 7 |
| check-in info | 31% | 6 |
| parking | 23% | 3 |
| booking / OTA | 16% | 6 |
| noise | 16% | 2 |
| fees / price | 13% | 3 |
| contact / phone | 8% | 4 |
| cancel / refund | 3% | 2 |

**What it means:**

- At 5–8 reviews per hotel, booking, contact and cancellation problems are rare for any one hotel. A per-hotel "your booking problems" report would usually come out empty. That idea fails at this data size.
- Reviews mostly talk about the stay itself: rooms, location, staff, food. Software can't fix those, but **what guests praise is marketing material** (location, staff, breakfast). That feeds Hotelzify's AI ad engine, booking website and Google profile.
- **Check-in information (31%) and parking (23%) come up often.** These are questions guests had to work out for themselves, which are exactly what an AI concierge and a good booking site answer before arrival.
- The keyword tags are crude ("book", "app", "key" and "reach" match innocent text), so the percentages are rough. They are good enough to rule out the per-hotel complaints idea, not to rank themes precisely.

## Technical decisions

- **18 Oct · Model access (Deepak):** local build uses `claude -p` (the Claude Code CLI on Deepak's subscription). The shipped app is BYOK through OpenRouter (the viewer pastes their own key). Demos on X or for the founder use free OpenRouter models.
  - Consequence 1: the model layer needs three backends behind one interface: `claude -p` (local only), OpenRouter (BYOK, OpenAI-compatible API), and a scripted fake for tests.
  - Consequence 2: `claude -p` runs on a personal subscription. Keep it to local development; don't wire it into the public demo.
  - Consequence 3: free OpenRouter models (`:free` IDs) allow 20 requests a minute and 50 a day, or 1,000 a day after a one-time $10 credit purchase (third-party sources, 2026; check https://openrouter.ai/docs/api/reference/limits). One report should cost 1–2 model calls, so 50 a day is enough to demo but not for a public link that spreads on X.
  - Consequence 4: free models are weaker at sticking to their sources, so the citation check (every claim must quote a real review) matters more, not less.
  - Consequence 5: BYOK key handling becomes a security decision to show: the key lives only in the viewer's browser session, goes only to OpenRouter, and is never logged or stored on the server.
  - Consequence 6: free providers may log or train on prompts. Review text is public, but check Google's terms on sending Places content to a third-party model before going public.

## Issues and resolutions

- Tripadvisor 403 on first key → it was a Terra key used on the retired API; switched to the Terra base URL. Resolved.

## Resources

- Google Places policies: https://developers.google.com/maps/documentation/places/web-service/policies
- Terra docs: https://docs.terra.tripadvisor.com/docs

## Issue, 19 Oct 2026: npm install crashes during ENG-004 (resolved)

Error: `npm error Cannot read properties of null (reading 'edgesOut')`, stack in `@npmcli/arborist` `build-ideal-tree.js` `#loadPeerSet`. npm 10.9.3, Node 22.20.0.

1. First install crashed but reported exit 0, because the output was piped into `tail`. Lesson: never pipe an install into `tail` without keeping its exit code.
2. Pinned `vite` 8.3.2 explicitly (vitest 5 takes vite as a peer). Same crash.
3. Bisected with `--dry-run` installs in an empty folder: next+react+react-dom OK, typescript OK, vite OK, @types OK, **`vitest@5.0.3` alone fails**. Swapped to `vitest@4.1.11`: the full install still fails. The debug log's last placement before the crash is `fdir@6.5.0` (via `tinyglobby`); `fdir` has an optional peer `picomatch`, which vitest also depends on directly. Hypothesis, not verified: an npm 10 bug in peer-set loading.

4. **Resolved:** `npx -y npm@11.21.0 install` with vitest back at 5.0.3: 59 packages, exit 0. The bug is in npm 10.9.3, not our dependencies. `package.json` now declares `packageManager: npm@11.21.0` and `engines.npm >=11`; CI must install npm 11 before `npm ci`.

## Research, 19 Oct 2026: build-in-public posts that reached people (research agent; links opened via fxtwitter API)

- Small-account breakouts showed a working thing or a real failure, never a teaser. Yasser Elsaid's Chatbase demo reached 826K views at 16 followers ("third tweet ever"): x.com/yasser_elsaid_/status/1621954428105379846. @leastfavorite_'s prompt-injection screenshots got 10.3K likes: x.com/leastfavorite_/status/1570475633557348355.
- Riley Goodside's prompt-injection post got 5.2K likes (x.com/goodside/status/1569128808308957185). Simon Willison's "Lethal Trifecta" post got 658K views (x.com/simonw/status/1934602159984984235). Prompt injection is a topic people already argue about, and that is where our `--tools ""` guard fits.
- X's published ranking weights (open-source algorithm, Apr 2023, may have changed): like 0.5, retweet 1, reply 13.5, profile click 12, a reply the author engages with 75, negative feedback −74. Replies and conversation outweigh likes.
- **Superseded 20 Oct 2026:** X's 2026 ranking code (github.com/xai-org/x-algorithm, `home-mixer/params/param.rs`) sets `ReplyWeight` to 5.0 (checked by Claude), with an extra boost for replies between accounts that follow each other. The 2023 numbers above are out of date. Full review: `docs/x-growth-review.html`.
- Buffer 2025 (second-hand report): median engagement 3.56% for text vs 3.40% for images. Format barely matters; content does.
- No controlled evidence on reply-to-big-accounts strategy or on teasers. Anecdotes only.
- Templates in use: failure or security screenshot; named rule ("LLM proposes, code verifies") with a diagram; counter-intuitive story ("deleted my own tests"); showing the paperwork (spec, decisions log); replying with a point and a screenshot under big accounts' prompt-injection posts, without dropping a link in their thread.
