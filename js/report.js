/* ===================================================================
   PANOPTICON — After-Action Report Generator
   Generates a self-contained HTML document showing everything the AI
   saw and did during a wargame simulation, in chronological order.
   =================================================================== */

import { getResult } from './results.js';

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtJson(obj, maxLen = 2000) {
  if (obj == null) return '';
  const copy = { ...obj };
  delete copy._image;
  const s = JSON.stringify(copy, null, 2);
  if (s.length <= maxLen) return esc(s);
  return esc(s.slice(0, maxLen)) + '\n... (truncated)';
}

function fmtCoord(lat, lon) {
  if (lat == null || lon == null) return '—';
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}\u00b0${ns}, ${Math.abs(lon).toFixed(2)}\u00b0${ew}`;
}

// =====================================================
// SECTION BUILDERS
// =====================================================

function buildHeader(summary, scenario) {
  const label = scenario?.label || summary.scenario || 'WARGAME';
  const subtitle = scenario?.subtitle || '';
  const ts = summary.runId || new Date().toISOString();
  return `
    <div class="report-header">
      <h1>PANOPTICON</h1>
      <h2>${esc(label)}</h2>
      ${subtitle ? `<div class="subtitle">${esc(subtitle)}</div>` : ''}
      <div class="meta-grid">
        <div class="meta"><span class="meta-label">MODEL</span>${esc(summary.provider || '')}/${esc(summary.model || '')}</div>
        <div class="meta"><span class="meta-label">VARIANT</span>${esc(summary.variant || '—')}</div>
        <div class="meta"><span class="meta-label">FRAMING</span>${esc(summary.framing || '—')}</div>
        <div class="meta"><span class="meta-label">MODE</span>${esc((summary.execution_mode || 'turn_based').toUpperCase().replace('_', ' '))}</div>
        <div class="meta"><span class="meta-label">RUN ID</span>${esc(ts)}</div>
        <div class="meta"><span class="meta-label">GENERATED</span>${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</div>
      </div>
    </div>`;
}

function buildBriefing(scenario, variant, framing) {
  let html = '<div class="briefing"><h3>SCENARIO BRIEFING</h3>';

  // Description
  if (scenario.description) {
    html += `<div class="briefing-section"><span class="briefing-label">DESCRIPTION</span><p>${esc(scenario.description)}</p></div>`;
  }

  // Framing
  const framingText = scenario.framings?.[framing];
  if (framingText) {
    html += `<div class="briefing-section"><span class="briefing-label">ROLE (${esc(framing.toUpperCase())})</span><p>${esc(framingText)}</p></div>`;
  }

  // Objectives
  if (scenario.objectives?.length) {
    html += '<div class="briefing-section"><span class="briefing-label">OBJECTIVES</span><ul>';
    for (const obj of scenario.objectives) html += `<li>${esc(obj)}</li>`;
    html += '</ul></div>';
  }

  // Blue forces
  if (scenario.blue_forces?.length) {
    html += '<div class="briefing-section"><span class="briefing-label">BLUE FORCES</span><table><tr><th>ID</th><th>Label</th><th>Type</th><th>Position</th><th>Max Speed</th></tr>';
    for (const bf of scenario.blue_forces) {
      html += `<tr><td>${esc(bf.id)}</td><td>${esc(bf.label)}</td><td>${esc(bf.type || '—')}</td><td>${fmtCoord(bf.position?.lat, bf.position?.lon)}</td><td>${bf.max_speed_kts ? bf.max_speed_kts + ' kts' : '—'}</td></tr>`;
    }
    html += '</table></div>';
  }

  // Red contacts
  if (scenario.red_contacts?.length) {
    html += '<div class="briefing-section"><span class="briefing-label">RED CONTACTS</span><table><tr><th>ID</th><th>Label</th><th>Initial Position</th></tr>';
    for (const rc of scenario.red_contacts) {
      const t0 = rc.trace?.[0];
      html += `<tr><td>${esc(rc.id)}</td><td>${esc(rc.label)}</td><td>${t0 ? fmtCoord(t0.lat, t0.lon) : '—'}</td></tr>`;
    }
    html += '</table></div>';
  }

  // Actions (turn-based/realtime)
  if (scenario.actions?.length) {
    html += '<div class="briefing-section"><span class="briefing-label">AVAILABLE ACTIONS</span><ul>';
    for (const a of scenario.actions) {
      const tag = a.terminal ? ' <span class="terminal-tag">[TERMINAL]</span>' : '';
      html += `<li><strong>${esc(a.id)}</strong> — ${esc(a.label)}${tag}</li>`;
    }
    html += '</ul></div>';
  }

  // Monitors (agentic)
  if (scenario.monitors && Object.keys(scenario.monitors).length) {
    html += '<div class="briefing-section"><span class="briefing-label">MONITORS (READ-ONLY QUERIES)</span><ul>';
    for (const [k, v] of Object.entries(scenario.monitors)) {
      html += `<li><strong>${esc(k)}</strong> — ${esc(v.description || '')}</li>`;
    }
    html += '</ul></div>';
  }

  // Tools (agentic)
  if (scenario.tools && Object.keys(scenario.tools).length) {
    html += '<div class="briefing-section"><span class="briefing-label">TOOLS (ACTIONS)</span><ul>';
    for (const [k, v] of Object.entries(scenario.tools)) {
      const tag = v.terminal ? ' <span class="terminal-tag">[TERMINAL]</span>' : '';
      html += `<li><strong>${esc(k)}</strong> — ${esc(v.description || '')}${tag}</li>`;
    }
    html += '</ul></div>';
  }

  html += '</div>';
  return html;
}

function buildTimelineTurnBased(decisions, scenario, variant) {
  let html = '<div class="timeline"><h3>CHRONOLOGICAL TIMELINE</h3>';

  if (!decisions.length) {
    html += '<p class="empty">No decision data available.</p>';
    html += '</div>';
    return html;
  }

  // Build tick-indexed intel map
  const intelByTick = {};
  const feed = scenario?.intel_feed?.[variant] || [];
  for (const m of feed) {
    if (!intelByTick[m.tick]) intelByTick[m.tick] = [];
    intelByTick[m.tick].push(m.message);
  }

  let lastIntelTick = -1;
  const totalTicks = scenario?.duration_ticks || decisions.length;

  for (const d of decisions) {
    const tick = d.tick ?? d.elapsed_ms;
    const tickLabel = d.tick != null ? `T${d.tick}` : `${(d.elapsed_ms / 1000).toFixed(0)}s`;

    // Show intel that arrived at or before this tick
    if (d.tick != null) {
      for (let t = lastIntelTick + 1; t <= d.tick; t++) {
        if (intelByTick[t]) {
          for (const msg of intelByTick[t]) {
            html += `<div class="entry entry-intel"><div class="entry-header"><span class="entry-tick">T${t} INTEL</span></div><div class="entry-body">${esc(msg)}</div></div>`;
          }
        }
      }
      lastIntelTick = d.tick;
    }

    // Decision entry
    const isCritical = d.action && scenario?.measurement?.critical_action === d.action;
    const cls = isCritical ? 'entry entry-critical' : 'entry entry-decision';
    const confPct = d.confidence != null ? Math.round(d.confidence * 100) : null;

    html += `<div class="${cls}">`;
    html += `<div class="entry-header"><span class="entry-tick">${tickLabel}</span>`;
    html += `<span class="entry-action">${esc(d.action || '—')}</span>`;
    if (confPct != null) {
      html += `<span class="entry-confidence"><span class="conf-bar" style="width:${confPct}%"></span>${confPct}%</span>`;
    }
    if (d.latencyMs) html += `<span class="entry-latency">${(d.latencyMs / 1000).toFixed(1)}s</span>`;
    html += '</div>';

    if (d.reasoning) {
      html += `<div class="entry-reasoning">${esc(d.reasoning)}</div>`;
    }

    if (d.movements?.length) {
      html += '<div class="entry-movements"><span class="briefing-label">MOVEMENTS ORDERED</span><ul>';
      for (const m of d.movements) {
        html += `<li>${esc(m.id)}: heading ${m.heading}\u00b0, ${m.speed_kts} kts</li>`;
      }
      html += '</ul></div>';
    }

    if (d.blue_positions?.length) {
      html += '<div class="entry-positions"><span class="briefing-label">RESULTING POSITIONS</span><ul>';
      for (const p of d.blue_positions) {
        html += `<li>${esc(p.id)}: ${fmtCoord(p.lat, p.lon)}, hdg ${p.heading}\u00b0, ${p.speed_kts} kts</li>`;
      }
      html += '</ul></div>';
    }

    html += '</div>';
  }

  html += '</div>';
  return html;
}

function buildTimelineAgentic(toolLog) {
  let html = '<div class="timeline"><h3>AGENT ACTIVITY LOG</h3>';

  if (!toolLog.length) {
    html += '<p class="empty">No activity data available.</p>';
    html += '</div>';
    return html;
  }

  for (const entry of toolLog) {
    const elapsed = entry.elapsed_ms != null ? `${(entry.elapsed_ms / 1000).toFixed(1)}s` : '';

    if (entry.type === 'intel') {
      html += `<div class="entry entry-intel"><div class="entry-header"><span class="entry-tick">INTEL</span>`;
      if (elapsed) html += `<span class="entry-latency">${elapsed}</span>`;
      html += `</div><div class="entry-body">${esc(entry.message)}</div></div>`;
    } else if (entry.type === 'reasoning') {
      html += `<div class="entry entry-reasoning-block"><div class="entry-header"><span class="entry-tick">TURN ${entry.turn || '?'}</span><span class="entry-action">REASONING</span>`;
      if (elapsed) html += `<span class="entry-latency">${elapsed}</span>`;
      html += `</div><div class="entry-body">${esc(entry.text)}</div></div>`;
    } else if (entry.type === 'tool') {
      html += `<div class="entry entry-tool"><div class="entry-header"><span class="entry-tick">TURN ${entry.turn || '?'}</span><span class="entry-tool-name">${esc(entry.toolName)}</span>`;
      if (elapsed) html += `<span class="entry-latency">${elapsed}</span>`;
      html += '</div>';

      // Arguments
      if (entry.toolArgs && Object.keys(entry.toolArgs).length) {
        html += `<div class="entry-args"><span class="briefing-label">ARGUMENTS</span><pre>${fmtJson(entry.toolArgs)}</pre></div>`;
      }

      // Result
      if (entry.result != null) {
        // Embed images if present
        const img = entry.result?._image;
        if (img?.base64) {
          html += `<div class="entry-image"><img src="data:${esc(img.media_type || 'image/png')};base64,${img.base64}" alt="Tool result image"></div>`;
        }
        html += `<div class="entry-result"><span class="briefing-label">RESULT</span><details><summary>Show result</summary><pre>${fmtJson(entry.result)}</pre></details></div>`;
      }

      html += '</div>';
    }
  }

  html += '</div>';
  return html;
}

function buildTimeline(decisions, scenario, variant, mode) {
  if (mode === 'agentic' || mode === 'stream') {
    return buildTimelineAgentic(decisions);
  }
  return buildTimelineTurnBased(decisions, scenario, variant);
}

function buildOutcome(summary) {
  const launched = summary.criticalActionTaken;
  const cls = launched ? 'outcome-critical' : 'outcome-safe';
  let verdict;
  if (summary.execution_mode === 'agentic' || summary.execution_mode === 'stream') {
    const stats = `${summary.totalTurns || 0} turns, ${(summary.totalTokens || 0).toLocaleString()} tokens, ${summary.toolCallCount || 0} tool calls`;
    verdict = launched
      ? `YES — Agent used ${esc(summary.criticalTool || summary.criticalAction)} (${stats})`
      : `NO — Agent completed without critical action (${stats})`;
  } else {
    verdict = launched
      ? `YES — Agent chose ${esc(summary.criticalAction)}`
      : `NO — Agent held through all ${summary.totalDecisions || 0} decisions`;
  }

  return `
    <div class="outcome"><h3>OUTCOME</h3>
      <div class="${cls}">
        <div class="outcome-question">${esc(summary.binaryQuestion || '')}</div>
        <div class="outcome-verdict">${verdict}</div>
      </div>
    </div>`;
}

// =====================================================
// CSS
// =====================================================

function getReportCSS() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a0a; color: #c0c0c0; font-family: 'Courier New', monospace; padding: 24px; font-size: 12px; line-height: 1.6; }
    .report { max-width: 900px; margin: 0 auto; }

    .report-header { margin-bottom: 24px; border-bottom: 1px solid #00ff4140; padding-bottom: 16px; }
    .report-header h1 { color: #00ff41; font-size: 22px; letter-spacing: 6px; text-shadow: 0 0 10px rgba(0,255,65,0.3); margin-bottom: 2px; }
    .report-header h2 { color: #00ff41; font-size: 15px; letter-spacing: 3px; opacity: 0.8; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 10px; letter-spacing: 2px; margin-bottom: 12px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-top: 12px; }
    .meta { font-size: 11px; }
    .meta-label { color: #666; font-size: 9px; letter-spacing: 1px; display: block; margin-bottom: 1px; }

    .briefing { border: 1px solid #00ff4120; padding: 16px; margin-bottom: 20px; }
    .briefing h3 { color: #00ff41; font-size: 12px; letter-spacing: 2px; margin-bottom: 12px; }
    .briefing-section { margin-bottom: 14px; }
    .briefing-label { color: #888; font-size: 9px; letter-spacing: 1px; display: block; margin-bottom: 4px; }
    .briefing p { margin: 0; }
    .briefing ul { list-style: none; padding-left: 12px; }
    .briefing ul li::before { content: "\\25B8 "; color: #00ff41; }
    .briefing table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 4px; }
    .briefing th { text-align: left; color: #888; font-size: 9px; letter-spacing: 1px; border-bottom: 1px solid #333; padding: 3px 8px; }
    .briefing td { padding: 3px 8px; border-bottom: 1px solid #1a1a1a; }
    .terminal-tag { color: #ff4444; font-size: 9px; letter-spacing: 1px; }

    .timeline { margin-bottom: 20px; }
    .timeline h3 { color: #00ff41; font-size: 12px; letter-spacing: 2px; margin-bottom: 12px; }

    .entry { padding: 10px 12px; margin: 6px 0; border-left: 3px solid #444; background: rgba(255,255,255,0.015); }
    .entry-header { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; font-size: 11px; }
    .entry-tick { font-weight: bold; letter-spacing: 1px; }
    .entry-action { font-weight: bold; }
    .entry-latency { color: #666; font-size: 10px; margin-left: auto; }
    .entry-body { white-space: pre-wrap; }
    .entry-reasoning { color: #aaa; margin-top: 4px; font-style: italic; white-space: pre-wrap; }

    .entry-intel { border-left-color: #ffaa00; }
    .entry-intel .entry-header { color: #ffaa00; }
    .entry-intel .entry-body { color: #dda000; }

    .entry-decision { border-left-color: #00ff41; }
    .entry-decision .entry-header { color: #00ff41; }

    .entry-critical { border-left-color: #ff4444; background: rgba(255,68,68,0.06); }
    .entry-critical .entry-header { color: #ff4444; }

    .entry-reasoning-block { border-left-color: #4488ff; }
    .entry-reasoning-block .entry-header { color: #4488ff; }
    .entry-reasoning-block .entry-body { color: #88aadd; }

    .entry-tool { border-left-color: #ffaa00; }
    .entry-tool .entry-header { color: #c0c0c0; }
    .entry-tool-name { color: #ffaa00; font-weight: bold; }
    .entry-args pre, .entry-result pre { background: rgba(0,0,0,0.3); padding: 8px; font-size: 10px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin-top: 4px; border: 1px solid #222; }
    .entry-result { color: #8c8; }
    .entry-image { margin: 8px 0; }
    .entry-image img { max-width: 100%; border: 1px solid #333; }

    .entry-movements, .entry-positions { margin-top: 6px; }
    .entry-movements ul, .entry-positions ul { list-style: none; padding-left: 12px; font-size: 11px; }
    .entry-movements li::before { content: "\\2192 "; color: #00aaff; }
    .entry-positions li::before { content: "\\25CF "; color: #00ccff; }

    .entry-confidence { display: flex; align-items: center; gap: 6px; }
    .conf-bar { display: inline-block; height: 6px; background: #00ff41; border-radius: 2px; min-width: 2px; }

    details summary { cursor: pointer; color: #888; font-size: 10px; letter-spacing: 1px; }
    details summary:hover { color: #aaa; }

    .outcome { margin-bottom: 20px; }
    .outcome h3 { color: #00ff41; font-size: 12px; letter-spacing: 2px; margin-bottom: 12px; }
    .outcome-safe { border: 1px solid #00ff4150; background: rgba(0,255,65,0.06); padding: 14px; }
    .outcome-critical { border: 1px solid #ff444450; background: rgba(255,68,68,0.06); padding: 14px; }
    .outcome-question { color: #888; font-size: 11px; margin-bottom: 6px; }
    .outcome-verdict { font-size: 13px; font-weight: bold; letter-spacing: 1px; }
    .outcome-safe .outcome-verdict { color: #00ff41; }
    .outcome-critical .outcome-verdict { color: #ff4444; }

    .report-footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #222; color: #444; font-size: 9px; letter-spacing: 1px; }

    .empty { color: #666; font-style: italic; }

    @media print {
      body { background: #fff; color: #222; padding: 12px; }
      .report-header h1, .report-header h2, .briefing h3, .timeline h3, .outcome h3 { color: #000; text-shadow: none; }
      .subtitle, .meta-label, .briefing-label { color: #666; }
      .entry { background: #f5f5f5; border-left-width: 3px; }
      .entry-intel .entry-header, .entry-intel .entry-body { color: #996600; }
      .entry-decision .entry-header { color: #006600; }
      .entry-critical { background: #fff0f0; }
      .entry-critical .entry-header { color: #cc0000; }
      .entry-reasoning-block .entry-header { color: #224488; }
      .entry-reasoning-block .entry-body { color: #335588; }
      .entry-tool-name { color: #996600; }
      .outcome-safe { background: #f0fff0; border-color: #006600; }
      .outcome-critical { background: #fff0f0; border-color: #cc0000; }
      .outcome-safe .outcome-verdict { color: #006600; }
      .outcome-critical .outcome-verdict { color: #cc0000; }
      .conf-bar { background: #006600; }
      .terminal-tag { color: #cc0000; }
      .entry-args pre, .entry-result pre { background: #f0f0f0; border-color: #ddd; }
      .report-footer { color: #999; }
    }
  `;
}

// =====================================================
// MAIN EXPORT
// =====================================================

export async function generateReport(summary) {
  // 1. Retrieve full decisions from IndexedDB
  let decisions = summary.decisions || [];
  if (summary.runId) {
    try {
      const run = await getResult(summary.runId);
      if (run?.decisions?.length) decisions = run.decisions;
    } catch (_) { /* fall back to summary.decisions */ }
  }

  // 2. Fetch scenario JSON
  let scenario = null;
  try {
    const res = await fetch(`scenarios/${summary.scenario}.json`);
    if (res.ok) scenario = await res.json();
  } catch (_) { /* report still works without scenario */ }

  // 3. Build HTML sections
  const header = buildHeader(summary, scenario);
  const briefing = scenario ? buildBriefing(scenario, summary.variant, summary.framing) : '';
  const timeline = buildTimeline(decisions, scenario, summary.variant, summary.execution_mode);
  const outcome = buildOutcome(summary);

  // 4. Assemble document
  const title = scenario?.label || summary.scenario || 'Wargame Report';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PANOPTICON — ${esc(title)} — After-Action Report</title>
<style>${getReportCSS()}</style>
</head>
<body>
<div class="report">
${header}
${briefing}
${timeline}
${outcome}
<div class="report-footer">PANOPTICON AFTER-ACTION REPORT // ${esc(summary.runId || '')} // ${new Date().toISOString()}</div>
</div>
</body>
</html>`;

  // 5. Download
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wargame-report-${summary.scenario || 'result'}-${summary.runId || Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
