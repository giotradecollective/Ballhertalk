# BallHerTalk — Live scores + news setup

This adds two live data feeds to the site:

1. **Live scores** (`/api/scores`) — powered by **API-Football** (api-sports.io).
   Shows live in-play matches for EPL, PSL, and Champions League, or the next
   few fixtures when nothing's live.
2. **News headlines** (`/api/news`) — pulled from public **RSS feeds**
   (BBC Sport, Sky Sports football). API-Football doesn't provide news
   articles, so this uses a separate free source with no API key required.

If neither function is deployed (or a request fails), the page quietly falls
back to placeholder content — nothing breaks, it just won't be "live" yet.

## 1. Get an API-Football key

- Sign up at https://www.api-football.com/ (or via RapidAPI) and grab your key
  from the dashboard. The free tier is enough to get started (100 requests/day).
- **Before going live**, confirm the league IDs in `api/scores.js` against your
  own account using the `/leagues?search=` endpoint — IDs are stable but it's
  worth double-checking, especially for smaller leagues like the PSL, since a
  wrong ID will just silently return no fixtures.

## 2. Deploy to Vercel (easiest path from a static file)

1. Install the Vercel CLI: `npm i -g vercel` (or just use the Vercel web
   dashboard and drag-and-drop this folder / connect a GitHub repo).
2. From this folder, run `vercel` and follow the prompts (first deploy asks a
   few setup questions — defaults are fine for a static site + `/api`
   functions).
3. In the Vercel dashboard: **Project → Settings → Environment Variables**,
   add:
   - `APIFOOTBALL_KEY` = your API-Football key
4. Redeploy (`vercel --prod`) so the new env variable is picked up.

Vercel auto-detects anything in `/api/*.js` as a serverless function — no
extra config needed for this setup.

## 3. Test it

- `https://your-site.vercel.app/api/scores` should return JSON with a
  `fixtures` array.
- `https://your-site.vercel.app/api/news` should return JSON with a
  `headlines` array.
- Open the site itself — the "Live scores" and "Live headlines" sections
  should populate from these endpoints automatically.

## Notes / things worth knowing

- **Caching**: both functions set `Cache-Control` headers (60s for scores,
  5min for news) so you're not hammering either source on every page view.
- **Rate limits**: the free API-Football tier is capped daily — the fallback
  to "next fixtures" (rather than polling constantly) keeps you well under it
  for a single-page site. If you outgrow it, paid tiers raise the cap.
- **Swapping/adding news sources**: edit the `FEEDS` array in `api/news.js` —
  any standard RSS feed URL works.
- **Changing leagues**: edit the `LEAGUES` object in `api/scores.js`.
