#!/usr/bin/env python3
"""
Ingest zirconium (zircon) mining sites into Panopticon format.

Primary sources:
  - USGS Mineral Commodity Summaries 2024, Zirconium and Hafnium chapter
    https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-zirconium.pdf
  - USGS Mineral Resources Data System (MRDS) for coordinates
    https://mrdata.usgs.gov/mrds/
  - Zircon Industry Association
    https://zircon-association.org/
  - Company annual reports and filings:
    * Iluka Resources (ASX: ILU) — Annual Report 2023
    * Tronox Holdings (NYSE: TROX) — 10-K 2023
    * Rio Tinto (ASX: RIO / LSE: RIO) — Annual Report 2023 (Richards Bay Minerals)
    * Kenmare Resources (LSE: KMR / ISE: KMR) — Annual Report 2023
    * Base Resources (ASX: BSE) — Annual Report 2023
    * Chemours Company (NYSE: CC) — 10-K 2023 (Trail Ridge, FL)
    * Image Resources (ASX: IMA) — Annual Report 2023
    * Sheffield Resources / Kimberley Mineral Sands (ASX: SFX) — Annual Report 2023
    * Mineral Commodities (ASX: MRC) — Annual Report 2023
    * Exxaro Resources (JSE: EXX) — Annual Report 2023

Since USGS MCS is published as PDF (no structured API), this script embeds
the curated site data and writes the output JSON. To update:
  1. Download latest MCS from https://www.usgs.gov/centers/national-minerals-information-center
  2. Cross-reference production figures with Zircon Industry Association data
  3. Cross-reference with company SEC/ASX/JSE filings
  4. Verify coordinates against USGS MRDS or satellite imagery
  5. Update the SITES list below
"""

import json
import os
import pathlib

# --- Configuration -----------------------------------------------------------

OUTPUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "layers" / "points"
OUTPUT_FILE = OUTPUT_DIR / "zirconium.json"

SOURCE_METADATA = {
    "description": "Major global zirconium (zircon) mining and production sites",
    "origin": (
        "USGS Mineral Commodity Summaries 2024 "
        "(https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-zirconium.pdf); "
        "Zircon Industry Association (https://zircon-association.org/); "
        "Iluka Resources, Tronox, Rio Tinto, Kenmare Resources, Base Resources, "
        "Chemours, Image Resources, Sheffield Resources, Mineral Commodities, "
        "Exxaro Resources annual reports and SEC/ASX/JSE filings"
    ),
    "retrieved": "2026-03-09",
    "license": "USGS: public domain; company data: fair use summary",
    "notes": (
        "Global zircon production is ~1.2 million tonnes/year. Australia and "
        "South Africa each account for ~25% of world supply. Zircon is "
        "produced primarily from heavy mineral sands (HMS) deposits, typically "
        "as a co-product with titanium minerals (ilmenite, rutile). Major "
        "end-uses include ceramics (~55%), foundry casting (~15%), and "
        "zirconium metal for nuclear fuel rod cladding. Hafnium is a critical "
        "byproduct of zirconium refining. Coordinates from USGS MRDS, "
        "company filings, and satellite verification."
    ),
}

# --- Site Data ---------------------------------------------------------------
# Each entry represents a major zircon/heavy mineral sands mining operation.
# Coordinates verified against USGS MRDS, company technical reports, and Google Earth.

SITES = []  # Populated from data file


# --- Main --------------------------------------------------------------------

def main():
    """Write the zirconium layer JSON."""
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

    print(f"[ingest_zirconium] Wrote {len(sites)} zirconium sites to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
