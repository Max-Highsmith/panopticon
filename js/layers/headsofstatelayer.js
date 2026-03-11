/* ===================================================================
   PANOPTICON — Heads of State Profiles Layer
   Ambient sidebar panel showing current world leaders.
   Data sourced from CIA World Factbook (public domain).
   =================================================================== */

import { createAmbientLayer } from './ambientlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const DATA_URL = 'data/layers/ambient/heads_of_state.json';

// --- Region colors ---

const REGION_COLORS = {
  AF: '#ff8844', // Africa
  AM: '#44aaff', // Americas
  AS: '#ff4488', // Asia
  EU: '#44ccaa', // Europe
  OC: '#aa88ff', // Oceania
};

function regionOf(code) {
  const africa = ['DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CG','CD','CI','DJ','EG','GQ','ER','SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW'];
  const americas = ['AG','AR','BS','BB','BZ','BO','BR','CA','CL','CO','CR','CU','DM','DO','EC','SV','GD','GT','GY','HN','JM','MX','NI','PA','PY','PE','KN','LC','VC','SR','TT','US','UY','VE'];
  const asia = ['AF','AM','AZ','BH','BD','BT','BN','KH','CN','CY','GE','IN','ID','IR','IQ','IL','JP','JO','KZ','KP','KW','KG','LA','LB','MY','MV','MN','MM','NP','OM','PK','PH','QA','SA','SG','KR','LK','SY','TJ','TH','TL','TR','TM','AE','UZ','VN','YE','TW','PS'];
  const europe = ['AL','AD','AT','BY','BE','BG','HR','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IE','IT','XK','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK','NO','PL','PT','RO','RU','RS','SK','SI','ES','SE','CH','UA','GB','VA'];
  const oceania = ['AU','FJ','KI','MH','FM','NR','NZ','PW','PG','WS','SB','TO','TV','VU'];
  if (africa.includes(code)) return 'AF';
  if (americas.includes(code)) return 'AM';
  if (asia.includes(code)) return 'AS';
  if (europe.includes(code)) return 'EU';
  if (oceania.includes(code)) return 'OC';
  return 'AS';
}

// --- Render ---

let searchQuery = '';
let activeRegion = 'ALL';

export function renderHeadsOfStatePanel(contentEl, data) {
  const located = data.located || [];
  const unlocated = data.unlocated || [];
  const all = [...located, ...unlocated];

  contentEl.innerHTML = '';

  // Search bar
  const search = document.createElement('input');
  search.className = 'hos-search';
  search.type = 'text';
  search.placeholder = 'SEARCH LEADERS...';
  search.value = searchQuery;
  search.style.cssText = 'width:100%;padding:6px 8px;background:#111;color:#00ff41;border:1px solid #333;font-family:Courier New,monospace;font-size:11px;margin-bottom:6px;box-sizing:border-box;';
  search.addEventListener('input', () => {
    searchQuery = search.value;
    renderList(listEl, all);
  });
  contentEl.appendChild(search);

  // Region filters
  const filters = document.createElement('div');
  filters.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;';
  const regions = [
    { key: 'ALL', label: 'ALL', color: '#555' },
    { key: 'AF', label: 'AFRICA', color: REGION_COLORS.AF },
    { key: 'AM', label: 'AMERICAS', color: REGION_COLORS.AM },
    { key: 'AS', label: 'ASIA', color: REGION_COLORS.AS },
    { key: 'EU', label: 'EUROPE', color: REGION_COLORS.EU },
    { key: 'OC', label: 'OCEANIA', color: REGION_COLORS.OC },
  ];
  for (const r of regions) {
    const pill = document.createElement('span');
    pill.textContent = r.label;
    pill.style.cssText = `padding:2px 8px;font-size:10px;font-family:Courier New,monospace;cursor:pointer;border:1px solid ${r.color};color:${activeRegion === r.key ? '#000' : r.color};background:${activeRegion === r.key ? r.color : 'transparent'};`;
    pill.addEventListener('click', () => {
      activeRegion = r.key;
      renderHeadsOfStatePanel(contentEl, data);
    });
    filters.appendChild(pill);
  }
  contentEl.appendChild(filters);

  // Leader list
  const listEl = document.createElement('div');
  contentEl.appendChild(listEl);

  renderList(listEl, all);
}

function renderList(listEl, leaders) {
  listEl.innerHTML = '';
  const q = searchQuery.toLowerCase();

  let filtered = leaders;
  if (activeRegion !== 'ALL') {
    filtered = filtered.filter(l => regionOf(l.country_code) === activeRegion);
  }
  if (q) {
    filtered = filtered.filter(l =>
      (l.name || '').toLowerCase().includes(q) ||
      (l.country || '').toLowerCase().includes(q) ||
      (l.title || '').toLowerCase().includes(q) ||
      (l.party || '').toLowerCase().includes(q) ||
      (l.bio || '').toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'color:#555;font-size:11px;padding:12px 0;text-align:center;';
    empty.textContent = 'NO LEADERS MATCH';
    listEl.appendChild(empty);
    return;
  }

  for (const l of filtered) {
    listEl.appendChild(makeLeaderCard(l));
  }
}

function makeLeaderCard(l) {
  const card = document.createElement('div');
  card.style.cssText = 'border:1px solid #333;padding:8px;margin-bottom:6px;background:#0a0a0a;cursor:pointer;';

  const region = regionOf(l.country_code);
  const rColor = REGION_COLORS[region] || '#aaa';

  // Top row: photo + header block
  const topRow = document.createElement('div');
  topRow.style.cssText = 'display:flex;gap:8px;margin-bottom:4px;';

  // Profile image
  if (l.image) {
    const img = document.createElement('img');
    img.src = l.image;
    img.alt = l.name;
    img.style.cssText = 'width:48px;height:48px;object-fit:cover;border:1px solid #333;flex-shrink:0;border-radius:2px;';
    img.onerror = () => { img.style.display = 'none'; };
    topRow.appendChild(img);
  }

  // Right side: name + title + meta
  const headerBlock = document.createElement('div');
  headerBlock.style.cssText = 'flex:1;min-width:0;';

  // Name + country code row
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;';

  const name = document.createElement('span');
  name.style.cssText = `color:${rColor};font-size:12px;font-weight:bold;font-family:Courier New,monospace;`;
  name.textContent = l.name;
  header.appendChild(name);

  const badge = document.createElement('span');
  badge.style.cssText = `font-size:9px;padding:1px 6px;border:1px solid ${rColor};color:${rColor};font-family:Courier New,monospace;`;
  badge.textContent = l.country_code;
  header.appendChild(badge);

  headerBlock.appendChild(header);

  // Title + country
  const titleLine = document.createElement('div');
  titleLine.style.cssText = 'color:#aaa;font-size:10px;font-family:Courier New,monospace;margin-bottom:2px;';
  titleLine.textContent = `${l.title} — ${l.country}`;
  headerBlock.appendChild(titleLine);

  // Meta: party, capital, assumed office
  const meta = document.createElement('div');
  meta.style.cssText = 'color:#666;font-size:9px;font-family:Courier New,monospace;';
  const parts = [];
  if (l.party) parts.push(l.party);
  if (l.capital) parts.push(l.capital);
  if (l.assumed_office) parts.push(`since ${l.assumed_office.slice(0, 4)}`);
  meta.textContent = parts.join(' · ');
  headerBlock.appendChild(meta);

  topRow.appendChild(headerBlock);
  card.appendChild(topRow);

  // Bio (collapsed by default)
  const bio = document.createElement('div');
  bio.style.cssText = 'color:#aaa;font-size:10px;font-family:Courier New,monospace;line-height:1.4;max-height:0;overflow:hidden;transition:max-height 0.3s ease;';
  bio.textContent = l.bio;
  card.appendChild(bio);

  // Click to expand/collapse
  let expanded = false;
  card.addEventListener('click', () => {
    expanded = !expanded;
    bio.style.maxHeight = expanded ? '300px' : '0';
  });

  return card;
}

// --- Layer creation ---

const layer = createAmbientLayer({
  layerKey: 'headsofstate',
  dataUrl: DATA_URL,
  panelId: 'headsofstate-panel',
  countId: 'headsofstate-count',
  logLabel: 'HEADS OF STATE',
  tabLabel: 'LEADERS',
  tabColor: '#ffcc44',
  renderFn: renderHeadsOfStatePanel,
  countFn: (data) => (data.located?.length || 0) + (data.unlocated?.length || 0),
});

registerLayerLoader('headsofstate', {
  load: layer.load,
  flyTo: null,
  reset: layer.reset,
  dataUrl: DATA_URL,
  layerType: 'ambient',
  show: layer.show,
  hide: layer.hide,
});
