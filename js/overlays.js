/* ===================================================================
   PANOPTICON — Map Overlays (blackout zones, data bounds)
   =================================================================== */

let blackoutEntities = [];
let dataBoundsEntities = [];

// --- Blackout Zone Overlays ---

export function createBlackoutOverlays(viewer, sc) {
  removeBlackoutOverlays(viewer);
  if (!sc || !sc.blackoutZones) return;

  for (const zone of sc.blackoutZones) {
    // Striped polygon fill
    blackoutEntities.push(viewer.entities.add({
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(zone.coords),
        material: new Cesium.StripeMaterialProperty({
          evenColor: Cesium.Color.fromCssColorString('#ff0000').withAlpha(0.12),
          oddColor: Cesium.Color.TRANSPARENT,
          repeat: 40,
          orientation: Cesium.StripeOrientation.VERTICAL,
        }),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('#ff0000').withAlpha(0.5),
        outlineWidth: 2,
        height: 0,
        classificationType: Cesium.ClassificationType.BOTH,
      },
    }));

    // Dashed border
    const borderCoords = [...zone.coords, zone.coords[0], zone.coords[1]];
    blackoutEntities.push(viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(borderCoords),
        width: 2,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.fromCssColorString('#ff0000').withAlpha(0.6),
          dashLength: 16,
        }),
        clampToGround: true,
      },
    }));

    // Label
    blackoutEntities.push(viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(zone.labelPos[0], zone.labelPos[1], 50000),
      label: {
        text: zone.label + '\n' + zone.sublabel,
        font: 'bold 18px Courier New',
        fillColor: Cesium.Color.fromCssColorString('#ff4444'),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 6,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8_000_000),
        scale: 1.0,
        backgroundEnabled: true,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
        backgroundPadding: new Cesium.Cartesian2(10, 6),
      },
    }));
  }
}

export function removeBlackoutOverlays(viewer) {
  blackoutEntities.forEach(e => viewer.entities.remove(e));
  blackoutEntities = [];
}

// --- Data Bounds Overlay ---

export function createDataBoundsOverlay(viewer, sc) {
  removeDataBoundsOverlay(viewer);
  if (!sc || !sc.dataBounds) return;
  const { latMin, latMax, lonMin, lonMax } = sc.dataBounds;

  // Dashed border
  dataBoundsEntities.push(viewer.entities.add({
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        lonMin, latMin, lonMax, latMin, lonMax, latMax, lonMin, latMax, lonMin, latMin,
      ]),
      width: 1.5,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.fromCssColorString('#00ff41').withAlpha(0.35),
        dashLength: 12,
        gapColor: Cesium.Color.TRANSPARENT,
      }),
      clampToGround: true,
    },
  }));

  // Corner labels
  const corners = [
    { lon: lonMin, lat: latMax, anchor: 'TL' },
    { lon: lonMax, lat: latMax, anchor: 'TR' },
    { lon: lonMax, lat: latMin, anchor: 'BR' },
    { lon: lonMin, lat: latMin, anchor: 'BL' },
  ];
  for (const c of corners) {
    const hOrigin = c.anchor.includes('L') ? Cesium.HorizontalOrigin.LEFT : Cesium.HorizontalOrigin.RIGHT;
    const vOrigin = c.anchor.includes('T') ? Cesium.VerticalOrigin.BOTTOM : Cesium.VerticalOrigin.TOP;
    dataBoundsEntities.push(viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(c.lon, c.lat, 0),
      label: {
        text: 'DATA BOUNDARY',
        font: '10px Courier New',
        fillColor: Cesium.Color.fromCssColorString('#00ff41').withAlpha(0.4),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        horizontalOrigin: hOrigin,
        verticalOrigin: vOrigin,
        pixelOffset: new Cesium.Cartesian2(hOrigin === Cesium.HorizontalOrigin.LEFT ? 6 : -6, vOrigin === Cesium.VerticalOrigin.BOTTOM ? -4 : 4),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 6_000_000),
        scale: 0.9,
      },
    }));
  }
}

export function removeDataBoundsOverlay(viewer) {
  dataBoundsEntities.forEach(e => viewer.entities.remove(e));
  dataBoundsEntities = [];
}
