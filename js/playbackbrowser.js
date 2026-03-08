/* ===================================================================
   PANOPTICON — Playback Browser Sidebar
   Lists available playbacks (curated events + wargame results)
   and handles selection.
   =================================================================== */

import { $ } from './utils.js';
import { listResults, getResult } from './results.js';

let manifests = [];      // all loaded manifests
let selectCallback = null; // (manifest) => void

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Initialize the playback browser.
 * @param {Object} opts
 * @param {Function} opts.onSelect - called with (manifest) when user picks a playback
 */
export function initPlaybackBrowser({ onSelect }) {
  selectCallback = onSelect;
}

/**
 * Load and display all available playbacks.
 * Fetches curated manifests from playbacks/ and wargame results from IndexedDB.
 */
export async function loadPlaybackList() {
  manifests = [];

  // 1. Load curated playback manifests (try server index first, then static list)
  try {
    const res = await fetch('playbacks/index.json');
    if (res.ok) {
      const index = await res.json();
      const loaded = await Promise.all(
        index.map(async (entry) => {
          try {
            const r = await fetch(`playbacks/${entry.file || entry.id + '.json'}`);
            return r.ok ? await r.json() : null;
          } catch { return null; }
        })
      );
      manifests.push(...loaded.filter(Boolean));
    }
  } catch {
    // If no index.json, try loading known manifests directly
    const knownIds = ['iran-feb28', 'venezuela-jan03', 'jalisco-feb22'];
    const loaded = await Promise.all(
      knownIds.map(async (id) => {
        try {
          const r = await fetch(`playbacks/${id}.json`);
          return r.ok ? await r.json() : null;
        } catch { return null; }
      })
    );
    manifests.push(...loaded.filter(Boolean));
  }

  // 2. Load wargame playbacks from server API (if available)
  try {
    const res = await fetch('/api/playbacks');
    if (res.ok) {
      const serverManifests = await res.json();
      // Only add wargame manifests that aren't already in the list
      const existingIds = new Set(manifests.map(m => m.id));
      for (const m of serverManifests) {
        if (!existingIds.has(m.id)) {
          manifests.push(m);
        }
      }
    }
  } catch { /* server not available */ }

  // 3. Load wargame results from IndexedDB
  try {
    const results = await listResults();
    for (const run of results) {
      if (!run.summary) continue;
      const s = run.summary;
      const manifest = {
        id: `wg-${run.runId}`,
        type: 'wargame',
        label: (s.scenario || 'WARGAME').replace(/-/g, ' ').toUpperCase(),
        subtitle: `WARGAME PLAYBACK // ${(s.scenario || '').replace(/-/g, ' ').toUpperCase()}`,
        description: `${s.provider?.toUpperCase() || '?'} // ${s.variant?.replace(/_/g, ' ').toUpperCase() || '?'} // ${s.framing?.toUpperCase() || '?'}`,
        category: 'wargame',
        date: new Date(run.timestamp).toISOString().slice(0, 10),
        camera: s.camera || null,
        region: s.region || null,
        timeline: {
          domain: 'ticks',
          totalTicks: s.totalDecisions || 8,
          tickIntervalMs: 6000,
        },
        data: {
          scenarioId: s.scenario,
          runId: run.runId,
          variant: s.variant,
          framing: s.framing,
          resultsSource: 'indexeddb',
        },
        display: { layers: s.layers || [] },
        summary: {
          provider: s.provider,
          model: s.model,
          criticalActionTaken: s.criticalActionTaken,
          criticalAction: s.criticalAction,
          binaryQuestion: s.binaryQuestion,
          totalDecisions: s.totalDecisions,
        },
        tags: ['wargame', s.provider, s.scenario].filter(Boolean),
      };
      manifests.push(manifest);
    }
  } catch { /* IndexedDB may not be available */ }

  renderSidebar();
  return manifests;
}

/**
 * Select a playback by id.
 */
export function selectPlaybackById(id) {
  const manifest = manifests.find(m => m.id === id);
  if (manifest && selectCallback) {
    // Update active state in sidebar
    document.querySelectorAll('.playback-card').forEach(c => c.classList.remove('active'));
    const card = document.querySelector(`.playback-card[data-id="${id}"]`);
    if (card) card.classList.add('active');

    selectCallback(manifest);
  }
}

/**
 * Get all loaded manifests.
 */
export function getManifests() {
  return manifests;
}

// =====================================================
// RENDERING
// =====================================================

function renderSidebar() {
  const container = $('playback-list');
  if (!container) return;
  container.innerHTML = '';

  // Group by category
  const curated = manifests.filter(m => m.type !== 'wargame');
  const wargames = manifests.filter(m => m.type === 'wargame');

  if (curated.length > 0) {
    const section = createSection('CURATED EVENTS', curated);
    container.appendChild(section);
  }

  if (wargames.length > 0) {
    const section = createSection('WARGAME RESULTS', wargames);
    container.appendChild(section);
  }

  if (manifests.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'pb-empty';
    empty.textContent = 'No playbacks available.';
    container.appendChild(empty);
  }
}

function createSection(title, items) {
  const section = document.createElement('div');
  section.className = 'pb-category';

  const header = document.createElement('div');
  header.className = 'pb-category-header';
  header.textContent = title;
  section.appendChild(header);

  for (const m of items) {
    const card = document.createElement('div');
    card.className = 'playback-card';
    card.dataset.id = m.id;
    card.onclick = () => selectPlaybackById(m.id);

    const titleEl = document.createElement('div');
    titleEl.className = 'pb-title';
    titleEl.textContent = m.label;
    card.appendChild(titleEl);

    const typeEl = document.createElement('div');
    typeEl.className = 'pb-type';
    typeEl.textContent = m.type === 'wargame' ? m.description : m.subtitle;
    card.appendChild(typeEl);

    if (m.type === 'wargame' && m.summary) {
      const badgeRow = document.createElement('div');
      badgeRow.className = 'pb-badge-row';

      const badge = document.createElement('span');
      badge.className = m.summary.criticalActionTaken ? 'pb-badge critical' : 'pb-badge safe';
      badge.textContent = m.summary.criticalActionTaken ? 'CRITICAL ACTION' : 'HELD';
      badgeRow.appendChild(badge);

      const dlBtn = document.createElement('button');
      dlBtn.className = 'pb-download-btn';
      dlBtn.textContent = 'DOWNLOAD';
      dlBtn.onclick = (e) => { e.stopPropagation(); downloadRun(m); };
      badgeRow.appendChild(dlBtn);

      card.appendChild(badgeRow);
    } else {
      const badge = document.createElement('span');
      badge.className = 'pb-badge ready';
      badge.textContent = 'DATA READY';
      card.appendChild(badge);
    }

    // Layer tags
    const layerList = (m.display && m.display.layers) || [];
    if (layerList.length > 0) {
      const layersRow = document.createElement('div');
      layersRow.className = 'pb-layers';
      for (const key of layerList) {
        const tag = document.createElement('span');
        tag.className = 'pb-layer-tag';
        tag.textContent = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toUpperCase();
        layersRow.appendChild(tag);
      }
      card.appendChild(layersRow);
    }

    section.appendChild(card);
  }

  return section;
}

// =====================================================
// DOWNLOAD
// =====================================================
async function downloadRun(manifest) {
  const runId = manifest.data?.runId;
  if (!runId) return;
  try {
    const result = await getResult(runId);
    if (!result) return;
    const payload = {
      _format: 'panopticon-wargame-result',
      _version: 1,
      runId: result.runId,
      timestamp: result.timestamp,
      summary: result.summary,
      decisions: result.decisions || [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wargame-${result.summary?.scenario || 'result'}-${runId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Download failed:', err);
  }
}

// =====================================================
// SEARCH (future)
// =====================================================
export function filterPlaybacks(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('.playback-card').forEach(card => {
    if (!q) { card.style.display = ''; return; }
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(q) ? '' : 'none';
  });
}
