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
  military: false,
  commercial: false,
  satellites: false,
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
  powerplants: false,
  nuclearplants: false,
  refineries: false,
  platforms: false,
  radar: false,
  strategicnuclear: false,
  volcanoes: false,
  cables: false,
  pipelines: false,
  traderoutes: false,
  arcticroutes: false,
  electricalgrid: false,
  chokepoints: false,
  fisheries: false,
  earthquakes: false,
  wildfires: false,
  whales: false,
  seaturtles: false,
  birds: false,
  elephants: false,
  spacedebris: false,
  oceancurrents: false,
  cargoroutes: false,
  spaceports: false,
  seaice: false,
  lightning: false,
  ports: false,
  commodityflows: false,
  ixps: false,
  oceantemp: false,
  meteors: false,
  cosmic: false,
  ionosphere: false,
  fishingfleets: false,
  arcticdeposits: false,
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
  powerplants:     new Map(),
  nuclearplants:   new Map(),
  refineries:      new Map(),
  platforms:       new Map(),
  radar:           new Map(),
  strategicnuclear:new Map(),
  volcanoes:       new Map(),
  cables:          new Map(),
  pipelines:       new Map(),
  traderoutes:     new Map(),
  arcticroutes:    new Map(),
  electricalgrid:  new Map(),
  chokepoints:     new Map(),
  fisheries:       new Map(),
  earthquakes:     new Map(),
  wildfires:       new Map(),
  whales:          new Map(),
  seaturtles:      new Map(),
  birds:           new Map(),
  elephants:       new Map(),
  spacedebris:     new Map(),
  oceancurrents:   new Map(),
  cargoroutes:     new Map(),
  spaceports:      new Map(),
  seaice:          new Map(),
  lightning:       new Map(),
  ports:           new Map(),
  commodityflows:  new Map(),
  ixps:            new Map(),
  oceantemp:       new Map(),
  meteors:         new Map(),
  cosmic:          new Map(),
  ionosphere:      new Map(),
  fishingfleets:   new Map(),
  arcticdeposits:  new Map(),
};

// --- Layer Operations ---

export function registerLayer(key) {
  if (layers[key] === undefined) layers[key] = false;
  if (!entityMaps[key]) entityMaps[key] = new Map();
}

export function toggleLayer(viewer, layer, currentMode, enabled) {
  if (enabled !== undefined) {
    layers[layer] = enabled;
  } else {
    const chk = document.getElementById('chk-' + layer);
    if (chk) layers[layer] = chk.checked;
  }

  const entityMap = entityMaps[layer];
  if (!entityMap) return;
  for (const [, record] of entityMap) {
    record.entity.show = layers[layer];
    if (record.trailEntity)       record.trailEntity.show = layers[layer];
    if (record.labelEntity)       record.labelEntity.show = layers[layer];
    if (record.orbitEntities)     record.orbitEntities.forEach(e => e.show = layers[layer]);
    if (record.footprintEntities) record.footprintEntities.forEach(e => e.show = layers[layer]);
  }

  // Playback mode: military/commercial toggle controls respective entities
  if (currentMode === 'playback' && (layer === 'military' || layer === 'commercial')) {
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
    if (record.trailEntity)       viewer.entities.remove(record.trailEntity);
    if (record.labelEntity)       viewer.entities.remove(record.labelEntity);
    if (record.orbitEntities)     record.orbitEntities.forEach(e => viewer.entities.remove(e));
    if (record.footprintEntities) record.footprintEntities.forEach(e => viewer.entities.remove(e));
  }
  entityMap.clear();
}

export function clearAllLayers(viewer, removeDataBoundsOverlay) {
  Object.values(entityMaps).forEach(map => clearLayer(viewer, map));
  removeDataBoundsOverlay();
}
