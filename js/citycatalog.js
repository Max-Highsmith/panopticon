/* ===================================================================
   PANOPTICON — City Catalog
   Central registry of all available cities for the jump-to widget.
   Pure data — no DOM or viewer imports.
   =================================================================== */

export const CITY_CATALOG = [
  // === AMERICAS ===
  { key: 'nyc',          label: 'NEW YORK',       shortLabel: 'NYC',      region: 'Americas',    lat: 40.75,   lon: -73.98,   alt: 30_000 },
  { key: 'dc',           label: 'WASHINGTON DC',  shortLabel: 'DC',       region: 'Americas',    lat: 38.90,   lon: -77.04,   alt: 30_000 },
  { key: 'la',           label: 'LOS ANGELES',    shortLabel: 'LA',       region: 'Americas',    lat: 34.05,   lon: -118.24,  alt: 30_000 },
  { key: 'mexico',       label: 'MEXICO CITY',    shortLabel: 'CDMX',     region: 'Americas',    lat: 19.43,   lon: -99.13,   alt: 30_000 },
  { key: 'saopaulo',     label: 'SAO PAULO',      shortLabel: 'GRU',      region: 'Americas',    lat: -23.55,  lon: -46.63,   alt: 30_000 },
  { key: 'bogota',       label: 'BOGOTA',         shortLabel: 'BOG',      region: 'Americas',    lat: 4.71,    lon: -74.07,   alt: 30_000 },

  // === EUROPE ===
  { key: 'london',       label: 'LONDON',         shortLabel: 'LDN',      region: 'Europe',      lat: 51.50,   lon: -0.12,    alt: 30_000 },
  { key: 'paris',        label: 'PARIS',          shortLabel: 'PAR',      region: 'Europe',      lat: 48.86,   lon: 2.35,     alt: 30_000 },
  { key: 'berlin',       label: 'BERLIN',         shortLabel: 'BER',      region: 'Europe',      lat: 52.52,   lon: 13.41,    alt: 30_000 },
  { key: 'moscow',       label: 'MOSCOW',         shortLabel: 'MOW',      region: 'Europe',      lat: 55.76,   lon: 37.62,    alt: 30_000 },
  { key: 'kyiv',         label: 'KYIV',           shortLabel: 'KYV',      region: 'Europe',      lat: 50.45,   lon: 30.52,    alt: 30_000 },
  { key: 'rome',         label: 'ROME',           shortLabel: 'ROM',      region: 'Europe',      lat: 41.90,   lon: 12.50,    alt: 30_000 },

  // === MIDDLE EAST ===
  { key: 'tehran',       label: 'TEHRAN',         shortLabel: 'THR',      region: 'Middle East', lat: 35.69,   lon: 51.39,    alt: 30_000 },
  { key: 'riyadh',       label: 'RIYADH',         shortLabel: 'RUH',      region: 'Middle East', lat: 24.71,   lon: 46.68,    alt: 30_000 },
  { key: 'jerusalem',    label: 'JERUSALEM',      shortLabel: 'JRS',      region: 'Middle East', lat: 31.77,   lon: 35.23,    alt: 30_000 },
  { key: 'dubai',        label: 'DUBAI',          shortLabel: 'DXB',      region: 'Middle East', lat: 25.20,   lon: 55.27,    alt: 30_000 },

  // === ASIA ===
  { key: 'tokyo',        label: 'TOKYO',          shortLabel: 'TYO',      region: 'Asia',        lat: 35.68,   lon: 139.75,   alt: 30_000 },
  { key: 'beijing',      label: 'BEIJING',        shortLabel: 'PEK',      region: 'Asia',        lat: 39.90,   lon: 116.40,   alt: 30_000 },
  { key: 'seoul',        label: 'SEOUL',          shortLabel: 'ICN',      region: 'Asia',        lat: 37.57,   lon: 126.98,   alt: 30_000 },
  { key: 'delhi',        label: 'NEW DELHI',      shortLabel: 'DEL',      region: 'Asia',        lat: 28.61,   lon: 77.21,    alt: 30_000 },
  { key: 'taipei',       label: 'TAIPEI',         shortLabel: 'TPE',      region: 'Asia',        lat: 25.03,   lon: 121.57,   alt: 30_000 },
  { key: 'singapore',    label: 'SINGAPORE',      shortLabel: 'SIN',      region: 'Asia',        lat: 1.35,    lon: 103.82,   alt: 30_000 },

  // === AFRICA ===
  { key: 'cairo',        label: 'CAIRO',          shortLabel: 'CAI',      region: 'Africa',      lat: 30.04,   lon: 31.24,    alt: 30_000 },
  { key: 'lagos',        label: 'LAGOS',          shortLabel: 'LOS',      region: 'Africa',      lat: 6.52,    lon: 3.38,     alt: 30_000 },
  { key: 'nairobi',      label: 'NAIROBI',        shortLabel: 'NBO',      region: 'Africa',      lat: -1.29,   lon: 36.82,    alt: 30_000 },

  // === OCEANIA ===
  { key: 'sydney',       label: 'SYDNEY',         shortLabel: 'SYD',      region: 'Oceania',     lat: -33.87,  lon: 151.21,   alt: 30_000 },
];

export function getCityCatalog() {
  return CITY_CATALOG;
}

export function getCityByKey(key) {
  return CITY_CATALOG.find(e => e.key === key) || null;
}

export function getCityRegions() {
  const seen = new Set();
  const regions = [];
  for (const e of CITY_CATALOG) {
    if (!seen.has(e.region)) { seen.add(e.region); regions.push(e.region); }
  }
  return regions;
}
