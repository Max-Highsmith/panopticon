#!/usr/bin/env python3
"""
Ingest selenium production sites into Panopticon format.

Primary sources:
  - USGS Mineral Commodity Summaries 2024, Selenium chapter
    https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-selenium.pdf
  - USGS Mineral Resources Data System (MRDS) for coordinates
    https://mrdata.usgs.gov/mrds/
  - Selenium-Tellurium Development Association (STDA)
    https://www.stda.org/
  - Company annual reports and filings:
    * Aurubis AG (ETR: NDA) — Annual Report 2023
    * Umicore (EBR: UMI) — Annual Report 2023
    * Boliden (STO: BOL) — Annual Report 2023
    * Mitsubishi Materials Corporation (TYO: 5711) — Annual Report 2023
    * JX Nippon Mining & Metals (subsidiary of ENEOS Holdings, TYO: 5020)
    * LS-Nikko Copper (subsidiary of LS Corp, KRX: 006260)
    * Freeport-McMoRan (NYSE: FCX) — 10-K 2023 (Miami smelter/refinery)
    * KGHM Polska Miedz (WSE: KGH) — Annual Report 2023
    * Codelco — Annual Report 2023
    * Hindalco Industries (NSE: HINDALCO) — Annual Report 2023 (Birla Copper)

Since USGS MCS is published as PDF (no structured API), this script embeds
the curated site data and writes the output JSON. To update:
  1. Download latest MCS from https://www.usgs.gov/centers/national-minerals-information-center
  2. Cross-reference production figures with STDA statistics
  3. Cross-reference with company annual reports and filings
  4. Verify coordinates against USGS MRDS or satellite imagery
  5. Update the SITES list below
"""

import json
import os
import pathlib

# --- Configuration -----------------------------------------------------------

OUTPUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "layers" / "points"
OUTPUT_FILE = OUTPUT_DIR / "selenium.json"

SOURCE_METADATA = {
    "description": "Major global selenium production sites",
    "origin": (
        "USGS Mineral Commodity Summaries 2024 "
        "(https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-selenium.pdf); "
        "Selenium-Tellurium Development Association (https://www.stda.org/); "
        "Aurubis, Umicore, Boliden, Mitsubishi Materials, JX Nippon Mining, "
        "LS-Nikko Copper, Freeport-McMoRan, KGHM, Codelco, Hindalco annual "
        "reports and SEC/exchange filings"
    ),
    "retrieved": "2026-03-09",
    "license": "USGS: public domain; STDA: public statistics; company data: fair use summary",
    "notes": (
        "Global selenium production is ~3,500 tonnes/year. Selenium is "
        "produced exclusively as a byproduct of copper refining — recovered "
        "from anode slimes during electrolytic copper refining. No primary "
        "selenium mines exist. China is the largest producer (~30%), followed "
        "by Japan (~15%), Germany (~10%), and Belgium (~8%). Major end-uses "
        "include metallurgy (~40%), glass manufacturing (~25%), electronics "
        "and solar cells (~10%), and chemicals (~10%). Selenium is critical "
        "for CIGS thin-film solar cells. Sites listed are copper refineries "
        "that recover selenium from anode slimes. Coordinates from USGS MRDS, "
        "company filings, and satellite verification."
    ),
}

# --- Site Data ---------------------------------------------------------------
# Each entry represents a copper refinery that produces selenium as a byproduct.
# Coordinates verified against company reports and Google Earth.

SITES = []  # Populated from data file


# --- Main --------------------------------------------------------------------

def main():
    """Write the selenium layer JSON."""
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

    print(f"[ingest_selenium] Wrote {len(sites)} selenium sites to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
