# Critical Minerals Layer Specification

## Overview

Each of the 30 DOE critical minerals gets its own dedicated point layer.
This replaces the old catch-all `mines.json` (which mixed cobalt, lithium, bitcoin).

## Data File Schema

Path: `data/layers/points/<mineral>.json`

```json
{
  "_source": {
    "description": "Major global <mineral> mining and production sites",
    "origin": "USGS Mineral Commodity Summaries 2024 (https://pubs.usgs.gov/periodicals/mcs2024/); S&P Global Market Intelligence mine database; company annual reports and SEC/ASX filings",
    "retrieved": "YYYY-MM-DD",
    "license": "USGS: public domain; company data: fair use summary",
    "notes": "Top producing mines globally. Coordinates from USGS MRDS, company filings, and satellite verification."
  },
  "_coverage": {
    "global_production_2023_tpa": 230000,
    "global_production_unit": "cobalt metal content",
    "global_production_source": "USGS MCS 2024",
    "operating_nameplate_tpa": 155900,
    "estimated_coverage_pct": 51,
    "site_count": 39,
    "operating_count": 28,
    "development_count": 9,
    "known_gaps": "Description of what's missing and why",
    "audit_date": "YYYY-MM-DD"
  },
  "sites": [
    {
      "name": "Mine Name",
      "lat": -10.603,
      "lon": 26.135,
      "country": "DRC",
      "operator": "CMOC Group",
      "ownership": "CMOC 80%, Gecamines 20%",
      "status": "operating",
      "type": "open-pit",
      "products": ["cobalt", "copper"],
      "capacity_tpa": 25000,
      "production_year": 2023,
      "reserves_mt": 3.1,
      "grade": "0.3% Co",
      "notes": "One of world's largest cobalt-copper deposits"
    }
  ]
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | YES | Mine/facility name |
| `lat` | number | YES | Latitude (WGS84) |
| `lon` | number | YES | Longitude (WGS84) |
| `country` | string | YES | Country name or ISO code |
| `operator` | string | YES | Current operator/owner |
| `ownership` | string | no | Ownership breakdown if joint venture |
| `status` | string | YES | One of: `operating`, `development`, `suspended`, `closed`, `exploration` |
| `type` | string | YES | Mine type: `open-pit`, `underground`, `brine`, `placer`, `byproduct`, `alluvial`, `in-situ` |
| `products` | string[] | YES | Array of minerals produced (primary first) |
| `capacity_tpa` | number | no | Annual production capacity in tonnes per annum |
| `production_year` | number | no | Year the capacity/production figure refers to |
| `reserves_mt` | number | no | Proven + probable reserves in million tonnes of ore |
| `grade` | string | no | Ore grade (format varies by mineral) |
| `notes` | string | no | Additional context |

### Coverage Metadata (MANDATORY)

Every mineral layer must include a `_coverage` block that documents what fraction of global
production the dataset represents. This is critical for data integrity — users must know
whether they're looking at 90% of global supply or 40%.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `global_production_2023_tpa` | number | YES | USGS-reported global production in tonnes/year |
| `global_production_unit` | string | YES | What the tpa figure measures (e.g. "LCE", "metal content", "concentrate") |
| `global_production_source` | string | YES | Source citation for the global figure |
| `operating_nameplate_tpa` | number | YES | Sum of `capacity_tpa` for all operating sites in this file |
| `estimated_coverage_pct` | number | YES | Estimated % of global production covered (at ~75% utilization) |
| `site_count` | number | YES | Total sites in file |
| `operating_count` | number | YES | Sites with status "operating" |
| `development_count` | number | YES | Sites with status "development" |
| `known_gaps` | string | YES | Honest description of what's missing and why |
| `audit_date` | string | YES | Date coverage was last verified (YYYY-MM-DD) |

### Status Values

- `operating` — currently producing
- `development` — under construction or in permitting
- `suspended` — temporarily closed (care & maintenance)
- `closed` — permanently closed
- `exploration` — advanced exploration / feasibility stage

### Site Count Target

Each mineral layer should have **10-15 major sites** representing the most significant global operations.

## Layer JS File

Path: `js/layers/<mineral>layer.js`

Uses `createDataLayer()` with a single category key `"sites"`.

The `descFn` must pack all detail fields into the description string using `//` separators,
matching the format expected by `extractOperator()`, `extractCountry()`, `extractNotes()` in viewbase.js:

```
"operator // country // status: <status> | type: <type> | products: <products> | capacity: <tpa> tpa | ownership: <ownership> | <notes>"
```

This ensures the click-to-view site panel shows rich detail.

## Icon Convention

All critical mineral layers use `makeDiamondIcon(color, size)` at `SZ_MINE` (28px).
Each mineral gets a unique, visually distinct color.

## Category in Layer Catalog

All critical mineral layers belong to the `'Critical Minerals'` category in layercatalog.js.
This replaces the old `'Resources'` category for mineral-specific layers.

## Ingestion Script

Path: `scripts/ingest_<mineral>.py`

Each script must:
1. Download data from USGS MCS or other authoritative API/CSV
2. Parse and transform into the JSON schema above
3. Write to `data/layers/points/<mineral>.json`
4. Include `_source` metadata
5. Be runnable: `python3 scripts/ingest_<mineral>.py`

If the primary source requires manual download, document steps in script header
and have the script process from a local file.
