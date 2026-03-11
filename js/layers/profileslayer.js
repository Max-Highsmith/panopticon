/* ===================================================================
   PANOPTICON — Person-of-Interest Profiles Layer
   Ambient sidebar panel showing fictional POI dossiers.
   Synthetic test data — all profiles are entirely fictional.
   =================================================================== */

import { createAmbientLayer } from './ambientlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const DATA_URL = 'data/layers/ambient/profiles.json';

// --- Threat level colors ---

const THREAT_COLORS = {
  CRITICAL: '#ff0000',
  HIGH:     '#ff4444',
  ELEVATED: '#ffaa00',
  MODERATE: '#ffcc44',
  LOW:      '#44cc88',
};

// --- Render ---

let searchQuery = '';
let activeFilter = 'ALL';

export function renderProfilesPanel(contentEl, data) {
  const located = data.located || [];
  const unlocated = data.unlocated || [];
  const all = [...located, ...unlocated];

  contentEl.innerHTML = '';

  // Search bar
  const search = document.createElement('input');
  search.className = 'profiles-search';
  search.type = 'text';
  search.placeholder = 'SEARCH PROFILES...';
  search.value = searchQuery;
  search.style.cssText = 'width:100%;padding:6px 8px;background:#111;color:#00ff41;border:1px solid #333;font-family:Courier New,monospace;font-size:11px;margin-bottom:6px;box-sizing:border-box;';
  search.addEventListener('input', () => {
    searchQuery = search.value;
    renderList(listEl, all);
  });
  contentEl.appendChild(search);

  // Threat level filters
  const filters = document.createElement('div');
  filters.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;';
  const levels = ['ALL', 'HIGH', 'ELEVATED', 'MODERATE', 'LOW'];
  for (const lvl of levels) {
    const pill = document.createElement('span');
    pill.textContent = lvl;
    pill.style.cssText = `padding:2px 8px;font-size:10px;font-family:Courier New,monospace;cursor:pointer;border:1px solid ${lvl === 'ALL' ? '#555' : (THREAT_COLORS[lvl] || '#555')};color:${activeFilter === lvl ? '#000' : (THREAT_COLORS[lvl] || '#aaa')};background:${activeFilter === lvl ? (THREAT_COLORS[lvl] || '#555') : 'transparent'};`;
    pill.addEventListener('click', () => {
      activeFilter = lvl;
      renderProfilesPanel(contentEl, data);
    });
    filters.appendChild(pill);
  }
  contentEl.appendChild(filters);

  // Profile list
  const listEl = document.createElement('div');
  contentEl.appendChild(listEl);

  renderList(listEl, all);
}

function renderList(listEl, profiles) {
  listEl.innerHTML = '';
  const q = searchQuery.toLowerCase();

  let filtered = profiles;
  if (activeFilter !== 'ALL') {
    filtered = filtered.filter(p => p.threat_level === activeFilter);
  }
  if (q) {
    filtered = filtered.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.nationality || '').toLowerCase().includes(q) ||
      (p.aliases || []).some(a => a.toLowerCase().includes(q)) ||
      (p.dossier || '').toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'color:#555;font-size:11px;padding:12px 0;text-align:center;';
    empty.textContent = 'NO PROFILES MATCH';
    listEl.appendChild(empty);
    return;
  }

  for (const p of filtered) {
    listEl.appendChild(makeProfileCard(p));
  }
}

function makeProfileCard(p) {
  const card = document.createElement('div');
  card.style.cssText = 'border:1px solid #333;padding:8px;margin-bottom:6px;background:#0a0a0a;cursor:pointer;';

  // Top row: photo + header block
  const topRow = document.createElement('div');
  topRow.style.cssText = 'display:flex;gap:8px;margin-bottom:4px;';

  // Profile image
  if (p.image) {
    const img = document.createElement('img');
    img.src = p.image;
    img.alt = p.name;
    img.style.cssText = 'width:48px;height:48px;object-fit:cover;border:1px solid #333;flex-shrink:0;';
    img.onerror = () => { img.style.display = 'none'; };
    topRow.appendChild(img);
  }

  // Right side: name + threat + meta
  const headerBlock = document.createElement('div');
  headerBlock.style.cssText = 'flex:1;min-width:0;';

  // Name + threat badge row
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;';

  const name = document.createElement('span');
  name.style.cssText = 'color:#ff6699;font-size:12px;font-weight:bold;font-family:Courier New,monospace;';
  name.textContent = p.name;
  header.appendChild(name);

  const badge = document.createElement('span');
  const tColor = THREAT_COLORS[p.threat_level] || '#aaa';
  badge.style.cssText = `font-size:9px;padding:1px 6px;border:1px solid ${tColor};color:${tColor};font-family:Courier New,monospace;`;
  badge.textContent = p.threat_level;
  header.appendChild(badge);

  headerBlock.appendChild(header);

  // Meta line (inside header block)
  const meta = document.createElement('div');
  meta.style.cssText = 'color:#888;font-size:10px;font-family:Courier New,monospace;';
  const locLabel = p.lat != null ? p.location_label : `LOC: ${p.location_label}`;
  meta.textContent = `${p.age}y | ${p.nationality} | ${locLabel} | ${p.status.toUpperCase()}`;
  headerBlock.appendChild(meta);

  topRow.appendChild(headerBlock);
  card.appendChild(topRow);

  // Aliases
  if (p.aliases && p.aliases.length) {
    const aliases = document.createElement('div');
    aliases.style.cssText = 'color:#666;font-size:9px;font-family:Courier New,monospace;margin-bottom:3px;';
    aliases.textContent = `AKA: ${p.aliases.join(', ')}`;
    card.appendChild(aliases);
  }

  // Dossier (collapsed by default, expands on click)
  const dossier = document.createElement('div');
  dossier.style.cssText = 'color:#aaa;font-size:10px;font-family:Courier New,monospace;line-height:1.4;max-height:0;overflow:hidden;transition:max-height 0.3s ease;';
  dossier.textContent = p.dossier;
  card.appendChild(dossier);

  // Associations
  if (p.associations && p.associations.length) {
    const assoc = document.createElement('div');
    assoc.style.cssText = 'color:#557;font-size:9px;font-family:Courier New,monospace;max-height:0;overflow:hidden;transition:max-height 0.3s ease;margin-top:4px;';
    assoc.textContent = `LINKED: ${p.associations.join(' | ')}`;
    card.appendChild(assoc);
  }

  // Click to expand/collapse
  let expanded = false;
  card.addEventListener('click', () => {
    expanded = !expanded;
    dossier.style.maxHeight = expanded ? '300px' : '0';
    const assocEl = card.querySelector('div:last-child');
    if (assocEl !== dossier) {
      assocEl.style.maxHeight = expanded ? '40px' : '0';
    }
  });

  return card;
}

// --- Layer creation ---

const layer = createAmbientLayer({
  layerKey: 'profiles',
  dataUrl: DATA_URL,
  panelId: 'profiles-panel',
  countId: 'profiles-count',
  logLabel: 'PROFILES',
  tabLabel: 'PROFILES',
  tabColor: '#ff6699',
  renderFn: renderProfilesPanel,
  countFn: (data) => (data.located?.length || 0) + (data.unlocated?.length || 0),
});

registerLayerLoader('profiles', {
  load: layer.load,
  flyTo: null,
  reset: layer.reset,
  dataUrl: DATA_URL,
  layerType: 'ambient',
  show: layer.show,
  hide: layer.hide,
});
