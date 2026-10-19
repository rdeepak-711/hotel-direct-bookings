# Direct Booking Check: the mental model

Written 18 Oct 2026, before the code exists, from `spec/site.md` and `docs/plan.html`. It describes the system as designed. After the build it gets re-read against the real code and corrected where the code differs; until then, treat it as the intent, not the proof.

The test for this document: Deepak can explain every section below out loud without opening it. If a section can't be re-explained, it is badly written or hiding something.

## What the tool is, in one breath

You type a US hotel's name. About 30 seconds later you get one page that says how likely that hotel is to lose bookings to sites like Expedia, where exactly it loses them, and the three things to fix first. Everything on the page comes from public data fetched live: the hotel's Google listing and reviews, its own website loaded in a phone browser, and the public listings of the five hotels nearest it. One AI call reads the reviews; everything else is plain code.

## The problem it answers

An independent hotel owner pays 15–25% commission when a guest books through Expedia or Booking.com instead of directly. The owner usually knows this and doesn't know *why* it happens to them specifically. The hunch behind the tool: a guest who already wants this hotel still books elsewhere when the hotel's own channels give them a reason to leave, which is a slow website, a listing with no description, a question (parking? check-in?) nobody answered. Those reasons are visible from outside. So we look from outside.

## The five sources and what each one gives

Think of five people each handing us one piece of paper:

1. **Google Places** hands us the listing: name, address, coordinates, rating, review count, website, phone, description, and the five reviews Google thinks are most relevant. This is the only source that must work; without it there is nothing to report on.
2. **Google PageSpeed** loads the hotel's website in a real phone browser and hands us a report card: a speed score 0–100, whether it's secure (HTTPS), whether it fits a phone screen, and, crucially, the list of every network request the page made. That list is how we know the booking engine: if the page calls `be.synxis.com`, the hotel books through SynXis on someone else's domain.
3. **The hotel's own website**, fetched by us as plain text: the home page, plus up to four pages it links to that look informational (FAQ, policies, rooms, about, parking, pets), because that is where the answers usually live. We need the words on those pages to answer "does the site mention parking?". The report says how many pages were read. A Facebook or booking-site link counts as no website at all and is never fetched. This fetch is locked down (see safety below) because the URL comes from Google, not from us.
4. **Google Places again, nearby search**: the five lodging places within 1.5 km. For each we take only rating, review count, whether they have a website, a phone, a description. Never their reviews. We then run PageSpeed on each neighbour's website too.
5. **Tripadvisor** (optional, built only if time remains): three recent reviews and the hotel's rank in its city.

Then one more participant, the only AI: **OpenRouter** carrying whichever model we choose, reading the reviews.

## What the AI does, and what it is not allowed to do

The AI gets the review texts and is asked for exactly four things, as JSON: themes guests praise, questions guests had to work out for themselves, a one-line headline, and ad lines. For every theme it must give quotes, each tagged with the review it came from.

Then code checks every quote. The quote must appear word for word (ignoring case, whitespace and curly quotes) inside the review it claims to come from. If it doesn't, the quote is dropped and the drop is recorded. Theme counts are then recomputed by code from the quotes that survived, not taken from the model. A theme with no surviving quotes disappears.

Why: the free models used for demos invent things, and a hotel owner shown a selling point they can't back up with a real review is worse off than one shown nothing. This is the same idea as the escalation-gate project: the model proposes, code verifies.

The AI never sees the neighbours' data, never writes the findings, never computes the score. If the AI step fails twice, the report still comes out, with the praise and gap sections marked unavailable.

## The two parts that are genuinely new

Everything above is data the owner could, with effort, find themselves. Two sections cross sources and say something they didn't know:

**The gap check.** Take each question theme the AI found in the reviews ("Parking", "Check-in time"). Map it to a topic by keyword. Look for that topic's keywords in the text of the hotel's own home page. Three outcomes: the site mentions it (fine, maybe make it easier to find), the site doesn't mention it (a high-severity finding: guests are asking and nobody wrote the answer down), or we couldn't check (no topic match or no page text). The reasoning for the owner: a guest with an unanswered question rings whoever answers fastest, and that's Expedia's call centre.

**The neighbour comparison.** A 4.5 rating means nothing on its own and a lot next to the hotels a guest is choosing between. For mobile speed, rating and review count we show the owner's number, the neighbours' average and a rank ("last of 4"). For description, phone and website we show "3 of 5 neighbours have one". Neighbours are counted, never named, and none of their reviews are read: naming them would turn a check-up into a public ranking of other people's businesses.

## The score

One number so the owner remembers one thing. Three sub-scores, each 0–100 (a fourth, Reviews, was dropped on 19 Oct because a star rating says nothing about whether guests book direct):

- **Website (weight 40):** the PageSpeed score, minus deductions for http, no viewport, booking on another company's domain, no tap-to-call. The biggest weight because it's what the owner controls most and where most hotels lose.
- **Guest messaging (30):** 100 minus 25 per question the site doesn't answer, minus 10 per question it does answer or we couldn't check.
- **Google listing (30):** 40 for a description, 30 for a website, 30 for a phone.

If a sub-score has no data (the AI failed, the site wouldn't load), it drops out and the weights are re-spread over the rest. The weights are a judgement, not measured against bookings, and the README will say so.

## How one report is made, in order

1. **Get the place from Google.** If this fails, the whole run fails; there's nothing to stand on.
2. **Five jobs at once:** fetch the home page text; run PageSpeed on the site (falling back to checks on the raw page if PageSpeed fails); find the neighbours and run PageSpeed on each; Tripadvisor if built; the AI on the reviews followed by the quote check. Each job can fail alone; its section is marked "not available" and the report still comes out.
3. **Gap check**: the AI's questions against the page text.
4. **Score.**
5. **Report builder**: turns everything into findings (each with an id, a category, a severity, evidence in plain words, a fix), picks the top three by severity then by how many reviews back it, attaches the verified quotes with their source and date, and writes the footnote about cancellations. Output is one JSON object. The page just renders it.

Wall time is set by PageSpeed, 10–45 seconds per site, which is why step 2 runs everything together.

## Where things run

Three places:

- **The visitor's browser** runs two pages: search and report. If the visitor types their own OpenRouter key, it stays in their browser's session storage and travels only inside the request to our server, where it is used once and never written anywhere.
- **Our server** is a set of Vercel functions behind two routes: `GET /api/search?q=` and `POST /api/report`. The report route checks a per-visitor rate limit, picks which AI client to use (a fake one for tests and previews, the viewer's key if given, else our demo key), and runs the pipeline. All API keys live here as environment variables and never reach the browser.
- **Outside services**: Google Places, Google PageSpeed, the hotel's website, Tripadvisor, OpenRouter. The server is the only thing that talks to them.

There is no database. A report is computed, returned, and gone. That is partly Google's rule (review text may not be stored) and partly the safest design: nothing stored, nothing to leak. The one exception is a ten-minute in-memory cache of PageSpeed results and the neighbour list, which are our own derived numbers and place ids, so two people checking the same hotel don't pay twice.

## Two audiences, one codebase

The public page uses generic fix categories: booking website, Google profile, marketing, guest messaging. The version sent to Hotelzify's founder adds one line per fix naming the matching Hotelzify product. It's the same report, unlocked by a secret token (`?partner=<token>`, checked on the server against `PARTNER_TOKEN`); without the right token the public report comes back, and the public JSON never contains the word Hotelzify. Tests assert both.

## The safety calls, in plain words

- **Fetching a URL Google gave us is dangerous** because a listing could point at an internal address. So `safeFetch` refuses anything that isn't http/https, refuses localhost and private network ranges, re-checks every redirect hop, stops after 3 redirects, gives up after 8 seconds, and reads at most 2 MB.
- **Review text is data, not instructions.** The AI prompt says so explicitly, and the quote check means a review that tries to inject text can at most produce a quote of itself.
- **Spending.** The in-app rate limiter is best effort (Vercel runs many short-lived instances, so its memory resets). The real cap is a hard daily quota on the Google key in Google Cloud.
- **Keys.** Server keys stay on the server. A viewer's key is used once per request. Error messages never include a key.
- **Fairness to real hotels.** Real reports go privately to Hotelzify, never posted. Public demos show the tool and the process, not a named hotel's bad score.

## What it deliberately doesn't do

No price comparison with Expedia (no legal API). No accounts or saved reports (no database by design). No PDF (the page is the report). No hotels outside the US (the job is the US business). No naming neighbours. No batch mode yet; "paste 50 hotels, get a ranked prospect list" is the most valuable form for a sales team and is the day-60 roadmap item.

## Where it's weak, said once

Eight reviews per hotel is thin; the report says so and talks in counts, never percentages. Topic matching is keywords, so "street noise" gets no gap check. A real quote filed under the wrong theme passes the quote check. The score weights are opinion. Hotelzify's own booking engine also runs on another domain (`bookmystay.io`), so the "booking off your domain" finding is a conversation for the CEO call, not a public criticism.

## Why this is job evidence

The founder hands out a hand-made version of this report at hotel-owner events. This is the automatic version, built in two days on real data, with the AI held to a verifiable standard and the security calls written down. The point to make in the interview is not "I built a dashboard" but "I found the two inferences nobody else makes (gap check, neighbour comparison), kept the AI to one checked step, and shipped it as a product an owner can read".
