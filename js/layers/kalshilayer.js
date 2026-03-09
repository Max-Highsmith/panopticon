/* ===================================================================
   PANOPTICON — Kalshi Prediction Markets Layer
   Ambient sidebar panel showing live and static market data.
   =================================================================== */

import { createAmbientLayer } from './ambientlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const DATA_URL = 'data/layers/ambient/kalshi_markets.json';
const LIVE_API = 'https://api.elections.kalshi.com/trade-api/v2/events?status=open&limit=100&with_nested_markets=true';
const POLL_MS = 60_000;

// --- Helpers ---

function formatVolume(v) {
  if (!v) return '0';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K';
  return String(v);
}

function formatExpiry(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = Date.now();
  const ms = d.getTime() - now;
  if (ms < 0) return 'EXPIRED';
  const hrs = ms / 3_600_000;
  if (hrs < 1) return Math.round(ms / 60_000) + 'm';
  if (hrs < 24) return Math.round(hrs) + 'h';
  const days = Math.round(hrs / 24);
  if (days < 365) return days + 'd';
  return (days / 365).toFixed(1) + 'y';
}

function centsDisplay(price) {
  if (price == null) return '--';
  // Price is already 0.00-1.00 from ingestion or live parse
  return Math.round(price * 100) + '\u00a2';
}

// --- Live API parser ---

function parseLiveResponse(raw) {
  const events = raw.events || [];
  const markets = [];
  for (const event of events) {
    const category = event.category || '';
    const eventTitle = event.title || '';
    for (const m of event.markets || []) {
      if (m.status !== 'active' && m.status !== 'open') continue;
      markets.push({
        ticker: m.ticker || '',
        event_ticker: m.event_ticker || '',
        title: m.title || '',
        subtitle: m.subtitle || '',
        event_title: eventTitle,
        category,
        yes_bid: (m.yes_bid || 0) / 100,
        yes_ask: (m.yes_ask || 0) / 100,
        no_bid: (m.no_bid || 0) / 100,
        no_ask: (m.no_ask || 0) / 100,
        last_price: (m.last_price || 0) / 100,
        volume: m.volume || 0,
        volume_24h: m.volume_24h || 0,
        open_interest: m.open_interest || 0,
        expiration: m.expected_expiration_time || '',
        status: m.status || '',
      });
    }
  }
  markets.sort((a, b) => (b.volume || 0) - (a.volume || 0));
  const categories = [...new Set(markets.map(m => m.category).filter(Boolean))].sort();
  return {
    _source: { description: 'Live Kalshi markets', origin: 'Kalshi Trade API v2' },
    snapshot_ts: new Date().toISOString(),
    categories,
    markets: markets.slice(0, 200),
  };
}

// --- Render ---

let activeFilter = 'ALL';
let searchQuery = '';

function renderMarketPanel(contentEl, data) {
  const markets = data.markets || [];
  const categories = data.categories || [];

  contentEl.innerHTML = '';

  // Search bar
  const search = document.createElement('input');
  search.className = 'kalshi-search';
  search.type = 'text';
  search.placeholder = 'SEARCH MARKETS...';
  search.value = searchQuery;
  search.addEventListener('input', () => {
    searchQuery = search.value;
    renderList(listEl, markets, categories);
  });
  contentEl.appendChild(search);

  // Category filters
  const filters = document.createElement('div');
  filters.className = 'kalshi-filters';
  const allPill = makePill('ALL', activeFilter === 'ALL');
  allPill.addEventListener('click', () => { activeFilter = 'ALL'; renderMarketPanel(contentEl, data); });
  filters.appendChild(allPill);
  for (const cat of categories) {
    const pill = makePill(cat.toUpperCase(), activeFilter === cat);
    pill.addEventListener('click', () => { activeFilter = cat; renderMarketPanel(contentEl, data); });
    filters.appendChild(pill);
  }
  contentEl.appendChild(filters);

  // Market list
  const listEl = document.createElement('div');
  listEl.className = 'kalshi-market-list';
  contentEl.appendChild(listEl);

  renderList(listEl, markets, categories);
}

function renderList(listEl, markets, _categories) {
  listEl.innerHTML = '';
  const q = searchQuery.toLowerCase();

  let filtered = markets;
  if (activeFilter !== 'ALL') {
    filtered = filtered.filter(m => m.category === activeFilter);
  }
  if (q) {
    filtered = filtered.filter(m =>
      (m.title || '').toLowerCase().includes(q) ||
      (m.event_title || '').toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'kalshi-empty';
    empty.textContent = 'NO MARKETS FOUND';
    listEl.appendChild(empty);
    return;
  }

  for (const m of filtered) {
    listEl.appendChild(makeCard(m));
  }
}

function makePill(label, active) {
  const el = document.createElement('span');
  el.className = 'kalshi-filter-pill' + (active ? ' active' : '');
  el.textContent = label;
  return el;
}

function makeCard(m) {
  const card = document.createElement('div');
  card.className = 'kalshi-card';

  // Title
  const title = document.createElement('div');
  title.className = 'kalshi-card-title';
  title.textContent = m.title || m.event_title || '';
  card.appendChild(title);

  // Price bar
  const priceBar = document.createElement('div');
  priceBar.className = 'kalshi-price-bar';

  const yesPrice = document.createElement('span');
  yesPrice.className = 'kalshi-yes-price';
  yesPrice.textContent = centsDisplay(m.yes_bid);

  const barTrack = document.createElement('div');
  barTrack.className = 'kalshi-bar-track';
  const barFill = document.createElement('div');
  barFill.className = 'kalshi-bar-fill';
  const pct = Math.round((m.yes_bid || 0) * 100);
  barFill.style.width = pct + '%';
  barTrack.appendChild(barFill);

  const noPrice = document.createElement('span');
  noPrice.className = 'kalshi-no-price';
  noPrice.textContent = centsDisplay(m.no_bid);

  priceBar.appendChild(yesPrice);
  priceBar.appendChild(barTrack);
  priceBar.appendChild(noPrice);
  card.appendChild(priceBar);

  // Meta row
  const meta = document.createElement('div');
  meta.className = 'kalshi-card-meta';

  const catTag = document.createElement('span');
  catTag.className = 'kalshi-cat-tag';
  catTag.textContent = (m.category || '').toUpperCase();

  const vol = document.createElement('span');
  vol.textContent = 'VOL ' + formatVolume(m.volume);

  const expiry = document.createElement('span');
  expiry.textContent = formatExpiry(m.expiration);

  meta.appendChild(catTag);
  meta.appendChild(vol);
  meta.appendChild(expiry);
  card.appendChild(meta);

  return card;
}

// --- Layer creation ---

const layer = createAmbientLayer({
  layerKey: 'kalshi',
  dataUrl: DATA_URL,
  panelId: 'kalshi-panel',
  countId: 'kalshi-count',
  logLabel: 'KALSHI',
  tabLabel: 'MARKETS',
  tabColor: '#ffaa00',
  renderFn: renderMarketPanel,
  liveUrl: LIVE_API,
  livePollMs: POLL_MS,
  parseLiveFn: parseLiveResponse,
});

registerLayerLoader('kalshi', {
  load: layer.load,
  flyTo: null,
  reset: layer.reset,
  dataUrl: DATA_URL,
  layerType: 'ambient',
  show: layer.show,
  hide: layer.hide,
});
