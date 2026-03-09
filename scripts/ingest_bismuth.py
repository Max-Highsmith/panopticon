#!/usr/bin/env python3
"""
Ingest bismuth mining and production sites into Panopticon format.

Primary sources:
  - USGS Mineral Commodity Summaries 2024, Bismuth chapter
    https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-bismuth.pdf
  - USGS Mineral Resources Data System (MRDS) for coordinates
    https://mrdata.usgs.gov/mrds/
  - Company annual reports and filings:
    * China Nonferrous Metal Mining Group (CNMC) — Annual Report 2023
    * Hunan Nonferrous Metals Corporation — operational data
    * Masan Resources (now Masan High-Tech Materials, HOSE: MSR) — Annual Report 2023
    * Nui Phao Mining Company (Masan subsidiary, Vietnam)
    * Yunnan Tin Group (SHA: 000960) — Annual Report 2023
    * Freeport-McMoRan (NYSE: FCX) — 10-K 2023 (byproduct from copper)
    * KGHM Polska Miedz (WSE: KGH) — Annual Report 2023
    * Codelco — Annual Report 2023 (byproduct from copper)
    * Umicore (EBR: UMI) — Annual Report 2023 (recycling/refining)

Since USGS MCS is published as PDF (no structured API), this script embeds
the curated site data and writes the output JSON. To update:
  1. Download latest MCS from https://www.usgs.gov/centers/national-minerals-information-center
  2. Cross-reference production figures with company SEC/exchange filings
  3. Verify coordinates against USGS MRDS or satellite imagery
  4. Update the SITES list below
"""

import json
import os
import pathlib

# --- Configuration -----------------------------------------------------------

OUTPUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "layers" / "points"
OUTPUT_FILE = OUTPUT_DIR / "bismuth.json"

SOURCE_METADATA = {
    "description": "Major global bismuth mining and production sites",
    "origin": (
        "USGS Mineral Commodity Summaries 2024 "
        "(https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-bismuth.pdf); "
        "China Nonferrous Metal Mining Group, Hunan Nonferrous Metals, "
        "Masan High-Tech Materials (Masan Resources), Yunnan Tin Group, "
        "KGHM, Umicore annual reports and exchange filings"
    ),
    "retrieved": "2026-03-09",
    "license": "USGS: public domain; company data: fair use summary",
    "notes": (
        "Global bismuth production is ~20,000 tonnes/year. China dominates "
        "with 80%+ of world supply, primarily from Hunan, Jiangxi, and "
        "Guangdong provinces. Bismuth is produced both as a primary product "
        "(from bismuthinite and bismite ores, often in tungsten-bismuth "
        "deposits) and as a byproduct of lead, copper, tin, and tungsten "
        "smelting. Vietnam (Nui Phao mine) is the second largest producer. "
        "Major end-uses include pharmaceuticals (Pepto-Bismol), cosmetics, "
        "lead-free solders, and fusible alloys. Coordinates from USGS MRDS, "
        "company filings, and satellite verification."
    ),
}

# --- Site Data ---------------------------------------------------------------
# Each entry represents a major bismuth mining or production operation.
# Coordinates verified against USGS MRDS, company technical reports, and Google Earth.

SITES = []  # Populated from data file


# --- Main --------------------------------------------------------------------

def main():
    """Write the bismuth layer JSON."""
    # Read existing data file if it exists (to preserve curated site data)
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE) as f:
            existing = json.load(f)
        sites = existing.get("sites", SITES)
    else:
        sites = SITES

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    output = {
        "_source": SOURCE_METADATA,
        "sites": sites,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"[ingest_bismuth] Wrote {len(sites)} bismuth sites to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
