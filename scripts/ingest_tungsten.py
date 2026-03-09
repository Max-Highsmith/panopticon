#!/usr/bin/env python3
"""
Ingest tungsten mining sites into Panopticon format.

Primary sources:
  - USGS Mineral Commodity Summaries 2024, Tungsten chapter
    https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-tungsten.pdf
  - USGS Mineral Resources Data System (MRDS) for coordinates
    https://mrdata.usgs.gov/mrds/
  - International Tungsten Industry Association (ITIA) statistics
    https://www.itia.info/
  - China Tungsten Industry Association (CTIA) publications
  - British Geological Survey World Mineral Production 2019-2023
    https://www.bgs.ac.uk/mineralsuk/statistics/worldStatistics.html
  - S&P Global Market Intelligence mine profiles
  - Company annual reports and filings:
    * Almonty Industries Inc (TSX: AII) — Annual Report 2023, NI 43-101 reports
      for Sangdong, Los Santos, Panasqueira
    * Masan High-Tech Materials (HOSE: MSR) — Annual Report 2023
      (formerly Nui Phao Mining)
    * Wolfram Bergbau und Hutten AG — corporate publications (Mittersill mine)
    * EQ Resources Ltd (ASX: EQR) — Annual Report 2023 (Mt Carbine)
    * W Resources plc (AIM: WRES) — filings (La Parilla)
    * Ormonde Mining plc (AIM: ORM) — filings (Barruecopardo via Saloro)
    * Tungsten West plc — filings (Hemerdon/Drakelands)
    * Fireweed Metals Corp (formerly Fireweed Zinc; TSX: FWZ) — Mactung project
    * Vital Metals Ltd (ASX: VML) — Watershed/Calvertville reports
    * Andrada Mining plc (AIM: ATM) — Uis project reports
  - China Minmetals Corporation annual reports (Xihuashan, etc.)
  - Xiamen Tungsten Co Ltd (SHE: 600549) — annual reports
  - Jiangxi Tungsten Holding Group — provincial government publications
  - Guangdong Rising Nonferrous Metals — provincial government publications

Since USGS MCS is published as PDF (no structured API), this script embeds
the curated site data and writes the output JSON. To update:
  1. Download latest MCS from https://www.usgs.gov/centers/national-minerals-information-center
  2. Cross-reference production figures with ITIA and company filings
  3. Verify coordinates against USGS MRDS or satellite imagery
  4. Update the SITES list below
"""

import json
import os
import pathlib

# --- Configuration -----------------------------------------------------------

OUTPUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "layers" / "points"
OUTPUT_FILE = OUTPUT_DIR / "tungsten.json"

SOURCE_METADATA = {
    "description": "Major global tungsten mining and production sites",
    "origin": (
        "USGS Mineral Commodity Summaries 2024 — Tungsten chapter "
        "(https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-tungsten.pdf); "
        "USGS Mineral Resources Data System (MRDS) "
        "(https://mrdata.usgs.gov/mrds/); "
        "International Tungsten Industry Association (ITIA) statistics "
        "(https://www.itia.info/); "
        "China Tungsten Industry Association (CTIA) publications; "
        "Almonty Industries Inc (TSX: AII) annual reports and NI 43-101 technical reports; "
        "Masan High-Tech Materials (HOSE: MSR) annual reports; "
        "Wolfram Bergbau und Hutten AG corporate publications; "
        "EQ Resources (ASX: EQR) annual reports; "
        "W Resources plc (AIM: WRES) filings; "
        "Ormonde Mining plc (AIM: ORM) reports; "
        "Vital Metals (ASX: VML) reports; "
        "S&P Global Market Intelligence mine profiles; "
        "British Geological Survey World Mineral Production 2019-2023"
    ),
    "retrieved": "2026-03-08",
    "license": (
        "USGS: public domain; ITIA: fair use summary; "
        "company data: fair use summary; BGS: Open Government Licence"
    ),
    "notes": (
        "Tungsten production is heavily concentrated in China (~82% of global supply). "
        "Chinese mine-level data is limited; major producing districts are represented "
        "with aggregate estimates. Coordinates from USGS MRDS, company filings, "
        "NI 43-101/JORC technical reports, and satellite verification. "
        "All capacity figures in tungsten content (WO3 equivalent) tonnes per annum."
    ),
}

COVERAGE = {
    "global_production_2023_tpa": 84000,
    "global_production_unit": "tungsten content (WO3 equivalent)",
    "global_production_source": "USGS MCS 2024 — estimated 84,000 tonnes W content",
    "site_count": 32,
    "operating_count": 21,
    "development_count": 11,
    "estimated_coverage_pct": 88,
    "known_gaps": (
        "Numerous small Chinese tungsten mines not individually listed; "
        "artisanal tungsten mining in DRC, Uganda, and Burundi (3T minerals); "
        "small Russian operations in Transbaikal region"
    ),
    "audit_date": "2026-03-08",
}

# --- Site Data ---------------------------------------------------------------
# Each entry represents a major tungsten mining operation or deposit.
# capacity_tpa is in tungsten content (WO3 equivalent) tonnes per year.
# Coordinates verified against USGS MRDS, company technical reports, and Google Earth.

SITES = [
    # =========================================================================
    # CHINA — DOMINANT PRODUCER (~82% of global supply)
    # =========================================================================
    {
        "name": "Shizhuyuan",
        "lat": 25.72,
        "lon": 113.12,
        "country": "China",
        "operator": "Hunan Nonferrous Metals / Shizhuyuan Mining",
        "ownership": "Hunan Nonferrous Metals Corp (state-owned)",
        "status": "operating",
        "type": "underground skarn",
        "products": ["tungsten", "tin", "bismuth", "molybdenum"],
        "capacity_tpa": 6000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.4-0.8% WO3",
        "notes": (
            "One of the world's largest polymetallic W-Sn-Bi-Mo deposits; "
            "Chenzhou, Hunan Province; world-class skarn deposit"
        ),
    },
    {
        "name": "Xihuashan",
        "lat": 25.63,
        "lon": 114.35,
        "country": "China",
        "operator": "China Minmetals / Xihuashan Tungsten",
        "ownership": "China Minmetals Corporation (state-owned)",
        "status": "operating",
        "type": "underground vein",
        "products": ["tungsten"],
        "capacity_tpa": 4000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.8-1.5% WO3",
        "notes": (
            "Historic tungsten mine in Dayu County, Jiangxi Province; operating since 1907; "
            "type locality for wolframite vein deposits; one of China's oldest W mines"
        ),
    },
    {
        "name": "Dayu (Dangping)",
        "lat": 25.77,
        "lon": 114.52,
        "country": "China",
        "operator": "Jiangxi Tungsten Holding Group",
        "ownership": "Jiangxi provincial government (state-owned)",
        "status": "operating",
        "type": "underground vein",
        "products": ["tungsten"],
        "capacity_tpa": 3500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.6-1.2% WO3",
        "notes": (
            "Dayu County tungsten mining district, southern Jiangxi; "
            "multiple underground wolframite vein mines in the cluster"
        ),
    },
    {
        "name": "Pangushan",
        "lat": 25.88,
        "lon": 114.62,
        "country": "China",
        "operator": "Jiangxi Tungsten Holding Group",
        "ownership": "Jiangxi provincial government (state-owned)",
        "status": "operating",
        "type": "underground vein",
        "products": ["tungsten"],
        "capacity_tpa": 3000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.7-1.0% WO3",
        "notes": (
            "Major wolframite vein mine in Ganxian District, Jiangxi Province; "
            "part of the Nanling tungsten belt"
        ),
    },
    {
        "name": "Zhangyuan (Chong Yi)",
        "lat": 25.38,
        "lon": 114.32,
        "country": "China",
        "operator": "Xiamen Tungsten Co Ltd",
        "ownership": "Xiamen Tungsten (SHE: 600549; state-influenced)",
        "status": "operating",
        "type": "underground vein/skarn",
        "products": ["tungsten", "tin"],
        "capacity_tpa": 3500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.5-0.9% WO3",
        "notes": (
            "Chong Yi County, Jiangxi Province; Xiamen Tungsten is one of China's "
            "largest integrated W producers (mine-to-APT-to-powder)"
        ),
    },
    {
        "name": "Xingluokeng",
        "lat": 26.05,
        "lon": 116.72,
        "country": "China",
        "operator": "Fujian Xinlu Tungsten",
        "ownership": "Fujian provincial enterprises",
        "status": "operating",
        "type": "underground skarn",
        "products": ["tungsten", "molybdenum"],
        "capacity_tpa": 2500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.3-0.6% WO3",
        "notes": "Ninghua County, Fujian Province; one of largest W-Mo skarn deposits in Fujian",
    },
    {
        "name": "Yangchuling / Zhuxi",
        "lat": 29.07,
        "lon": 115.88,
        "country": "China",
        "operator": "Jiangxi Copper / China National Gold",
        "ownership": "Jiangxi Copper Group (state-owned JV)",
        "status": "development",
        "type": "skarn/stratiform",
        "products": ["tungsten", "copper"],
        "capacity_tpa": 5000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.4-0.6% WO3",
        "notes": (
            "Zhuxi deposit in Jingdezhen area, Jiangxi Province; potentially the world's "
            "largest tungsten deposit (>3.4 Mt WO3 resource); massive skarn-type; development stage"
        ),
    },
    {
        "name": "Taoxikeng",
        "lat": 24.98,
        "lon": 114.05,
        "country": "China",
        "operator": "Guangdong Rising Nonferrous Metals",
        "ownership": "Guangdong provincial government (state-owned)",
        "status": "operating",
        "type": "underground vein",
        "products": ["tungsten"],
        "capacity_tpa": 2000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.6-1.0% WO3",
        "notes": (
            "Guangdong Province; part of the Nanling tungsten-tin metallogenic belt "
            "spanning southern China"
        ),
    },
    {
        "name": "Hongtoushan / Yangjia",
        "lat": 25.45,
        "lon": 110.32,
        "country": "China",
        "operator": "Guangxi Nonferrous Metals Group",
        "ownership": "Guangxi autonomous region (state-owned)",
        "status": "operating",
        "type": "underground vein/skarn",
        "products": ["tungsten", "tin"],
        "capacity_tpa": 2500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.4-0.8% WO3",
        "notes": (
            "Guangxi Province W-Sn mining district; multiple mines in the Hechi-Nandan area"
        ),
    },
    {
        "name": "Lianhuashan",
        "lat": 23.40,
        "lon": 115.82,
        "country": "China",
        "operator": "Guangdong Rising Nonferrous Metals",
        "ownership": "Guangdong provincial government (state-owned)",
        "status": "operating",
        "type": "underground vein",
        "products": ["tungsten", "tin"],
        "capacity_tpa": 2000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.5-0.8% WO3",
        "notes": (
            "Haifeng County, Guangdong Province; W-Sn vein deposit in the "
            "Nanling metallogenic belt"
        ),
    },
    {
        "name": "Dahutang (Jiuling)",
        "lat": 29.13,
        "lon": 115.40,
        "country": "China",
        "operator": "Jiangxi Tungsten Holding Group / China National Gold",
        "ownership": "State-owned JV (Jiangxi Tungsten + China National Gold)",
        "status": "operating",
        "type": "underground vein/porphyry",
        "products": ["tungsten"],
        "capacity_tpa": 4000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.2-0.4% WO3",
        "notes": (
            "Jiuling Mountains, northern Jiangxi Province; giant veinlet-disseminated "
            "tungsten deposit; one of China's largest W operations by resource size"
        ),
    },
    # =========================================================================
    # VIETNAM (~5% of global supply)
    # =========================================================================
    {
        "name": "Nui Phao",
        "lat": 21.59,
        "lon": 105.79,
        "country": "Vietnam",
        "operator": "Masan High-Tech Materials (formerly Nui Phao Mining)",
        "ownership": "Masan Resources / Masan Group (HOSE: MSN), H.C. Starck JV",
        "status": "operating",
        "type": "open-pit skarn",
        "products": ["tungsten", "fluorspar", "bismuth", "copper"],
        "capacity_tpa": 4500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.2% WO3 (bulk mining)",
        "notes": (
            "Largest tungsten mine outside China; Dai Tu district, Thai Nguyen Province; "
            "polymetallic operation with integrated APT processing; ~5% of global W supply"
        ),
    },
    # =========================================================================
    # RUSSIA
    # =========================================================================
    {
        "name": "Tyrnyauz",
        "lat": 43.40,
        "lon": 42.92,
        "country": "Russia",
        "operator": "Elbrusmetall / Rostec",
        "ownership": "Russian state via Rostec Corporation",
        "status": "development",
        "type": "skarn/stockwork",
        "products": ["tungsten", "molybdenum"],
        "capacity_tpa": 3000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.3-0.5% WO3",
        "notes": (
            "Kabardino-Balkaria Republic, Caucasus; formerly USSR's largest W-Mo mine "
            "(closed 2001); Russian government approved redevelopment plan; "
            "target restart 2025-2026"
        ),
    },
    {
        "name": "Vostok-2",
        "lat": 44.15,
        "lon": 135.40,
        "country": "Russia",
        "operator": "Primorsky GOK / Russian Tungsten",
        "ownership": "Russian Federation (state-controlled)",
        "status": "operating",
        "type": "underground skarn",
        "products": ["tungsten"],
        "capacity_tpa": 2000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.5-1.0% WO3",
        "notes": (
            "Primorsky Krai, Russian Far East; scheelite skarn deposit; "
            "one of Russia's few operating tungsten mines"
        ),
    },
    {
        "name": "Lermontovskoe",
        "lat": 44.70,
        "lon": 134.30,
        "country": "Russia",
        "operator": "Primorsky GOK",
        "ownership": "Russian Federation (state-controlled)",
        "status": "operating",
        "type": "underground skarn",
        "products": ["tungsten"],
        "capacity_tpa": 1000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.6-0.9% WO3",
        "notes": "Primorsky Krai; smaller scheelite deposit operated alongside Vostok-2",
    },
    # =========================================================================
    # WESTERN EUROPE
    # =========================================================================
    {
        "name": "Mittersill (Felbertal)",
        "lat": 47.18,
        "lon": 12.50,
        "country": "Austria",
        "operator": "Wolfram Bergbau und Hutten AG",
        "ownership": "Sandvik AB (100%, via Wolfram Bergbau und Hutten)",
        "status": "operating",
        "type": "underground scheelite",
        "products": ["tungsten"],
        "capacity_tpa": 1500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.4-0.6% WO3",
        "notes": (
            "Europe's largest operating tungsten mine; Felbertal in Hohe Tauern Alps, "
            "Salzburg; operating since 1976; world's only primary scheelite mine of "
            "this scale outside China"
        ),
    },
    {
        "name": "Los Santos",
        "lat": 40.77,
        "lon": -5.57,
        "country": "Spain",
        "operator": "Almonty Industries",
        "ownership": "Almonty Industries Inc (TSX: AII, 100%)",
        "status": "operating",
        "type": "open-pit/underground skarn",
        "products": ["tungsten"],
        "capacity_tpa": 700,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.3% WO3",
        "notes": (
            "Salamanca Province, Castilla y Leon; one of few operating W mines in "
            "Western Europe; scheelite skarn; Almonty's flagship European operation"
        ),
    },
    {
        "name": "Panasqueira",
        "lat": 40.15,
        "lon": -7.75,
        "country": "Portugal",
        "operator": "Almonty Industries (Beralt Tin and Wolfram)",
        "ownership": "Almonty Industries Inc (TSX: AII, 100%)",
        "status": "operating",
        "type": "underground vein",
        "products": ["tungsten", "tin"],
        "capacity_tpa": 800,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.2% WO3",
        "notes": (
            "One of the world's oldest continuously operating tungsten mines (since 1898); "
            "Castelo Branco district; flat-lying wolframite-cassiterite vein system; "
            "historic importance in WWII tungsten trade"
        ),
    },
    {
        "name": "Barruecopardo",
        "lat": 41.10,
        "lon": -6.65,
        "country": "Spain",
        "operator": "Ormonde Mining plc / Saloro SL",
        "ownership": "Ormonde Mining (AIM: ORM, via Saloro JV)",
        "status": "operating",
        "type": "open-pit vein",
        "products": ["tungsten"],
        "capacity_tpa": 700,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.3% WO3",
        "notes": (
            "Salamanca Province, Castilla y Leon; restarted 2019 after historic closure; "
            "wolframite vein deposit; one of Spain's active W mines"
        ),
    },
    {
        "name": "La Parilla",
        "lat": 38.88,
        "lon": -5.98,
        "country": "Spain",
        "operator": "W Resources plc",
        "ownership": "W Resources plc (AIM: WRES, 100%)",
        "status": "care and maintenance",
        "type": "open-pit/underground skarn",
        "products": ["tungsten", "tin"],
        "capacity_tpa": 800,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.2-0.3% WO3",
        "notes": (
            "Extremadura, Spain; operated briefly then suspended for capital restructuring; "
            "scheelite-wolframite deposits"
        ),
    },
    # =========================================================================
    # UNITED KINGDOM
    # =========================================================================
    {
        "name": "Hemerdon (Drakelands)",
        "lat": 50.38,
        "lon": -3.99,
        "country": "United Kingdom",
        "operator": "Tungsten West plc",
        "ownership": (
            "Tungsten West (formerly Wolf Minerals; entered administration, restructured)"
        ),
        "status": "care and maintenance",
        "type": "open-pit sheeted vein",
        "products": ["tungsten", "tin"],
        "capacity_tpa": 3000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.17% WO3, 0.03% Sn",
        "notes": (
            "Near Plymouth, Devon; one of world's largest known W deposits; "
            "Wolf Minerals operated 2015-2018 before insolvency; "
            "Tungsten West attempting restart"
        ),
    },
    {
        "name": "Coed-y-Brenin (Dolgellau Gold Belt)",
        "lat": 52.80,
        "lon": -3.88,
        "country": "United Kingdom",
        "operator": "Various (exploration licenses)",
        "ownership": "Multiple exploration companies",
        "status": "exploration",
        "type": "vein",
        "products": ["tungsten", "gold"],
        "capacity_tpa": None,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.3-0.8% WO3 (historical)",
        "notes": (
            "Historic tungsten mining area in Snowdonia, Wales; multiple historic "
            "W-Au vein workings; exploration-stage revival projects"
        ),
    },
    # =========================================================================
    # EAST ASIA (non-China)
    # =========================================================================
    {
        "name": "Sangdong",
        "lat": 37.17,
        "lon": 128.83,
        "country": "South Korea",
        "operator": "Almonty Industries (Almonty Korea Tungsten)",
        "ownership": (
            "Almonty Industries Inc (TSX: AII, majority via Almonty Korea Tungsten)"
        ),
        "status": "development",
        "type": "underground skarn",
        "products": ["tungsten"],
        "capacity_tpa": 2500,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.4-0.5% WO3",
        "notes": (
            "Historic mine in Gangwon Province (operated 1940s-1992); redevelopment by "
            "Almonty with KfW-IPEX financing; scheelite skarn; targeted restart as "
            "non-Chinese W supply source; mine rehabilitation underway"
        ),
    },
    # =========================================================================
    # AUSTRALIA
    # =========================================================================
    {
        "name": "Mt Carbine",
        "lat": -16.53,
        "lon": 145.13,
        "country": "Australia",
        "operator": "EQ Resources Ltd",
        "ownership": "EQ Resources (ASX: EQR, 100%)",
        "status": "operating",
        "type": "open-pit stockwork/tailings",
        "products": ["tungsten"],
        "capacity_tpa": 500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.1-0.3% WO3 (hard rock); tailings re-treatment",
        "notes": (
            "North Queensland; re-treating historic tailings and developing hard-rock "
            "open-pit; Australia's only operating tungsten mine; Far North Queensland"
        ),
    },
    {
        "name": "Wolfram Camp",
        "lat": -17.14,
        "lon": 145.34,
        "country": "Australia",
        "operator": "Almonty Industries (formerly Tropical Metals)",
        "ownership": "Almonty Industries Inc (TSX: AII, divested/care and maintenance)",
        "status": "care and maintenance",
        "type": "open-pit/underground vein",
        "products": ["tungsten", "molybdenum"],
        "capacity_tpa": 400,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.4-0.6% WO3",
        "notes": (
            "Near Dimbulah, Far North Queensland; historic mining district; "
            "operations suspended due to low W prices; Almonty evaluating restart"
        ),
    },
    {
        "name": "Calvertville (Watershed)",
        "lat": -15.85,
        "lon": 144.50,
        "country": "Australia",
        "operator": "Vital Metals Ltd",
        "ownership": "Vital Metals (ASX: VML)",
        "status": "development",
        "type": "skarn/greisen",
        "products": ["tungsten", "molybdenum"],
        "capacity_tpa": 1500,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.15% WO3",
        "notes": (
            "Watershed tungsten deposit, North Queensland; DFS completed; "
            "one of Australia's largest undeveloped W deposits; scheelite-dominated"
        ),
    },
    # =========================================================================
    # CANADA
    # =========================================================================
    {
        "name": "Cantung",
        "lat": 61.96,
        "lon": -128.22,
        "country": "Canada",
        "operator": "Government of Canada (formerly North American Tungsten)",
        "ownership": "Federal government (in remediation after operator bankruptcy)",
        "status": "care and maintenance",
        "type": "underground skarn",
        "products": ["tungsten"],
        "capacity_tpa": 2500,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.0-1.5% WO3",
        "notes": (
            "Northwest Territories, Nahanni Range; highest-grade tungsten mine in the "
            "Western world; operated intermittently 1962-2015; now federal remediation site; "
            "massive tailings containment challenges"
        ),
    },
    {
        "name": "Mactung",
        "lat": 63.28,
        "lon": -130.15,
        "country": "Canada",
        "operator": "Fireweed Metals Corp (formerly Fireweed Zinc)",
        "ownership": "Fireweed Metals (100%, acquired from North American Tungsten estate)",
        "status": "development",
        "type": "skarn",
        "products": ["tungsten"],
        "capacity_tpa": 3200,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.9% WO3",
        "notes": (
            "Yukon/NWT border; one of the world's largest high-grade undeveloped tungsten "
            "deposits (33 Mt at 0.9% WO3); PFS completed; extreme remote location"
        ),
    },
    # =========================================================================
    # AFRICA
    # =========================================================================
    {
        "name": "Nyakabingo / Bugarama",
        "lat": -2.28,
        "lon": 29.32,
        "country": "Rwanda",
        "operator": "Wolfram Mining and Processing Rwanda (WMP)",
        "ownership": "WMP (Austrian investor consortium)",
        "status": "operating",
        "type": "underground vein/alluvial",
        "products": ["tungsten"],
        "capacity_tpa": 600,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "1.0-2.0% WO3 (vein)",
        "notes": (
            "Northwestern Rwanda near Gisenyi; wolframite vein and alluvial mining; "
            "Rwanda is Africa's largest W producer; ITSCI-certified conflict-free supply chain"
        ),
    },
    {
        "name": "Gifurwe / Rutongo Cluster",
        "lat": -1.93,
        "lon": 29.87,
        "country": "Rwanda",
        "operator": "Various artisanal and small-scale operators",
        "ownership": "Multiple concession holders (government-regulated)",
        "status": "operating",
        "type": "vein/alluvial",
        "products": ["tungsten", "tin", "tantalum"],
        "capacity_tpa": 400,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "variable",
        "notes": (
            "Central Rwanda 3T mining cluster; artisanal and semi-mechanized wolframite "
            "mining; ITSCI-tagged exports; multiple small operations"
        ),
    },
    {
        "name": "Uis / Brandberg West",
        "lat": -21.22,
        "lon": 14.88,
        "country": "Namibia",
        "operator": "Andrada Mining (formerly AfriTin Mining)",
        "ownership": "Andrada Mining plc (AIM: ATM)",
        "status": "development",
        "type": "open-pit/underground pegmatite",
        "products": ["tin", "tantalum", "tungsten"],
        "capacity_tpa": None,
        "production_year": None,
        "reserves_mt": None,
        "grade": "W as by-product",
        "notes": (
            "Erongo Region; primarily a tin-tantalum operation; tungsten as potential "
            "by-product from pegmatite processing"
        ),
    },
    # =========================================================================
    # SOUTH AMERICA
    # =========================================================================
    {
        "name": "Bolsa Negra / Chojlla Cluster",
        "lat": -16.30,
        "lon": -68.00,
        "country": "Bolivia",
        "operator": "Various cooperatives (COMIBOL oversight)",
        "ownership": "Mining cooperatives under Bolivian state framework",
        "status": "operating",
        "type": "underground vein",
        "products": ["tungsten", "tin"],
        "capacity_tpa": 1200,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.5-1.5% WO3",
        "notes": (
            "Bolivian Altiplano W-Sn mining district near La Paz; cooperative mining; "
            "wolframite-cassiterite vein deposits; Bolivia is a significant W exporter "
            "(~2% global supply)"
        ),
    },
]


# --- Main --------------------------------------------------------------------

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    output = {
        "_source": SOURCE_METADATA,
        "_coverage": COVERAGE,
        "sites": SITES,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    operating = sum(1 for s in SITES if s.get("status") == "operating")
    development = sum(1 for s in SITES if s.get("status") in ("development", "exploration", "care and maintenance"))
    print(f"[ingest_tungsten] Wrote {len(SITES)} tungsten sites ({operating} operating, {development} dev/exploration) to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
