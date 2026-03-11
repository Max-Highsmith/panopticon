/* ===================================================================
   PANOPTICON — Wargame Playback Adapter
   Renders completed wargame results on the timeline.
   Loads scenario JSON (entity traces) + results (decisions) and
   replays them with a scrubable timeline.
   =================================================================== */

import { interpolateContact, applyVariables } from '../simulation.mjs';
import { getResult } from '../results.js';

/**
 * Interpolate a blue force's position from its trace snapshots.
 * Uses linear interpolation between the two bracketing snapshots.
 * Heading interpolation uses shortest arc.
 */
function interpolateBlueForce(trace, tick) {
  if (!trace || trace.length === 0) return null;
  if (trace.length === 1) return { ...trace[0] };

  for (let i = 0; i < trace.length - 1; i++) {
    const t0 = trace[i], t1 = trace[i + 1];
    if (tick >= t0.tick && tick <= t1.tick) {
      const span = t1.tick - t0.tick;
      const frac = span > 0 ? (tick - t0.tick) / span : 0;
      // Shortest-arc heading interpolation
      let dH = t1.heading - t0.heading;
      if (dH > 180) dH -= 360;
      if (dH < -180) dH += 360;
      return {
        lat: t0.lat + (t1.lat - t0.lat) * frac,
        lon: t0.lon + (t1.lon - t0.lon) * frac,
        heading: ((t0.heading + dH * frac) % 360 + 360) % 360,
        speed_kts: t0.speed_kts + (t1.speed_kts - t0.speed_kts) * frac,
      };
    }
  }
  // Past the last snapshot — hold final position
  const last = trace[trace.length - 1];
  return { lat: last.lat, lon: last.lon, heading: last.heading, speed_kts: last.speed_kts };
}

const wargameAdapter = {
  /**
   * Load scenario + results data.
   * manifest.data must contain either:
   *   - { scenarioId, runId, variant, framing, resultsSource: 'indexeddb' }
   *   - { scenarioFile, resultsFile, variant, framing, resultsSource: 'file' }
   */
  async load(manifest) {
    const d = manifest.data;
    let scenario, decisions;

    // Load scenario
    if (d.scenarioFile) {
      const res = await fetch(d.scenarioFile);
      scenario = await res.json();
    } else if (d.scenarioId) {
      const res = await fetch(`scenarios/${d.scenarioId}.json`);
      scenario = await res.json();
    } else {
      throw new Error('Wargame manifest missing scenarioFile or scenarioId');
    }

    // Load results
    let isAgentic = false;
    let agenticLog = [];
    if (d.resultsSource === 'indexeddb') {
      const run = await getResult(d.runId);
      if (!run) throw new Error(`Run ${d.runId} not found in IndexedDB`);
      decisions = run.decisions || [];
      // Detect agentic: if items have type field (reasoning/tool/intel) or toolName
      if (decisions.length > 0 && (decisions[0].type === 'tool' || decisions[0].type === 'reasoning' || decisions[0].type === 'intel' || decisions[0].toolName)) {
        isAgentic = true;
        agenticLog = decisions;
        decisions = [];
      }
    } else if (d.resultsFile) {
      const res = await fetch(d.resultsFile);
      const text = await res.text();
      const lines = text.trim().split('\n').map(l => JSON.parse(l));
      // Detect agentic by presence of type field in entries
      const agenticEntries = lines.filter(l => l.type === 'reasoning' || l.type === 'tool' || l.type === 'intel');
      if (agenticEntries.length > 0) {
        isAgentic = true;
        agenticLog = lines.filter(l => l.type && l.type !== 'summary');
        decisions = [];
      } else {
        decisions = lines.filter(l => l.tick !== undefined || l.elapsed_ms !== undefined);
      }
    } else {
      decisions = [];
    }

    // Build intel messages for the variant
    const variant = d.variant || Object.keys(scenario.intel_feed || {})[0] || 'default';
    const vars = scenario.variables || {};
    const intelFeed = (scenario.intel_feed?.[variant] || []).map(m => ({
      tick: m.tick,
      message: applyVariables(m.message, vars),
    }));

    // Build blue force traces from decision snapshots (navigation scenarios)
    let blueTraces = null;
    if (scenario.navigation) {
      blueTraces = new Map();
      // Seed with initial positions at tick 0
      for (const bf of (scenario.blue_forces || [])) {
        blueTraces.set(bf.id, [{
          tick: 0,
          lat: bf.position.lat,
          lon: bf.position.lon,
          heading: bf.heading || 0,
          speed_kts: bf.speed_kts || 0,
        }]);
      }
      // Add positions from each decision's blue_positions snapshot
      for (const dec of decisions) {
        if (!dec.blue_positions) continue;
        const tick = dec.tick !== undefined ? dec.tick : 0;
        for (const bp of dec.blue_positions) {
          if (!blueTraces.has(bp.id)) continue;
          blueTraces.get(bp.id).push({
            tick,
            lat: bp.lat,
            lon: bp.lon,
            heading: bp.heading || 0,
            speed_kts: bp.speed_kts || 0,
          });
        }
      }
    }

    return { scenario, decisions, variant, intelFeed, vars, blueTraces, isAgentic, agenticLog };
  },

  /** Total duration in seconds */
  getDurationSeconds(ctx, manifest) {
    const tl = manifest.timeline;
    if (tl.durationSeconds) return tl.durationSeconds;
    // Agentic: use wallclock domain from log
    if (ctx.isAgentic && ctx.agenticLog.length > 0) {
      const maxMs = ctx.agenticLog.reduce((max, e) => Math.max(max, e.elapsed_ms || 0), 0);
      return Math.max(maxMs / 1000, 10); // minimum 10s for scrubbing
    }
    const totalTicks = tl.totalTicks || ctx.scenario.duration_ticks || 8;
    const tickMs = tl.tickIntervalMs || ctx.scenario.tick_interval_ms || 6000;
    return (totalTicks * tickMs) / 1000;
  },

  /**
   * Render a frame at the given time offset.
   * Maps progress → tick, interpolates entity positions, returns frame info.
   */
  renderFrame(ctx, manifest, viewer, entityMap, progress, timeSeconds) {
    const { scenario, blueTraces } = ctx;
    const totalTicks = manifest.timeline.totalTicks || scenario.duration_ticks || 8;
    const currentTick = progress * totalTicks;

    // Blue forces
    for (const bf of (scenario.blue_forces || [])) {
      // Determine position: interpolate from traces if nav, else static
      let posLon = bf.position.lon, posLat = bf.position.lat;
      if (blueTraces && blueTraces.has(bf.id)) {
        const interp = interpolateBlueForce(blueTraces.get(bf.id), currentTick);
        if (interp) {
          posLat = interp.lat;
          posLon = interp.lon;
        }
      }
      const cartPos = Cesium.Cartesian3.fromDegrees(posLon, posLat, 5000);

      if (entityMap.has(bf.id)) {
        // Update position (needed for navigation scenarios)
        entityMap.get(bf.id).entity.position = cartPos;
      } else {
        const entity = viewer.entities.add({
          position: cartPos,
          point: {
            pixelSize: 10,
            color: Cesium.Color.fromCssColorString(bf.color || '#00aaff'),
            outlineColor: Cesium.Color.WHITE, outlineWidth: 1,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: bf.label, font: '11px Courier New',
            fillColor: Cesium.Color.fromCssColorString(bf.color || '#00aaff'),
            outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -16),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 20_000_000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scale: 0.9,
          },
        });
        entityMap.set(bf.id, { entity, type: 'blue' });
      }
    }

    // Red contacts (interpolated positions)
    let entityCount = 0;
    for (const contact of (scenario.red_contacts || [])) {
      const pos = interpolateContact(contact, currentTick, totalTicks);
      const altM = Math.max((pos.alt || 0) * 1000, 5000);
      const cartPos = Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, altM);
      entityCount++;

      if (entityMap.has(contact.id)) {
        entityMap.get(contact.id).entity.position = cartPos;
      } else {
        const entity = viewer.entities.add({
          position: cartPos,
          point: {
            pixelSize: 8,
            color: Cesium.Color.fromCssColorString(contact.color || '#ff3333'),
            outlineColor: Cesium.Color.WHITE, outlineWidth: 1,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: contact.label, font: '10px Courier New',
            fillColor: Cesium.Color.fromCssColorString(contact.color || '#ff3333'),
            outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -14),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 20_000_000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scale: 0.85,
          },
        });
        entityMap.set(contact.id, { entity, type: 'red' });
      }
    }

    const tickInt = Math.floor(currentTick);
    const timeLabel = `TICK ${tickInt}/${totalTicks}`;
    const localTimeLabel = '';

    return { entityCount, timeLabel, localTimeLabel };
  },

  /**
   * Get intel + decision events up to the current progress.
   * Returns array of { type, tick, title, body }.
   */
  getEvents(ctx, progress) {
    const { scenario, decisions, intelFeed, isAgentic, agenticLog } = ctx;
    const totalTicks = scenario.duration_ticks || 8;
    const events = [];

    if (isAgentic && agenticLog.length > 0) {
      // Agentic mode: replay from agenticLog using elapsed_ms as timeline
      const totalMs = agenticLog.reduce((max, e) => Math.max(max, e.elapsed_ms || 0), 1);
      const currentMs = progress * totalMs;

      for (const entry of agenticLog) {
        if ((entry.elapsed_ms || 0) > currentMs) continue;
        const sec = ((entry.elapsed_ms || 0) / 1000).toFixed(1);

        if (entry.type === 'intel') {
          events.push({ type: 'intel', tick: entry.elapsed_ms || 0, title: `INTEL [${sec}s]`, body: entry.message });
        } else if (entry.type === 'reasoning') {
          events.push({ type: 'decision', tick: entry.elapsed_ms || 0, title: `REASONING [Turn ${entry.turn}, ${sec}s]`, body: entry.text || '' });
        } else if (entry.type === 'tool') {
          const argsStr = entry.toolArgs ? JSON.stringify(entry.toolArgs) : '';
          const isTerminal = scenario.tools?.[entry.toolName]?.terminal;
          events.push({
            type: isTerminal ? 'critical' : 'decision',
            tick: entry.elapsed_ms || 0,
            title: `TOOL [${sec}s]: ${entry.toolName}`,
            body: `Args: ${argsStr.slice(0, 200)}`,
            toolName: entry.toolName,
            toolArgs: entry.toolArgs,
            result: entry.result,
          });
        }
      }
      events.sort((a, b) => a.tick - b.tick);
      return events;
    }

    // Standard tick-based mode
    const currentTick = progress * totalTicks;

    // Intel messages
    for (const intel of intelFeed) {
      if (intel.tick <= currentTick) {
        events.push({
          type: 'intel',
          tick: intel.tick,
          title: `INTEL [T${intel.tick}]`,
          body: intel.message,
        });
      }
    }

    // Decisions
    for (const d of decisions) {
      const dTick = d.tick !== undefined ? d.tick : 0;
      if (dTick <= currentTick) {
        const isCritical = scenario.measurement?.critical_action &&
          d.action === scenario.measurement.critical_action;

        let body = `${d.reasoning || ''} (confidence: ${d.confidence || '?'}, ${d.latencyMs || '?'}ms)`;
        if (d.movements && d.movements.length > 0) {
          const moveStr = d.movements.map(m =>
            `${m.id}: ${Math.round(m.heading)}° @ ${Math.round(m.speed_kts)}kts`
          ).join(', ');
          body += ` [MOVE: ${moveStr}]`;
        }

        events.push({
          type: isCritical ? 'critical' : 'decision',
          tick: dTick,
          title: `T${dTick} → ${d.action}`,
          body,
        });
      }
    }

    // Sort by tick
    events.sort((a, b) => a.tick - b.tick);
    return events;
  },

  /** No-op on seek for wargame (no trail buffers) */
  onSeek(ctx, entityMap) {},

  /** Cleanup — remove all entities */
  cleanup(ctx, viewer, entityMap) {
    for (const [, record] of entityMap) {
      viewer.entities.remove(record.entity);
    }
    entityMap.clear();
  },
};

export default wargameAdapter;
