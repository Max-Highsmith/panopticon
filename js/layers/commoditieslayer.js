/* ===================================================================
   PANOPTICON — Commodity Prices Layer
   Ambient sidebar panel showing natural resource / commodity prices
   from World Bank Pink Sheet data.
   =================================================================== */

import { createAmbientLayer } from './ambientlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const DATA_URL = 'data/layers/ambient/commodity_prices.json';
// No live API — World Bank data is monthly, refresh via ingestion script.

// --- Helpers ---

function formatPrice(price, unit) {
  if (price == null) return '--';
  const formatted = price >= 100
    ? price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return formatted + ' ' + (unit || '');
}

function formatChange(pct) {
  if (pct == null) return '--';
  const sign = pct >= 0 ? '+' : '';
  return sign + pct.toFixed(1) + '%';
}

// --- Render ---

let activeCategory = 'ALL';

function renderCommodityPanel(contentEl, data) {
  const commodities = data.commodities || [];
  const categories = data.categories || [];
  contentEl.innerHTML = '';

  // Category filter pills
  const filters = document.createElement('div');
  filters.className = 'commodity-filters';

  const allPill = makePill('ALL', activeCategory === 'ALL');
  allPill.addEventListener('click', () => { activeCategory = 'ALL'; renderCommodityPanel(contentEl, data); });
  filters.appendChild(allPill);
  for (const cat of categories) {
    const pill = makePill(cat.toUpperCase(), activeCategory === cat);
    pill.addEventListener('click', () => { activeCategory = cat; renderCommodityPanel(contentEl, data); });
    filters.appendChild(pill);
  }
  contentEl.appendChild(filters);

  // Commodity list
  const listEl = document.createElement('div');
  contentEl.appendChild(listEl);

  let filtered = commodities;
  if (activeCategory !== 'ALL') {
    filtered = filtered.filter(c => c.category === activeCategory);
  }

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'commodity-empty';
    empty.textContent = 'NO DATA';
    listEl.appendChild(empty);
    return;
  }

  // Group by category
  let lastCategory = '';
  for (const c of filtered) {
    if (activeCategory === 'ALL' && c.category !== lastCategory) {
      lastCategory = c.category;
      const header = document.createElement('div');
      header.className = 'commodity-category-header';
      header.textContent = c.category.toUpperCase();
      listEl.appendChild(header);
    }
    listEl.appendChild(makeItem(c));
  }
}

function makePill(label, active) {
  const el = document.createElement('span');
  el.className = 'commodity-pill' + (active ? ' active' : '');
  el.textContent = label;
  return el;
}

function makeItem(c) {
  const item = document.createElement('div');
  item.className = 'commodity-item';

  const left = document.createElement('div');
  const name = document.createElement('span');
  name.className = 'commodity-name';
  name.textContent = c.name;
  left.appendChild(name);

  const right = document.createElement('div');
  right.style.textAlign = 'right';

  const price = document.createElement('span');
  price.className = 'commodity-price';
  price.textContent = formatPrice(c.price, '');
  right.appendChild(price);

  const unit = document.createElement('span');
  unit.className = 'commodity-unit';
  unit.textContent = c.unit || '';
  right.appendChild(unit);

  if (c.change_pct != null) {
    const br = document.createElement('br');
    right.appendChild(br);
    const change = document.createElement('span');
    change.className = 'commodity-change ' + (c.change_pct >= 0 ? 'positive' : 'negative');
    change.textContent = formatChange(c.change_pct);
    right.appendChild(change);
  }

  item.appendChild(left);
  item.appendChild(right);
  return item;
}

// --- Layer creation ---

const layer = createAmbientLayer({
  layerKey: 'commodities',
  dataUrl: DATA_URL,
  panelId: 'commodities-panel',
  countId: 'commodities-count',
  logLabel: 'COMMODITIES',
  tabLabel: 'CMDTY',
  tabColor: '#cc8844',
  renderFn: renderCommodityPanel,
  countFn: (data) => data.commodities?.length || '0',
});

registerLayerLoader('commodities', {
  load: layer.load,
  flyTo: null,
  reset: layer.reset,
  dataUrl: DATA_URL,
  layerType: 'ambient',
  show: layer.show,
  hide: layer.hide,
});
