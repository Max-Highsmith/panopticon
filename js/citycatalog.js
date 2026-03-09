/* ===================================================================
   PANOPTICON — City Catalog
   Central registry of all available cities for the jump-to widget.
   Includes all UN member-state capitals plus select major cities.
   Pure data — no DOM or viewer imports.
   =================================================================== */

export const CITY_CATALOG = [
  // =====================================================================
  //  AMERICAS — North America
  // =====================================================================
  { key: 'nyc',              label: 'NEW YORK',              shortLabel: 'NYC',   region: 'Americas',    lat: 40.7128,   lon: -73.9986,  alt: 30_000 },
  { key: 'dc',               label: 'WASHINGTON DC',         shortLabel: 'DC',    region: 'Americas',    lat: 38.9072,   lon: -77.0369,  alt: 30_000 },
  { key: 'la',               label: 'LOS ANGELES',           shortLabel: 'LA',    region: 'Americas',    lat: 34.0522,   lon: -118.2437, alt: 30_000 },
  { key: 'ottawa',           label: 'OTTAWA',                shortLabel: 'OTT',   region: 'Americas',    lat: 45.4215,   lon: -75.6972,  alt: 30_000 },
  { key: 'mexico',           label: 'MEXICO CITY',           shortLabel: 'CDMX',  region: 'Americas',    lat: 19.4326,   lon: -99.1332,  alt: 30_000 },

  // =====================================================================
  //  AMERICAS — Central America & Caribbean
  // =====================================================================
  { key: 'guatemala',        label: 'GUATEMALA CITY',        shortLabel: 'GUA',   region: 'Americas',    lat: 14.6349,   lon: -90.5069,  alt: 30_000 },
  { key: 'belmopan',         label: 'BELMOPAN',              shortLabel: 'BZE',   region: 'Americas',    lat: 17.2510,   lon: -88.7590,  alt: 30_000 },
  { key: 'tegucigalpa',      label: 'TEGUCIGALPA',           shortLabel: 'TGU',   region: 'Americas',    lat: 14.0723,   lon: -87.1921,  alt: 30_000 },
  { key: 'sansalvador',      label: 'SAN SALVADOR',          shortLabel: 'SAL',   region: 'Americas',    lat: 13.6929,   lon: -89.2182,  alt: 30_000 },
  { key: 'managua',          label: 'MANAGUA',               shortLabel: 'MGA',   region: 'Americas',    lat: 12.1150,   lon: -86.2362,  alt: 30_000 },
  { key: 'sanjose',          label: 'SAN JOSÉ',              shortLabel: 'SJO',   region: 'Americas',    lat: 9.9281,    lon: -84.0907,  alt: 30_000 },
  { key: 'panama',           label: 'PANAMA CITY',           shortLabel: 'PTY',   region: 'Americas',    lat: 8.9824,    lon: -79.5199,  alt: 30_000 },
  { key: 'havana',           label: 'HAVANA',                shortLabel: 'HAV',   region: 'Americas',    lat: 23.1136,   lon: -82.3666,  alt: 30_000 },
  { key: 'kingston',         label: 'KINGSTON',              shortLabel: 'KIN',   region: 'Americas',    lat: 17.9714,   lon: -76.7936,  alt: 30_000 },
  { key: 'portauprince',     label: 'PORT-AU-PRINCE',        shortLabel: 'PAP',   region: 'Americas',    lat: 18.5944,   lon: -72.3074,  alt: 30_000 },
  { key: 'santodomingo',     label: 'SANTO DOMINGO',         shortLabel: 'SDQ',   region: 'Americas',    lat: 18.4861,   lon: -69.9312,  alt: 30_000 },
  { key: 'nassau',           label: 'NASSAU',                shortLabel: 'NAS',   region: 'Americas',    lat: 25.0480,   lon: -77.3554,  alt: 30_000 },
  { key: 'portofspain',      label: 'PORT OF SPAIN',         shortLabel: 'POS',   region: 'Americas',    lat: 10.6596,   lon: -61.5086,  alt: 30_000 },
  { key: 'bridgetown',       label: 'BRIDGETOWN',            shortLabel: 'BGI',   region: 'Americas',    lat: 13.1132,   lon: -59.5988,  alt: 30_000 },
  { key: 'castries',         label: 'CASTRIES',              shortLabel: 'SLU',   region: 'Americas',    lat: 14.0101,   lon: -60.9875,  alt: 30_000 },
  { key: 'stgeorges',        label: "ST. GEORGE'S",          shortLabel: 'GND',   region: 'Americas',    lat: 12.0564,   lon: -61.7485,  alt: 30_000 },
  { key: 'kingstown',        label: 'KINGSTOWN',             shortLabel: 'SVD',   region: 'Americas',    lat: 13.1600,   lon: -61.2248,  alt: 30_000 },
  { key: 'stjohns',          label: "ST. JOHN'S",            shortLabel: 'ANU',   region: 'Americas',    lat: 17.1175,   lon: -61.8456,  alt: 30_000 },
  { key: 'roseau',           label: 'ROSEAU',                shortLabel: 'DOM',   region: 'Americas',    lat: 15.3010,   lon: -61.3872,  alt: 30_000 },
  { key: 'basseterre',       label: 'BASSETERRE',            shortLabel: 'SKB',   region: 'Americas',    lat: 17.2948,   lon: -62.7261,  alt: 30_000 },

  // =====================================================================
  //  AMERICAS — South America
  // =====================================================================
  { key: 'bogota',           label: 'BOGOTÁ',                shortLabel: 'BOG',   region: 'Americas',    lat: 4.7110,    lon: -74.0721,  alt: 30_000 },
  { key: 'caracas',          label: 'CARACAS',               shortLabel: 'CCS',   region: 'Americas',    lat: 10.4806,   lon: -66.9036,  alt: 30_000 },
  { key: 'saopaulo',         label: 'SÃO PAULO',            shortLabel: 'GRU',   region: 'Americas',    lat: -23.5505,  lon: -46.6333,  alt: 30_000 },
  { key: 'brasilia',         label: 'BRASÍLIA',              shortLabel: 'BSB',   region: 'Americas',    lat: -15.7975,  lon: -47.8919,  alt: 30_000 },
  { key: 'buenosaires',      label: 'BUENOS AIRES',          shortLabel: 'EZE',   region: 'Americas',    lat: -34.6037,  lon: -58.3816,  alt: 30_000 },
  { key: 'santiago',         label: 'SANTIAGO',              shortLabel: 'SCL',   region: 'Americas',    lat: -33.4489,  lon: -70.6693,  alt: 30_000 },
  { key: 'lima',             label: 'LIMA',                  shortLabel: 'LIM',   region: 'Americas',    lat: -12.0464,  lon: -77.0428,  alt: 30_000 },
  { key: 'quito',            label: 'QUITO',                 shortLabel: 'UIO',   region: 'Americas',    lat: -0.1807,   lon: -78.4678,  alt: 30_000 },
  { key: 'lapaz',            label: 'LA PAZ',                shortLabel: 'LPB',   region: 'Americas',    lat: -16.4897,  lon: -68.1193,  alt: 30_000 },
  { key: 'asuncion',         label: 'ASUNCIÓN',              shortLabel: 'ASU',   region: 'Americas',    lat: -25.2637,  lon: -57.5759,  alt: 30_000 },
  { key: 'montevideo',       label: 'MONTEVIDEO',            shortLabel: 'MVD',   region: 'Americas',    lat: -34.9011,  lon: -56.1645,  alt: 30_000 },
  { key: 'georgetown',       label: 'GEORGETOWN',            shortLabel: 'GEO',   region: 'Americas',    lat: 6.8013,    lon: -58.1551,  alt: 30_000 },
  { key: 'paramaribo',       label: 'PARAMARIBO',            shortLabel: 'PBM',   region: 'Americas',    lat: 5.8520,    lon: -55.2038,  alt: 30_000 },

  // =====================================================================
  //  EUROPE — Western
  // =====================================================================
  { key: 'london',           label: 'LONDON',                shortLabel: 'LDN',   region: 'Europe',      lat: 51.5074,   lon: -0.1278,   alt: 30_000 },
  { key: 'paris',            label: 'PARIS',                 shortLabel: 'PAR',   region: 'Europe',      lat: 48.8566,   lon: 2.3522,    alt: 30_000 },
  { key: 'berlin',           label: 'BERLIN',                shortLabel: 'BER',   region: 'Europe',      lat: 52.5200,   lon: 13.4050,   alt: 30_000 },
  { key: 'rome',             label: 'ROME',                  shortLabel: 'ROM',   region: 'Europe',      lat: 41.9028,   lon: 12.4964,   alt: 30_000 },
  { key: 'madrid',           label: 'MADRID',                shortLabel: 'MAD',   region: 'Europe',      lat: 40.4168,   lon: -3.7038,   alt: 30_000 },
  { key: 'lisbon',           label: 'LISBON',                shortLabel: 'LIS',   region: 'Europe',      lat: 38.7223,   lon: -9.1393,   alt: 30_000 },
  { key: 'amsterdam',        label: 'AMSTERDAM',             shortLabel: 'AMS',   region: 'Europe',      lat: 52.3676,   lon: 4.9041,    alt: 30_000 },
  { key: 'brussels',         label: 'BRUSSELS',              shortLabel: 'BRU',   region: 'Europe',      lat: 50.8503,   lon: 4.3517,    alt: 30_000 },
  { key: 'luxembourg',       label: 'LUXEMBOURG',            shortLabel: 'LUX',   region: 'Europe',      lat: 49.6117,   lon: 6.1300,    alt: 30_000 },
  { key: 'bern',             label: 'BERN',                  shortLabel: 'BRN',   region: 'Europe',      lat: 46.9480,   lon: 7.4474,    alt: 30_000 },
  { key: 'vienna',           label: 'VIENNA',                shortLabel: 'VIE',   region: 'Europe',      lat: 48.2082,   lon: 16.3738,   alt: 30_000 },
  { key: 'dublin',           label: 'DUBLIN',                shortLabel: 'DUB',   region: 'Europe',      lat: 53.3498,   lon: -6.2603,   alt: 30_000 },
  { key: 'reykjavik',        label: 'REYKJAVIK',             shortLabel: 'REK',   region: 'Europe',      lat: 64.1466,   lon: -21.9426,  alt: 30_000 },
  { key: 'andorra',          label: 'ANDORRA LA VELLA',      shortLabel: 'AND',   region: 'Europe',      lat: 42.5063,   lon: 1.5218,    alt: 30_000 },
  { key: 'monaco',           label: 'MONACO',                shortLabel: 'MCO',   region: 'Europe',      lat: 43.7384,   lon: 7.4246,    alt: 30_000 },
  { key: 'sanmarino',        label: 'SAN MARINO',            shortLabel: 'SMR',   region: 'Europe',      lat: 43.9424,   lon: 12.4578,   alt: 30_000 },
  { key: 'vaduz',            label: 'VADUZ',                 shortLabel: 'VAD',   region: 'Europe',      lat: 47.1410,   lon: 9.5209,    alt: 30_000 },
  { key: 'valletta',         label: 'VALLETTA',              shortLabel: 'MLA',   region: 'Europe',      lat: 35.8989,   lon: 14.5146,   alt: 30_000 },

  // =====================================================================
  //  EUROPE — Nordic
  // =====================================================================
  { key: 'stockholm',        label: 'STOCKHOLM',             shortLabel: 'ARN',   region: 'Europe',      lat: 59.3293,   lon: 18.0686,   alt: 30_000 },
  { key: 'oslo',             label: 'OSLO',                  shortLabel: 'OSL',   region: 'Europe',      lat: 59.9139,   lon: 10.7522,   alt: 30_000 },
  { key: 'copenhagen',       label: 'COPENHAGEN',            shortLabel: 'CPH',   region: 'Europe',      lat: 55.6761,   lon: 12.5683,   alt: 30_000 },
  { key: 'helsinki',          label: 'HELSINKI',              shortLabel: 'HEL',   region: 'Europe',      lat: 60.1699,   lon: 24.9384,   alt: 30_000 },

  // =====================================================================
  //  EUROPE — Central & Eastern
  // =====================================================================
  { key: 'moscow',           label: 'MOSCOW',                shortLabel: 'MOW',   region: 'Europe',      lat: 55.7558,   lon: 37.6173,   alt: 30_000 },
  { key: 'kyiv',             label: 'KYIV',                  shortLabel: 'KYV',   region: 'Europe',      lat: 50.4501,   lon: 30.5234,   alt: 30_000 },
  { key: 'warsaw',           label: 'WARSAW',                shortLabel: 'WAW',   region: 'Europe',      lat: 52.2297,   lon: 21.0122,   alt: 30_000 },
  { key: 'prague',           label: 'PRAGUE',                shortLabel: 'PRG',   region: 'Europe',      lat: 50.0755,   lon: 14.4378,   alt: 30_000 },
  { key: 'budapest',         label: 'BUDAPEST',              shortLabel: 'BUD',   region: 'Europe',      lat: 47.4979,   lon: 19.0402,   alt: 30_000 },
  { key: 'bucharest',        label: 'BUCHAREST',             shortLabel: 'OTP',   region: 'Europe',      lat: 44.4268,   lon: 26.1025,   alt: 30_000 },
  { key: 'sofia',            label: 'SOFIA',                 shortLabel: 'SOF',   region: 'Europe',      lat: 42.6977,   lon: 23.3219,   alt: 30_000 },
  { key: 'athens',           label: 'ATHENS',                shortLabel: 'ATH',   region: 'Europe',      lat: 37.9838,   lon: 23.7275,   alt: 30_000 },
  { key: 'ankara',           label: 'ANKARA',                shortLabel: 'ANK',   region: 'Europe',      lat: 39.9334,   lon: 32.8597,   alt: 30_000 },
  { key: 'zagreb',           label: 'ZAGREB',                shortLabel: 'ZAG',   region: 'Europe',      lat: 45.8150,   lon: 15.9819,   alt: 30_000 },
  { key: 'belgrade',         label: 'BELGRADE',              shortLabel: 'BEG',   region: 'Europe',      lat: 44.7866,   lon: 20.4489,   alt: 30_000 },
  { key: 'sarajevo',         label: 'SARAJEVO',              shortLabel: 'SJJ',   region: 'Europe',      lat: 43.8563,   lon: 18.4131,   alt: 30_000 },
  { key: 'podgorica',        label: 'PODGORICA',             shortLabel: 'TGD',   region: 'Europe',      lat: 42.4304,   lon: 19.2594,   alt: 30_000 },
  { key: 'skopje',           label: 'SKOPJE',                shortLabel: 'SKP',   region: 'Europe',      lat: 41.9973,   lon: 21.4280,   alt: 30_000 },
  { key: 'tirana',           label: 'TIRANA',                shortLabel: 'TIA',   region: 'Europe',      lat: 41.3275,   lon: 19.8187,   alt: 30_000 },
  { key: 'pristina',         label: 'PRISTINA',              shortLabel: 'PRN',   region: 'Europe',      lat: 42.6629,   lon: 21.1655,   alt: 30_000 },
  { key: 'ljubljana',        label: 'LJUBLJANA',             shortLabel: 'LJU',   region: 'Europe',      lat: 46.0569,   lon: 14.5058,   alt: 30_000 },
  { key: 'bratislava',       label: 'BRATISLAVA',            shortLabel: 'BTS',   region: 'Europe',      lat: 48.1486,   lon: 17.1077,   alt: 30_000 },
  { key: 'vilnius',          label: 'VILNIUS',               shortLabel: 'VNO',   region: 'Europe',      lat: 54.6872,   lon: 25.2797,   alt: 30_000 },
  { key: 'riga',             label: 'RIGA',                  shortLabel: 'RIX',   region: 'Europe',      lat: 56.9496,   lon: 24.1052,   alt: 30_000 },
  { key: 'tallinn',          label: 'TALLINN',               shortLabel: 'TLL',   region: 'Europe',      lat: 59.4370,   lon: 24.7536,   alt: 30_000 },
  { key: 'minsk',            label: 'MINSK',                 shortLabel: 'MSQ',   region: 'Europe',      lat: 53.9006,   lon: 27.5590,   alt: 30_000 },
  { key: 'chisinau',         label: 'CHIȘINĂU',              shortLabel: 'KIV',   region: 'Europe',      lat: 47.0105,   lon: 28.8638,   alt: 30_000 },
  { key: 'nicosia',          label: 'NICOSIA',               shortLabel: 'NIC',   region: 'Europe',      lat: 35.1856,   lon: 33.3823,   alt: 30_000 },

  // =====================================================================
  //  EUROPE — Caucasus
  // =====================================================================
  { key: 'tbilisi',          label: 'TBILISI',               shortLabel: 'TBS',   region: 'Europe',      lat: 41.7151,   lon: 44.8271,   alt: 30_000 },
  { key: 'yerevan',          label: 'YEREVAN',               shortLabel: 'EVN',   region: 'Europe',      lat: 40.1792,   lon: 44.4991,   alt: 30_000 },
  { key: 'baku',             label: 'BAKU',                  shortLabel: 'GYD',   region: 'Europe',      lat: 40.4093,   lon: 49.8671,   alt: 30_000 },

  // =====================================================================
  //  MIDDLE EAST
  // =====================================================================
  { key: 'tehran',           label: 'TEHRAN',                shortLabel: 'THR',   region: 'Middle East', lat: 35.6892,   lon: 51.3890,   alt: 30_000 },
  { key: 'riyadh',           label: 'RIYADH',                shortLabel: 'RUH',   region: 'Middle East', lat: 24.7136,   lon: 46.6753,   alt: 30_000 },
  { key: 'jerusalem',        label: 'JERUSALEM',             shortLabel: 'JRS',   region: 'Middle East', lat: 31.7683,   lon: 35.2137,   alt: 30_000 },
  { key: 'dubai',            label: 'DUBAI',                 shortLabel: 'DXB',   region: 'Middle East', lat: 25.2048,   lon: 55.2708,   alt: 30_000 },
  { key: 'abudhabi',         label: 'ABU DHABI',             shortLabel: 'AUH',   region: 'Middle East', lat: 24.4539,   lon: 54.3773,   alt: 30_000 },
  { key: 'baghdad',          label: 'BAGHDAD',               shortLabel: 'BGW',   region: 'Middle East', lat: 33.3152,   lon: 44.3661,   alt: 30_000 },
  { key: 'damascus',         label: 'DAMASCUS',              shortLabel: 'DAM',   region: 'Middle East', lat: 33.5138,   lon: 36.2765,   alt: 30_000 },
  { key: 'amman',            label: 'AMMAN',                 shortLabel: 'AMM',   region: 'Middle East', lat: 31.9454,   lon: 35.9284,   alt: 30_000 },
  { key: 'beirut',           label: 'BEIRUT',                shortLabel: 'BEY',   region: 'Middle East', lat: 33.8938,   lon: 35.5018,   alt: 30_000 },
  { key: 'kuwait',           label: 'KUWAIT CITY',           shortLabel: 'KWI',   region: 'Middle East', lat: 29.3759,   lon: 47.9774,   alt: 30_000 },
  { key: 'manama',           label: 'MANAMA',                shortLabel: 'BAH',   region: 'Middle East', lat: 26.2285,   lon: 50.5860,   alt: 30_000 },
  { key: 'doha',             label: 'DOHA',                  shortLabel: 'DOH',   region: 'Middle East', lat: 25.2854,   lon: 51.5310,   alt: 30_000 },
  { key: 'muscat',           label: 'MUSCAT',                shortLabel: 'MCT',   region: 'Middle East', lat: 23.5880,   lon: 58.3829,   alt: 30_000 },
  { key: 'sanaa',            label: "SANA'A",                shortLabel: 'SAH',   region: 'Middle East', lat: 15.3694,   lon: 44.1910,   alt: 30_000 },

  // =====================================================================
  //  ASIA — Central
  // =====================================================================
  { key: 'astana',           label: 'ASTANA',                shortLabel: 'NQZ',   region: 'Asia',        lat: 51.1694,   lon: 71.4491,   alt: 30_000 },
  { key: 'tashkent',         label: 'TASHKENT',              shortLabel: 'TAS',   region: 'Asia',        lat: 41.2995,   lon: 69.2401,   alt: 30_000 },
  { key: 'ashgabat',         label: 'ASHGABAT',              shortLabel: 'ASB',   region: 'Asia',        lat: 37.9601,   lon: 58.3261,   alt: 30_000 },
  { key: 'bishkek',          label: 'BISHKEK',               shortLabel: 'FRU',   region: 'Asia',        lat: 42.8746,   lon: 74.5698,   alt: 30_000 },
  { key: 'dushanbe',         label: 'DUSHANBE',              shortLabel: 'DYU',   region: 'Asia',        lat: 38.5598,   lon: 68.7740,   alt: 30_000 },

  // =====================================================================
  //  ASIA — East
  // =====================================================================
  { key: 'tokyo',            label: 'TOKYO',                 shortLabel: 'TYO',   region: 'Asia',        lat: 35.6762,   lon: 139.6503,  alt: 30_000 },
  { key: 'beijing',          label: 'BEIJING',               shortLabel: 'PEK',   region: 'Asia',        lat: 39.9042,   lon: 116.4074,  alt: 30_000 },
  { key: 'seoul',            label: 'SEOUL',                 shortLabel: 'ICN',   region: 'Asia',        lat: 37.5665,   lon: 126.9780,  alt: 30_000 },
  { key: 'pyongyang',        label: 'PYONGYANG',             shortLabel: 'FNJ',   region: 'Asia',        lat: 39.0392,   lon: 125.7625,  alt: 30_000 },
  { key: 'taipei',           label: 'TAIPEI',                shortLabel: 'TPE',   region: 'Asia',        lat: 25.0330,   lon: 121.5654,  alt: 30_000 },
  { key: 'hongkong',          label: 'HONG KONG',             shortLabel: 'HKG',   region: 'Asia',        lat: 22.3193,   lon: 114.1694,  alt: 30_000 },
  { key: 'ulaanbaatar',      label: 'ULAANBAATAR',           shortLabel: 'ULN',   region: 'Asia',        lat: 47.8864,   lon: 106.9057,  alt: 30_000 },

  // =====================================================================
  //  ASIA — South
  // =====================================================================
  { key: 'delhi',            label: 'NEW DELHI',             shortLabel: 'DEL',   region: 'Asia',        lat: 28.6139,   lon: 77.2090,   alt: 30_000 },
  { key: 'islamabad',        label: 'ISLAMABAD',             shortLabel: 'ISB',   region: 'Asia',        lat: 33.6844,   lon: 73.0479,   alt: 30_000 },
  { key: 'dhaka',            label: 'DHAKA',                 shortLabel: 'DAC',   region: 'Asia',        lat: 23.8103,   lon: 90.4125,   alt: 30_000 },
  { key: 'colombo',          label: 'COLOMBO',               shortLabel: 'CMB',   region: 'Asia',        lat: 6.9271,    lon: 79.8612,   alt: 30_000 },
  { key: 'kathmandu',        label: 'KATHMANDU',             shortLabel: 'KTM',   region: 'Asia',        lat: 27.7172,   lon: 85.3240,   alt: 30_000 },
  { key: 'thimphu',          label: 'THIMPHU',               shortLabel: 'THI',   region: 'Asia',        lat: 27.4728,   lon: 89.6390,   alt: 30_000 },
  { key: 'male',             label: 'MALÉ',                  shortLabel: 'MLE',   region: 'Asia',        lat: 4.1755,    lon: 73.5093,   alt: 30_000 },
  { key: 'kabul',            label: 'KABUL',                 shortLabel: 'KBL',   region: 'Asia',        lat: 34.5553,   lon: 69.2075,   alt: 30_000 },

  // =====================================================================
  //  ASIA — Southeast
  // =====================================================================
  { key: 'singapore',        label: 'SINGAPORE',             shortLabel: 'SIN',   region: 'Asia',        lat: 1.3521,    lon: 103.8198,  alt: 30_000 },
  { key: 'jakarta',          label: 'JAKARTA',               shortLabel: 'CGK',   region: 'Asia',        lat: -6.2088,   lon: 106.8456,  alt: 30_000 },
  { key: 'bangkok',          label: 'BANGKOK',               shortLabel: 'BKK',   region: 'Asia',        lat: 13.7563,   lon: 100.5018,  alt: 30_000 },
  { key: 'hanoi',            label: 'HANOI',                 shortLabel: 'HAN',   region: 'Asia',        lat: 21.0278,   lon: 105.8342,  alt: 30_000 },
  { key: 'manila',           label: 'MANILA',                shortLabel: 'MNL',   region: 'Asia',        lat: 14.5995,   lon: 120.9842,  alt: 30_000 },
  { key: 'kualalumpur',      label: 'KUALA LUMPUR',          shortLabel: 'KUL',   region: 'Asia',        lat: 3.1390,    lon: 101.6869,  alt: 30_000 },
  { key: 'naypyidaw',        label: 'NAYPYIDAW',             shortLabel: 'NYT',   region: 'Asia',        lat: 19.7633,   lon: 96.0785,   alt: 30_000 },
  { key: 'phnompenh',        label: 'PHNOM PENH',            shortLabel: 'PNH',   region: 'Asia',        lat: 11.5564,   lon: 104.9282,  alt: 30_000 },
  { key: 'vientiane',        label: 'VIENTIANE',             shortLabel: 'VTE',   region: 'Asia',        lat: 17.9757,   lon: 102.6331,  alt: 30_000 },
  { key: 'bandar',           label: 'BANDAR SERI BEGAWAN',   shortLabel: 'BWN',   region: 'Asia',        lat: 4.9431,    lon: 114.9425,  alt: 30_000 },
  { key: 'dili',             label: 'DILI',                  shortLabel: 'DIL',   region: 'Asia',        lat: -8.5569,   lon: 125.5603,  alt: 30_000 },

  // =====================================================================
  //  AFRICA — North
  // =====================================================================
  { key: 'cairo',            label: 'CAIRO',                 shortLabel: 'CAI',   region: 'Africa',      lat: 30.0444,   lon: 31.2357,   alt: 30_000 },
  { key: 'algiers',          label: 'ALGIERS',               shortLabel: 'ALG',   region: 'Africa',      lat: 36.7538,   lon: 3.0588,    alt: 30_000 },
  { key: 'rabat',            label: 'RABAT',                 shortLabel: 'RBA',   region: 'Africa',      lat: 34.0209,   lon: -6.8416,   alt: 30_000 },
  { key: 'tunis',            label: 'TUNIS',                 shortLabel: 'TUN',   region: 'Africa',      lat: 36.8065,   lon: 10.1815,   alt: 30_000 },
  { key: 'tripoli',          label: 'TRIPOLI',               shortLabel: 'TIP',   region: 'Africa',      lat: 32.8872,   lon: 13.1913,   alt: 30_000 },
  { key: 'khartoum',         label: 'KHARTOUM',              shortLabel: 'KRT',   region: 'Africa',      lat: 15.5007,   lon: 32.5599,   alt: 30_000 },
  { key: 'nouakchott',       label: 'NOUAKCHOTT',            shortLabel: 'NKC',   region: 'Africa',      lat: 18.0735,   lon: -15.9582,  alt: 30_000 },

  // =====================================================================
  //  AFRICA — West
  // =====================================================================
  { key: 'lagos',            label: 'LAGOS',                 shortLabel: 'LOS',   region: 'Africa',      lat: 6.5244,    lon: 3.3792,    alt: 30_000 },
  { key: 'abuja',            label: 'ABUJA',                 shortLabel: 'ABV',   region: 'Africa',      lat: 9.0579,    lon: 7.4951,    alt: 30_000 },
  { key: 'accra',            label: 'ACCRA',                 shortLabel: 'ACC',   region: 'Africa',      lat: 5.6037,    lon: -0.1870,   alt: 30_000 },
  { key: 'dakar',            label: 'DAKAR',                 shortLabel: 'DSS',   region: 'Africa',      lat: 14.7167,   lon: -17.4677,  alt: 30_000 },
  { key: 'bamako',           label: 'BAMAKO',                shortLabel: 'BKO',   region: 'Africa',      lat: 12.6392,   lon: -8.0029,   alt: 30_000 },
  { key: 'ouagadougou',      label: 'OUAGADOUGOU',           shortLabel: 'OUA',   region: 'Africa',      lat: 12.3714,   lon: -1.5197,   alt: 30_000 },
  { key: 'niamey',           label: 'NIAMEY',                shortLabel: 'NIM',   region: 'Africa',      lat: 13.5116,   lon: 2.1254,    alt: 30_000 },
  { key: 'conakry',          label: 'CONAKRY',               shortLabel: 'CKY',   region: 'Africa',      lat: 9.6412,    lon: -13.5784,  alt: 30_000 },
  { key: 'freetown',         label: 'FREETOWN',              shortLabel: 'FNA',   region: 'Africa',      lat: 8.4657,    lon: -13.2317,  alt: 30_000 },
  { key: 'monrovia',         label: 'MONROVIA',              shortLabel: 'ROB',   region: 'Africa',      lat: 6.2907,    lon: -10.7605,  alt: 30_000 },
  { key: 'lome',             label: 'LOMÉ',                  shortLabel: 'LFW',   region: 'Africa',      lat: 6.1256,    lon: 1.2254,    alt: 30_000 },
  { key: 'portonovo',        label: 'PORTO-NOVO',            shortLabel: 'PON',   region: 'Africa',      lat: 6.4969,    lon: 2.6289,    alt: 30_000 },
  { key: 'yamoussoukro',     label: 'YAMOUSSOUKRO',          shortLabel: 'YAM',   region: 'Africa',      lat: 6.8276,    lon: -5.2893,   alt: 30_000 },
  { key: 'banjul',           label: 'BANJUL',                shortLabel: 'BJL',   region: 'Africa',      lat: 13.4549,   lon: -16.5790,  alt: 30_000 },
  { key: 'bissau',           label: 'BISSAU',                shortLabel: 'BIS',   region: 'Africa',      lat: 11.8037,   lon: -15.1804,  alt: 30_000 },
  { key: 'praia',            label: 'PRAIA',                 shortLabel: 'RAI',   region: 'Africa',      lat: 14.9331,   lon: -23.5133,  alt: 30_000 },

  // =====================================================================
  //  AFRICA — Central
  // =====================================================================
  { key: 'kinshasa',         label: 'KINSHASA',              shortLabel: 'FIH',   region: 'Africa',      lat: -4.4419,   lon: 15.2663,   alt: 30_000 },
  { key: 'brazzaville',      label: 'BRAZZAVILLE',           shortLabel: 'BZV',   region: 'Africa',      lat: -4.2634,   lon: 15.2429,   alt: 30_000 },
  { key: 'yaounde',          label: 'YAOUNDÉ',               shortLabel: 'YAO',   region: 'Africa',      lat: 3.8480,    lon: 11.5021,   alt: 30_000 },
  { key: 'ndjamena',         label: "N'DJAMENA",             shortLabel: 'NDJ',   region: 'Africa',      lat: 12.1348,   lon: 15.0557,   alt: 30_000 },
  { key: 'bangui',           label: 'BANGUI',                shortLabel: 'BGF',   region: 'Africa',      lat: 4.3947,    lon: 18.5582,   alt: 30_000 },
  { key: 'libreville',       label: 'LIBREVILLE',            shortLabel: 'LBV',   region: 'Africa',      lat: 0.4162,    lon: 9.4673,    alt: 30_000 },
  { key: 'malabo',           label: 'MALABO',                shortLabel: 'SSG',   region: 'Africa',      lat: 3.7504,    lon: 8.7371,    alt: 30_000 },
  { key: 'saotome',          label: 'SÃO TOMÉ',              shortLabel: 'TMS',   region: 'Africa',      lat: 0.1864,    lon: 6.6131,    alt: 30_000 },

  // =====================================================================
  //  AFRICA — East
  // =====================================================================
  { key: 'nairobi',          label: 'NAIROBI',               shortLabel: 'NBO',   region: 'Africa',      lat: -1.2921,   lon: 36.8219,   alt: 30_000 },
  { key: 'addisababa',       label: 'ADDIS ABABA',           shortLabel: 'ADD',   region: 'Africa',      lat: 9.0250,    lon: 38.7469,   alt: 30_000 },
  { key: 'dodoma',           label: 'DODOMA',                shortLabel: 'DOD',   region: 'Africa',      lat: -6.1630,   lon: 35.7516,   alt: 30_000 },
  { key: 'kampala',          label: 'KAMPALA',               shortLabel: 'EBB',   region: 'Africa',      lat: 0.3476,    lon: 32.5825,   alt: 30_000 },
  { key: 'kigali',           label: 'KIGALI',                shortLabel: 'KGL',   region: 'Africa',      lat: -1.9403,   lon: 29.8739,   alt: 30_000 },
  { key: 'gitega',           label: 'GITEGA',                shortLabel: 'GIT',   region: 'Africa',      lat: -3.4264,   lon: 29.9246,   alt: 30_000 },
  { key: 'juba',             label: 'JUBA',                  shortLabel: 'JUB',   region: 'Africa',      lat: 4.8594,    lon: 31.5713,   alt: 30_000 },
  { key: 'mogadishu',        label: 'MOGADISHU',             shortLabel: 'MGQ',   region: 'Africa',      lat: 2.0469,    lon: 45.3182,   alt: 30_000 },
  { key: 'asmara',           label: 'ASMARA',                shortLabel: 'ASM',   region: 'Africa',      lat: 15.3229,   lon: 38.9251,   alt: 30_000 },
  { key: 'djibouti',         label: 'DJIBOUTI',              shortLabel: 'JIB',   region: 'Africa',      lat: 11.5721,   lon: 43.1456,   alt: 30_000 },
  { key: 'moroni',           label: 'MORONI',                shortLabel: 'HAH',   region: 'Africa',      lat: -11.7172,  lon: 43.2551,   alt: 30_000 },
  { key: 'antananarivo',     label: 'ANTANANARIVO',           shortLabel: 'TNR',   region: 'Africa',      lat: -18.8792,  lon: 47.5079,   alt: 30_000 },
  { key: 'portlouis',        label: 'PORT LOUIS',            shortLabel: 'MRU',   region: 'Africa',      lat: -20.1609,  lon: 57.5012,   alt: 30_000 },
  { key: 'victoria',         label: 'VICTORIA',              shortLabel: 'SEZ',   region: 'Africa',      lat: -4.6191,   lon: 55.4513,   alt: 30_000 },

  // =====================================================================
  //  AFRICA — Southern
  // =====================================================================
  { key: 'pretoria',         label: 'PRETORIA',              shortLabel: 'PRY',   region: 'Africa',      lat: -25.7479,  lon: 28.2293,   alt: 30_000 },
  { key: 'maputo',           label: 'MAPUTO',                shortLabel: 'MPM',   region: 'Africa',      lat: -25.9692,  lon: 32.5732,   alt: 30_000 },
  { key: 'harare',           label: 'HARARE',                shortLabel: 'HRE',   region: 'Africa',      lat: -17.8252,  lon: 31.0335,   alt: 30_000 },
  { key: 'lusaka',           label: 'LUSAKA',                shortLabel: 'LUN',   region: 'Africa',      lat: -15.3875,  lon: 28.3228,   alt: 30_000 },
  { key: 'lilongwe',         label: 'LILONGWE',              shortLabel: 'LLW',   region: 'Africa',      lat: -13.9626,  lon: 33.7741,   alt: 30_000 },
  { key: 'gaborone',         label: 'GABORONE',              shortLabel: 'GBE',   region: 'Africa',      lat: -24.6282,  lon: 25.9231,   alt: 30_000 },
  { key: 'windhoek',         label: 'WINDHOEK',              shortLabel: 'WDH',   region: 'Africa',      lat: -22.5609,  lon: 17.0658,   alt: 30_000 },
  { key: 'luanda',           label: 'LUANDA',                shortLabel: 'LAD',   region: 'Africa',      lat: -8.8390,   lon: 13.2894,   alt: 30_000 },
  { key: 'mbabane',          label: 'MBABANE',               shortLabel: 'MBB',   region: 'Africa',      lat: -26.3054,  lon: 31.1367,   alt: 30_000 },
  { key: 'maseru',           label: 'MASERU',                shortLabel: 'MSU',   region: 'Africa',      lat: -29.3167,  lon: 27.4833,   alt: 30_000 },

  // =====================================================================
  //  OCEANIA
  // =====================================================================
  { key: 'sydney',           label: 'SYDNEY',                shortLabel: 'SYD',   region: 'Oceania',     lat: -33.8688,  lon: 151.2093,  alt: 30_000 },
  { key: 'canberra',         label: 'CANBERRA',              shortLabel: 'CBR',   region: 'Oceania',     lat: -35.2809,  lon: 149.1300,  alt: 30_000 },
  { key: 'wellington',       label: 'WELLINGTON',            shortLabel: 'WLG',   region: 'Oceania',     lat: -41.2865,  lon: 174.7762,  alt: 30_000 },
  { key: 'portmoresby',      label: 'PORT MORESBY',          shortLabel: 'POM',   region: 'Oceania',     lat: -6.3149,   lon: 143.9556,  alt: 30_000 },
  { key: 'suva',             label: 'SUVA',                  shortLabel: 'SUV',   region: 'Oceania',     lat: -18.1416,  lon: 178.4419,  alt: 30_000 },
  { key: 'honiara',          label: 'HONIARA',               shortLabel: 'HIR',   region: 'Oceania',     lat: -9.4456,   lon: 159.9729,  alt: 30_000 },
  { key: 'portvila',         label: 'PORT VILA',             shortLabel: 'VLI',   region: 'Oceania',     lat: -17.7334,  lon: 168.3273,  alt: 30_000 },
  { key: 'apia',             label: 'APIA',                  shortLabel: 'APW',   region: 'Oceania',     lat: -13.8333,  lon: -171.7500, alt: 30_000 },
  { key: 'nukualofa',        label: "NUKU'ALOFA",            shortLabel: 'TBU',   region: 'Oceania',     lat: -21.2087,  lon: -175.1982, alt: 30_000 },
  { key: 'tarawa',           label: 'TARAWA',                shortLabel: 'TRW',   region: 'Oceania',     lat: 1.4518,    lon: 172.9717,  alt: 30_000 },
  { key: 'palikir',          label: 'PALIKIR',               shortLabel: 'PNI',   region: 'Oceania',     lat: 6.9248,    lon: 158.1610,  alt: 30_000 },
  { key: 'majuro',           label: 'MAJURO',                shortLabel: 'MAJ',   region: 'Oceania',     lat: 7.0897,    lon: 171.3803,  alt: 30_000 },
  { key: 'ngerulmud',        label: 'NGERULMUD',             shortLabel: 'ROR',   region: 'Oceania',     lat: 7.5006,    lon: 134.6244,  alt: 30_000 },
  { key: 'funafuti',         label: 'FUNAFUTI',              shortLabel: 'FUN',   region: 'Oceania',     lat: -8.5211,   lon: 179.1962,  alt: 30_000 },
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
