/* ===================================================================
   PANOPTICON — BTC Whale Transactions Layer
   Ambient sidebar panel showing large Bitcoin transfers from mempool.space.
   =================================================================== */

import { createAmbientLayer } from './ambientlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const DATA_URL = 'data/layers/ambient/whale_btc.json';
const LIVE_API = 'https://mempool.space/api/mempool/recent';
const PRICE_API = 'https://mempool.space/api/v1/prices';
const POLL_MS = 30_000;
const THRESHOLD_SATS = 10 * 100_000_000; // 10 BTC in satoshis

// --- Helpers ---

function formatBtc(btc) {
  if (btc == null) return '--';
  if (btc >= 1000) return btc.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' BTC';
  return btc.toFixed(4) + ' BTC';
}

function formatUsd(v) {
  if (v == null) return '';
  if (v >= 1_000_000_000) return '$' + (v / 1_000_000_000).toFixed(2) + 'B';
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(2) + 'M';
  if (v >= 1_000) return '$' + (v / 1_000).toFixed(1) + 'K';
  return '$' + v.toFixed(0);
}

function truncateTxid(txid) {
  if (!txid || txid.length < 16) return txid || '';
  return txid.slice(0, 8) + '...' + txid.slice(-8);
}

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
  return Math.floor(hrs / 24) + 'd AGO';
}

function formatSats(sats) {
  if (sats == null) return '';
  return sats.toLocaleString('en-US') + ' sats';
}

// --- Live API parser ---

let cachedBtcPrice = 0;

async function fetchBtcPrice() {
  try {
    const res = await fetch(PRICE_API);
    if (res.ok) {
      const data = await res.json();
      cachedBtcPrice = data.USD || 0;
    }
  } catch { /* silent */ }
}

function parseLiveResponse(raw) {
  if (!Array.isArray(raw)) return null;

  // Filter for whale transactions (>= 10 BTC)
  const whales = [];
  for (const tx of raw) {
    const totalSats = (tx.value || 0);
    if (totalSats >= THRESHOLD_SATS) {
      const btc = totalSats / 100_000_000;
      whales.push({
        txid: tx.txid || '',
        value_btc: Math.round(btc * 10000) / 10000,
        value_usd: cachedBtcPrice ? Math.round(btc * cachedBtcPrice) : null,
        fee_sats: tx.fee || 0,
        size: tx.size || tx.vsize || 0,
        time: new Date().toISOString(),
        inputs: 0,
        outputs: 0,
      });
    }
  }

  whales.sort((a, b) => b.value_btc - a.value_btc);

  return {
    _source: { description: 'Recent whale BTC transactions', origin: 'mempool.space API' },
    snapshot_ts: new Date().toISOString(),
    btc_price_usd: cachedBtcPrice,
    threshold_btc: 10,
    transactions: whales,
  };
}

// --- Render ---

function renderWhalePanel(contentEl, data) {
  const txs = data.transactions || [];
  const btcPrice = data.btc_price_usd || cachedBtcPrice;
  contentEl.innerHTML = '';

  // Price header
  if (btcPrice) {
    const priceHeader = document.createElement('div');
    priceHeader.style.cssText = 'padding: 8px 14px; font-size: 10px; opacity: 0.5; border-bottom: 1px solid #f7931a10; letter-spacing: 1px;';
    priceHeader.textContent = 'BTC PRICE: $' + btcPrice.toLocaleString('en-US');
    contentEl.appendChild(priceHeader);
  }

  if (txs.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'whale-empty';
    empty.textContent = 'NO WHALE TRANSACTIONS';
    contentEl.appendChild(empty);
    return;
  }

  for (const tx of txs) {
    contentEl.appendChild(makeTxItem(tx, btcPrice));
  }
}

function makeTxItem(tx, btcPrice) {
  const item = document.createElement('div');
  item.className = 'whale-tx';

  // Amount row
  const amountRow = document.createElement('div');
  const amount = document.createElement('span');
  amount.className = 'whale-amount';
  amount.textContent = formatBtc(tx.value_btc);
  amountRow.appendChild(amount);

  const usdVal = tx.value_usd || (btcPrice ? Math.round(tx.value_btc * btcPrice) : null);
  if (usdVal) {
    const usd = document.createElement('span');
    usd.className = 'whale-usd';
    usd.textContent = '(' + formatUsd(usdVal) + ')';
    amountRow.appendChild(usd);
  }
  item.appendChild(amountRow);

  // Txid
  const txid = document.createElement('div');
  txid.className = 'whale-txid';
  txid.textContent = truncateTxid(tx.txid);
  txid.title = tx.txid;
  if (tx.txid) {
    txid.addEventListener('click', (e) => {
      e.stopPropagation();
      window.open('https://mempool.space/tx/' + tx.txid, '_blank', 'noopener');
    });
  }
  item.appendChild(txid);

  // Meta row
  const meta = document.createElement('div');
  meta.className = 'whale-meta';

  const fee = document.createElement('span');
  fee.textContent = 'FEE ' + formatSats(tx.fee_sats);
  meta.appendChild(fee);

  const time = document.createElement('span');
  time.textContent = timeAgo(tx.time);
  meta.appendChild(time);

  item.appendChild(meta);
  return item;
}

// --- Layer creation ---

// Fetch BTC price on module load for live estimates
fetchBtcPrice();
setInterval(fetchBtcPrice, 300_000); // Refresh price every 5 min

const layer = createAmbientLayer({
  layerKey: 'whalebtc',
  dataUrl: DATA_URL,
  panelId: 'whalebtc-panel',
  countId: 'whalebtc-count',
  logLabel: 'BTC-WHALE',
  tabLabel: 'WHALES',
  tabColor: '#f7931a',
  renderFn: renderWhalePanel,
  liveUrl: LIVE_API,
  livePollMs: POLL_MS,
  parseLiveFn: parseLiveResponse,
  countFn: (data) => data.transactions?.length || '0',
});

registerLayerLoader('whalebtc', {
  load: layer.load,
  flyTo: null,
  reset: layer.reset,
  dataUrl: DATA_URL,
  layerType: 'ambient',
  show: layer.show,
  hide: layer.hide,
});
