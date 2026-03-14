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
let _cachedData = null;

export function renderProfilesPanel(contentEl, data) {
  _cachedData = data;
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

/**
 * Show a full-panel dossier detail overlay for a person matching `name`.
 * Called from wargame.js after lookup_person tool calls.
 */
export function showProfileDetail(name) {
  if (!_cachedData) return;
  const all = [...(_cachedData.located || []), ...(_cachedData.unlocated || [])];
  const q = name.toLowerCase();
  const match = all.find(p =>
    (p.name || '').toLowerCase().includes(q) ||
    (p.aliases || []).some(a => a.toLowerCase().includes(q))
  );
  if (!match) return;

  // Remove any existing overlay
  const prev = document.getElementById('profile-detail-overlay');
  if (prev) prev.remove();

  const container = document.getElementById('ambient-container');
  if (!container) return;

  const overlay = document.createElement('div');
  overlay.id = 'profile-detail-overlay';
  overlay.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.96);z-index:200;padding:16px;overflow-y:auto;font-family:Courier New,monospace;display:flex;flex-direction:column;gap:10px;';

  // Close on click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // Header: DOSSIER label + close btn
  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
  const title = document.createElement('span');
  title.style.cssText = 'color:#ff6699;font-size:11px;letter-spacing:2px;';
  title.textContent = '\u2588 DOSSIER FILE';
  hdr.appendChild(title);
  const closeBtn = document.createElement('span');
  closeBtn.style.cssText = 'color:#555;font-size:16px;cursor:pointer;';
  closeBtn.textContent = '\u2715';
  closeBtn.addEventListener('click', () => overlay.remove());
  hdr.appendChild(closeBtn);
  overlay.appendChild(hdr);

  // Divider
  const hr = () => { const d = document.createElement('div'); d.style.cssText = 'border-top:1px solid #333;margin:2px 0;'; return d; };
  overlay.appendChild(hr());

  // Photo + identity row
  const idRow = document.createElement('div');
  idRow.style.cssText = 'display:flex;gap:12px;align-items:flex-start;';
  if (match.image) {
    const img = document.createElement('img');
    img.src = match.image;
    img.style.cssText = 'width:80px;height:80px;object-fit:cover;border:1px solid #ff6699;flex-shrink:0;';
    img.onerror = () => { img.style.display = 'none'; };
    idRow.appendChild(img);
  }
  const idBlock = document.createElement('div');
  idBlock.style.cssText = 'flex:1;';
  const tColor = THREAT_COLORS[match.threat_level] || '#aaa';
  idBlock.innerHTML = `
    <div style="color:#ff6699;font-size:16px;font-weight:bold;margin-bottom:4px;">${match.name}</div>
    <div style="display:inline-block;padding:2px 8px;border:1px solid ${tColor};color:${tColor};font-size:10px;margin-bottom:6px;">THREAT: ${match.threat_level}</div>
    <div style="color:#888;font-size:11px;line-height:1.6;">
      AGE: ${match.age} | ${match.nationality}<br>
      STATUS: <span style="color:${match.status === 'active' ? '#ff4444' : '#888'}">${(match.status || '').toUpperCase()}</span><br>
      LOC: ${match.location_label || 'UNKNOWN'}
    </div>
  `;
  idRow.appendChild(idBlock);
  overlay.appendChild(idRow);

  // Aliases
  if (match.aliases && match.aliases.length) {
    const aliases = document.createElement('div');
    aliases.style.cssText = 'color:#996;font-size:10px;';
    aliases.textContent = 'AKA: ' + match.aliases.join(' \u2502 ');
    overlay.appendChild(aliases);
  }

  overlay.appendChild(hr());

  // Dossier text
  const dossierLabel = document.createElement('div');
  dossierLabel.style.cssText = 'color:#ff6699;font-size:10px;letter-spacing:1px;';
  dossierLabel.textContent = 'INTEL SUMMARY';
  overlay.appendChild(dossierLabel);
  const dossierText = document.createElement('div');
  dossierText.style.cssText = 'color:#ccc;font-size:11px;line-height:1.6;white-space:pre-wrap;';
  dossierText.textContent = match.dossier || 'No intelligence on file.';
  overlay.appendChild(dossierText);

  // Associations
  if (match.associations && match.associations.length) {
    overlay.appendChild(hr());
    const assocLabel = document.createElement('div');
    assocLabel.style.cssText = 'color:#ff6699;font-size:10px;letter-spacing:1px;';
    assocLabel.textContent = 'KNOWN ASSOCIATIONS';
    overlay.appendChild(assocLabel);
    const assocList = document.createElement('div');
    assocList.style.cssText = 'color:#88aacc;font-size:11px;line-height:1.6;';
    assocList.textContent = match.associations.join(' \u2502 ');
    overlay.appendChild(assocList);
  }

  // Coordinates if located
  if (match.lat != null && match.lon != null) {
    const coords = document.createElement('div');
    coords.style.cssText = 'color:#555;font-size:9px;margin-top:6px;';
    coords.textContent = `\u25C7 ${match.lat.toFixed(4)}, ${match.lon.toFixed(4)}`;
    overlay.appendChild(coords);
  }

  container.appendChild(overlay);

  // Auto-dismiss after 12 seconds
  setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 12000);
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
