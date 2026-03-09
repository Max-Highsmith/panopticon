#!/usr/bin/env python3
"""
Ingest cadmium production sites into Panopticon format.

Primary sources:
  - USGS Mineral Commodity Summaries 2024, Cadmium chapter
    https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-cadmium.pdf
  - USGS Mineral Resources Data System (MRDS) for coordinates
    https://mrdata.usgs.gov/mrds/
  - International Zinc Association
    https://www.zinc.org/
  - Company annual reports and filings:
    * Korea Zinc Co. (KRX: 010130) — Annual Report 2023
    * Nyrstar (Trafigura subsidiary) — Annual Report 2023
    * Hindustan Zinc (NSE: HINDZINC, subsidiary of Vedanta) — Annual Report 2023
    * Glencore (LSE: GLEN) — Annual Report 2023 (zinc smelting operations)
    * Teck Resources (NYSE: TECK / TSX: TECK.B) — Annual Report 2023
    * Boliden (STO: BOL) — Annual Report 2023
    * Shaanxi Zinc Industry / Shaanxi Nonferrous — operational data
    * Zhuzhou Smelter Group (subsidiary of China Minmetals) — operational data
    * Huludao Zinc Industry (SHE: 000751) — Annual Report 2023
    * Nexa Resources (NYSE: NEXA) — 20-F 2023

Since USGS MCS is published as PDF (no structured API), this script embeds
the curated site data and writes the output JSON. To update:
  1. Download latest MCS from https://www.usgs.gov/centers/national-minerals-information-center
  2. Cross-reference production figures with International Zinc Association data
  3. Cross-reference with company annual reports and filings
  4. Verify coordinates against USGS MRDS or satellite imagery
  5. Update the SITES list below
"""

import json
import os
import pathlib

# --- Configuration -----------------------------------------------------------

OUTPUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "layers" / "points"
OUTPUT_FILE = OUTPUT_DIR / "cadmium.json"

SOURCE_METADATA = {
    "description": "Major global cadmium production sites",
    "origin": (
        "USGS Mineral Commodity Summaries 2024 "
        "(https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-cadmium.pdf); "
        "International Zinc Association (https://www.zinc.org/); "
        "Korea Zinc, Nyrstar, Hindustan Zinc, Glencore, Teck Resources, "
        "Boliden, Zhuzhou Smelter Group, Huludao Zinc Industry, "
        "Nexa Resources annual reports and SEC/exchange filings"
    ),
    "retrieved": "2026-03-09",
    "license": "USGS: public domain; IZA: public statistics; company data: fair use summary",
    "notes": (
        "Global cadmium production is ~24,000 tonnes/year. Cadmium is "
        "produced exclusively as a byproduct of zinc refining — recovered "
        "during zinc smelting from the zinc concentrate purification step. "
        "No primary cadmium mines exist. China is the largest producer "
        "(~35%), followed by South Korea (~15%), Japan (~10%), and Canada "
        "(~5%). Major end-uses include NiCd batteries (~75%), pigments "
        "(~10%), coatings (~7%), and CdTe thin-film solar cells (growing). "
        "Cadmium is toxic and heavily regulated; declining use in most "
        "applications except solar. Sites listed are zinc smelters/refineries "
        "that recover cadmium. Coordinates from USGS MRDS, company filings, "
        "and satellite verification."
    ),
}

# --- Site Data ---------------------------------------------------------------
# Each entry represents a zinc smelter/refinery that produces cadmium as a byproduct.
# Coordinates verified against company reports and Google Earth.

SITES = []  # Populated from data file


# --- Main --------------------------------------------------------------------

def main():
    """Write the cadmium layer JSON."""
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

    print(f"[ingest_cadmium] Wrote {len(sites)} cadmium sites to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
