// /api/scores.js
// Fetches live + upcoming fixtures from API-Football (api-sports.io) for the
// leagues configured below, and returns clean JSON for the front end.
//
// SETUP:
// 1. Get an API key at https://www.api-football.com/ or via RapidAPI.
// 2. In Vercel: Project Settings -> Environment Variables -> add APIFOOTBALL_KEY.
// 3. Double-check the league IDs below against your account's /leagues?search=
//    endpoint before going live — IDs are stable but always worth confirming,
//    especially for smaller leagues like the PSL.

const LEAGUES = {
  39: 'Premier League',        // England
  2: 'Champions League',       // UEFA
  288: 'Premiership',          // South Africa (verify this ID for your account)
};

const BASE_URL = 'https://v3.football.api-sports.io';

function currentSeasonYear() {
  // API-Football seasons are keyed by the year the season *starts* in.
  // Northern hemisphere leagues run Aug-May, so before July we're still
  // in the season that started the previous year.
  const now = new Date();
  const y = now.getUTCFullYear();
  return now.getUTCMonth() < 6 ? y - 1 : y;
}

export default async function handler(req, res) {
  const apiKey = process.env.APIFOOTBALL_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Missing APIFOOTBALL_KEY environment variable' });
    return;
  }

  const headers = { 'x-apisports-key': apiKey };

  try {
    // 1) Try live-in-play fixtures first, filtered to our leagues.
    const liveResp = await fetch(`${BASE_URL}/fixtures?live=all`, { headers });
    const liveJson = await liveResp.json();
    let fixtures = (liveJson.response || []).filter(f => LEAGUES[f.league?.id]);
    let mode = 'live';

    // 2) Nothing live right now -> fall back to each league's next fixtures.
    if (fixtures.length === 0) {
      const season = currentSeasonYear();
      const results = await Promise.all(
        Object.keys(LEAGUES).map(async (id) => {
          const r = await fetch(
            `${BASE_URL}/fixtures?league=${id}&season=${season}&next=4`,
            { headers }
          );
          const j = await r.json();
          return j.response || [];
        })
      );
      fixtures = results.flat();
      mode = 'upcoming';
    }

    const cleaned = fixtures.slice(0, 12).map(f => ({
      league: f.league?.name,
      leagueLogo: f.league?.logo,
      home: f.teams?.home?.name,
      homeLogo: f.teams?.home?.logo,
      away: f.teams?.away?.name,
      awayLogo: f.teams?.away?.logo,
      scoreHome: f.goals?.home,
      scoreAway: f.goals?.away,
      status: f.fixture?.status?.short,   // e.g. NS, 1H, HT, 2H, FT
      elapsed: f.fixture?.status?.elapsed,
      kickoff: f.fixture?.date,
    }));

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.status(200).json({ mode, fixtures: cleaned });
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch fixtures', detail: String(err) });
  }
}
