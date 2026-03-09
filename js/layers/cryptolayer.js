/* ===================================================================
   PANOPTICON — Crypto Markets Layer
   Ambient sidebar panel showing top cryptocurrencies by market cap.
   =================================================================== */

import { createAmbientLayer } from './ambientlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const DATA_URL = 'data/layers/ambient/crypto_markets.json';
const LIVE_API = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&sparkline=false';
const POLL_MS = 60_000;

// --- Helpers ---

function formatUsd(v) {
  if (v == null) return '--';
  if (v >= 1_000_000_000_000) return '$' + (v / 1_000_000_000_000).toFixed(2) + 'T';
  if (v >= 1_000_000_000) return '$' + (v / 1_000_000_000).toFixed(2) + 'B';
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(2) + 'M';
  if (v >= 1) return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '$' + v.toFixed(6);
}

function formatPrice(v) {
  if (v == null) return '--';
  if (v >= 1) return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (v >= 0.01) return '$' + v.toFixed(4);
  return '$' + v.toFixed(6);
}

function formatChange(pct) {
  if (pct == null) return '--';
  const sign = pct >= 0 ? '+' : '';
  return sign + pct.toFixed(2) + '%';
}

// --- Live API parser ---

function parseLiveResponse(raw) {
  if (!Array.isArray(raw)) return null;
  const coins = raw.map(c => ({
    id: c.id || '',
    symbol: (c.symbol || '').toUpperCase(),
    name: c.name || '',
    image: c.image || '',
    price: c.current_price || 0,
    change_24h: c.price_change_percentage_24h != null ? Math.round(c.price_change_percentage_24h * 100) / 100 : null,
    market_cap: c.market_cap || 0,
    volume_24h: c.total_volume || 0,
    rank: c.market_cap_rank || 0,
  }));
  return {
    _source: { description: 'Live crypto market data', origin: 'CoinGecko API v3' },
    snapshot_ts: new Date().toISOString(),
    coins,
  };
}

// --- Render ---

let searchQuery = '';

function renderCryptoPanel(contentEl, data) {
  const coins = data.coins || [];
  contentEl.innerHTML = '';

  // Search bar
  const search = document.createElement('input');
  search.className = 'crypto-search';
  search.type = 'text';
  search.placeholder = 'SEARCH CRYPTO...';
  search.value = searchQuery;
  search.addEventListener('input', () => {
    searchQuery = search.value;
    renderList(listEl, coins);
  });
  contentEl.appendChild(search);

  // Coin list
  const listEl = document.createElement('div');
  contentEl.appendChild(listEl);
  renderList(listEl, coins);
}

function renderList(listEl, coins) {
  listEl.innerHTML = '';
  const q = searchQuery.toLowerCase();

  let filtered = coins;
  if (q) {
    filtered = filtered.filter(c =>
      c.symbol.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'crypto-empty';
    empty.textContent = 'NO COINS FOUND';
    listEl.appendChild(empty);
    return;
  }

  for (const c of filtered) {
    listEl.appendChild(makeCard(c));
  }
}

function makeCard(c) {
  const card = document.createElement('div');
  card.className = 'crypto-card';

  // Rank
  const rank = document.createElement('span');
  rank.className = 'crypto-rank';
  rank.textContent = '#' + c.rank;
  card.appendChild(rank);

  // Symbol
  const symbol = document.createElement('span');
  symbol.className = 'crypto-symbol';
  symbol.textContent = c.symbol;
  card.appendChild(symbol);

  // Name
  const name = document.createElement('span');
  name.className = 'crypto-name';
  name.textContent = c.name;
  card.appendChild(name);

  // Price
  const price = document.createElement('span');
  price.className = 'crypto-price';
  price.textContent = formatPrice(c.price);
  card.appendChild(price);

  // 24h change
  const change = document.createElement('span');
  change.className = 'crypto-change ' + (c.change_24h >= 0 ? 'positive' : 'negative');
  change.textContent = formatChange(c.change_24h);
  card.appendChild(change);

  // Meta row (market cap + volume)
  const meta = document.createElement('div');
  meta.className = 'crypto-meta';
  meta.style.width = '100%';
  meta.style.paddingLeft = '30px';

  const mcap = document.createElement('span');
  mcap.textContent = 'MCAP ' + formatUsd(c.market_cap);
  meta.appendChild(mcap);

  const vol = document.createElement('span');
  vol.textContent = 'VOL ' + formatUsd(c.volume_24h);
  meta.appendChild(vol);

  // Wrap card and meta in a container
  const wrapper = document.createElement('div');
  wrapper.appendChild(card);
  wrapper.appendChild(meta);
  wrapper.style.borderBottom = '1px solid #ffffff08';

  return wrapper;
}

// --- Layer creation ---

const layer = createAmbientLayer({
  layerKey: 'crypto',
  dataUrl: DATA_URL,
  panelId: 'crypto-panel',
  countId: 'crypto-count',
  logLabel: 'CRYPTO',
  tabLabel: 'CRYPTO',
  tabColor: '#f7931a',
  renderFn: renderCryptoPanel,
  liveUrl: LIVE_API,
  livePollMs: POLL_MS,
  parseLiveFn: parseLiveResponse,
  countFn: (data) => data.coins?.length || '0',
});

registerLayerLoader('crypto', {
  load: layer.load,
  flyTo: null,
  reset: layer.reset,
  dataUrl: DATA_URL,
  layerType: 'ambient',
  show: layer.show,
  hide: layer.hide,
});
