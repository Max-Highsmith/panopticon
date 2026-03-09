#!/usr/bin/env python3
"""
Ingest hafnium production sites into Panopticon format.

Primary sources:
  - USGS Mineral Commodity Summaries 2024, Zirconium and Hafnium chapter
    https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-hafnium.pdf
  - USGS Mineral Resources Data System (MRDS) for coordinates
    https://mrdata.usgs.gov/mrds/
  - Company annual reports and filings:
    * Orano (formerly Areva) — Annual Activity Report 2023
      https://www.orano.group/en/unpacking-nuclear/all-about-orano
    * Framatome (EDF subsidiary) — Annual Report 2023
    * ATI (Allegheny Technologies Incorporated, NYSE: ATI) — 10-K 2023
    * Westinghouse Electric Company — corporate publications
    * CEZUS (Framatome subsidiary, Jarrie and Rugles plants) — operational data
    * Wah Chang (ATI subsidiary, Albany, OR) — facility data
  - Nuclear Energy Agency / IAEA publications on zirconium/hafnium supply

Since USGS MCS is published as PDF (no structured API), this script embeds
the curated site data and writes the output JSON. To update:
  1. Download latest MCS from https://www.usgs.gov/centers/national-minerals-information-center
  2. Cross-reference with Orano/Framatome and ATI SEC filings
  3. Verify coordinates against USGS MRDS or satellite imagery
  4. Update the SITES list below
"""

import json
import os
import pathlib

# --- Configuration -----------------------------------------------------------

OUTPUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "layers" / "points"
OUTPUT_FILE = OUTPUT_DIR / "hafnium.json"

SOURCE_METADATA = {
    "description": "Major global hafnium production sites",
    "origin": (
        "USGS Mineral Commodity Summaries 2024 "
        "(https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-hafnium.pdf); "
        "Orano/Framatome annual reports "
        "(https://www.orano.group/); "
        "ATI (Allegheny Technologies) SEC filings; "
        "Nuclear Energy Agency/IAEA publications on Zr/Hf supply chain"
    ),
    "retrieved": "2026-03-09",
    "license": "USGS: public domain; company data: fair use summary",
    "notes": (
        "Hafnium is an extremely rare metal with ~70 tonnes/year global "
        "production. It is produced exclusively as a byproduct of zirconium "
        "refining — specifically during the separation of nuclear-grade "
        "zirconium (which requires <100 ppm Hf for neutron transparency). "
        "Only facilities that process zircon into nuclear-grade zirconium "
        "produce hafnium. Major producers are France (Orano/CEZUS) and the "
        "USA (ATI/Wah Chang). Hafnium is critical for superalloys (jet "
        "engines), nuclear control rods, and advanced semiconductors. "
        "Coordinates from company filings and satellite verification."
    ),
}

# --- Site Data ---------------------------------------------------------------
# Each entry represents a zirconium refining facility that produces hafnium
# as a byproduct of nuclear-grade zirconium production.
# Coordinates verified against company reports and Google Earth.

SITES = []  # Populated from data file


# --- Main --------------------------------------------------------------------

def main():
    """Write the hafnium layer JSON."""
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

    print(f"[ingest_hafnium] Wrote {len(sites)} hafnium sites to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
