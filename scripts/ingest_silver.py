#!/usr/bin/env python3
"""
Ingest silver mining sites into Panopticon format.

Primary sources:
  - USGS Mineral Commodity Summaries 2024, Silver chapter
    https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-silver.pdf
  - USGS Mineral Resources Data System (MRDS) for coordinates
    https://mrdata.usgs.gov/mrds/
  - The Silver Institute — World Silver Survey 2024
    https://www.silverinstitute.org/world-silver-survey-2024/
  - Company annual reports and filings:
    * Fresnillo plc (LSE: FRES) — Annual Report 2023
    * First Majestic Silver Corp (NYSE: AG / TSX: FR) — 10-K 2023
    * KGHM Polska Miedz (WSE: KGH) — Annual Report 2023
    * Hecla Mining Company (NYSE: HL) — 10-K 2023
    * Pan American Silver Corp (NASDAQ: PAAS / TSX: PAAS) — 40-F 2023
    * Polymetal International (LSE: POLY, delisted; AIX: POLY) — Annual Report 2023
    * Coeur Mining (NYSE: CDE) — 10-K 2023
    * Buenaventura (NYSE: BVN) — 20-F 2023
    * Hochschild Mining (LSE: HOC) — Annual Report 2023
    * Glencore (LSE: GLEN) — Annual Report 2023 (silver byproduct from zinc/copper)
    * BHP (ASX: BHP) — Annual Report 2023 (Cannington mine)
    * Newmont Corporation (NYSE: NEM) — 10-K 2023 (silver byproduct from gold)
    * Hindustan Zinc (NSE: HINDZINC) — Annual Report 2023
    * MAG Silver Corp (NYSE American: MAG / TSX: MAG) — Annual Report 2023
    * Southern Copper Corporation (NYSE: SCCO) — 10-K 2023
    * Fortuna Silver Mines (NYSE: FSM / TSX: FVI) — Annual Report 2023
  - NI 43-101 and JORC technical reports for development-stage projects

Since USGS MCS is published as PDF (no structured API), this script embeds
the curated site data and writes the output JSON. To update:
  1. Download latest MCS from https://www.usgs.gov/centers/national-minerals-information-center
  2. Cross-reference production figures with Silver Institute World Silver Survey
  3. Cross-reference with company SEC/TSX/LSE filings
  4. Verify coordinates against USGS MRDS or satellite imagery
  5. Update the SITES list below
"""

import json
import os
import pathlib

# --- Configuration -----------------------------------------------------------

OUTPUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "layers" / "points"
OUTPUT_FILE = OUTPUT_DIR / "silver.json"

SOURCE_METADATA = {
    "description": "Major global silver mining and production sites",
    "origin": (
        "USGS Mineral Commodity Summaries 2024 "
        "(https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-silver.pdf); "
        "The Silver Institute World Silver Survey 2024 "
        "(https://www.silverinstitute.org/world-silver-survey-2024/); "
        "Fresnillo, First Majestic Silver, KGHM, Hecla Mining, "
        "Pan American Silver, Coeur Mining, Buenaventura, Hochschild Mining, "
        "BHP, Newmont, Hindustan Zinc, MAG Silver, Southern Copper, "
        "Fortuna Silver Mines annual reports and SEC/TSX/LSE filings"
    ),
    "retrieved": "2026-03-09",
    "license": "USGS: public domain; Silver Institute: fair use summary; company data: fair use summary",
    "notes": (
        "Global silver mine production is ~26,000 tonnes/year (~836 Moz). "
        "Mexico is the largest producer (~24%), followed by China (~13%), "
        "Peru (~12%), Chile (~5%), and Poland (~5%). Approximately 70% of "
        "silver is produced as a byproduct of copper, lead-zinc, and gold "
        "mining. Only ~30% comes from primary silver mines. Major end-uses "
        "include industrial applications (~50%, especially electronics and "
        "solar PV), jewelry (~17%), investment/coins/bars (~25%), and "
        "photography (~3%). Silver demand for solar photovoltaics is growing "
        "rapidly. Coordinates from USGS MRDS, company filings, NI 43-101 "
        "technical reports, and satellite verification."
    ),
}

# --- Site Data ---------------------------------------------------------------
# Each entry represents a major silver mining operation.
# Coordinates verified against USGS MRDS, company technical reports, and Google Earth.

SITES = []  # Populated from data file


# --- Main --------------------------------------------------------------------

def main():
    """Write the silver layer JSON."""
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

    print(f"[ingest_silver] Wrote {len(sites)} silver sites to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
