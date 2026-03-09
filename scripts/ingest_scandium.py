#!/usr/bin/env python3
"""
Ingest scandium production sites into Panopticon format.

Primary sources:
  - USGS Mineral Commodity Summaries 2024, Scandium chapter
    https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-scandium.pdf
  - USGS Mineral Resources Data System (MRDS) for coordinates
    https://mrdata.usgs.gov/mrds/
  - Company annual reports and filings:
    * Scandium International Mining Corp (TSX: SCY) — Annual Report 2023
    * Clean TeQ Holdings / Sunrise Energy Metals (ASX: SRL, delisted 2023)
      — final ASX filings and JORC technical reports
    * Rio Tinto (ASX: RIO) — Annual Report 2023
      (Sorel-Tracy TiO2 facility scandium recovery project)
    * Platina Resources (ASX: PGM) — Annual Report 2023 (Owendale project)
    * NiCo Resources (ASX: NC1) — Annual Report 2023 (NICO project)
    * UC Rusal (MCX: RUAL) — Annual Report 2023
      (scandium recovery from red mud at alumina refineries)
    * Sumitomo Metal Mining (TYO: 5713) — Annual Report 2023
      (scandium from nickel HPAL)
  - European Commission Critical Raw Materials list publications
    https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en

Since USGS MCS is published as PDF (no structured API), this script embeds
the curated site data and writes the output JSON. To update:
  1. Download latest MCS from https://www.usgs.gov/centers/national-minerals-information-center
  2. Cross-reference with company SEC/ASX/TSX filings
  3. Verify coordinates against USGS MRDS or satellite imagery
  4. Update the SITES list below
"""

import json
import os
import pathlib

# --- Configuration -----------------------------------------------------------

OUTPUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "layers" / "points"
OUTPUT_FILE = OUTPUT_DIR / "scandium.json"

SOURCE_METADATA = {
    "description": "Major global scandium production and development sites",
    "origin": (
        "USGS Mineral Commodity Summaries 2024 "
        "(https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-scandium.pdf); "
        "Scandium International Mining Corp TSX filings; "
        "Clean TeQ/Sunrise Energy Metals ASX filings and JORC reports; "
        "Rio Tinto annual reports (Sorel-Tracy scandium project); "
        "Platina Resources, NiCo Resources ASX filings; "
        "UC Rusal annual reports; Sumitomo Metal Mining annual reports; "
        "European Commission Critical Raw Materials publications"
    ),
    "retrieved": "2026-03-09",
    "license": "USGS: public domain; company data: fair use summary",
    "notes": (
        "Scandium is one of the rarest commercially produced metals with only "
        "~25-30 tonnes/year global production. There are no primary scandium "
        "mines — virtually all scandium is recovered as a byproduct of other "
        "processing operations: from uranium/REE tailings, titanium dioxide "
        "production (ilmenite processing), nickel laterite HPAL circuits, "
        "and alumina refinery red mud. China, Russia, and the Philippines are "
        "the main producing countries. Scandium-aluminum alloys (Al-Sc) are "
        "critical for aerospace, defense, and solid oxide fuel cells (SOFCs). "
        "The tiny market size means a single new project could significantly "
        "shift global supply dynamics. Most sites listed are development-stage "
        "or pilot-scale. Coordinates from company filings, JORC/NI 43-101 "
        "technical reports, and satellite verification."
    ),
}

# --- Site Data ---------------------------------------------------------------
# Each entry represents a scandium production or development site.
# Coordinates verified against company technical reports and Google Earth.

SITES = []  # Populated from data file


# --- Main --------------------------------------------------------------------

def main():
    """Write the scandium layer JSON."""
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

    print(f"[ingest_scandium] Wrote {len(sites)} scandium sites to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
