/* ===================================================================
   PANOPTICON — Trending News Layer
   Ambient sidebar panel showing live news headlines from Google News RSS.
   =================================================================== */

import { createAmbientLayer } from './ambientlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const DATA_URL = 'data/layers/ambient/trending_news.json';
const LIVE_API = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fnews.google.com%2Frss';
const POLL_MS = 300_000; // 5 minutes

// --- Helpers ---

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = Date.now();
  const ms = now - d.getTime();
  if (ms < 0) return 'JUST NOW';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'JUST NOW';
  if (mins < 60) return mins + 'm AGO';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h AGO';
  const days = Math.floor(hrs / 24);
  return days + 'd AGO';
}

function extractSource(title) {
  if (!title) return '';
  if (title.includes(' - ')) {
    return title.split(' - ').pop().trim();
  }
  return '';
}

// --- Live API parser ---

function parseLiveResponse(raw) {
  const items = raw.items || raw.feed?.entries || [];
  const headlines = items.map(item => {
    const fullTitle = item.title || '';
    const source = item.author || extractSource(fullTitle);
    const cleanTitle = source && fullTitle.includes(' - ')
      ? fullTitle.substring(0, fullTitle.lastIndexOf(' - ')).trim()
      : fullTitle;

    return {
      title: cleanTitle,
      link: item.link || item.guid || '',
      source,
      pubDate: item.pubDate || item.published || '',
    };
  });

  return {
    _source: { description: 'Live news headlines', origin: 'Google News RSS via rss2json.com' },
    snapshot_ts: new Date().toISOString(),
    headlines,
  };
}

// --- Render ---

function renderNewsPanel(contentEl, data) {
  const headlines = data.headlines || [];
  contentEl.innerHTML = '';

  if (headlines.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'news-empty';
    empty.textContent = 'NO HEADLINES';
    contentEl.appendChild(empty);
    return;
  }

  for (const h of headlines) {
    contentEl.appendChild(makeNewsItem(h));
  }
}

function makeNewsItem(h) {
  const item = document.createElement('div');
  item.className = 'news-item';

  // Title
  const title = document.createElement('div');
  title.className = 'news-title';
  title.textContent = h.title || '';
  item.appendChild(title);

  // Clicking opens link in new tab
  if (h.link) {
    item.addEventListener('click', () => {
      window.open(h.link, '_blank', 'noopener');
    });
  }

  // Meta row
  const meta = document.createElement('div');
  meta.className = 'news-meta';

  const source = document.createElement('span');
  source.className = 'news-source';
  source.textContent = (h.source || 'NEWS').toUpperCase();
  meta.appendChild(source);

  const time = document.createElement('span');
  time.className = 'news-time';
  time.textContent = timeAgo(h.pubDate);
  meta.appendChild(time);

  item.appendChild(meta);
  return item;
}

// --- Layer creation ---

const layer = createAmbientLayer({
  layerKey: 'news',
  dataUrl: DATA_URL,
  panelId: 'news-panel',
  countId: 'news-count',
  logLabel: 'NEWS',
  tabLabel: 'NEWS',
  tabColor: '#44aaff',
  renderFn: renderNewsPanel,
  liveUrl: LIVE_API,
  livePollMs: POLL_MS,
  parseLiveFn: parseLiveResponse,
  countFn: (data) => data.headlines?.length || '0',
});

registerLayerLoader('news', {
  load: layer.load,
  flyTo: null,
  reset: layer.reset,
  dataUrl: DATA_URL,
  layerType: 'ambient',
  show: layer.show,
  hide: layer.hide,
});
