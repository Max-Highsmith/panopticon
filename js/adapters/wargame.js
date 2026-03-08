/* ===================================================================
   PANOPTICON — Wargame Playback Adapter
   Renders completed wargame results on the timeline.
   Loads scenario JSON (entity traces) + results (decisions) and
   replays them with a scrubable timeline.
   =================================================================== */

import { interpolateContact, buildWorldState, applyVariables } from '../simulation.mjs';
import { getResult } from '../results.js';

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
    if (d.resultsSource === 'indexeddb') {
      const run = await getResult(d.runId);
      if (!run) throw new Error(`Run ${d.runId} not found in IndexedDB`);
      decisions = run.decisions || [];
    } else if (d.resultsFile) {
      const res = await fetch(d.resultsFile);
      const text = await res.text();
      const lines = text.trim().split('\n').map(l => JSON.parse(l));
      // Skip header (first line) and summary (last line with type: 'summary')
      decisions = lines.filter(l => l.tick !== undefined || l.elapsed_ms !== undefined);
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

    return { scenario, decisions, variant, intelFeed, vars };
  },

  /** Total duration in seconds */
  getDurationSeconds(ctx, manifest) {
    const tl = manifest.timeline;
    if (tl.durationSeconds) return tl.durationSeconds;
    const totalTicks = tl.totalTicks || ctx.scenario.duration_ticks || 8;
    const tickMs = tl.tickIntervalMs || ctx.scenario.tick_interval_ms || 6000;
    return (totalTicks * tickMs) / 1000;
  },

  /**
   * Render a frame at the given time offset.
   * Maps progress → tick, interpolates entity positions, returns frame info.
   */
  renderFrame(ctx, manifest, viewer, entityMap, progress, timeSeconds) {
    const { scenario } = ctx;
    const totalTicks = manifest.timeline.totalTicks || scenario.duration_ticks || 8;
    const currentTick = progress * totalTicks;

    // Blue forces (static positions)
    for (const bf of (scenario.blue_forces || [])) {
      if (entityMap.has(bf.id)) {
        // Already exists, no update needed (static)
      } else {
        const entity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(bf.position.lon, bf.position.lat, 0),
          point: {
            pixelSize: 10,
            color: Cesium.Color.fromCssColorString(bf.color || '#00aaff'),
            outlineColor: Cesium.Color.WHITE, outlineWidth: 1,
          },
          label: {
            text: bf.label, font: '11px Courier New',
            fillColor: Cesium.Color.fromCssColorString(bf.color || '#00aaff'),
            outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -16),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 20_000_000),
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
      const cartPos = Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, (pos.alt || 0) * 1000);
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
          },
          label: {
            text: contact.label, font: '10px Courier New',
            fillColor: Cesium.Color.fromCssColorString(contact.color || '#ff3333'),
            outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -14),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 20_000_000),
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
    const { scenario, decisions, intelFeed } = ctx;
    const totalTicks = scenario.duration_ticks || 8;
    const currentTick = progress * totalTicks;
    const events = [];

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
        events.push({
          type: isCritical ? 'critical' : 'decision',
          tick: dTick,
          title: `T${dTick} → ${d.action}`,
          body: `${d.reasoning || ''} (confidence: ${d.confidence || '?'}, ${d.latencyMs || '?'}ms)`,
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
