// /api/news.js
// Pulls real football headlines from public RSS feeds (no API key needed)
// and returns them as clean JSON, sorted newest-first.
//
// Add or remove feeds freely — just keep the {src, url} shape.

const FEEDS = [
  { src: 'BBC', url: 'http://feeds.bbci.co.uk/sport/football/rss.xml' },
  { src: 'Sky Sports', url: 'https://www.skysports.com/rss/12040' },
];

function stripCdata(s = '') {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

function tag(name, block) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return m ? stripCdata(m[1]).trim() : '';
}

function parseRss(xml, src) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return items.map(item => {
    const title = tag('title', item);
    const link = tag('link', item);
    const pubDate = tag('pubDate', item);
    return {
      src,
      title,
      link,
      pubDate,
      time: pubDate ? new Date(pubDate).getTime() : 0,
    };
  }).filter(i => i.title);
}

function relativeTime(ms) {
  if (!ms) return '';
  const diffMin = Math.max(1, Math.round((Date.now() - ms) / 60000));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

export default async function handler(req, res) {
  try {
    const results = await Promise.allSettled(
      FEEDS.map(async (feed) => {
        const r = await fetch(feed.url, {
          headers: { 'User-Agent': 'BallHerTalk/1.0 (+news widget)' },
        });
        const xml = await r.text();
        return parseRss(xml, feed.src);
      })
    );

    const all = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .sort((a, b) => b.time - a.time)
      .slice(0, 8)
      .map(({ src, title, link, time }) => ({
        src,
        text: title,
        link,
        time: relativeTime(time),
      }));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json({ headlines: all });
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch news feeds', detail: String(err) });
  }
}
