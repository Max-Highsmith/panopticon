#!/usr/bin/env python3
"""
Ingest heavy rare earth element (HREE) mining sites into Panopticon format.

Heavy REE: Dy (dysprosium), Tb (terbium), Y (yttrium), Er (erbium),
           Yb (ytterbium), Lu (lutetium), Ho (holmium), Tm (thulium)
Used in: permanent magnets (Dy/Tb for high-temp stability in NdFeB magnets),
         electronics, fiber optics, nuclear applications, phosphors

STRATEGICALLY CRITICAL: China controls ~90%+ of global HREE supply via
ionic adsorption clay deposits in Jiangxi, Guangdong, Fujian, and Guangxi.
No near-term substitutes exist for Dy/Tb in high-performance magnets used
in EV motors and wind turbines.

Primary sources:
  - USGS Mineral Commodity Summaries 2024, Rare Earths chapter
    https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-rare-earths.pdf
  - USGS Mineral Resources Data System (MRDS) for coordinates
    https://mrdata.usgs.gov/mrds/
  - Adamas Intelligence Rare Earth Magnet Market Outlook
    https://www.adamasintel.com/
  - China Ministry of Natural Resources rare earth production quotas
    http://www.mnr.gov.cn/
  - Ganzhou municipal government rare earth industry reports
  - China Southern Rare Earth Group annual reports
  - Company annual reports and filings:
    * Northern Minerals (ASX: NTU) — Annual Report 2023
    * Australian Strategic Materials (ASX: ASM) — Annual Report 2023
    * Texas Mineral Resources (OTCQB: TMRC) filings
    * Rare Element Resources (TSX: RES) — Annual Report 2023
    * Quest Rare Minerals (TSX-V: QRM) filings
    * Mkango Resources (TSX-V: MKA) — Annual Report 2023
    * Leading Edge Materials (TSX-V: LEM) filings
    * Namibia Critical Metals (TSX-V: NMI) filings
    * Peak Resources (ASX: PEK) — Annual Report 2023
    * Greenland Minerals (ASX: GGG) filings
  - Myanmar rare earth export data: Chinese customs statistics
    (General Administration of Customs, PRC)
  - Argus Media rare earth price and market reports

Since USGS MCS is published as PDF (no structured API), this script embeds
the curated site data and writes the output JSON. To update:
  1. Download latest MCS from https://www.usgs.gov/centers/national-minerals-information-center
  2. Cross-reference production figures with company SEC/ASX filings
  3. Verify coordinates against USGS MRDS or satellite imagery
  4. Check Chinese MIIT/MNR rare earth production quota announcements
     (especially medium/heavy REE quotas which are set separately)
  5. Monitor Myanmar border closure/reopening reports (Argus, SMM)
  6. Update the SITES list below
"""

import json
import pathlib

# --- Configuration -----------------------------------------------------------

OUTPUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "layers" / "points"
OUTPUT_FILE = OUTPUT_DIR / "reeheavy.json"

SOURCE_METADATA = {
    "description": (
        "Major global heavy rare earth element (HREE) mining and production sites "
        "— Dy, Tb, Y, Er, Yb, Lu used in permanent magnets (Dy/Tb for "
        "high-temperature stability), electronics, fiber optics, and nuclear "
        "applications"
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
        "China Southern Rare Earth Group annual reports; "
        "Ganzhou municipal government rare earth industry reports; "
        "Northern Minerals (ASX: NTU) Annual Report 2023; "
        "Australian Strategic Materials (ASX: ASM) Annual Report 2023; "
        "Texas Mineral Resources (OTCQB: TMRC) filings; "
        "Rare Element Resources (TSX: RES) Annual Report 2023; "
        "Quest Rare Minerals (TSX-V: QRM) filings; "
        "Mkango Resources (TSX-V: MKA) Annual Report 2023; "
        "Myanmar rare earth export data via Chinese customs statistics "
        "(General Administration of Customs, PRC); "
        "Argus Media rare earth price and market reports"
    ),
    "retrieved": "2026-03-08",
    "license": (
        "USGS: public domain; Chinese government data: public domain; "
        "company data: fair use summary of public filings"
    ),
    "notes": (
        "Heavy REE (Dy, Tb, Y, Er, Yb, Lu, Ho, Tm) comprise ~15% of total rare "
        "earth oxide (REO) production. Global total REO ~300,000 t/yr, so HREE "
        "~45,000 t/yr. CRITICALLY, China controls ~90%+ of HREE supply, "
        "predominantly from ionic adsorption clay deposits in Jiangxi, Guangdong, "
        "Fujian, and Guangxi provinces. These clays are the world's primary source "
        "of dysprosium and terbium, essential for NdFeB permanent magnets used in "
        "EV motors and wind turbines. HREE are strategically critical because of "
        "extreme supply concentration and no near-term substitutes for Dy/Tb in "
        "high-performance magnets. Coordinates from USGS MRDS, Chinese government "
        "publications, company NI 43-101/JORC reports, and satellite imagery. "
        "All capacity figures in REO equivalent tonnes per annum."
    ),
}

COVERAGE_METADATA = {
    "global_production_2023_tpa": 45000,
    "global_production_unit": "REO (rare earth oxide) equivalent",
    "global_production_source": (
        "USGS MCS 2024 — ~300,000 t total REO globally, heavy REE ~15% = ~45,000 t; "
        "Adamas Intelligence estimates HREE ~12-18% depending on product mix"
    ),
    "estimated_coverage_pct": 85,
    "site_count": 25,
    "operating_count": 11,
    "development_count": 14,
    "known_gaps": (
        "Numerous small ionic clay mining operations in Jiangxi, Guangdong, and "
        "Fujian provinces not individually listed (consolidated under district-level "
        "entries); some Myanmar HREE operations in Shan State; Russian Tomtor "
        "niobium-HREE deposit (pre-development)"
    ),
    "audit_date": "2026-03-08",
}

# --- Site Data ---------------------------------------------------------------
# Each entry represents a major HREE mining operation.
# capacity_tpa is in REO (rare earth oxide) equivalent tonnes per year.
# Coordinates verified against USGS MRDS, Chinese government publications,
# company technical reports, and Google Earth.

SITES = [
    # =========================================================================
    # CHINA — IONIC CLAY DEPOSITS (DOMINANT, ~90% of global HREE)
    # Jiangxi Province is the world capital of heavy rare earth production.
    # =========================================================================
    {
        "name": "Ganzhou HREE District (Longnan/Dingnan)",
        "lat": 24.8,
        "lon": 114.95,
        "country": "China",
        "operator": "China Southern Rare Earth Group",
        "ownership": (
            "China Southern Rare Earth Group (state-owned; consolidated under "
            "China Rare Earth Group restructuring 2021-2022)"
        ),
        "status": "operating",
        "type": "ionic adsorption clay",
        "products": ["dysprosium", "terbium", "yttrium", "erbium", "holmium"],
        "capacity_tpa": 12000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.05-0.15% REO (ionic clay, HREE-enriched)",
        "notes": (
            "Ganzhou is the world's primary HREE production center; Longnan and "
            "Dingnan counties are the historic heartland of Chinese ionic clay REE "
            "mining; in-situ leaching and heap leaching; produces majority of global "
            "dysprosium and terbium; severe environmental legacy from decades of mining"
        ),
    },
    {
        "name": "Xinfeng HREE Mines",
        "lat": 25.38,
        "lon": 114.92,
        "country": "China",
        "operator": "China Southern Rare Earth Group",
        "ownership": "China Southern Rare Earth Group (state-owned)",
        "status": "operating",
        "type": "ionic adsorption clay",
        "products": ["dysprosium", "terbium", "yttrium"],
        "capacity_tpa": 5000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.05-0.12% REO (ionic clay)",
        "notes": (
            "Xinfeng County, Jiangxi; part of the greater Ganzhou HREE district; "
            "ionic clay deposits in weathered granite; in-situ leaching dominant; "
            "consolidated under China Southern RE Group"
        ),
    },
    {
        "name": "Anyuan-Xunwu HREE District",
        "lat": 24.95,
        "lon": 115.6,
        "country": "China",
        "operator": "China Southern Rare Earth Group",
        "ownership": "China Southern Rare Earth Group (state-owned)",
        "status": "operating",
        "type": "ionic adsorption clay",
        "products": ["dysprosium", "terbium", "yttrium", "erbium"],
        "capacity_tpa": 4000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.06-0.15% REO (ionic clay)",
        "notes": (
            "Eastern Jiangxi Province; Anyuan and Xunwu counties; HREE-enriched "
            "ionic clay zone; part of the Nanling Range geological belt that hosts "
            "China's HREE deposits"
        ),
    },
    {
        "name": "Guangdong HREE District (Pingyuan/Meizhou)",
        "lat": 24.57,
        "lon": 115.85,
        "country": "China",
        "operator": "Guangdong Rising Nonferrous Metals / China Rare Earth Group",
        "ownership": (
            "Guangdong Rising Nonferrous Metals Group; consolidated under "
            "China Rare Earth Group"
        ),
        "status": "operating",
        "type": "ionic adsorption clay",
        "products": ["dysprosium", "terbium", "yttrium"],
        "capacity_tpa": 4000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.04-0.12% REO (ionic clay)",
        "notes": (
            "Pingyuan and Meizhou area, Guangdong Province; ionic clay deposits "
            "in weathered granitic terrain; historically significant HREE producer; "
            "environmental remediation ongoing"
        ),
    },
    {
        "name": "Fujian HREE Operations (Longyan/Shanghang)",
        "lat": 25.1,
        "lon": 116.75,
        "country": "China",
        "operator": "Xiamen Tungsten / China Rare Earth Group",
        "ownership": (
            "Xiamen Tungsten Co. (SHA: 600549); consolidated under "
            "China Rare Earth Group"
        ),
        "status": "operating",
        "type": "ionic adsorption clay",
        "products": ["dysprosium", "terbium", "yttrium", "erbium"],
        "capacity_tpa": 3000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.05-0.12% REO (ionic clay)",
        "notes": (
            "Western Fujian Province (Longyan, Shanghang); ionic clay deposits; "
            "Xiamen Tungsten is major operator; integrated separation facilities "
            "in Fujian"
        ),
    },
    {
        "name": "Guangxi HREE Operations (Chongzuo/Hezhou)",
        "lat": 22.4,
        "lon": 107.35,
        "country": "China",
        "operator": "Guangxi provincial operators / China Rare Earth Group",
        "ownership": "Various operators consolidated under China Rare Earth Group",
        "status": "operating",
        "type": "ionic adsorption clay",
        "products": ["dysprosium", "yttrium", "terbium"],
        "capacity_tpa": 3000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.04-0.10% REO (ionic clay)",
        "notes": (
            "Chongzuo and Hezhou areas, Guangxi Zhuang Autonomous Region; "
            "ionic clay mining expanded in Guangxi as Jiangxi deposits deplete; "
            "newer operations with somewhat better environmental controls"
        ),
    },
    {
        "name": "Hunan HREE District (Yongzhou/Chenzhou)",
        "lat": 25.61,
        "lon": 112.0,
        "country": "China",
        "operator": "Hunan province operators / China Rare Earth Group",
        "ownership": "Various operators consolidated under China Rare Earth Group",
        "status": "operating",
        "type": "ionic adsorption clay",
        "products": ["dysprosium", "yttrium", "terbium"],
        "capacity_tpa": 2000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.04-0.10% REO (ionic clay)",
        "notes": (
            "Southern Hunan Province; emerging HREE ionic clay province as Jiangxi "
            "production faces depletion and environmental restrictions; Nanling Range "
            "geological belt continuation"
        ),
    },
    {
        "name": "Bayan Obo (HREE byproduct)",
        "lat": 41.8,
        "lon": 109.97,
        "country": "China",
        "operator": "Northern Rare Earth (Baotou Steel)",
        "ownership": "China Northern Rare Earth Group (state-owned)",
        "status": "operating",
        "type": "carbonatite (bastnaesite/monazite)",
        "products": ["yttrium", "dysprosium", "erbium"],
        "capacity_tpa": 2000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "HREE minor fraction of total 3-6% REO",
        "notes": (
            "Inner Mongolia; primarily LREE producer but monazite component "
            "contains some HREE (Y, Dy, Er); small but non-negligible HREE "
            "byproduct from world's largest REE mine"
        ),
    },
    # =========================================================================
    # MYANMAR
    # =========================================================================
    {
        "name": "Kachin State HREE Operations",
        "lat": 25.8,
        "lon": 97.8,
        "country": "Myanmar",
        "operator": "Various (informal/artisanal miners)",
        "ownership": "Multiple small operators; Kachin Independence Army territory",
        "status": "operating",
        "type": "ionic adsorption clay",
        "products": ["dysprosium", "terbium", "yttrium", "holmium"],
        "capacity_tpa": 6000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "variable (0.05-0.2% REO, HREE-enriched in some deposits)",
        "notes": (
            "Significant HREE content in some Kachin deposits; raw ore exported to "
            "Yunnan, China for processing; ~10-15% of global HREE supply; supply "
            "disrupted by periodic China-Myanmar border closures and Kachin conflict; "
            "strategic supply risk"
        ),
    },
    # =========================================================================
    # AUSTRALIA
    # =========================================================================
    {
        "name": "Browns Range",
        "lat": -19.04,
        "lon": 128.95,
        "country": "Australia",
        "operator": "Northern Minerals",
        "ownership": "Northern Minerals (ASX: NTU, 100%)",
        "status": "development",
        "type": "xenotime-bearing weathered crust",
        "products": ["dysprosium", "terbium", "yttrium"],
        "capacity_tpa": 650,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.66% REO (high HREE proportion, ~86% heavy)",
        "notes": (
            "East Kimberley, Western Australia; pilot plant operated 2018-2020 "
            "producing Dy-Tb-Y carbonate; one of the most advanced HREE projects "
            "outside China; PFS completed; transitioning to full-scale production; "
            "critical for non-Chinese HREE supply"
        ),
    },
    {
        "name": "Dubbo (Toongi)",
        "lat": -32.08,
        "lon": 148.6,
        "country": "Australia",
        "operator": "Australian Strategic Materials (ASM)",
        "ownership": "Australian Strategic Materials (ASX: ASM, 100%)",
        "status": "development",
        "type": "alkaline volcanic (trachyte hosted zircon/REE)",
        "products": ["dysprosium", "terbium", "yttrium", "zirconium", "niobium", "hafnium"],
        "capacity_tpa": 2000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.75% REO (HREE + Zr, Nb, Hf polymetallic)",
        "notes": (
            "New South Wales; polymetallic deposit with significant HREE content "
            "plus critical minerals (Zr, Nb, Hf); Korean partnership (KORES) for "
            "offtake; metallurgy proven at pilot scale; DFS completed; unique "
            "multi-element project"
        ),
    },
    # =========================================================================
    # UNITED STATES
    # =========================================================================
    {
        "name": "Round Top",
        "lat": 31.36,
        "lon": -105.02,
        "country": "United States",
        "operator": "Texas Mineral Resources / USA Rare Earth",
        "ownership": "Texas Mineral Resources (OTCQB: TMRC) / USA Rare Earth LLC JV",
        "status": "development",
        "type": "rhyolite laccolith (HREE-bearing yttrofluorite)",
        "products": ["dysprosium", "yttrium", "terbium", "erbium"],
        "capacity_tpa": 2000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.06% REO (vast tonnage, low grade but HREE-enriched)",
        "notes": (
            "Hudspeth County, West Texas; enormous rhyolite dome with disseminated "
            "HREE in yttrofluorite; extremely large resource but low grade; heap "
            "leach processing planned; US DoD interest for domestic HREE supply; "
            "PEA completed"
        ),
    },
    {
        "name": "Bear Lodge (HREE component)",
        "lat": 44.49,
        "lon": -104.43,
        "country": "United States",
        "operator": "Rare Element Resources",
        "ownership": "Rare Element Resources (TSX: RES / OTCQX: REEMF, 100%)",
        "status": "development",
        "type": "carbonatite/alkaline intrusion",
        "products": ["dysprosium", "yttrium", "terbium"],
        "capacity_tpa": 500,
        "production_year": None,
        "reserves_mt": None,
        "grade": "3.0% TREO (HREE ~5-8% of total REO)",
        "notes": (
            "Wyoming Black Hills; Bull Hill deposit; primarily LREE but contains "
            "meaningful HREE component including dysprosium; US DoD DPA Title III "
            "funding; potential domestic HREE source alongside LREE production"
        ),
    },
    # =========================================================================
    # CANADA
    # =========================================================================
    {
        "name": "Strange Lake",
        "lat": 56.32,
        "lon": -64.15,
        "country": "Canada",
        "operator": "Quest Rare Minerals (Torngat Metals)",
        "ownership": "Quest Rare Minerals (TSX-V: QRM, 100%)",
        "status": "development",
        "type": "peralkaline granite (zircon/pyrochlore/gadolinite)",
        "products": ["dysprosium", "terbium", "yttrium", "erbium", "ytterbium"],
        "capacity_tpa": 2500,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.0% REO (HREE ~40% of total REO)",
        "notes": (
            "Labrador/Quebec border; one of the largest HREE deposits outside "
            "China; peralkaline granite with very high HREE proportion (~40%); "
            "exceptionally enriched in Dy, Tb, Y; PFS completed; remote location "
            "increases development costs"
        ),
    },
    {
        "name": "Kipawa (Zeus)",
        "lat": 47.26,
        "lon": -79.45,
        "country": "Canada",
        "operator": "Matamec Explorations (now part of consolidation)",
        "ownership": "Various (project under restructuring/partnering)",
        "status": "development",
        "type": "peralkaline syenite (eudialyte)",
        "products": ["dysprosium", "yttrium", "terbium", "zirconium"],
        "capacity_tpa": 1000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.4% REO (HREE-enriched, eudialyte)",
        "notes": (
            "Temiscamingue, Quebec; eudialyte-bearing syenite with HREE enrichment; "
            "PEA completed; zirconium co-product; remote location; First Nations "
            "partnership (Kebaowek); development delayed"
        ),
    },
    # =========================================================================
    # EUROPE
    # =========================================================================
    {
        "name": "Norra Karr",
        "lat": 58.09,
        "lon": 14.51,
        "country": "Sweden",
        "operator": "Leading Edge Materials",
        "ownership": "Leading Edge Materials (TSX-V: LEM, 100%)",
        "status": "development",
        "type": "peralkaline nepheline syenite (eudialyte)",
        "products": ["dysprosium", "terbium", "yttrium"],
        "capacity_tpa": 2000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.6% REO (HREE ~55% of total, very high Dy/Tb)",
        "notes": (
            "Vattern Lake area, southern Sweden; one of the most significant HREE "
            "deposits in Europe; eudialyte-hosted with exceptional HREE proportion; "
            "permitting challenges (Natura 2000 area); PFS completed; strategic for "
            "European HREE sovereignty"
        ),
    },
    # =========================================================================
    # AFRICA
    # =========================================================================
    {
        "name": "Lofdal",
        "lat": -20.2,
        "lon": 14.5,
        "country": "Namibia",
        "operator": "Namibia Critical Metals (formerly Namibia Rare Earths)",
        "ownership": "Namibia Critical Metals (TSX-V: NMI, 100%)",
        "status": "development",
        "type": "carbonatite (xenotime-bearing dykes)",
        "products": ["dysprosium", "terbium", "yttrium"],
        "capacity_tpa": 1500,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.5-1.0% REO (HREE-enriched, ~78% heavy)",
        "notes": (
            "Khorixas area, Kunene Region; one of few primary HREE deposits outside "
            "China; xenotime-bearing carbonatite dykes; very high HREE:LREE ratio "
            "(~78% heavy); PEA completed; JOGMEC partnership for Japanese supply security"
        ),
    },
    {
        "name": "Songwe Hill (HREE component)",
        "lat": -10.48,
        "lon": 33.65,
        "country": "Malawi",
        "operator": "Mkango Resources",
        "ownership": "Mkango Resources (TSX-V: MKA, 51% earning into 75%)",
        "status": "development",
        "type": "carbonatite",
        "products": ["dysprosium", "terbium", "yttrium"],
        "capacity_tpa": 500,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.6% TREO (HREE ~8-10% of total REO)",
        "notes": (
            "Phalombe District, Malawi; carbonatite deposit with meaningful HREE "
            "content alongside LREE; PFS completed; some Dy and Tb recovery planned; "
            "partnership with Grupa Azoty for separation technology"
        ),
    },
    {
        "name": "Steenkampskraal (HREE component)",
        "lat": -31.19,
        "lon": 18.8,
        "country": "South Africa",
        "operator": "Steenkampskraal Holdings",
        "ownership": "Steenkampskraal Holdings",
        "status": "development",
        "type": "monazite vein",
        "products": ["dysprosium", "yttrium", "terbium"],
        "capacity_tpa": 200,
        "production_year": None,
        "reserves_mt": None,
        "grade": "14% TREO (HREE ~3-5% of total REO)",
        "notes": (
            "Western Cape; historic thorium-REE monazite mine; small HREE component "
            "in addition to dominant LREE; xenotime minor mineral provides some HREE; "
            "restart in permitting"
        ),
    },
    {
        "name": "Ngualla (HREE component)",
        "lat": -8.3,
        "lon": 31.65,
        "country": "Tanzania",
        "operator": "Peak Resources",
        "ownership": "Peak Resources (ASX: PEK, 100%)",
        "status": "development",
        "type": "carbonatite (bastnaesite/synchysite)",
        "products": ["dysprosium", "yttrium"],
        "capacity_tpa": 300,
        "production_year": None,
        "reserves_mt": None,
        "grade": "4.8% TREO (HREE ~2-3% of total REO)",
        "notes": (
            "Southwest Tanzania; primarily LREE deposit but carbonatite contains "
            "some HREE; small Dy/Y co-product alongside main NdPr production; "
            "Teesside (UK) processing plant planned"
        ),
    },
    # =========================================================================
    # BRAZIL
    # =========================================================================
    {
        "name": "Serra Verde (HREE component)",
        "lat": -13.7,
        "lon": -49.1,
        "country": "Brazil",
        "operator": "Serra Verde Mining",
        "ownership": "Serra Verde Mining (private, backed by JOGMEC)",
        "status": "development",
        "type": "ionic adsorption clay (laterite)",
        "products": ["dysprosium", "yttrium", "terbium"],
        "capacity_tpa": 1000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "0.15-0.25% REO (HREE ~20-30% of total REO in clay)",
        "notes": (
            "Goias State, Brazil; ionic clay deposit with both LREE and HREE; "
            "similar mineralogy to south China clays; JOGMEC investment aimed at "
            "Dy/Tb supply security for Japan; development stage"
        ),
    },
    # =========================================================================
    # GREENLAND
    # =========================================================================
    {
        "name": "Kvanefjeld (HREE component)",
        "lat": 60.97,
        "lon": -46.05,
        "country": "Greenland",
        "operator": "Greenland Minerals",
        "ownership": "Greenland Minerals (ASX: GGG)",
        "status": "development",
        "type": "alkaline igneous (eudialyte/steenstrupine)",
        "products": ["dysprosium", "terbium", "yttrium"],
        "capacity_tpa": 1000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1.1% TREO (HREE ~10-15% of total REO)",
        "notes": (
            "Ilimaussaq complex, South Greenland; large deposit with both LREE and "
            "HREE; steenstrupine and eudialyte minerals host HREE; uranium co-product "
            "remains politically contentious; Shenghe Resources strategic partner"
        ),
    },
    # =========================================================================
    # RUSSIA
    # =========================================================================
    {
        "name": "Tomtor (Burannyi)",
        "lat": 71.15,
        "lon": 116.98,
        "country": "Russia",
        "operator": "TriArk Mining / Rostec",
        "ownership": "TriArk Mining (backed by Rostec state corporation)",
        "status": "development",
        "type": "carbonatite (pyrochlore/crandallite)",
        "products": ["yttrium", "dysprosium", "niobium", "scandium"],
        "capacity_tpa": None,
        "production_year": None,
        "reserves_mt": None,
        "grade": "8-12% REO + 6% Nb2O5 (exceptional grades)",
        "notes": (
            "Yakutia (Sakha Republic); one of the highest-grade REE-niobium deposits "
            "known globally; Burannyi area; extreme Arctic remoteness (permafrost, no "
            "roads); pre-development; Russian strategic mineral reserve; both LREE and "
            "HREE present"
        ),
    },
    # =========================================================================
    # VIETNAM
    # =========================================================================
    {
        "name": "Dong Pao (HREE component)",
        "lat": 21.8,
        "lon": 103.5,
        "country": "Vietnam",
        "operator": "Vietnam National Chemical Group (Vinachem)",
        "ownership": "Vinachem (state-owned)",
        "status": "development",
        "type": "bastnaesite/parisite hydrothermal",
        "products": ["dysprosium", "yttrium"],
        "capacity_tpa": 500,
        "production_year": None,
        "reserves_mt": None,
        "grade": "1-10% TREO (HREE minor component)",
        "notes": (
            "Lai Chau Province, Vietnam; primarily LREE but contains some HREE; "
            "Vietnamese government exploring HREE separation capability with "
            "Japanese and Korean technical assistance"
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

    print(f"[ingest_reeheavy] Wrote {len(SITES)} heavy REE sites to {OUTPUT_FILE}")
    print(f"  Operating: {output['_coverage']['operating_count']}")
    print(f"  Development: {output['_coverage']['development_count']}")


if __name__ == "__main__":
    main()
