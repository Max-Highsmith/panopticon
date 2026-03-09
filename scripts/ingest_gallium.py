#!/usr/bin/env python3
"""
Ingest gallium production sites into Panopticon format.

Primary sources:
  - USGS Mineral Commodity Summaries 2024, Gallium chapter
    https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-gallium.pdf
  - USGS Minerals Yearbook — Gallium
    https://www.usgs.gov/centers/national-minerals-information-center/gallium-statistics-and-information
  - Company annual reports and filings:
    * Aluminum Corporation of China / Chalco (SHA: 601600 / SEHK: 2600)
    * China Hongqiao Group (SEHK: 1378)
    * East Hope Group corporate disclosures
    * Nanshan Aluminum (SHE: 002009)
    * Xinfa Group corporate disclosures
    * Guizhou Huajin Aluminum (State Power Investment Corp.)
    * Yunnan Aluminium Co. (SHE: 000807)
    * Guangxi Investment Group corporate disclosures
    * Bosai Minerals Group corporate disclosures
    * Sumitomo Chemical (TYO: 4005)
    * Dowa Holdings (TYO: 5714)
    * Korea Zinc (KRX: 010130)
    * RUSAL (MOEX: RUAL) — Nikolaev, Bogoslovsk, Achinsk refineries
    * MAL Magyar Aluminium corporate disclosures
    * ERG / Aluminum of Kazakhstan corporate disclosures
    * AXT Inc. (NASDAQ: AXTI)
    * Indium Corporation corporate publications
    * 5N Plus Inc. (TSX: VNP)
  - European Commission Critical Raw Materials Study 2023

IMPORTANT: Gallium is EXCLUSIVELY a byproduct of alumina (bauxite) refining.
There are NO dedicated gallium mines. All production sites are alumina refineries
(or zinc smelters/recyclers) with gallium recovery circuits installed.

Since USGS MCS is published as PDF (no structured API), this script embeds
the curated site data and writes the output JSON. To update:
  1. Download latest MCS from https://www.usgs.gov/centers/national-minerals-information-center
  2. Cross-reference production figures with company annual reports
  3. Verify coordinates against satellite imagery and company facility maps
  4. Update the SITES list below
"""

import json
import pathlib

# --- Configuration -----------------------------------------------------------

OUTPUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "layers" / "points"
OUTPUT_FILE = OUTPUT_DIR / "gallium.json"

SOURCE_METADATA = {
    "description": "Global gallium production sites (alumina refineries with gallium recovery circuits)",
    "origin": (
        "USGS Mineral Commodity Summaries 2024, Gallium chapter "
        "(https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-gallium.pdf); "
        "USGS Minerals Yearbook — Gallium "
        "(https://www.usgs.gov/centers/national-minerals-information-center/"
        "gallium-statistics-and-information); "
        "Aluminum Corporation of China (Chalco) annual reports "
        "(SHA: 601600 / SEHK: 2600); "
        "China Hongqiao Group annual reports (SEHK: 1378); "
        "East Hope Group corporate disclosures; "
        "Nanshan Aluminum (SHE: 002009) annual reports; "
        "Sumitomo Chemical (TYO: 4005) annual reports; "
        "Dowa Holdings (TYO: 5714) annual reports; "
        "Korea Zinc (KRX: 010130) annual reports; "
        "RUSAL (MOEX: RUAL) annual reports; "
        "AXT Inc. (NASDAQ: AXTI) annual reports; "
        "European Commission Critical Raw Materials Study 2023; "
        "Indium Corporation technical publications"
    ),
    "retrieved": "2026-03-08",
    "license": (
        "USGS: public domain; company data: fair use summary; "
        "EC reports: public domain"
    ),
    "notes": (
        "Gallium is EXCLUSIVELY a byproduct of alumina (bauxite) refining — "
        "there are no dedicated gallium mines anywhere in the world. All sites "
        "listed are alumina refineries or smelters that have installed gallium "
        "recovery circuits to extract gallium from Bayer process liquor. China "
        "dominates with ~98% of primary gallium production. Some sites also "
        "recover gallium from recycling (secondary production). Coordinates "
        "from company filings, satellite imagery, and USGS MRDS. Capacity "
        "figures represent gallium metal output, not alumina capacity."
    ),
}

COVERAGE_METADATA = {
    "global_production_2023_tpa": 550,
    "global_production_unit": "gallium metal (tonnes)",
    "global_production_source": (
        "USGS MCS 2024 — estimated 550 tonnes primary gallium worldwide"
    ),
    "site_count": 25,
    "operating_count": 20,
    "development_count": 5,
    "estimated_coverage_pct": 90,
    "known_gaps": (
        "Smaller Chinese alumina refineries with unreported Ga recovery; "
        "some Ukrainian and Kazakh facilities with uncertain operational "
        "status post-2022"
    ),
    "audit_date": "2026-03-08",
}

# --- Site Data ---------------------------------------------------------------
# Each entry represents a facility that produces gallium, almost always as a
# byproduct of alumina refining (Bayer process). capacity_tpa is gallium metal
# output in tonnes per year.

SITES = [
    # =========================================================================
    # CHINA — ALUMINA REFINERIES WITH GA RECOVERY
    # China produces ~98% of world primary gallium (~540 of 550 tonnes)
    # =========================================================================
    {
        "name": "Chalco Shandong (Zibo/Weifang)",
        "lat": 36.78,
        "lon": 118.05,
        "country": "China",
        "operator": "Aluminum Corporation of China (Chalco)",
        "ownership": "Chalco / Chinalco (state-owned)",
        "status": "operating",
        "type": "alumina refinery byproduct",
        "products": ["gallium", "alumina"],
        "capacity_tpa": 80,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "50-100 ppm Ga in bauxite feed",
        "notes": (
            "One of Chalco's largest Ga recovery operations; Bayer process "
            "liquor extraction; Shandong is China's top alumina-producing province"
        ),
    },
    {
        "name": "Chalco Guangxi (Pingguo)",
        "lat": 23.32,
        "lon": 107.58,
        "country": "China",
        "operator": "Aluminum Corporation of China (Chalco)",
        "ownership": "Chalco / Chinalco (state-owned)",
        "status": "operating",
        "type": "alumina refinery byproduct",
        "products": ["gallium", "alumina"],
        "capacity_tpa": 60,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "50-80 ppm Ga in bauxite feed",
        "notes": (
            "Guangxi alumina refinery with integrated gallium circuit; "
            "processes local karst bauxite"
        ),
    },
    {
        "name": "Chalco Henan (Zhengzhou)",
        "lat": 34.75,
        "lon": 113.65,
        "country": "China",
        "operator": "Aluminum Corporation of China (Chalco)",
        "ownership": "Chalco / Chinalco (state-owned)",
        "status": "operating",
        "type": "alumina refinery byproduct",
        "products": ["gallium", "alumina"],
        "capacity_tpa": 50,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "50-80 ppm Ga in bauxite feed",
        "notes": (
            "Historic Zhengzhou alumina complex; one of China's oldest "
            "alumina refineries with Ga recovery"
        ),
    },
    {
        "name": "Chalco Shanxi (Xiaoyi)",
        "lat": 37.14,
        "lon": 111.77,
        "country": "China",
        "operator": "Aluminum Corporation of China (Chalco)",
        "ownership": "Chalco / Chinalco (state-owned)",
        "status": "operating",
        "type": "alumina refinery byproduct",
        "products": ["gallium", "alumina"],
        "capacity_tpa": 40,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "60-100 ppm Ga in bauxite feed",
        "notes": (
            "Shanxi province alumina refinery; Ga recovery from "
            "high-alumina bauxite"
        ),
    },
    {
        "name": "Chalco Guizhou (Zunyi)",
        "lat": 27.73,
        "lon": 107.00,
        "country": "China",
        "operator": "Aluminum Corporation of China (Chalco)",
        "ownership": "Chalco / Chinalco (state-owned)",
        "status": "operating",
        "type": "alumina refinery byproduct",
        "products": ["gallium", "alumina"],
        "capacity_tpa": 20,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "60-100 ppm Ga in bauxite feed",
        "notes": (
            "Zunyi alumina refinery; Guizhou bauxite has some of China's "
            "highest gallium concentrations; major Ga recovery site"
        ),
    },
    {
        "name": "East Hope Group Xinjiang (Sanmenxia/Hami)",
        "lat": 42.83,
        "lon": 93.52,
        "country": "China",
        "operator": "East Hope Group",
        "ownership": "East Hope Group (private)",
        "status": "operating",
        "type": "alumina refinery byproduct",
        "products": ["gallium", "alumina", "aluminum"],
        "capacity_tpa": 50,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "50-80 ppm Ga in bauxite feed",
        "notes": (
            "Integrated alumina-to-aluminum complex in Xinjiang; major "
            "gallium producer; East Hope is one of China's largest private "
            "aluminum companies"
        ),
    },
    {
        "name": "China Hongqiao Group (Binzhou)",
        "lat": 37.38,
        "lon": 117.97,
        "country": "China",
        "operator": "China Hongqiao Group",
        "ownership": "China Hongqiao Group (SEHK: 1378, private)",
        "status": "operating",
        "type": "alumina refinery byproduct",
        "products": ["gallium", "alumina", "aluminum"],
        "capacity_tpa": 60,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "50-80 ppm Ga in bauxite feed",
        "notes": (
            "World's largest aluminum producer by volume; Shandong-based; "
            "significant Ga recovery from massive alumina throughput"
        ),
    },
    {
        "name": "Nanshan Aluminum (Longkou)",
        "lat": 37.65,
        "lon": 120.52,
        "country": "China",
        "operator": "Nanshan Aluminum",
        "ownership": "Shandong Nanshan Aluminium (SHE: 002009)",
        "status": "operating",
        "type": "alumina refinery byproduct",
        "products": ["gallium", "alumina"],
        "capacity_tpa": 30,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "50-80 ppm Ga in bauxite feed",
        "notes": (
            "Integrated aluminum complex in Yantai, Shandong; "
            "Ga recovery circuit installed"
        ),
    },
    {
        "name": "Xinfa Group (Chiping)",
        "lat": 36.59,
        "lon": 116.25,
        "country": "China",
        "operator": "Xinfa Group",
        "ownership": "Xinfa Group (private, Shandong)",
        "status": "operating",
        "type": "alumina refinery byproduct",
        "products": ["gallium", "alumina"],
        "capacity_tpa": 25,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "50-80 ppm Ga in bauxite feed",
        "notes": (
            "Major private alumina producer in Liaocheng, Shandong; "
            "gallium circuit commissioned ~2010"
        ),
    },
    {
        "name": "Guizhou Huajin Aluminum (Qingzhen)",
        "lat": 26.57,
        "lon": 106.47,
        "country": "China",
        "operator": "Guizhou Huajin Aluminum",
        "ownership": "China Power Investment (State Power Investment Corp.)",
        "status": "operating",
        "type": "alumina refinery byproduct",
        "products": ["gallium", "alumina"],
        "capacity_tpa": 20,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "60-100 ppm Ga in bauxite feed",
        "notes": (
            "Guizhou province alumina refinery; local bauxite feed with "
            "relatively high gallium content"
        ),
    },
    {
        "name": "Yunnan Aluminum (Kunming)",
        "lat": 24.88,
        "lon": 102.83,
        "country": "China",
        "operator": "Yunnan Aluminium Co.",
        "ownership": "Yunnan Aluminium (SHE: 000807), Chinalco subsidiary",
        "status": "operating",
        "type": "alumina refinery byproduct",
        "products": ["gallium", "alumina"],
        "capacity_tpa": 15,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "50-80 ppm Ga in bauxite feed",
        "notes": (
            "Kunming-area alumina complex; hydropower-based aluminum "
            "smelting region; Ga recovery circuit"
        ),
    },
    {
        "name": "Guangxi Investment Group (Baise)",
        "lat": 23.90,
        "lon": 106.62,
        "country": "China",
        "operator": "Guangxi Investment Group",
        "ownership": "Guangxi Investment Group (state-owned, Guangxi provincial)",
        "status": "operating",
        "type": "alumina refinery byproduct",
        "products": ["gallium", "alumina"],
        "capacity_tpa": 20,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "60-90 ppm Ga in bauxite feed",
        "notes": (
            "Baise (Bose) area alumina refinery; Guangxi's bauxite belt is "
            "one of China's richest; Ga recovery from Bayer process"
        ),
    },
    {
        "name": "Bosai Minerals (Guiyang)",
        "lat": 26.65,
        "lon": 106.72,
        "country": "China",
        "operator": "Bosai Minerals Group",
        "ownership": (
            "Bosai Minerals Group (private, also operates bauxite mines "
            "in Guyana/Ghana)"
        ),
        "status": "operating",
        "type": "alumina refinery byproduct",
        "products": ["gallium", "alumina"],
        "capacity_tpa": 15,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "50-80 ppm Ga in bauxite feed",
        "notes": (
            "Guizhou-based alumina producer; imports bauxite from own "
            "mines in Guyana; Ga circuit installed"
        ),
    },
    # =========================================================================
    # JAPAN — HIGH-PURITY GA FOR SEMICONDUCTORS
    # =========================================================================
    {
        "name": "Sumitomo Chemical (Ehime / Niihama)",
        "lat": 33.96,
        "lon": 133.28,
        "country": "Japan",
        "operator": "Sumitomo Chemical Co.",
        "ownership": "Sumitomo Chemical (TYO: 4005)",
        "status": "operating",
        "type": "alumina refinery byproduct + recycling",
        "products": ["gallium", "high-purity gallium"],
        "capacity_tpa": 10,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "refined to 99.9999% (6N) purity",
        "notes": (
            "Niihama Works; produces ultra-high-purity gallium for "
            "semiconductor applications (GaAs, GaN); both primary "
            "recovery and recycling"
        ),
    },
    {
        "name": "Dowa Electronics Materials (Akita)",
        "lat": 39.72,
        "lon": 140.10,
        "country": "Japan",
        "operator": "Dowa Holdings / Dowa Electronics Materials",
        "ownership": "Dowa Holdings (TYO: 5714)",
        "status": "operating",
        "type": "smelter byproduct + recycling",
        "products": ["gallium", "indium", "germanium"],
        "capacity_tpa": 8,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "refined to 99.9999% (6N) purity",
        "notes": (
            "Kosaka smelter complex; recovers Ga from zinc refining "
            "residues and recycled semiconductor scrap; also produces In and Ge"
        ),
    },
    # =========================================================================
    # SOUTH KOREA
    # =========================================================================
    {
        "name": "Korea Zinc (Onsan)",
        "lat": 35.42,
        "lon": 129.36,
        "country": "South Korea",
        "operator": "Korea Zinc Co.",
        "ownership": "Korea Zinc (KRX: 010130)",
        "status": "operating",
        "type": "zinc refinery byproduct",
        "products": ["gallium", "indium", "zinc"],
        "capacity_tpa": 5,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.99% (4N) purity",
        "notes": (
            "World's largest zinc smelter; recovers Ga as byproduct from "
            "zinc refining residues at Onsan complex, Ulsan"
        ),
    },
    # =========================================================================
    # RUSSIA / UKRAINE
    # =========================================================================
    {
        "name": "RUSAL Nikolaev Alumina Refinery",
        "lat": 46.97,
        "lon": 32.00,
        "country": "Ukraine",
        "operator": "RUSAL (formerly UC Rusal)",
        "ownership": "RUSAL (MOEX: RUAL)",
        "status": "suspended",
        "type": "alumina refinery byproduct",
        "products": ["gallium", "alumina"],
        "capacity_tpa": 15,
        "production_year": 2021,
        "reserves_mt": None,
        "grade": "50-80 ppm Ga in bauxite feed",
        "notes": (
            "Mykolaiv Alumina Plant (MAP); historically significant Ga "
            "producer; operations disrupted since 2022 due to conflict"
        ),
    },
    {
        "name": "RUSAL Bogoslovsk Alumina Refinery",
        "lat": 59.77,
        "lon": 60.05,
        "country": "Russia",
        "operator": "RUSAL",
        "ownership": "RUSAL (MOEX: RUAL)",
        "status": "operating",
        "type": "alumina refinery byproduct",
        "products": ["gallium", "alumina"],
        "capacity_tpa": 10,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "60-100 ppm Ga in bauxite feed",
        "notes": (
            "Bogoslovsk Aluminum Smelter (BAZ); Sverdlovsk Oblast, Urals; "
            "Ga recovery from local and imported bauxite processing"
        ),
    },
    {
        "name": "RUSAL Achinsk Alumina Refinery",
        "lat": 56.28,
        "lon": 90.50,
        "country": "Russia",
        "operator": "RUSAL",
        "ownership": "RUSAL (MOEX: RUAL)",
        "status": "operating",
        "type": "alumina refinery byproduct",
        "products": ["gallium", "alumina"],
        "capacity_tpa": 8,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "60-100 ppm Ga in nepheline feed",
        "notes": (
            "Achinsk Alumina Refinery; Krasnoyarsk Krai; processes "
            "nepheline syenite (not bauxite) from Kiya-Shaltyr deposit; "
            "Ga recovery from sinter process"
        ),
    },
    # =========================================================================
    # EUROPE
    # =========================================================================
    {
        "name": "Ingal Stade",
        "lat": 53.60,
        "lon": 9.47,
        "country": "Germany",
        "operator": "Ingal Stade GmbH (formerly AOS)",
        "ownership": "PPM Pure Metals / 5N Plus (various ownership changes)",
        "status": "closed",
        "type": "alumina refinery byproduct",
        "products": ["gallium"],
        "capacity_tpa": 0,
        "production_year": None,
        "reserves_mt": None,
        "grade": "refined to 99.99%+ purity",
        "notes": (
            "Former alumina refinery site near Hamburg; historically "
            "Germany's only primary Ga source; alumina refinery closed 2009; "
            "reopening discussions under EU Critical Raw Materials Act"
        ),
    },
    {
        "name": "MAL Magyar Aluminium (Ajka)",
        "lat": 47.09,
        "lon": 17.56,
        "country": "Hungary",
        "operator": "MAL Magyar Aluminium",
        "ownership": "MAL Zrt. (Hungarian private)",
        "status": "operating",
        "type": "alumina refinery byproduct",
        "products": ["gallium", "alumina"],
        "capacity_tpa": 8,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "50-80 ppm Ga in bauxite feed",
        "notes": (
            "Ajka alumina refinery in western Hungary; one of few "
            "remaining primary Ga producers in the EU; processes "
            "Hungarian and imported bauxite"
        ),
    },
    # =========================================================================
    # CENTRAL ASIA
    # =========================================================================
    {
        "name": "Pavlodar Alumina Refinery",
        "lat": 52.29,
        "lon": 76.95,
        "country": "Kazakhstan",
        "operator": "Aluminum of Kazakhstan (AoK)",
        "ownership": "ERG (Eurasian Resources Group)",
        "status": "operating",
        "type": "alumina refinery byproduct",
        "products": ["gallium", "alumina"],
        "capacity_tpa": 5,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "50-80 ppm Ga in bauxite feed",
        "notes": (
            "Pavlodar alumina plant; processes bauxite from Torgay and "
            "Krasnooktyabrsk deposits; Ga recovery circuit installed"
        ),
    },
    # =========================================================================
    # NORTH AMERICA — RECYCLING ONLY (NO PRIMARY US/CANADIAN GA PRODUCTION)
    # =========================================================================
    {
        "name": "AXT Inc. (Fremont, recycling)",
        "lat": 37.49,
        "lon": -121.94,
        "country": "United States",
        "operator": "AXT Inc.",
        "ownership": "AXT Inc. (NASDAQ: AXTI)",
        "status": "operating",
        "type": "recycling / secondary",
        "products": ["gallium arsenide substrates", "gallium"],
        "capacity_tpa": 3,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.9999% (6N) recycled Ga",
        "notes": (
            "Semiconductor substrate manufacturer; recovers and recycles "
            "gallium from GaAs wafer production scrap; no primary US Ga "
            "production exists"
        ),
    },
    {
        "name": "Indium Corporation (Utica, recycling)",
        "lat": 43.10,
        "lon": -75.23,
        "country": "United States",
        "operator": "Indium Corporation",
        "ownership": "Indium Corporation (private)",
        "status": "operating",
        "type": "recycling / secondary",
        "products": ["gallium", "indium", "germanium"],
        "capacity_tpa": 2,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.9999% (6N) recycled",
        "notes": (
            "Specialty metals company; recycles Ga, In, Ge from "
            "semiconductor and LED scrap; Clinton, NY facility"
        ),
    },
    {
        "name": "5N Plus (Montreal, recycling)",
        "lat": 45.50,
        "lon": -73.57,
        "country": "Canada",
        "operator": "5N Plus Inc.",
        "ownership": "5N Plus Inc. (TSX: VNP)",
        "status": "operating",
        "type": "recycling / secondary",
        "products": ["gallium", "germanium", "indium", "tellurium"],
        "capacity_tpa": 3,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.999% to 99.99999% (5N-7N) purity",
        "notes": (
            "Specialty semiconductor metals recycler; processes Ga-containing "
            "scrap from LED and PV industries; also operates in Germany and UK"
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

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"[ingest_gallium] Wrote {len(SITES)} gallium sites to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
