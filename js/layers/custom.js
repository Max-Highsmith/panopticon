/* ===================================================================
   PANOPTICON — Custom Dataset Loader

   Loads user-defined datasets configured in CUSTOM_DATASETS (config.js).
   Supports GeoJSON, CSV, and KML formats.

   To add a custom dataset:
   1. Place your data file in data/custom/ (or any path relative to index.html)
   2. Add an entry to CUSTOM_DATASETS in js/config.js:
      {
        id: 'my_data',
        label: 'MY DATA',
        file: 'data/custom/my_data.geojson',
        color: '#ff00ff',
        iconType: 'circle',   // 'circle' | 'diamond' | 'server' | 'radiation'
        iconSize: 20,         // optional
        altitude: 200,        // optional, meters
      }
   3. Reload the app — a new toggle will appear in the layer bar.

   Supported formats:
   - GeoJSON (.geojson/.json): FeatureCollection with Point geometries.
     Feature.properties are shown in the info panel on click.
   - CSV (.csv): First row = headers. Must have lat/lon or latitude/longitude columns.
     Additional columns become properties shown on click.
   - KML (.kml): <Placemark> elements with <Point><coordinates>.
     <name> and <description> are used for labels and info.
   =================================================================== */

import { DISPLAY, CUSTOM_DATASETS } from '../config.js';
import { $ } from '../utils.js';
import { makeDiamondIcon, makeServerIcon, makeRadiationIcon, makeCircleIcon } from '../icons.js';
import { layers, entityMaps } from '../globe.js';
import { registerLayer as registerCatalogLayer } from '../layercatalog.js';

const loadedSets = new Set();

function getIcon(iconType, color, size) {
  const s = size || 48;
  switch (iconType) {
    case 'diamond':    return makeDiamondIcon(color, s);
    case 'server':     return makeServerIcon(color, s);
    case 'radiation':  return makeRadiationIcon(color, s);
    default:           return makeCircleIcon(color, s);
  }
}

// --- Format Parsers ---

function parseGeoJSON(text) {
  const data = JSON.parse(text);
  const features = data.type === 'FeatureCollection' ? data.features : [data];
  const points = [];
  for (const f of features) {
    if (!f.geometry || f.geometry.type !== 'Point') continue;
    const [lon, lat, alt] = f.geometry.coordinates;
    const props = f.properties || {};
    points.push({
      name: props.name || props.Name || props.title || `Point ${points.length + 1}`,
      lat, lon,
      alt: alt || 0,
      props,
    });
  }
  return points;
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  const latIdx = headers.findIndex(h => h === 'lat' || h === 'latitude');
  const lonIdx = headers.findIndex(h => h === 'lon' || h === 'lng' || h === 'longitude');
  if (latIdx < 0 || lonIdx < 0) {
    console.error('CUSTOM: CSV missing lat/lon columns. Found:', headers);
    return [];
  }

  const nameIdx = headers.findIndex(h => h === 'name' || h === 'title' || h === 'label');
  const points = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    const lat = parseFloat(cols[latIdx]);
    const lon = parseFloat(cols[lonIdx]);
    if (isNaN(lat) || isNaN(lon)) continue;

    const props = {};
    headers.forEach((h, j) => { props[h] = cols[j]; });

    points.push({
      name: nameIdx >= 0 ? cols[nameIdx] : `Point ${points.length + 1}`,
      lat, lon, alt: 0,
      props,
    });
  }
  return points;
}

function parseKML(text) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');
  const placemarks = doc.querySelectorAll('Placemark');
  const points = [];

  for (const pm of placemarks) {
    const coordEl = pm.querySelector('Point coordinates');
    if (!coordEl) continue;
    const parts = coordEl.textContent.trim().split(',');
    const lon = parseFloat(parts[0]);
    const lat = parseFloat(parts[1]);
    const alt = parseFloat(parts[2]) || 0;
    if (isNaN(lat) || isNaN(lon)) continue;

    const nameEl = pm.querySelector('name');
    const descEl = pm.querySelector('description');

    points.push({
      name: nameEl ? nameEl.textContent.trim() : `Point ${points.length + 1}`,
      lat, lon, alt,
      props: { description: descEl ? descEl.textContent.trim() : '' },
    });
  }
  return points;
}

function parseFile(text, filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'csv') return parseCSV(text);
  if (ext === 'kml') return parseKML(text);
  return parseGeoJSON(text); // default for .geojson, .json
}

// --- Dataset Loading ---

async function loadDataset(viewer, dataset) {
  const { id, label, file, color, iconType, iconSize, altitude } = dataset;
  if (loadedSets.has(id)) return;

  const mapKey = 'custom_' + id;

  // Register in layer system if not already
  if (!entityMaps[mapKey]) entityMaps[mapKey] = new Map();
  if (layers[mapKey] === undefined) layers[mapKey] = false;

  const entities = entityMaps[mapKey];
  const icon = getIcon(iconType || 'circle', color || '#ff00ff', iconSize ? iconSize * 2 : 48);
  const displaySize = iconSize || DISPLAY.CUSTOM_ICON_SIZE;
  const displayAlt = altitude || 0;
  const displayColor = color || '#ff00ff';

  try {
    const res = await fetch(file);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const points = parseFile(text, file);

    for (const pt of points) {
      const ptId = `${id}_${pt.name}_${pt.lat}_${pt.lon}`;
      if (entities.has(ptId)) continue;

      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(pt.lon, pt.lat, pt.alt || displayAlt),
        billboard: {
          image: icon,
          width: displaySize,
          height: displaySize,
          alignedAxis: Cesium.Cartesian3.ZERO,
          disableDepthTestDistance: 0,
        },
        label: {
          text: pt.name,
          font: '10px Courier New',
          fillColor: Cesium.Color.fromCssColorString(displayColor),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(12, -3),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3_000_000),
          scale: 0.8,
        },
      });
      entity.show = layers[mapKey];

      // Build description from properties
      const descParts = Object.entries(pt.props)
        .filter(([k]) => k !== 'name' && k !== 'Name' && k !== 'title')
        .map(([k, v]) => `${k}: ${v}`)
        .slice(0, 5);

      entity.acData = {
        hex: ptId,
        r: pt.name,
        t: label,
        flight: pt.name,
        desc: descParts.join(' // ') || label,
        alt_baro: 0,
        gs: 0,
        track: 0,
      };
      entities.set(ptId, { entity });
    }

    loadedSets.add(id);
    console.log(`CUSTOM [${id}]: loaded ${entities.size} points from ${file}`);
  } catch (err) {
    console.error(`CUSTOM [${id}] fetch error:`, err);
  }
}

// --- Catalog Registration ---

function registerCustom(dataset) {
  const { id, label, color } = dataset;
  const mapKey = 'custom_' + id;
  const shortLabel = label.length > 6 ? label.substring(0, 6) : label;

  registerCatalogLayer({
    key: mapKey,
    label,
    shortLabel,
    category: 'Custom',
    color: color || '#ff00ff',
    defaultOn: false,
    defaultPinned: false,
  });
}

// --- Public API ---

export function loadCustomDatasets(viewer, registerLoader) {
  if (!CUSTOM_DATASETS || CUSTOM_DATASETS.length === 0) return;

  for (const ds of CUSTOM_DATASETS) {
    if (!ds.id || !ds.file) {
      console.warn('CUSTOM: skipping dataset missing id or file:', ds);
      continue;
    }

    const mapKey = 'custom_' + ds.id;
    if (!entityMaps[mapKey]) entityMaps[mapKey] = new Map();
    if (layers[mapKey] === undefined) layers[mapKey] = false;

    registerCustom(ds);

    // Register lazy loader so the layer selector can trigger data fetch
    if (registerLoader) {
      registerLoader(mapKey, { load: () => loadDataset(viewer, ds) });
    }
  }
}
