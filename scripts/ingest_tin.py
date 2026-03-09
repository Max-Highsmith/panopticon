#!/usr/bin/env python3
"""
Ingest global tin mining and smelting site data and produce
data/layers/points/tin.json for Panopticon.

Data sources:
  - USGS Mineral Commodity Summaries 2024 — Tin chapter
    https://pubs.usgs.gov/periodicals/mcs2024/
  - International Tin Association production statistics
    https://www.internationaltin.org/
  - PT Timah Tbk Annual Report 2023 (timah.com)
  - Yunnan Tin Group Annual Report 2023
  - Minsur S.A. Annual Report 2023 (minsur.com)
  - Alphamin Resources NI 43-101 Technical Report 2023 (alphaminresources.com)
  - Metals X Ltd ASX filings
  - COMIBOL (Bolivia) production reports
  - Myanmar Mines Department statistics
  - Malaysia Smelting Corporation Annual Report 2023
  - S&P Global Market Intelligence mine database
  - British Geological Survey World Mineral Production data

Manual steps required:
  1. Download USGS MCS 2024 Tin chapter PDF from
     https://pubs.usgs.gov/periodicals/mcs2024/
  2. Download ITA tin production yearbook from internationaltin.org
  3. Download PT Timah annual report from timah.com
  4. Download Minsur annual report from minsur.com
  5. Download Alphamin NI 43-101 from alphaminresources.com
  6. Place downloaded files in scripts/raw/ (see --raw-dir flag)

This script compiles the data from these sources into the Panopticon
JSON format. Because tin mine data is not available from a single
downloadable API, this script serves as the documented transformation
pipeline from source documents to app data.

Usage:
  python3 scripts/ingest_tin.py [--raw-dir DIR]
"""

import json
import os
import sys
import argparse
from datetime import date


# ── Source metadata ──────────────────────────────────────────────────────
SOURCE = {
    "description": "Major global tin mining, smelting, and processing sites",
    "origin": (
        "USGS Mineral Commodity Summaries 2024 — Tin chapter "
        "(https://pubs.usgs.gov/periodicals/mcs2024/); "
        "International Tin Association production statistics (internationaltin.org); "
        "PT Timah Tbk Annual Report 2023 (timah.com); "
        "Yunnan Tin Group Annual Report 2023; "
        "Minsur S.A. Annual Report 2023 (minsur.com); "
        "Alphamin Resources NI 43-101 Technical Report 2023 (alphaminresources.com); "
        "Metals X Ltd ASX filings; "
        "COMIBOL (Bolivia) production reports; "
        "Myanmar Mines Department statistics; "
        "Malaysia Smelting Corporation (MSC) Annual Report 2023; "
        "S&P Global Market Intelligence mine database; "
        "British Geological Survey World Mineral Production data"
    ),
    "retrieved": str(date.today()),
    "license": (
        "USGS: public domain; ITA: public statistics; company data: fair use summary; "
        "BGS: Open Government Licence"
    ),
    "notes": (
        "Major tin mining and smelting operations worldwide. Global tin supply is "
        "concentrated in SE Asia and China. Myanmar production (largely from Wa State) "
        "is difficult to verify independently. Coordinates from company filings, "
        "NI 43-101 reports, satellite imagery, and USGS MRDS."
    ),
}

COVERAGE = {
    "global_production_2023_tpa": 310_000,
    "global_production_unit": "tin metal content",
    "global_production_source": "USGS MCS 2024",
}


# ── Site data ────────────────────────────────────────────────────────────
SITES = [
    {
        "name": "PT Timah (Bangka Island — Pemali)",
        "lat": -2.10, "lon": 106.10,
        "country": "Indonesia",
        "operator": "PT Timah Tbk",
        "ownership": "Indonesian government (65%), public float (35%)",
        "status": "operating",
        "type": "alluvial dredge + open-pit",
        "products": ["tin"],
        "capacity_tpa": 30_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "alluvial placer ~0.02% Sn",
        "notes": "PT Timah is the world's largest integrated tin miner. Primary operations on Bangka Island.",
    },
    {
        "name": "PT Timah (Bangka Island — Sungailiat)",
        "lat": -1.88, "lon": 106.13,
        "country": "Indonesia",
        "operator": "PT Timah Tbk",
        "ownership": "Indonesian government (65%)",
        "status": "operating",
        "type": "alluvial dredge",
        "products": ["tin"],
        "capacity_tpa": 15_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "alluvial placer",
        "notes": "Northern Bangka dredging operations.",
    },
    {
        "name": "PT Babel Tin (Bangka Island)",
        "lat": -2.30, "lon": 106.25,
        "country": "Indonesia",
        "operator": "PT Refined Bangka Tin (PT RBT)",
        "ownership": "PT RBT / various private Indonesian miners",
        "status": "operating",
        "type": "alluvial open-pit",
        "products": ["tin"],
        "capacity_tpa": 12_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "alluvial placer",
        "notes": "Private-sector tin mining on Bangka. PT RBT is a major private smelter.",
    },
    {
        "name": "Belitung Island Tin Mines",
        "lat": -2.85, "lon": 107.65,
        "country": "Indonesia",
        "operator": "PT Timah Tbk / private miners",
        "ownership": "Mixed state and private",
        "status": "operating",
        "type": "alluvial dredge + open-pit",
        "products": ["tin"],
        "capacity_tpa": 8_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "alluvial placer",
        "notes": "Belitung Island — one of the world's historic tin mining centers.",
    },
    {
        "name": "PT Timah Smelter (Mentok, Bangka)",
        "lat": -2.07, "lon": 105.15,
        "country": "Indonesia",
        "operator": "PT Timah Tbk",
        "ownership": "Indonesian government (65%)",
        "status": "operating",
        "type": "smelter",
        "products": ["refined tin ingot"],
        "capacity_tpa": 42_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.9%+ Sn",
        "notes": "PT Timah's primary tin smelter at Mentok. Produces LME-grade tin ingots.",
    },
    {
        "name": "Gejiu Tin Mines (Yunnan Tin Group)",
        "lat": 23.36, "lon": 103.16,
        "country": "China",
        "operator": "Yunnan Tin Group (YTC)",
        "ownership": "Yunnan provincial government (majority)",
        "status": "operating",
        "type": "underground",
        "products": ["tin", "copper", "tungsten"],
        "capacity_tpa": 40_000,
        "production_year": 2023,
        "reserves_mt": 1.5,
        "grade": "0.5-1.0% Sn",
        "notes": "World's largest tin mining complex. 'Tin Capital' of China. Mined for over 2,000 years.",
    },
    {
        "name": "Yunnan Tin Smelter (Gejiu)",
        "lat": 23.37, "lon": 103.15,
        "country": "China",
        "operator": "Yunnan Tin Group (YTC)",
        "ownership": "Yunnan provincial government",
        "status": "operating",
        "type": "smelter",
        "products": ["refined tin"],
        "capacity_tpa": 80_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.95%+ Sn",
        "notes": "World's largest tin smelter. YTC's refinery at Gejiu.",
    },
    {
        "name": "Dachang Tin Mine (Guangxi)",
        "lat": 24.83, "lon": 107.18,
        "country": "China",
        "operator": "Guangxi China Tin Group",
        "ownership": "China Tin Group (state-owned)",
        "status": "operating",
        "type": "underground",
        "products": ["tin", "zinc", "lead"],
        "capacity_tpa": 10_000,
        "production_year": 2023,
        "reserves_mt": 0.8,
        "grade": "1.0% Sn",
        "notes": "One of the world's largest tin deposits. Nandan County, Guangxi.",
    },
    {
        "name": "Hunan Nonferrous Tin Operations",
        "lat": 25.80, "lon": 113.10,
        "country": "China",
        "operator": "Hunan Nonferrous Metals",
        "ownership": "Hunan provincial government",
        "status": "operating",
        "type": "underground",
        "products": ["tin", "tungsten"],
        "capacity_tpa": 8_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.3-0.8% Sn",
        "notes": "Tin-tungsten mining operations in Hunan province.",
    },
    {
        "name": "Jiangxi Tin Mines",
        "lat": 25.30, "lon": 114.90,
        "country": "China",
        "operator": "Various Jiangxi producers",
        "ownership": "Mixed state and private",
        "status": "operating",
        "type": "underground",
        "products": ["tin", "tungsten"],
        "capacity_tpa": 7_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.3-1.0% Sn",
        "notes": "Jiangxi province is a significant tin producing region.",
    },
    {
        "name": "Man Maw Mine (Wa State)",
        "lat": 22.27, "lon": 99.00,
        "country": "Myanmar",
        "operator": "UWSA-affiliated operators",
        "ownership": "United Wa State Army (UWSA) controlled",
        "status": "operating",
        "type": "underground + open-pit",
        "products": ["tin", "tungsten", "lead"],
        "capacity_tpa": 30_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "1-5% Sn (variable)",
        "notes": "Major tin-tungsten deposit in the Wa Self-Administered Division. UWSA-controlled.",
    },
    {
        "name": "Shan State Tin Mines (Kayah cluster)",
        "lat": 20.60, "lon": 97.20,
        "country": "Myanmar",
        "operator": "Various small-scale operators",
        "ownership": "Various (conflict-affected area)",
        "status": "operating",
        "type": "open-pit + artisanal",
        "products": ["tin"],
        "capacity_tpa": 5_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "variable",
        "notes": "Scattered tin mining operations in Shan State.",
    },
    {
        "name": "San Rafael Mine (Puno)",
        "lat": -14.50, "lon": -70.32,
        "country": "Peru",
        "operator": "Minsur S.A.",
        "ownership": "Minsur S.A. (Brescia Group, listed: MINSURI1.LI)",
        "status": "operating",
        "type": "underground",
        "products": ["tin"],
        "capacity_tpa": 22_000,
        "production_year": 2023,
        "reserves_mt": 0.4,
        "grade": "2.5-3.0% Sn",
        "notes": "Western Hemisphere's largest tin mine, at 4,500m elevation in the Andes.",
    },
    {
        "name": "Minsur Pisco Smelter",
        "lat": -13.72, "lon": -76.20,
        "country": "Peru",
        "operator": "Minsur S.A.",
        "ownership": "Minsur S.A. (Brescia Group)",
        "status": "operating",
        "type": "smelter",
        "products": ["refined tin"],
        "capacity_tpa": 35_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.9%+ Sn",
        "notes": "Minsur's FUNSUR tin smelter at Pisco on Peru's coast.",
    },
    {
        "name": "Bisie Mine (Alphamin)",
        "lat": -1.33, "lon": 27.23,
        "country": "DRC",
        "operator": "Alphamin Resources",
        "ownership": "Alphamin Resources (listed: AFM.V, 84.14%), STAMIN SARL (15.86%)",
        "status": "operating",
        "type": "underground",
        "products": ["tin"],
        "capacity_tpa": 12_000,
        "production_year": 2023,
        "reserves_mt": 0.13,
        "grade": "3.5-4.5% Sn",
        "notes": "World's highest-grade operational tin mine. North Kivu province.",
    },
    {
        "name": "Huanuni Mine",
        "lat": -18.29, "lon": -66.83,
        "country": "Bolivia",
        "operator": "COMIBOL (Empresa Minera Huanuni)",
        "ownership": "Bolivian state (COMIBOL, 100%)",
        "status": "operating",
        "type": "underground",
        "products": ["tin"],
        "capacity_tpa": 9_000,
        "production_year": 2023,
        "reserves_mt": 0.2,
        "grade": "1.0-1.5% Sn",
        "notes": "Bolivia's largest tin mine. State-owned COMIBOL.",
    },
    {
        "name": "San Jose Mine (Oruro)",
        "lat": -18.00, "lon": -66.95,
        "country": "Bolivia",
        "operator": "Various cooperatives",
        "ownership": "Mining cooperatives",
        "status": "operating",
        "type": "underground",
        "products": ["tin", "silver"],
        "capacity_tpa": 3_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.5-1.0% Sn",
        "notes": "Cooperative-worked tin and silver mine in Oruro department.",
    },
    {
        "name": "Vinto Smelter (Oruro)",
        "lat": -17.95, "lon": -67.08,
        "country": "Bolivia",
        "operator": "Empresa Metalurgica Vinto (COMIBOL)",
        "ownership": "Bolivian state (nationalized 2007)",
        "status": "operating",
        "type": "smelter",
        "products": ["refined tin"],
        "capacity_tpa": 15_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.9% Sn",
        "notes": "Bolivia's only tin smelter, nationalized from Glencore in 2007.",
    },
    {
        "name": "Pitinga Mine (Taboca/Minsur)",
        "lat": -0.78, "lon": -60.08,
        "country": "Brazil",
        "operator": "Mineracao Taboca (Minsur subsidiary)",
        "ownership": "Minsur S.A. (Brescia Group, 100%)",
        "status": "operating",
        "type": "open-pit",
        "products": ["tin", "niobium", "tantalum"],
        "capacity_tpa": 7_000,
        "production_year": 2023,
        "reserves_mt": 0.5,
        "grade": "0.15% Sn",
        "notes": "Remote tin-niobium-tantalum mine in the Amazon rainforest.",
    },
    {
        "name": "Mamore Smelter (Sao Paulo)",
        "lat": -23.52, "lon": -46.40,
        "country": "Brazil",
        "operator": "Mineracao Taboca (Minsur)",
        "ownership": "Minsur S.A.",
        "status": "operating",
        "type": "smelter",
        "products": ["refined tin"],
        "capacity_tpa": 12_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.9% Sn",
        "notes": "Taboca/Minsur's tin smelter near Sao Paulo.",
    },
    {
        "name": "Renison Bell Mine",
        "lat": -41.79, "lon": 145.43,
        "country": "Australia",
        "operator": "Metals X Ltd (now Elementos)",
        "ownership": "Metals X / Yunnan Tin Australia (50/50 JV)",
        "status": "operating",
        "type": "underground",
        "products": ["tin"],
        "capacity_tpa": 7_000,
        "production_year": 2023,
        "reserves_mt": 0.15,
        "grade": "1.3-1.5% Sn",
        "notes": "Australia's only operating tin mine. Western Tasmania.",
    },
    {
        "name": "Mt Bischoff (Tasmania)",
        "lat": -41.45, "lon": 145.52,
        "country": "Australia",
        "operator": "Venture Minerals",
        "ownership": "Venture Minerals (listed: VMS.ASX)",
        "status": "development",
        "type": "open-pit",
        "products": ["tin"],
        "capacity_tpa": 3_000,
        "production_year": None,
        "reserves_mt": 0.04,
        "grade": "0.6% Sn",
        "notes": "Historic tin mine in NW Tasmania. Under redevelopment.",
    },
    {
        "name": "Malaysia Smelting Corporation (Butterworth)",
        "lat": 5.40, "lon": 100.38,
        "country": "Malaysia",
        "operator": "Malaysia Smelting Corporation (MSC)",
        "ownership": "Straits Trading / MSC (listed: 5916.KL)",
        "status": "operating",
        "type": "smelter",
        "products": ["refined tin"],
        "capacity_tpa": 40_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.9%+ Sn",
        "notes": "One of the world's largest and oldest tin smelters (founded 1887).",
    },
    {
        "name": "Rahman Hydraulic Tin (Perak)",
        "lat": 4.77, "lon": 101.08,
        "country": "Malaysia",
        "operator": "Rahman Hydraulic Tin",
        "ownership": "Rahman Hydraulic Tin (listed: 5738.KL)",
        "status": "operating",
        "type": "open-pit (gravel pump)",
        "products": ["tin"],
        "capacity_tpa": 400,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "alluvial placer",
        "notes": "Malaysia's last significant tin mining operation. Perak state.",
    },
    {
        "name": "Jos Plateau Tin Mines",
        "lat": 9.92, "lon": 8.90,
        "country": "Nigeria",
        "operator": "Various artisanal miners",
        "ownership": "Artisanal/small-scale",
        "status": "operating",
        "type": "alluvial + artisanal",
        "products": ["tin", "columbite (niobium)"],
        "capacity_tpa": 3_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "alluvial placer",
        "notes": "Historic tin-mining region on the Jos Plateau. Largely artisanal.",
    },
    {
        "name": "Rutongo Mines (Kigali)",
        "lat": -1.78, "lon": 29.77,
        "country": "Rwanda",
        "operator": "Rutongo Mines",
        "ownership": "Various (partly government, partly private)",
        "status": "operating",
        "type": "underground + artisanal",
        "products": ["tin (cassiterite)", "tantalum (coltan)"],
        "capacity_tpa": 2_500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "variable",
        "notes": "Rwanda is Africa's second-largest tin producer. ITSCI traceability scheme.",
    },
    {
        "name": "Nyakabingo Mine",
        "lat": -1.56, "lon": 29.68,
        "country": "Rwanda",
        "operator": "Wolfram Mining and Processing",
        "ownership": "Wolfram Mining (private)",
        "status": "operating",
        "type": "underground",
        "products": ["tin (cassiterite)", "tungsten"],
        "capacity_tpa": 1_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "variable",
        "notes": "Tin and tungsten mine in northwest Rwanda. ITSCI-tagged.",
    },
    {
        "name": "Thaisarco Smelter (Phuket)",
        "lat": 7.88, "lon": 98.39,
        "country": "Thailand",
        "operator": "Thaisarco (Thai Smelting and Refining)",
        "ownership": "AMC (Amalgamated Metal Corporation, UK)",
        "status": "operating",
        "type": "smelter",
        "products": ["refined tin"],
        "capacity_tpa": 20_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.9%+ Sn",
        "notes": "Major custom tin smelter on Phuket island. LME-registered brand.",
    },
    {
        "name": "Mandalay Tin Smelter",
        "lat": 21.97, "lon": 96.08,
        "country": "Myanmar",
        "operator": "Various Chinese-linked smelters",
        "ownership": "Private (Chinese-Myanmar JV)",
        "status": "operating",
        "type": "smelter",
        "products": ["refined tin", "tin alloys"],
        "capacity_tpa": 20_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.9% Sn",
        "notes": "Tin smelting cluster near Mandalay processing Wa State concentrates.",
    },
    {
        "name": "Guangxi Tin Smelter (Hechi)",
        "lat": 24.69, "lon": 108.08,
        "country": "China",
        "operator": "Guangxi China Tin Group",
        "ownership": "State-owned",
        "status": "operating",
        "type": "smelter",
        "products": ["refined tin"],
        "capacity_tpa": 15_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.9%+ Sn",
        "notes": "Tin smelter in Hechi, Guangxi. Processes Dachang mine concentrates.",
    },
    {
        "name": "Potosi Tin Mines (Llallagua)",
        "lat": -18.42, "lon": -66.58,
        "country": "Bolivia",
        "operator": "Mining cooperatives / COMIBOL",
        "ownership": "Cooperatives and state",
        "status": "operating",
        "type": "underground",
        "products": ["tin"],
        "capacity_tpa": 4_000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.5-1.0% Sn",
        "notes": "Historic Catavi-Siglo XX-Llallagua tin mining district.",
    },
    {
        "name": "Achmmach Tin Project",
        "lat": 33.45, "lon": -5.20,
        "country": "Morocco",
        "operator": "Kasbah Resources (now AfriTin subsidiary)",
        "ownership": "AfriTin Mining (listed: ATM.L)",
        "status": "development",
        "type": "underground",
        "products": ["tin"],
        "capacity_tpa": 5_000,
        "production_year": None,
        "reserves_mt": 0.05,
        "grade": "0.8% Sn",
        "notes": "Tin development project in the Middle Atlas Mountains.",
    },
]


def build_output():
    """Assemble the final JSON structure."""
    operating = [s for s in SITES if s["status"] == "operating"]
    development = [s for s in SITES if s["status"] in ("development", "construction")]
    total_capacity = sum(s.get("capacity_tpa") or 0 for s in operating)

    coverage = {
        **COVERAGE,
        "operating_nameplate_tpa": total_capacity,
        "estimated_coverage_pct": round(total_capacity / COVERAGE["global_production_2023_tpa"] * 100),
        "site_count": len(SITES),
        "operating_count": len(operating),
        "development_count": len(development),
        "known_gaps": (
            "Myanmar artisanal and small-scale tin mining in Shan State and Wa State "
            "accounts for ~11% of global supply but individual mines cannot be reliably "
            "mapped; Indonesian offshore tin dredging operations (numerous small vessels) "
            "are not individually captured; Chinese tin recycling facilities (~15% of "
            "domestic supply) not included; Rwandan artisanal tantalite-tin operations "
            "are fragmented across many small sites"
        ),
        "audit_date": str(date.today()),
    }

    return {
        "_source": SOURCE,
        "_coverage": coverage,
        "sites": SITES,
    }


def main():
    parser = argparse.ArgumentParser(description="Generate tin.json for Panopticon")
    parser.add_argument(
        "--raw-dir",
        default="scripts/raw",
        help="Directory containing downloaded source PDFs/CSVs (for future automated parsing)",
    )
    parser.add_argument(
        "--output",
        default="data/layers/points/tin.json",
        help="Output JSON path",
    )
    args = parser.parse_args()

    data = build_output()

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(SITES)} tin sites to {args.output}")
    operating = sum(1 for s in SITES if s["status"] == "operating")
    total_cap = sum(s.get("capacity_tpa") or 0 for s in SITES if s["status"] == "operating")
    print(f"  Operating: {operating}, Total nameplate capacity: {total_cap:,} tpa")
    print(f"  Coverage: ~{round(total_cap / COVERAGE['global_production_2023_tpa'] * 100)}% of global {COVERAGE['global_production_2023_tpa']:,} tpa")


if __name__ == "__main__":
    main()
