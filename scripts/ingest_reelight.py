#!/usr/bin/env python3
"""
Ingest light rare earth element (LREE) mining sites into Panopticon format.

Light REE: La (lanthanum), Ce (cerium), Pr (praseodymium), Nd (neodymium)
Used in: permanent magnets (NdFeB), catalysts, glass polishing, metallurgy

Primary sources:
  - USGS Mineral Commodity Summaries 2024, Rare Earths chapter
    https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-rare-earths.pdf
  - USGS Mineral Resources Data System (MRDS) for coordinates
    https://mrdata.usgs.gov/mrds/
  - Adamas Intelligence Rare Earth Magnet Market Outlook
    https://www.adamasintel.com/
  - China Ministry of Natural Resources rare earth production quotas
    http://www.mnr.gov.cn/
  - Company annual reports and filings:
    * Northern Rare Earth / Baotou Steel (SHA: 600111)
    * MP Materials (NYSE: MP) — 10-K 2023
    * Lynas Rare Earths (ASX: LYC) — Annual Report 2023
    * Arafura Rare Earths (ASX: ARU) — Annual Report 2023
    * Vital Metals (ASX: VML) — Annual Report 2023
    * Hastings Technology Metals (ASX: HAS) — Annual Report 2023
    * Peak Resources (ASX: PEK) — Annual Report 2023
    * Greenland Minerals (ASX: GGG) filings
    * LKAB press releases (Kiruna REE discovery, January 2023)
    * Defense Metals (TSX-V: DEFN) filings
    * Rare Element Resources (TSX: RES) filings
    * Mkango Resources (TSX-V: MKA) filings
    * Serra Verde Mining (JOGMEC partnership)
  - Myanmar rare earth export data: Chinese customs statistics
    (General Administration of Customs, PRC)
  - IREL India annual reports
  - Vietnam MONRE (Ministry of Natural Resources) Dong Pao publications

Since USGS MCS is published as PDF (no structured API), this script embeds
the curated site data and writes the output JSON. To update:
  1. Download latest MCS from https://www.usgs.gov/centers/national-minerals-information-center
  2. Cross-reference production figures with company SEC/ASX filings
  3. Verify coordinates against USGS MRDS or satellite imagery
  4. Check Chinese MIIT/MNR rare earth production quota announcements
  5. Update the SITES list below
"""

import json
import pathlib

# --- Configuration -----------------------------------------------------------

OUTPUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "layers" / "points"
OUTPUT_FILE = OUTPUT_DIR / "reelight.json"

SOURCE_METADATA = {
    "description": (
        "Major global light rare earth element (LREE) mining and production sites "
        "— La, Ce, Pr, Nd used in permanent magnets, catalysts, glass polishing, "
        "and metallurgy"
    ),
    "origin": (
        "USGS Mineral Commodity Summaries 2024, Rare Earths chapter "
        "(https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-rare-earths.pdf); "
        "USGS Mineral Resources Data System (MRDS) for coordinates "
        "(https://mrdata.usgs.gov/mrds/); "
        "Adamas Intelligence Rare Earth Magnet Market Outlook "
        "(https://www.adamasintel.com/); "
        "China Ministry of Natural Resources rare earth production quotas "
        "(http://www.mnr.gov.cn/); "
        "Northern Rare Earth (Baotou Steel) annual reports (SHA: 600111); "
        "MP Materials (NYSE: MP) 10-K 2023; "
        "Lynas Rare Earths (ASX: LYC) Annual Report 2023; "
        "Arafura Rare Earths (ASX: ARU) Annual Report 2023; "
        "Vital Metals (ASX: VML) Annual Report 2023; "
        "Greenland Minerals (ASX: GGG) filings; "
        "LKAB press releases on Kiruna REE discovery (Jan 2023); "
        "Peak Resources (ASX: PEK) Annual Report 2023; "
        "Myanmar rare earth export data via Chinese customs statistics "
        "(General Administration of Customs, PRC); "
        "IREL India annual reports; "
        "Dong Pao mine data from Vietnam MONRE publications"
    ),
    "retrieved": "2026-03-08",
    "license": (
        "USGS: public domain; Chinese government data: public domain; "
        "company data: fair use summary of public filings"
    ),
    "notes": (
        "Light REE (La, Ce, Pr, Nd) comprise ~85% of total rare earth oxide (REO) "
        "production. Global total REO production ~300,000 t/yr (USGS MCS 2024), so "
        "LREE ~255,000 t/yr. China dominates with ~60% of global production, "
        "primarily from Bayan Obo (carbonatite/bastnaesite) and Sichuan bastnaesite "
        "deposits. Coordinates from USGS MRDS, company NI 43-101/JORC reports, "
        "satellite imagery verification. All capacity figures in REO (rare earth "
        "oxide) equivalent tonnes per annum."
    ),
}

COVERAGE_METADATA = {
    "global_production_2023_tpa": 255000,
    "global_production_unit": "REO (rare earth oxide) equivalent",
    "global_production_source": (
        "USGS MCS 2024 — ~300,000 t total REO globally, light REE ~85% = ~255,000 t"
    ),
    "estimated_coverage_pct": 88,
    "site_count": 30,
    "operating_count": 14,
    "development_count": 16,
    "known_gaps": (
        "Smaller Chinese operations in Shandong and Hunan provinces; "
        "informal artisanal mining in Myanmar Shan State; some Indian beach sand "
        "monazite processing facilities under IREL"
    ),
    "audit_date": "2026-03-08",
}

# --- Site Data ---------------------------------------------------------------
# Each entry represents a major LREE mining operation.
# capacity_tpa is in REO (rare earth oxide) equivalent tonnes per year.
# Coordinates verified against USGS MRDS, company technical reports, and Google Earth.

SITES = [
    # =========================================================================
    # CHINA — DOMINANT LREE PRODUCER (~60% of global)
    # =========================================================================
    {
        "name": "Bayan Obo",
        "lat": 41.8,
        "lon": 109.97,
        "country": "China",
        "operator": "Northern Rare Earth (Baotou Steel)",
        "ownership": "China Northern Rare Earth Group (state-owned, subsidiary of Baotou Steel)",
        "status": "operating",
        "type": "carbonatite (bastnaesite/monazite)",
        "products": ["cerium", "lanthanum", "neodymium", "praseodymium"],
        "capacity_tpa": 60000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "3-6% REO",
        "notes": (
            "World's largest REE deposit; Inner Mongolia; ~50% of China's LREE "
            "production; iron ore co-product; operating since 1957; estimated "
            "48 Mt REO reserves"
        ),
    },
    {
        "name": "Maoniuping (Mianning)",
        "lat": 28.55,
        "lon": 102.18,
        "country": "China",
        "operator": "Shenghe Resources / JL MAG",
        "ownership": "Shenghe Resources Holding (SHA: 600392); JL MAG Rare-Earth (SHE: 300748)",
        "status": "operating",
        "type": "carbonatite (bastnaesite)",
        "products": ["cerium", "lanthanum", "neodymium", "praseodymium"],
        "capacity_tpa": 30000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "2-5% REO",
        "notes": (
            "Sichuan Province; second-largest LREE deposit in China; bastnaesite "
            "carbonatite vein deposit; major NdPr source for magnet production"
        ),
    },
    {
        "name": "Dalucao",
        "lat": 27.65,
        "lon": 102.4,
        "country": "China",
        "operator": "Sichuan Jiangci Mining (state consortium)",
        "ownership": "State-controlled Sichuan provincial consortium",
        "status": "operating",
        "type": "carbonatite (bastnaesite)",
        "products": ["cerium", "lanthanum", "neodymium"],
        "capacity_tpa": 10000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "2-4% REO",
        "notes": (
            "Sichuan Province; companion deposit to Maoniuping; "
            "bastnaesite carbonatite"
        ),
    },
    {
        "name": "Weishan",
        "lat": 35.18,
        "lon": 116.98,
        "country": "China",
        "operator": "Shandong Weishan Lake Rare Earth",
        "ownership": "Shandong provincial state-owned enterprise",
        "status": "operating",
        "type": "alkaline ignite (bastnaesite/parisite)",
        "products": ["cerium", "lanthanum", "neodymium"],
        "capacity_tpa": 5000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "1-3% REO",
        "notes": (
            "Shandong Province; Weishan Lake area; smaller operation focused on "
            "LREE; bastnaesite and parisite mineralization"
        ),
    },
    {
        "name": "Zhaotong REE District",
        "lat": 27.33,
        "lon": 103.72,
        "country": "China",
        "operator": "Various (consolidated under China Northern/Southern RE groups)",
        "ownership": "Consolidated under state rare earth groups per 2021 restructuring",
        "status": "operating",
        "type": "carbonatite (bastnaesite)",
        "products": ["cerium", "lanthanum", "neodymium"],
        "capacity_tpa": 8000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "2-4% REO",
        "notes": (
            "Yunnan Province; multiple small-medium bastnaesite deposits "
            "consolidated under state management"
        ),
    },
    # =========================================================================
    # UNITED STATES
    # =========================================================================
    {
        "name": "Mountain Pass",
        "lat": 35.48,
        "lon": -115.53,
        "country": "United States",
        "operator": "MP Materials",
        "ownership": "MP Materials (NYSE: MP, 100%)",
        "status": "operating",
        "type": "carbonatite (bastnaesite)",
        "products": ["cerium", "lanthanum", "neodymium", "praseodymium"],
        "capacity_tpa": 40000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "7% REO (exceptionally high grade)",
        "notes": (
            "Only active US rare earth mine; San Bernardino County, California; "
            "~12% of global REO; concentrate shipped to China for separation until "
            "2025 onsite separation plant completion; originally opened 1952 by Molycorp"
        ),
    },
    {
        "name": "Bear Lodge",
        "lat": 44.49,
        "lon": -104.43,
        "country": "United States",
        "operator": "Rare Element Resources",
        "ownership": "Rare Element Resources (TSX: RES / OTCQX: REEMF, 100%)",
        "status": "development",
        "type": "carbonatite/alkaline intrusion",
        "products": ["neodymium", "praseodymium", "cerium", "lanthanum"],
        "capacity_tpa": 5000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "3.0% REO",
        "notes": (
            "Wyoming Black Hills; Bull Hill deposit; NdPr-enriched LREE carbonatite; "
            "PFS completed; US DoD DPA Title III funding received; potential domestic "
            "US REE source"
        ),
    },
    # =========================================================================
    # AUSTRALIA
    # =========================================================================
    {
        "name": "Mt Weld",
        "lat": -28.77,
        "lon": 122.55,
        "country": "Australia",
        "operator": "Lynas Rare Earths",
        "ownership": "Lynas Rare Earths (ASX: LYC, 100%)",
        "status": "operating",
        "type": "carbonatite (monazite/apatite weathered laterite)",
        "products": ["neodymium", "praseodymium", "lanthanum", "cerium"],
        "capacity_tpa": 12000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "15.4% REO (world's highest grade REE deposit)",
        "notes": (
            "Western Australia; highest-grade known REE deposit globally; ore "
            "processed at LAMP facility in Kuantan, Malaysia; new Kalgoorlie "
            "cracking/leaching plant under construction; ~10,500 t REO produced 2023"
        ),
    },
    {
        "name": "Nolans",
        "lat": -22.59,
        "lon": 133.24,
        "country": "Australia",
        "operator": "Arafura Rare Earths",
        "ownership": "Arafura Rare Earths (ASX: ARU, 100%)",
        "status": "development",
        "type": "apatite-allanite-epidote vein",
        "products": ["neodymium", "praseodymium", "cerium", "lanthanum"],
        "capacity_tpa": 4440,
        "production_year": None,
        "reserves_mt": None,
        "grade": "2.6% REO (26% NdPr within REO)",
        "notes": (
            "Northern Territory; NdPr-rich deposit with unusually high proportion "
            "of magnet-feed REE; DFS completed; integrated mine-to-separated-oxide "
            "project; AU government critical minerals offtake framework"
        ),
    },
    {
        "name": "Yangibana",
        "lat": -23.6,
        "lon": 116.3,
        "country": "Australia",
        "operator": "Hastings Technology Metals",
        "ownership": "Hastings Technology Metals (ASX: HAS, 100%)",
        "status": "development",
        "type": "ironstone (monazite hosted in ironstone veins)",
        "products": ["neodymium", "praseodymium", "cerium", "lanthanum"],
        "capacity_tpa": 3400,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.18% REO (high NdPr ratio ~37% of TREO)",
        "notes": (
            "Gascoyne region, Western Australia; NdPr-enriched deposit with "
            "unusually high proportion of magnet-feed REE (~37% NdPr of total REO "
            "vs industry average ~22%); DFS completed; construction commenced"
        ),
    },
    # =========================================================================
    # MYANMAR
    # =========================================================================
    {
        "name": "Kachin State LREE Operations",
        "lat": 25.5,
        "lon": 97.5,
        "country": "Myanmar",
        "operator": "Various (informal/artisanal miners)",
        "ownership": "Multiple small operators; Kachin Independence Army territory",
        "status": "operating",
        "type": "ionic adsorption clay (some hard-rock)",
        "products": ["neodymium", "praseodymium", "cerium", "lanthanum"],
        "capacity_tpa": 38000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "variable (0.05-0.3% REO)",
        "notes": (
            "~12% of global REO supply; largely unregulated mining in Kachin State; "
            "raw ore/concentrate exported to China (Yunnan) for processing; "
            "environmental concerns; production surged post-2017; strategic supply "
            "vulnerability due to conflict zone"
        ),
    },
    # =========================================================================
    # INDIA
    # =========================================================================
    {
        "name": "IREL Chavara",
        "lat": 9.0,
        "lon": 76.55,
        "country": "India",
        "operator": "Indian Rare Earths Limited (IREL)",
        "ownership": "Government of India (100%, Dept of Atomic Energy)",
        "status": "operating",
        "type": "placer (beach sand monazite)",
        "products": ["cerium", "lanthanum", "neodymium"],
        "capacity_tpa": 3000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "monazite concentrate 55-60% REO",
        "notes": (
            "Kerala coast; beach sand heavy mineral processing; monazite separated "
            "as REE source; thorium co-product (strategic for India's nuclear program); "
            "IREL operates multiple beach sand plants"
        ),
    },
    {
        "name": "IREL OSCOM (Chatrapur)",
        "lat": 19.35,
        "lon": 84.98,
        "country": "India",
        "operator": "Indian Rare Earths Limited (IREL)",
        "ownership": "Government of India (100%, Dept of Atomic Energy)",
        "status": "operating",
        "type": "placer (beach sand monazite)",
        "products": ["cerium", "lanthanum", "neodymium", "praseodymium"],
        "capacity_tpa": 5000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "monazite concentrate 55-60% REO",
        "notes": (
            "Odisha coast; India's largest beach sand mineral processing complex; "
            "monazite and other heavy mineral separation; OSCOM = Orissa Sands Complex"
        ),
    },
    # =========================================================================
    # THAILAND
    # =========================================================================
    {
        "name": "Thailand Monazite Operations",
        "lat": 8.5,
        "lon": 98.5,
        "country": "Thailand",
        "operator": "Various (tin mining byproduct)",
        "ownership": "Multiple Thai operators under DPIM oversight",
        "status": "operating",
        "type": "placer (monazite byproduct from tin mining)",
        "products": ["cerium", "lanthanum", "neodymium"],
        "capacity_tpa": 7000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "monazite byproduct (55-60% REO)",
        "notes": (
            "Southern Thailand (Phuket/Phang Nga region historic tin belt); monazite "
            "recovered as byproduct of tin dredging and smelting; exported to China "
            "and Malaysia for processing"
        ),
    },
    # =========================================================================
    # RUSSIA
    # =========================================================================
    {
        "name": "Lovozero",
        "lat": 67.89,
        "lon": 34.78,
        "country": "Russia",
        "operator": "Solikamsk Magnesium Works",
        "ownership": "Solikamsk Magnesium Works (private Russian company)",
        "status": "operating",
        "type": "alkaline igneous (loparite)",
        "products": ["cerium", "lanthanum", "neodymium"],
        "capacity_tpa": 3000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "loparite ore ~30% REO",
        "notes": (
            "Kola Peninsula; Lovozero alkaline massif; loparite ore processed at "
            "Solikamsk; Russia's primary REE operation; small by global standards "
            "but strategically important for Russian domestic supply"
        ),
    },
    # =========================================================================
    # CANADA
    # =========================================================================
    {
        "name": "Nechalacho",
        "lat": 62.14,
        "lon": -112.57,
        "country": "Canada",
        "operator": "Vital Metals",
        "ownership": "Vital Metals (ASX: VML, 100%)",
        "status": "operating",
        "type": "pegmatite (bastnaesite)",
        "products": ["cerium", "lanthanum", "neodymium", "praseodymium"],
        "capacity_tpa": 1000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "3.3% REO",
        "notes": (
            "Northwest Territories; Canada's first rare earth producer (2021); "
            "bastnaesite ore from North T deposit; concentrate processed at "
            "Vital's Saskatoon facility; small-scale operation"
        ),
    },
    {
        "name": "Wicheeda",
        "lat": 54.85,
        "lon": -122.05,
        "country": "Canada",
        "operator": "Defense Metals",
        "ownership": "Defense Metals (TSX-V: DEFN, 100%)",
        "status": "development",
        "type": "carbonatite (bastnaesite/monazite)",
        "products": ["neodymium", "praseodymium", "cerium", "lanthanum"],
        "capacity_tpa": 3500,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.96% REO",
        "notes": (
            "British Columbia; carbonatite-hosted LREE deposit; PEA completed "
            "showing economic viability; McLeod Lake area; potential Canadian "
            "REE supply source"
        ),
    },
    {
        "name": "Pele Mountain (Eco Ridge)",
        "lat": 46.49,
        "lon": -82.3,
        "country": "Canada",
        "operator": "Appia Rare Earths & Uranium",
        "ownership": "Appia Rare Earths & Uranium (CSE: API, 100%)",
        "status": "development",
        "type": "uraniferous conglomerate (monazite/xenotime)",
        "products": ["cerium", "lanthanum", "neodymium", "uranium"],
        "capacity_tpa": None,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.2% REO + 0.04% U3O8",
        "notes": (
            "Elliot Lake, Ontario; historic uranium mining region; REE in monazite "
            "within Huronian conglomerate; PEA completed; uranium co-product; "
            "early development"
        ),
    },
    # =========================================================================
    # BRAZIL
    # =========================================================================
    {
        "name": "Serra Verde",
        "lat": -13.7,
        "lon": -49.1,
        "country": "Brazil",
        "operator": "Serra Verde Mining",
        "ownership": "Serra Verde Mining (private, backed by Japan's JOGMEC)",
        "status": "development",
        "type": "ionic adsorption clay (laterite)",
        "products": ["neodymium", "praseodymium", "lanthanum", "cerium"],
        "capacity_tpa": 5000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.15-0.25% REO (ionic clay)",
        "notes": (
            "Goias State; ionic clay deposit similar to south China clays; "
            "JOGMEC investment for Japanese supply security; development stage "
            "with pilot processing"
        ),
    },
    # =========================================================================
    # GREENLAND
    # =========================================================================
    {
        "name": "Kvanefjeld",
        "lat": 60.97,
        "lon": -46.05,
        "country": "Greenland",
        "operator": "Greenland Minerals",
        "ownership": "Greenland Minerals (ASX: GGG); Shenghe Resources strategic partner",
        "status": "development",
        "type": "alkaline igneous (eudialyte/steenstrupine)",
        "products": ["neodymium", "praseodymium", "cerium", "lanthanum", "uranium", "zinc"],
        "capacity_tpa": 10000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.1% REO",
        "notes": (
            "Ilimaussaq complex, South Greenland; one of world's largest undeveloped "
            "REE deposits; uranium co-product controversial — Greenland parliament "
            "passed ban on radioactive mining (2021), later overturned; both LREE "
            "and HREE present"
        ),
    },
    {
        "name": "Sarfartoq",
        "lat": 66.48,
        "lon": -51.28,
        "country": "Greenland",
        "operator": "Hudson Resources",
        "ownership": "Hudson Resources (TSX-V: HUD, 100%)",
        "status": "development",
        "type": "carbonatite",
        "products": ["cerium", "lanthanum", "neodymium"],
        "capacity_tpa": None,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.8% REO",
        "notes": (
            "Near Kangerlussuaq, West Greenland; carbonatite REE deposit; "
            "early-stage development; LREE-dominant with some fluorite"
        ),
    },
    # =========================================================================
    # SWEDEN
    # =========================================================================
    {
        "name": "Kiruna REE (LKAB)",
        "lat": 67.86,
        "lon": 20.23,
        "country": "Sweden",
        "operator": "LKAB",
        "ownership": "LKAB (100%, Swedish state-owned)",
        "status": "development",
        "type": "apatite (REE from iron ore tailings)",
        "products": ["cerium", "lanthanum", "neodymium", "praseodymium", "phosphorus"],
        "capacity_tpa": None,
        "production_year": None,
        "reserves_mt": None,
        "grade": "estimated 1M+ tonnes REO in Per Geijer deposit",
        "notes": (
            "Europe's largest known REE deposit announced January 2023; Per Geijer "
            "iron ore body; REE in apatite gangue from iron mining; LKAB planning "
            "extraction from tailings and new mining; permitting 10-15 year "
            "timeline; strategic for European REE sovereignty"
        ),
    },
    # =========================================================================
    # VIETNAM
    # =========================================================================
    {
        "name": "Dong Pao",
        "lat": 21.8,
        "lon": 103.5,
        "country": "Vietnam",
        "operator": "Vietnam National Chemical Group (Vinachem)",
        "ownership": "Vinachem (state-owned); Toyota Tsusho (exploration JV partner)",
        "status": "development",
        "type": "bastnaesite/parisite hydrothermal",
        "products": ["cerium", "lanthanum", "neodymium"],
        "capacity_tpa": 5000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1-10% REO (variable, high-grade zones)",
        "notes": (
            "Lai Chau Province, northwest Vietnam; one of the largest REE deposits "
            "in Southeast Asia; Japanese investment for supply diversification; "
            "development delayed by processing technology challenges"
        ),
    },
    # =========================================================================
    # AFRICA
    # =========================================================================
    {
        "name": "Ngualla",
        "lat": -8.3,
        "lon": 31.65,
        "country": "Tanzania",
        "operator": "Peak Resources",
        "ownership": "Peak Resources (ASX: PEK, 100%; Tanzania government free-carry interest)",
        "status": "development",
        "type": "carbonatite (bastnaesite)",
        "products": ["neodymium", "praseodymium", "cerium", "lanthanum"],
        "capacity_tpa": 12000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "4.8% REO (exceptionally high grade)",
        "notes": (
            "Southwest Tanzania; one of the world's highest-grade undeveloped REE "
            "deposits; NdPr-enriched; DFS completed; Teesside (UK) processing "
            "plant planned; Tanzanian government partnership"
        ),
    },
    {
        "name": "Steenkampskraal",
        "lat": -31.19,
        "lon": 18.8,
        "country": "South Africa",
        "operator": "Steenkampskraal Holdings",
        "ownership": "Steenkampskraal Holdings",
        "status": "development",
        "type": "monazite vein",
        "products": ["cerium", "lanthanum", "neodymium", "praseodymium", "thorium"],
        "capacity_tpa": 2500,
        "production_year": None,
        "reserves_mt": None,
        "grade": "14% REO (very high grade monazite vein)",
        "notes": (
            "Western Cape, South Africa; historic thorium-REE mine (operated "
            "1952-1963); monazite vein deposit with exceptionally high grades; "
            "restart in permitting stage; both LREE and some HREE present"
        ),
    },
    {
        "name": "Songwe Hill",
        "lat": -10.48,
        "lon": 33.65,
        "country": "Malawi",
        "operator": "Mkango Resources (via Lancaster Exploration)",
        "ownership": "Mkango Resources (TSX-V: MKA, 51% earning into 75%)",
        "status": "development",
        "type": "carbonatite",
        "products": ["neodymium", "praseodymium", "cerium", "lanthanum"],
        "capacity_tpa": 3000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.6% REO",
        "notes": (
            "Phalombe District; carbonatite-hosted REE deposit; PFS completed; "
            "NdPr-enriched distribution; partnership with Grupa Azoty for separation"
        ),
    },
    {
        "name": "Phalaborwa (Foskor)",
        "lat": -23.94,
        "lon": 31.14,
        "country": "South Africa",
        "operator": "Foskor / Rainbow Rare Earths",
        "ownership": (
            "Foskor (state-owned, phosphate); Rainbow Rare Earths (LSE: RBW, "
            "REE extraction from Foskor gypsum tailings)"
        ),
        "status": "operating",
        "type": "carbonatite (phosphate/REE byproduct)",
        "products": ["cerium", "lanthanum", "neodymium", "praseodymium"],
        "capacity_tpa": 2000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "REE recovered from phosphogypsum waste (~0.4% REO)",
        "notes": (
            "Limpopo Province; Palabora carbonatite complex; Rainbow Rare Earths "
            "extracting REE from Foskor's phosphogypsum tailings stack; K-Tech "
            "ion exchange separation"
        ),
    },
    {
        "name": "Madagascar REE Projects",
        "lat": -22.3,
        "lon": 46.8,
        "country": "Madagascar",
        "operator": "Various exploration companies",
        "ownership": "Multiple junior miners including Tantalus Rare Earths AG",
        "status": "development",
        "type": "ionic adsorption clay / placer",
        "products": ["neodymium", "praseodymium", "cerium", "lanthanum"],
        "capacity_tpa": None,
        "production_year": None,
        "reserves_mt": None,
        "grade": "variable (0.05-0.3% REO)",
        "notes": (
            "Central highlands; multiple ionic clay and placer REE occurrences "
            "under exploration; prospective geology similar to southern China clays"
        ),
    },
    # =========================================================================
    # EUROPE (OTHER)
    # =========================================================================
    {
        "name": "Fen Complex",
        "lat": 59.28,
        "lon": 9.3,
        "country": "Norway",
        "operator": "REEtec",
        "ownership": "REEtec AS (private Norwegian company)",
        "status": "development",
        "type": "carbonatite",
        "products": ["cerium", "lanthanum", "neodymium"],
        "capacity_tpa": None,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1-2% REO",
        "notes": (
            "Telemark; historic carbonatite complex; REEtec developing separation "
            "technology and planning pilot facility; European supply potential; "
            "early exploration stage for mining"
        ),
    },
    {
        "name": "Sokli",
        "lat": 67.8,
        "lon": 29.3,
        "country": "Finland",
        "operator": "Yara International (exploration)",
        "ownership": "Yara International (NHH: YAR; phosphate rights)",
        "status": "development",
        "type": "carbonatite (apatite-REE)",
        "products": ["cerium", "lanthanum", "neodymium", "phosphorus"],
        "capacity_tpa": None,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.5-1.5% REO in apatite",
        "notes": (
            "Finnish Lapland, Savukoski; large carbonatite complex primarily "
            "explored for phosphate; REE in apatite could be recovered as byproduct; "
            "Yara holds phosphate extraction rights; early-stage REE evaluation"
        ),
    },
]


# --- Main --------------------------------------------------------------------

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    output = {
        "_source": SOURCE_METADATA,
        "_coverage": COVERAGE_METADATA,
        "sites": SITES,
    }

    # Update coverage site_count to match actual data
    output["_coverage"]["site_count"] = len(SITES)
    output["_coverage"]["operating_count"] = sum(
        1 for s in SITES if s.get("status") == "operating"
    )
    output["_coverage"]["development_count"] = sum(
        1 for s in SITES if s.get("status") == "development"
    )

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"[ingest_reelight] Wrote {len(SITES)} light REE sites to {OUTPUT_FILE}")
    print(f"  Operating: {output['_coverage']['operating_count']}")
    print(f"  Development: {output['_coverage']['development_count']}")


if __name__ == "__main__":
    main()
