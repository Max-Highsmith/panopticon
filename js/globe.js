/* ===================================================================
   PANOPTICON — Globe Setup & Layer Management
   =================================================================== */

// --- Cesium Viewer Initialization ---

export function createViewer(containerId) {
  const viewer = new Cesium.Viewer(containerId, {
    geocoder: false, homeButton: false, sceneModePicker: false,
    baseLayerPicker: false, navigationHelpButton: false,
    animation: false, timeline: false, fullscreenButton: false,
    selectionIndicator: false, infoBox: false, scene3DOnly: true,
    imageryProvider: false,
  });

  viewer.scene.backgroundColor = Cesium.Color.BLACK;
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 500;

  viewer.imageryLayers.addImageryProvider(
    new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' })
  );

  // Attempt to load Google 3D tiles (degrades gracefully)
  (async () => {
    try {
      const tileset = await Cesium.createGooglePhotorealistic3DTileset();
      viewer.scene.primitives.add(tileset);
      viewer.scene.globe.show = false;
    } catch {
      console.log('Google 3D Tiles not available, using OpenStreetMap globe.');
    }
  })();

  return viewer;
}

// --- Layer State ---

export const layers = {
  military: true,
  commercial: true,
  satellites: true,
  ships: false,
  pokemon: false,
  mines: false,
  infra: false,
  nuclear: false,
  airports: false,
  bases: false,
  webcams: false,
  arcticmining: false,
  rareearth: false,
  drilling: false,
};

// Entity registries — each maps an ID to a record with { entity, ... }
export const entityMaps = {
  military:   new Map(),
  commercial: new Map(),
  satellites: new Map(),
  ships:      new Map(),
  pokemon:    new Map(),
  mines:      new Map(),
  infra:      new Map(),
  nuclear:    new Map(),
  replay:     new Map(),
  airports:   new Map(),
  bases:      new Map(),
  webcams:      new Map(),
  arcticmining: new Map(),
  rareearth:    new Map(),
  drilling:     new Map(),
};

// --- Layer Operations ---

export function toggleLayer(viewer, layer, currentMode) {
  const chkId = 'chk-' + layer;
  layers[layer] = document.getElementById(chkId).checked;

  const entityMap = entityMaps[layer];
  if (!entityMap) return;
  for (const [, record] of entityMap) {
    record.entity.show = layers[layer];
    if (record.trailEntity)      record.trailEntity.show = layers[layer];
    if (record.orbitEntities)    record.orbitEntities.forEach(e => e.show = layers[layer]);
    if (record.footprintEntities) record.footprintEntities.forEach(e => e.show = layers[layer]);
  }

  // Replay mode: military/commercial toggle controls respective entities
  if (currentMode === 'replay' && (layer === 'military' || layer === 'commercial')) {
    for (const [, record] of entityMaps.replay) {
      const isMil = record.entity.acData && record.entity.acData.mil;
      if ((layer === 'military' && isMil) || (layer === 'commercial' && !isMil)) {
        record.entity.show = layers[layer];
        if (record.trailEntity) record.trailEntity.show = layers[layer];
      }
    }
  }
}

export function clearLayer(viewer, entityMap) {
  for (const [, record] of entityMap) {
    viewer.entities.remove(record.entity);
    if (record.trailEntity)      viewer.entities.remove(record.trailEntity);
    if (record.orbitEntities)    record.orbitEntities.forEach(e => viewer.entities.remove(e));
    if (record.footprintEntities) record.footprintEntities.forEach(e => viewer.entities.remove(e));
  }
  entityMap.clear();
}

export function clearAllLayers(viewer, removeDataBoundsOverlay) {
  Object.values(entityMaps).forEach(map => clearLayer(viewer, map));
  removeDataBoundsOverlay();
}
