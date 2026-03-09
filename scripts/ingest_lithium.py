#!/usr/bin/env python3
"""
Ingest lithium mining sites into Panopticon format.

Primary sources:
  - USGS Mineral Commodity Summaries 2024, Lithium chapter
    https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-lithium.pdf
  - USGS Mineral Resources Data System (MRDS) for coordinates
    https://mrdata.usgs.gov/mrds/
  - S&P Global Market Intelligence mine profiles
  - Company annual reports and filings:
    * SQM (Santiago Exchange / NYSE: SQM) — Annual Report 2023
    * Albemarle (NYSE: ALB) — 10-K 2023
    * Pilbara Minerals (ASX: PLS) — Annual Report 2023
    * Ganfeng Lithium (SHE: 002460 / SEHK: 1772) — Annual Report 2023
    * Arcadium Lithium (NYSE: ALTM) — 10-K 2023 (merger of Allkem + Livent)
    * Lithium Americas (NYSE: LAC / TSX: LAC) — Annual Information Form 2023
    * Rio Tinto (ASX: RIO) — Annual Report 2023
    * Mineral Resources (ASX: MIN) — Annual Report 2023
    * Sigma Lithium (NASDAQ: SGML / TSX-V: SGML) — Annual Report 2023
    * Liontown Resources (ASX: LTR) — Annual Report 2023
    * Core Lithium (ASX: CXO) — Annual Report 2023
    * ioneer Ltd (ASX: INR) — Annual Report 2023
    * Eramet (EPA: ERA) — Annual Report 2023
    * Zijin Mining (SHA: 601899 / SEHK: 2899) — Annual Report 2023
    * Leo Lithium (ASX: LLL) — Annual Report 2023
    * AVZ Minerals (ASX: AVZ) — Annual Report 2023
    * Atlantic Lithium (ASX: A11) — Annual Report 2023
    * European Metals Holdings (ASX: EMH) — Annual Report 2023
    * Sibanye-Stillwater (NYSE: SBSW / JSE: SSW) — Annual Report 2023
    * Lepidico Ltd (ASX: LPD) — Annual Report 2023
    * Piedmont Lithium (NASDAQ: PLL) — Annual Report 2023
    * Savannah Resources (AIM: SAV) — Annual Report 2023
    * Critical Elements Lithium (TSX-V: CRE) — Annual Report 2023
    * Lithium Power International (ASX: LPI) — Annual Report 2023
    * Infinity Lithium (ASX: INF) — Annual Report 2023
  - Bolivia YLB/Comibol government publications on Salar de Uyuni
  - NI 43-101 and JORC technical reports for development-stage projects

Since USGS MCS is published as PDF (no structured API), this script embeds
the curated site data and writes the output JSON. To update:
  1. Download latest MCS from https://www.usgs.gov/centers/national-minerals-information-center
  2. Cross-reference production figures with company SEC/ASX filings
  3. Verify coordinates against USGS MRDS or satellite imagery
  4. Update the SITES list below
"""

import json
import os
import pathlib

# --- Configuration -----------------------------------------------------------

OUTPUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "layers" / "points"
OUTPUT_FILE = OUTPUT_DIR / "lithium.json"

SOURCE_METADATA = {
    "description": "Major global lithium mining and production sites",
    "origin": (
        "USGS Mineral Commodity Summaries 2024 "
        "(https://pubs.usgs.gov/periodicals/mcs2024/); "
        "S&P Global Market Intelligence; "
        "Albemarle, SQM, Pilbara Minerals, Ganfeng Lithium, Rio Tinto, "
        "Arcadium Lithium, Sigma Lithium, Liontown Resources, Core Lithium, "
        "ioneer, Eramet, Zijin Mining, Leo Lithium, AVZ Minerals, "
        "Atlantic Lithium, European Metals Holdings, Sibanye-Stillwater, "
        "Lepidico annual reports and ASX/SEC/TSX filings; "
        "Bolivia YLB/Comibol government publications"
    ),
    "retrieved": "2026-03-08",
    "license": "USGS: public domain; company data: fair use summary; Bolivia government data: public domain",
    "notes": (
        "Major lithium operations globally — operating mines, advanced development "
        "projects, and world-class deposits. Coordinates from USGS MRDS, company "
        "filings, NI 43-101/JORC technical reports, and satellite verification. "
        "Production/capacity figures from 2023 where available. All capacity figures "
        "in lithium carbonate equivalent (LCE) tonnes per annum. Note: USGS reports "
        "lithium in Li metal content; figures here have been converted to LCE "
        "(multiply Li content by ~5.323). Australian hard-rock capacities converted "
        "from spodumene concentrate nameplate using standard ~6% Li2O recovery factors."
    ),
}

# --- Site Data ---------------------------------------------------------------
# Each entry represents a major lithium mining operation.
# capacity_tpa is in lithium carbonate equivalent (LCE) tonnes per year.
# Coordinates verified against USGS MRDS, company technical reports, and Google Earth.

SITES = [
    # =========================================================================
    # SOUTH AMERICA — BRINE OPERATIONS
    # =========================================================================
    {
        "name": "Salar de Atacama",
        "lat": -23.5,
        "lon": -68.25,
        "country": "Chile",
        "operator": "SQM / Albemarle",
        "ownership": "SQM (CORFO lease), Albemarle (separate lease)",
        "status": "operating",
        "type": "brine",
        "products": ["lithium", "potassium"],
        "capacity_tpa": 250000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "1,500 mg/L Li",
        "notes": (
            "World's largest lithium brine operation; ~25% of global supply; "
            "combined SQM (~180k LCE) + Albemarle (~85k LCE) nameplate capacity"
        ),
    },
    {
        "name": "Salar de Olaroz",
        "lat": -23.39,
        "lon": -66.69,
        "country": "Argentina",
        "operator": "Allkem (now Arcadium Lithium)",
        "ownership": "Allkem/Arcadium Lithium (66.5%), Toyota Tsusho (25%), JEMSE (8.5%)",
        "status": "operating",
        "type": "brine",
        "products": ["lithium"],
        "capacity_tpa": 42500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "690 mg/L Li",
        "notes": "Stage 2 expansion completed 2023, ramping to 42,500 tpa LCE",
    },
    {
        "name": "Salar del Hombre Muerto",
        "lat": -25.39,
        "lon": -67.08,
        "country": "Argentina",
        "operator": "Arcadium Lithium (formerly Livent)",
        "ownership": "Arcadium Lithium (100%)",
        "status": "operating",
        "type": "brine",
        "products": ["lithium"],
        "capacity_tpa": 22000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "520 mg/L Li",
        "notes": (
            "One of the longest-operating lithium brine operations in Argentina; "
            "Fenix expansion underway"
        ),
    },
    {
        "name": "Cauchari-Olaroz",
        "lat": -23.33,
        "lon": -66.75,
        "country": "Argentina",
        "operator": "Lithium Americas Argentina / Ganfeng",
        "ownership": (
            "Lithium Americas Argentina (44.8%), "
            "Ganfeng Lithium (46.7%), JEMSE (8.5%)"
        ),
        "status": "operating",
        "type": "brine",
        "products": ["lithium"],
        "capacity_tpa": 40000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "594 mg/L Li",
        "notes": (
            "First production June 2023; ramping to 40,000 tpa LCE nameplate; "
            "adjacent to Salar de Olaroz"
        ),
    },
    {
        "name": "Tres Quebradas",
        "lat": -27.35,
        "lon": -69.07,
        "country": "Argentina",
        "operator": "Zijin Mining",
        "ownership": "Zijin Mining (100%, acquired from Neo Lithium 2022)",
        "status": "development",
        "type": "brine",
        "products": ["lithium"],
        "capacity_tpa": 20000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "901 mg/L Li",
        "notes": (
            "High-grade salar in Catamarca province; DFS completed; "
            "construction initiated by Zijin post-acquisition"
        ),
    },
    {
        "name": "Sal de Vida",
        "lat": -25.4,
        "lon": -66.85,
        "country": "Argentina",
        "operator": "Allkem (now Arcadium Lithium)",
        "ownership": "Arcadium Lithium (100%)",
        "status": "development",
        "type": "brine",
        "products": ["lithium"],
        "capacity_tpa": 45000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "780 mg/L Li",
        "notes": (
            "Adjacent to Salar del Hombre Muerto; Stage 1 (15,000 tpa) "
            "under construction, total 45,000 tpa planned"
        ),
    },
    {
        "name": "Rincon",
        "lat": -23.93,
        "lon": -66.67,
        "country": "Argentina",
        "operator": "Rio Tinto (Rincon Mining)",
        "ownership": "Rio Tinto (100%, acquired Rincon Mining 2022 for $825M)",
        "status": "development",
        "type": "brine",
        "products": ["lithium"],
        "capacity_tpa": 50000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "340 mg/L Li",
        "notes": (
            "Salar de Rincon; Rio Tinto's flagship lithium project; "
            "starter plant under construction, full-scale 50,000 tpa planned"
        ),
    },
    {
        "name": "Centenario-Ratones",
        "lat": -24.1,
        "lon": -66.8,
        "country": "Argentina",
        "operator": "Eramet",
        "ownership": "Eramet (50.1%), Tsingshan (49.9%)",
        "status": "development",
        "type": "brine",
        "products": ["lithium"],
        "capacity_tpa": 24000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "350 mg/L Li",
        "notes": (
            "Salta province; Eramet's DLE (direct lithium extraction) plant "
            "under construction; first production targeted 2024"
        ),
    },
    {
        "name": "Maricunga",
        "lat": -27.0,
        "lon": -69.27,
        "country": "Chile",
        "operator": "Lithium Power International",
        "ownership": "Lithium Power International (100%, consolidated 2021)",
        "status": "development",
        "type": "brine",
        "products": ["lithium"],
        "capacity_tpa": 15000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "960 mg/L Li",
        "notes": (
            "Blanco project on Salar de Maricunga; DFS completed; "
            "permitting in progress in Atacama region"
        ),
    },
    {
        "name": "Pastos Grandes",
        "lat": -21.6,
        "lon": -67.8,
        "country": "Bolivia",
        "operator": "Comibol / YLB",
        "ownership": (
            "Bolivia state (Corporacion Minera de Bolivia / "
            "Yacimientos de Litio Bolivianos)"
        ),
        "status": "development",
        "type": "brine",
        "products": ["lithium"],
        "capacity_tpa": 15000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "400\u2013600 mg/L Li (est.)",
        "notes": (
            "Secondary Bolivian salar under state-led exploration; "
            "pilot-scale DLE testing with CBC (China); "
            "15,000 tpa LCE target for Comibol pilot plant"
        ),
    },
    {
        "name": "Salar de Uyuni",
        "lat": -20.2,
        "lon": -67.5,
        "country": "Bolivia",
        "operator": "YLB (Yacimientos de Litio Bolivianos)",
        "ownership": "Bolivia state (100%)",
        "status": "development",
        "type": "brine",
        "products": ["lithium", "potassium"],
        "capacity_tpa": 25000,
        "production_year": None,
        "reserves_mt": 21.0,
        "grade": "350\u2013530 mg/L Li",
        "notes": (
            "World's largest lithium resource (~21 Mt Li); state-controlled; "
            "pilot plant operational; high Mg:Li ratio complicates extraction; "
            "DLE agreements with CATL/CBC and Russian Uranium One; "
            "25,000 tpa LCE target for YLB industrial phase "
            "(operational challenges persist)"
        ),
    },
    # =========================================================================
    # SOUTH AMERICA — HARD-ROCK
    # =========================================================================
    {
        "name": "Grota do Cirilo",
        "lat": -16.7,
        "lon": -42.2,
        "country": "Brazil",
        "operator": "Sigma Lithium",
        "ownership": "Sigma Lithium (100%)",
        "status": "operating",
        "type": "hard-rock spodumene",
        "products": ["lithium"],
        "capacity_tpa": 37000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "1.44% Li2O",
        "notes": (
            "Largest hard-rock lithium project in the Americas; "
            "Araçuaí/Itinga, Minas Gerais; first production April 2023; "
            "green (DMS) processing"
        ),
    },
    # =========================================================================
    # AUSTRALIA — HARD-ROCK
    # =========================================================================
    {
        "name": "Greenbushes",
        "lat": -33.86,
        "lon": 116.06,
        "country": "Australia",
        "operator": "Talison Lithium",
        "ownership": "Tianqi Lithium (51%), Albemarle (49%)",
        "status": "operating",
        "type": "hard-rock spodumene",
        "products": ["lithium"],
        "capacity_tpa": 200000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "2.4% Li2O",
        "notes": (
            "World's largest hard-rock lithium mine; operating since 1983; "
            "Talison produces ~1.5M tpa spodumene concentrate (~200k LCE equivalent)"
        ),
    },
    {
        "name": "Mt Cattlin",
        "lat": -33.53,
        "lon": 119.74,
        "country": "Australia",
        "operator": "Arcadium Lithium (formerly Allkem)",
        "ownership": "Arcadium Lithium (100%)",
        "status": "operating",
        "type": "hard-rock spodumene",
        "products": ["lithium", "tantalum"],
        "capacity_tpa": 30000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "1.2% Li2O",
        "notes": "Open-pit spodumene mine near Ravensthorpe, WA",
    },
    {
        "name": "Pilgangoora",
        "lat": -21.3,
        "lon": 118.98,
        "country": "Australia",
        "operator": "Pilbara Minerals",
        "ownership": "Pilbara Minerals (100%)",
        "status": "operating",
        "type": "hard-rock spodumene",
        "products": ["lithium", "tantalum"],
        "capacity_tpa": 90000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "1.3% Li2O",
        "notes": (
            "Major Pilbara spodumene operation; P680 and P1000 expansion projects; "
            "~680k tpa spodumene nameplate converts to ~90k LCE"
        ),
    },
    {
        "name": "Wodgina",
        "lat": -21.18,
        "lon": 118.68,
        "country": "Australia",
        "operator": "Mineral Resources / Albemarle",
        "ownership": "Mineral Resources (50%), Albemarle (50%) via MARBL JV",
        "status": "operating",
        "type": "hard-rock spodumene",
        "products": ["lithium"],
        "capacity_tpa": 100000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "1.4% Li2O",
        "notes": (
            "Restarted in 2022 after care-and-maintenance; Train 1 & 2 operational; "
            "~750k tpa spodumene nameplate converts to ~100k LCE"
        ),
    },
    {
        "name": "Finniss",
        "lat": -13.0,
        "lon": 131.2,
        "country": "Australia",
        "operator": "Core Lithium",
        "ownership": "Core Lithium (100%)",
        "status": "operating",
        "type": "hard-rock spodumene",
        "products": ["lithium"],
        "capacity_tpa": 15000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "1.4% Li2O",
        "notes": (
            "NT's first lithium mine; first shipment late 2022; operations "
            "suspended in early 2024 due to low spodumene prices"
        ),
    },
    {
        "name": "Mt Holland",
        "lat": -32.07,
        "lon": 119.83,
        "country": "Australia",
        "operator": "Covalent Lithium (SQM/Wesfarmers JV)",
        "ownership": "SQM (50%), Wesfarmers (50%) via Covalent Lithium",
        "status": "development",
        "type": "hard-rock spodumene",
        "products": ["lithium"],
        "capacity_tpa": 50000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.5% Li2O",
        "notes": (
            "Earl Grey deposit; integrated mine-to-hydroxide project "
            "with refinery at Kwinana, WA; first production expected 2025"
        ),
    },
    {
        "name": "Kathleen Valley",
        "lat": -27.49,
        "lon": 120.69,
        "country": "Australia",
        "operator": "Liontown Resources",
        "ownership": "Liontown Resources (100%)",
        "status": "development",
        "type": "hard-rock spodumene",
        "products": ["lithium", "tantalum"],
        "capacity_tpa": 46000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.4% Li2O",
        "notes": (
            "Major Tier-1 deposit near Leinster, WA; offtake agreements "
            "with Tesla and LG; commissioning 2024"
        ),
    },
    {
        "name": "Bald Hill",
        "lat": -33.28,
        "lon": 121.32,
        "country": "Australia",
        "operator": "Alita Resources",
        "ownership": "Alita Resources (formerly Tawana Resources; entered administration)",
        "status": "care and maintenance",
        "type": "hard-rock spodumene",
        "products": ["lithium", "tantalum"],
        "capacity_tpa": 24000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.0% Li2O",
        "notes": (
            "Mine placed on care-and-maintenance in 2019 after operator insolvency; "
            "high tantalum credits; near Norseman, WA"
        ),
    },
    # =========================================================================
    # CHINA
    # =========================================================================
    {
        "name": "Yichun (Jiangxi Province)",
        "lat": 27.8,
        "lon": 114.38,
        "country": "China",
        "operator": "Ganfeng Lithium / multiple",
        "ownership": (
            "Multiple operators including Ganfeng Lithium, "
            "Jiangxi Special Electric Motor"
        ),
        "status": "operating",
        "type": "hard-rock lepidolite",
        "products": ["lithium"],
        "capacity_tpa": 50000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.4\u20130.8% Li2O (lepidolite)",
        "notes": (
            "Yichun/Ningdu region hosts Asia's largest lepidolite reserves; "
            "multiple mines and processors"
        ),
    },
    {
        "name": "Yajiang\u2013Aba (Sichuan Province)",
        "lat": 30.03,
        "lon": 101.01,
        "country": "China",
        "operator": "Multiple (incl. Tianqi, CATL subsidiaries)",
        "ownership": "Various state and private operators",
        "status": "operating",
        "type": "hard-rock spodumene",
        "products": ["lithium"],
        "capacity_tpa": 40000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "1.3% Li2O",
        "notes": (
            "Lijiagou, Dangba, and surrounding spodumene deposits "
            "on the Tibetan Plateau margin"
        ),
    },
    {
        "name": "Ningdu (Jiangxi Province)",
        "lat": 26.47,
        "lon": 116.02,
        "country": "China",
        "operator": "Various (Ganfeng, others)",
        "ownership": "Multiple operators in Ningdu County pegmatite district",
        "status": "operating",
        "type": "hard-rock lepidolite",
        "products": ["lithium"],
        "capacity_tpa": 30000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.5\u20130.8% Li2O (lepidolite)",
        "notes": (
            "Southern Jiangxi lepidolite mining district; multiple small-to-medium "
            "mines; significant domestic supply source alongside Yichun cluster"
        ),
    },
    {
        "name": "Dangxiongcuo (Tibet)",
        "lat": 31.5,
        "lon": 89.0,
        "country": "China",
        "operator": "Tibet Mining / state enterprises",
        "ownership": "State-controlled enterprises (Tibet Mining Industry Co.)",
        "status": "development",
        "type": "brine (salt lake)",
        "products": ["lithium"],
        "capacity_tpa": 20000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "100\u2013300 mg/L Li (est.)",
        "notes": (
            "Tibetan Plateau salt lake lithium brine; exploration and pilot stage; "
            "extreme altitude (~4,500m) limits development; part of China's "
            "strategic lithium reserve base; 20,000 tpa LCE estimated target "
            "per Chinese government expansion plans"
        ),
    },
    # =========================================================================
    # NORTH AMERICA
    # =========================================================================
    {
        "name": "Thacker Pass",
        "lat": 41.57,
        "lon": -117.56,
        "country": "United States",
        "operator": "Lithium Americas Corp.",
        "ownership": "Lithium Americas (100%); GM equity investment",
        "status": "development",
        "type": "sedimentary clay (smectite)",
        "products": ["lithium"],
        "capacity_tpa": 40000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "2,917 ppm Li (0.29% Li)",
        "notes": (
            "Largest known lithium deposit in the US; Phase 1 construction "
            "underway in Humboldt County, NV"
        ),
    },
    {
        "name": "Silver Peak",
        "lat": 37.75,
        "lon": -117.63,
        "country": "United States",
        "operator": "Albemarle",
        "ownership": "Albemarle (100%)",
        "status": "operating",
        "type": "brine",
        "products": ["lithium"],
        "capacity_tpa": 5000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "200\u2013300 mg/L Li",
        "notes": (
            "Only currently operating lithium mine in the US; Clayton Valley, NV; "
            "operating since 1966; small scale but strategically significant"
        ),
    },
    {
        "name": "Kings Mountain (Carolina Lithium)",
        "lat": 35.24,
        "lon": -81.35,
        "country": "United States",
        "operator": "Albemarle",
        "ownership": "Albemarle (100%)",
        "status": "development",
        "type": "hard-rock spodumene",
        "products": ["lithium"],
        "capacity_tpa": 30000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.1% Li2O (est.)",
        "notes": (
            "Historic Kings Mountain lithium belt, NC; Albemarle expansion project "
            "targeting 30,000 tpa LCE; previously operated by FMC/Livent until 1988"
        ),
    },
    {
        "name": "Piedmont Lithium (Gaston County)",
        "lat": 35.33,
        "lon": -81.25,
        "country": "United States",
        "operator": "Piedmont Lithium",
        "ownership": "Piedmont Lithium (100%)",
        "status": "development",
        "type": "hard-rock spodumene",
        "products": ["lithium"],
        "capacity_tpa": 30000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.08% Li2O",
        "notes": (
            "Carolina Tin-Spodumene Belt; PFS completed; local permitting challenges; "
            "offtake agreement with Tesla"
        ),
    },
    {
        "name": "Rhyolite Ridge",
        "lat": 37.95,
        "lon": -117.85,
        "country": "United States",
        "operator": "ioneer Ltd",
        "ownership": "ioneer (50%), Sibanye-Stillwater (50% JV)",
        "status": "development",
        "type": "sedimentary (searlesite)",
        "products": ["lithium", "boron"],
        "capacity_tpa": 22000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1,769 ppm Li",
        "notes": (
            "Unique lithium-boron deposit in Esmeralda County, NV; "
            "DOE conditional loan commitment of $700M; first production targeted 2026"
        ),
    },
    {
        "name": "Whabouchi",
        "lat": 49.72,
        "lon": -75.97,
        "country": "Canada",
        "operator": "Nemaska Lithium (Livent/Arcadium)",
        "ownership": "Arcadium Lithium (50%), Investissement Quebec (50%)",
        "status": "development",
        "type": "hard-rock spodumene",
        "products": ["lithium"],
        "capacity_tpa": 34000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.4% Li2O",
        "notes": (
            "One of Canada's largest lithium deposits; in development "
            "with Becancour hydroxide plant"
        ),
    },
    {
        "name": "James Bay",
        "lat": 52.3,
        "lon": -76.6,
        "country": "Canada",
        "operator": "Allkem (now Arcadium Lithium)",
        "ownership": "Arcadium Lithium (100%)",
        "status": "development",
        "type": "hard-rock spodumene",
        "products": ["lithium"],
        "capacity_tpa": 40000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.3% Li2O",
        "notes": (
            "Large open-pit spodumene deposit in northern Quebec; DFS completed; "
            "construction decision pending; near Cree Nation of Eastmain territory"
        ),
    },
    {
        "name": "Rose Lithium-Tantalum",
        "lat": 49.78,
        "lon": -78.6,
        "country": "Canada",
        "operator": "Critical Elements Lithium",
        "ownership": "Critical Elements Lithium (100%)",
        "status": "development",
        "type": "hard-rock spodumene",
        "products": ["lithium", "tantalum"],
        "capacity_tpa": 26000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.85% Li2O",
        "notes": (
            "Eeyou Istchee James Bay, Quebec; FS completed 2023; "
            "significant tantalum by-product credits"
        ),
    },
    # =========================================================================
    # AFRICA
    # =========================================================================
    {
        "name": "Goulamina",
        "lat": 11.58,
        "lon": -7.98,
        "country": "Mali",
        "operator": "Leo Lithium / Ganfeng Lithium",
        "ownership": (
            "Ganfeng Lithium (majority, via JV with Leo Lithium); "
            "Mali state (10% carried interest)"
        ),
        "status": "development",
        "type": "hard-rock spodumene",
        "products": ["lithium"],
        "capacity_tpa": 51000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.45% Li2O",
        "notes": (
            "One of the largest undeveloped spodumene deposits globally; "
            "southern Mali near Bougouni; DFS completed; "
            "Ganfeng controlling operations post-restructuring"
        ),
    },
    {
        "name": "Arcadia",
        "lat": -17.58,
        "lon": 30.93,
        "country": "Zimbabwe",
        "operator": "Zhejiang Huayou Cobalt",
        "ownership": "Zhejiang Huayou Cobalt (majority, acquired from Prospect Resources 2022)",
        "status": "operating",
        "type": "hard-rock petalite/spodumene",
        "products": ["lithium"],
        "capacity_tpa": 42000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "1.06% Li2O (petalite dominant)",
        "notes": (
            "Near Harare; one of Africa's largest lithium deposits; fast-tracked to "
            "production under Chinese ownership; open-pit petalite and spodumene"
        ),
    },
    {
        "name": "Bikita",
        "lat": -20.06,
        "lon": 31.43,
        "country": "Zimbabwe",
        "operator": "Sinomine Resource Group",
        "ownership": "Sinomine (100%, acquired 2022)",
        "status": "operating",
        "type": "hard-rock petalite/lepidolite",
        "products": ["lithium"],
        "capacity_tpa": 30000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "1.0\u20131.4% Li2O (petalite)",
        "notes": (
            "Historic mine operating since 1950s; Masvingo Province; one of the "
            "oldest lithium mines globally; expanded under Sinomine ownership"
        ),
    },
    {
        "name": "Karibib (Rubicon/Desert Lion)",
        "lat": -21.95,
        "lon": 15.85,
        "country": "Namibia",
        "operator": "Lepidico Ltd",
        "ownership": "Lepidico (formerly Desert Lion Energy project)",
        "status": "development",
        "type": "hard-rock lepidolite",
        "products": ["lithium"],
        "capacity_tpa": 5000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.5\u20130.7% Li2O (lepidolite)",
        "notes": (
            "Karibib pegmatite field, Erongo Region; Lepidico's L-Max "
            "processing technology; small-scale development project"
        ),
    },
    {
        "name": "Manono",
        "lat": -7.3,
        "lon": 27.42,
        "country": "Democratic Republic of Congo",
        "operator": "AVZ Minerals / Dathcom Mining",
        "ownership": "AVZ Minerals (75% in Dathcom Mining JV, under dispute); Cominiere (25%)",
        "status": "development",
        "type": "hard-rock spodumene",
        "products": ["lithium", "tin"],
        "capacity_tpa": 70000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.65% Li2O",
        "notes": (
            "One of world's largest hard-rock lithium deposits (400 Mt at 1.65%); "
            "Tanganyika Province; ownership dispute ongoing with CATH/Zijin interests"
        ),
    },
    {
        "name": "Ewoyaa",
        "lat": 5.18,
        "lon": -1.28,
        "country": "Ghana",
        "operator": "Atlantic Lithium",
        "ownership": (
            "Atlantic Lithium (majority); Piedmont Lithium (offtake partner); "
            "Ghana government (13% carried interest)"
        ),
        "status": "development",
        "type": "hard-rock spodumene",
        "products": ["lithium"],
        "capacity_tpa": 25000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.26% Li2O",
        "notes": (
            "Cape Coast area, Central Region; DFS completed; potentially first "
            "lithium mine in West Africa; mining license granted 2024"
        ),
    },
    # =========================================================================
    # EUROPE
    # =========================================================================
    {
        "name": "Jadar",
        "lat": 44.43,
        "lon": 19.35,
        "country": "Serbia",
        "operator": "Rio Tinto",
        "ownership": "Rio Tinto (100%)",
        "status": "development",
        "type": "jadarite (unique mineral)",
        "products": ["lithium", "boron"],
        "capacity_tpa": 58000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.8% Li2O (jadarite)",
        "notes": (
            "Unique jadarite mineral deposit discovered 2004; permits reinstated "
            "by Serbian court 2024 after earlier government revocation"
        ),
    },
    {
        "name": "Cinovec",
        "lat": 50.73,
        "lon": 13.77,
        "country": "Czech Republic",
        "operator": "European Metals Holdings (Geomet)",
        "ownership": "European Metals Holdings (49% via Geomet JV); CEZ Group (51%)",
        "status": "development",
        "type": "hard-rock zinnwaldite/greisen",
        "products": ["lithium", "tin"],
        "capacity_tpa": 25000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.44% Li2O (zinnwaldite)",
        "notes": (
            "Largest lithium deposit in Europe; Krusne Hory/Erzgebirge (Ore Mountains) "
            "on Czech-German border; underground mine planned; PFS completed"
        ),
    },
    {
        "name": "Wolfsberg",
        "lat": 46.83,
        "lon": 14.83,
        "country": "Austria",
        "operator": "European Lithium",
        "ownership": "European Lithium (rebranded Critical Metals Corp.)",
        "status": "development",
        "type": "hard-rock spodumene",
        "products": ["lithium"],
        "capacity_tpa": 10000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.0% Li2O",
        "notes": (
            "Koralpe region, Carinthia; one of few European spodumene deposits; "
            "DFS completed; JORC resource defined; underground mine planned"
        ),
    },
    {
        "name": "Keliber (Kaustinen)",
        "lat": 63.55,
        "lon": 23.7,
        "country": "Finland",
        "operator": "Sibanye-Stillwater (Keliber Oy)",
        "ownership": "Sibanye-Stillwater (majority, acquired 2023)",
        "status": "development",
        "type": "hard-rock spodumene",
        "products": ["lithium"],
        "capacity_tpa": 15000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.0\u20131.2% Li2O",
        "notes": (
            "Ostrobothnia region; integrated mine-to-hydroxide project; "
            "multiple pegmatite deposits; Kokkola chemical plant; construction underway"
        ),
    },
    {
        "name": "San Jose (Caceres)",
        "lat": 39.47,
        "lon": -6.37,
        "country": "Spain",
        "operator": "Infinity Lithium / Extremadura New Energies",
        "ownership": "Infinity Lithium (75%), Extremadura New Energies JV",
        "status": "development",
        "type": "hard-rock lepidolite",
        "products": ["lithium", "tin"],
        "capacity_tpa": 15000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.6% Li2O (lepidolite)",
        "notes": (
            "San Jose deposit near Caceres, Extremadura; underground mine planned; "
            "close to historic tin workings; environmental opposition from city"
        ),
    },
    {
        "name": "Emili (Barroso)",
        "lat": 41.05,
        "lon": -7.55,
        "country": "Portugal",
        "operator": "Savannah Resources",
        "ownership": "Savannah Resources (majority via Lusorecursos subsidiary)",
        "status": "development",
        "type": "hard-rock spodumene",
        "products": ["lithium"],
        "capacity_tpa": 20000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.04% Li2O",
        "notes": (
            "Barroso region, northern Portugal (Boticas); JORC resource defined; "
            "EIA submitted; local opposition from agricultural/environmental groups; "
            "could become first Portuguese lithium mine"
        ),
    },
]


# --- Main --------------------------------------------------------------------

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    output = {
        "_source": SOURCE_METADATA,
        "sites": SITES,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"[ingest_lithium] Wrote {len(SITES)} lithium sites to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
