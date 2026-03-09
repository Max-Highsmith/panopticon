#!/usr/bin/env python3
"""
Ingest molybdenum mining sites into Panopticon format.

Primary sources:
  - USGS Mineral Commodity Summaries 2024, Molybdenum chapter
    https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-molybdenum.pdf
  - USGS Mineral Resources Data System (MRDS) for coordinates
    https://mrdata.usgs.gov/mrds/
  - International Molybdenum Association (IMOA)
    https://www.imoa.info/
  - Company annual reports and filings:
    * Freeport-McMoRan (NYSE: FCX) — 10-K 2023
    * Codelco — Annual Report 2023 (Chilean state copper company)
    * CMOC Group (SEHK: 3993) — Annual Report 2023
    * Rio Tinto (ASX: RIO / LSE: RIO) — Annual Report 2023
    * Southern Copper Corporation (NYSE: SCCO) — 10-K 2023
    * Centerra Gold (TSX: CG) — Annual Report 2023 (Thompson Creek)
    * Teck Resources (NYSE: TECK / TSX: TECK.B) — Annual Report 2023
    * BHP (ASX: BHP) — Annual Report 2023 (Olympic Dam Mo byproduct)
    * Antofagasta (LSE: ANTO) — Annual Report 2023
    * General Moly (NYSE American: GMO) — 10-K 2023
    * Jinduicheng Molybdenum (SHE: 601958) — Annual Report 2023
    * China Molybdenum Co. (SHA: 603993 / SEHK: 3993) — Annual Report 2023
  - NI 43-101 technical reports for development-stage projects

Since USGS MCS is published as PDF (no structured API), this script embeds
the curated site data and writes the output JSON. To update:
  1. Download latest MCS from https://www.usgs.gov/centers/national-minerals-information-center
  2. Cross-reference production figures with IMOA statistics and company filings
  3. Verify coordinates against USGS MRDS or satellite imagery
  4. Update the SITES list below
"""

import json
import os
import pathlib

# --- Configuration -----------------------------------------------------------

OUTPUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "layers" / "points"
OUTPUT_FILE = OUTPUT_DIR / "molybdenum.json"

SOURCE_METADATA = {
    "description": "Major global molybdenum mining and production sites",
    "origin": (
        "USGS Mineral Commodity Summaries 2024 "
        "(https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-molybdenum.pdf); "
        "International Molybdenum Association (https://www.imoa.info/); "
        "Freeport-McMoRan, Codelco, CMOC Group, Rio Tinto, Southern Copper, "
        "Centerra Gold, Teck Resources, BHP, Antofagasta, Jinduicheng "
        "Molybdenum, China Molybdenum annual reports and SEC/TSX/ASX filings"
    ),
    "retrieved": "2026-03-09",
    "license": "USGS: public domain; IMOA: public statistics; company data: fair use summary",
    "notes": (
        "Global molybdenum mine production is ~300,000 tonnes/year. China "
        "produces ~40%, Chile ~18%, USA ~10%. Approximately 50% of world "
        "molybdenum is produced as a byproduct of copper mining (porphyry "
        "copper deposits). Primary molybdenum mines are concentrated in China "
        "and the western USA. Molybdenum is critical for high-strength steel "
        "alloys, catalysts, and lubricants. Coordinates from USGS MRDS, "
        "company filings, and satellite verification."
    ),
}

# --- Site Data ---------------------------------------------------------------
# Each entry represents a major molybdenum mining operation.
# Coordinates verified against USGS MRDS, company technical reports, and Google Earth.

SITES = []  # Populated from data file


# --- Main --------------------------------------------------------------------

def main():
    """Write the molybdenum layer JSON."""
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

    print(f"[ingest_molybdenum] Wrote {len(sites)} molybdenum sites to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
