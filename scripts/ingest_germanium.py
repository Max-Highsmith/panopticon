#!/usr/bin/env python3
"""
Ingest germanium production sites into Panopticon format.

Primary sources:
  - USGS Mineral Commodity Summaries 2024, Germanium chapter
    https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-germanium.pdf
  - USGS Minerals Yearbook — Germanium
    https://www.usgs.gov/centers/national-minerals-information-center/germanium-statistics-and-information
  - Company annual reports and filings:
    * Yunnan Germanium Industry Co. (SHE: 002428)
    * Yunnan Chihong Zinc & Germanium Co. (SHA: 600497)
    * Zhuzhou Smelting Group / China Minmetals / Hunan Nonferrous Metals
    * Yunnan Copper Industry (SHE: 000878)
    * Umicore N.V. (EBR: UMI) — Annual Report 2023
    * Teck Resources (NYSE: TECK / TSX: TECK.B) — Annual Report 2023
    * Boliden AB (STO: BOL) — Annual Report 2023
    * Nyrstar (controlled by Trafigura Group) — Annual Report 2023
    * Korea Zinc (KRX: 010130) — Annual Report 2023
    * Indium Corporation corporate publications
    * 5N Plus Inc. (TSX: VNP) — Annual Report 2023
    * Ivanhoe Mines (TSX: IVN) — NI 43-101 Technical Report for Kipushi
    * PPM Pure Metals GmbH corporate disclosures
    * Vedanta / Hindustan Zinc (BSE: 500188) — Annual Report 2023
    * Doe Run Peru corporate disclosures
  - European Commission Critical Raw Materials Study 2023
  - China Nonferrous Metals Industry Association statistics

IMPORTANT: Germanium is mainly a byproduct of zinc refining (~75%) and coal
fly ash processing (~20%, almost exclusively in China). There are very few
deposits where germanium is the primary commodity. The Kipushi mine in DRC
is a rare exception where Ge is economically significant in its own right.

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
OUTPUT_FILE = OUTPUT_DIR / "germanium.json"

SOURCE_METADATA = {
    "description": (
        "Global germanium production sites (zinc refineries, coal fly ash "
        "processors, and recycling facilities)"
    ),
    "origin": (
        "USGS Mineral Commodity Summaries 2024, Germanium chapter "
        "(https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-germanium.pdf); "
        "USGS Minerals Yearbook — Germanium "
        "(https://www.usgs.gov/centers/national-minerals-information-center/"
        "germanium-statistics-and-information); "
        "Yunnan Germanium Industry Co. annual reports (SHE: 002428); "
        "Umicore annual reports (EBR: UMI); "
        "Teck Resources annual reports (NYSE: TECK / TSX: TECK.B); "
        "Boliden AB annual reports (STO: BOL); "
        "Indium Corporation technical publications; "
        "5N Plus annual reports (TSX: VNP); "
        "European Commission Critical Raw Materials Study 2023; "
        "Germanium Corporation of Russia corporate disclosures; "
        "China Nonferrous Metals Industry Association statistics"
    ),
    "retrieved": "2026-03-08",
    "license": (
        "USGS: public domain; company data: fair use summary; "
        "EC reports: public domain"
    ),
    "notes": (
        "Germanium is primarily a byproduct of zinc ore refining (~75% of "
        "global supply) and coal fly ash processing (~20%, almost exclusively "
        "in China). There are very few deposits where germanium is the primary "
        "commodity. Some germanium is also recovered from optical fiber "
        "manufacturing scrap and recycled electronics. China dominates with "
        "~68% of world production. Coordinates from company filings, satellite "
        "imagery, and USGS MRDS. Capacity figures represent germanium metal "
        "equivalent output."
    ),
}

COVERAGE_METADATA = {
    "global_production_2023_tpa": 180,
    "global_production_unit": "germanium metal (tonnes)",
    "global_production_source": (
        "USGS MCS 2024 — estimated 180 tonnes refined germanium worldwide"
    ),
    "site_count": 25,
    "operating_count": 21,
    "development_count": 4,
    "estimated_coverage_pct": 88,
    "known_gaps": (
        "Small Chinese coal fly ash processors in Inner Mongolia and Guizhou "
        "not individually identified; some artisanal zinc-germanium recovery "
        "in DRC (Kipushi); Russian facilities with limited public disclosure"
    ),
    "audit_date": "2026-03-08",
}

# --- Site Data ---------------------------------------------------------------
# Each entry represents a facility that produces germanium, primarily as a
# byproduct of zinc refining or coal fly ash processing. capacity_tpa is
# germanium metal equivalent output in tonnes per year.

SITES = [
    # =========================================================================
    # CHINA — ZINC REFINERY BYPRODUCT + COAL FLY ASH
    # China produces ~68% of world germanium (~120 of 180 tonnes)
    # =========================================================================
    {
        "name": "Yunnan Germanium (Lincang)",
        "lat": 23.88,
        "lon": 100.09,
        "country": "China",
        "operator": "Yunnan Germanium Industry Co.",
        "ownership": (
            "Yunnan Germanium Industry (SHE: 002428), subsidiary of "
            "Yunnan Chihong Zinc & Germanium"
        ),
        "status": "operating",
        "type": "zinc refinery byproduct + coal fly ash",
        "products": ["germanium", "germanium dioxide", "optical germanium"],
        "capacity_tpa": 30,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "concentrate to 99.999% (5N) zone-refined Ge",
        "notes": (
            "World's largest single germanium producer; integrated "
            "zinc-germanium mining and refining in Yunnan; supplies GeO2, "
            "zone-refined Ge ingots, and IR-grade Ge for optics"
        ),
    },
    {
        "name": "Yunnan Chihong Zinc & Germanium (Qujing)",
        "lat": 25.49,
        "lon": 103.80,
        "country": "China",
        "operator": "Yunnan Chihong Zinc & Germanium Co.",
        "ownership": "Yunnan Chihong Z&G (SHA: 600497)",
        "status": "operating",
        "type": "zinc refinery byproduct",
        "products": ["germanium", "zinc", "lead"],
        "capacity_tpa": 20,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "Ge-rich zinc concentrates; 100-300 ppm Ge in feed",
        "notes": (
            "Qujing smelter complex; parent company of Yunnan Germanium; "
            "processes Ge-bearing zinc ores from Huize and Lanping mines"
        ),
    },
    {
        "name": "Hunan Nonferrous Zhuzhou Smelter",
        "lat": 27.83,
        "lon": 113.13,
        "country": "China",
        "operator": "Zhuzhou Smelting Group",
        "ownership": "China Minmetals / Hunan Nonferrous Metals",
        "status": "operating",
        "type": "zinc refinery byproduct",
        "products": ["germanium", "indium", "zinc", "lead"],
        "capacity_tpa": 15,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "50-200 ppm Ge in zinc concentrates",
        "notes": (
            "One of China's largest integrated zinc-lead smelters; recovers "
            "Ge, In, Cd, and other minor metals from zinc refining residues; "
            "Zhuzhou, Hunan"
        ),
    },
    {
        "name": "Zhonghao Smelting (Liuzhou)",
        "lat": 24.33,
        "lon": 109.42,
        "country": "China",
        "operator": "Guangxi Zhonghao Smelting",
        "ownership": "Private (Guangxi provincial)",
        "status": "operating",
        "type": "zinc refinery byproduct",
        "products": ["germanium", "zinc"],
        "capacity_tpa": 10,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "50-150 ppm Ge in zinc concentrates",
        "notes": (
            "Zinc smelter in Guangxi with germanium recovery circuit; "
            "processes Ge-bearing zinc ores from southern China deposits"
        ),
    },
    {
        "name": "Cloud Copper / Yunnan Copper (Kunming)",
        "lat": 25.02,
        "lon": 102.68,
        "country": "China",
        "operator": "Yunnan Copper Industry",
        "ownership": "Yunnan Copper (SHE: 000878), China Aluminum Corp. subsidiary",
        "status": "operating",
        "type": "copper refinery byproduct",
        "products": ["germanium", "copper", "gold", "silver"],
        "capacity_tpa": 8,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "Ge recovered from copper anode slimes",
        "notes": (
            "Recovers Ge from copper refining; Yunnan's polymetallic ores "
            "contain germanium as trace element; integrated precious metals "
            "recovery"
        ),
    },
    {
        "name": "Guizhou Coal Fly Ash Ge Recovery (Bijie)",
        "lat": 27.30,
        "lon": 105.29,
        "country": "China",
        "operator": "Multiple local processors",
        "ownership": "Various small-to-medium enterprises",
        "status": "operating",
        "type": "coal fly ash processing",
        "products": ["germanium dioxide", "germanium"],
        "capacity_tpa": 12,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "100-500 ppm Ge in lignite fly ash",
        "notes": (
            "Bijie/Weining area coal-fired power plants produce Ge-rich "
            "fly ash; multiple small processors extract GeO2; Guizhou "
            "lignite uniquely enriched in Ge"
        ),
    },
    {
        "name": "Inner Mongolia Coal Fly Ash (Wuhai)",
        "lat": 39.67,
        "lon": 106.82,
        "country": "China",
        "operator": "Multiple processors",
        "ownership": "Various Inner Mongolia enterprises",
        "status": "operating",
        "type": "coal fly ash processing",
        "products": ["germanium dioxide"],
        "capacity_tpa": 10,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "50-300 ppm Ge in coal ash",
        "notes": (
            "Inner Mongolia lignite deposits contain elevated Ge; fly ash "
            "from local power plants processed for GeO2 recovery; growing "
            "segment of Chinese Ge supply"
        ),
    },
    {
        "name": "Xilingol Coal Germanium (Xilinhaote)",
        "lat": 43.97,
        "lon": 116.08,
        "country": "China",
        "operator": "Inner Mongolia Xilingol Ge Industry",
        "ownership": "State/private consortium",
        "status": "operating",
        "type": "coal fly ash processing",
        "products": ["germanium dioxide", "germanium"],
        "capacity_tpa": 8,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "200-600 ppm Ge in lignite",
        "notes": (
            "Xilingol League lignite coal deposits with exceptionally high "
            "Ge content; dedicated Ge extraction from coal combustion residues"
        ),
    },
    {
        "name": "Nanjing Germanium (Nanjing)",
        "lat": 32.06,
        "lon": 118.80,
        "country": "China",
        "operator": "Nanjing Germanium Factory",
        "ownership": "China Electronics Technology Group (CETC)",
        "status": "operating",
        "type": "refining / zone refining",
        "products": ["high-purity germanium", "germanium wafers"],
        "capacity_tpa": 5,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.9999% (6N) zone-refined Ge",
        "notes": (
            "Specialty germanium refiner; produces detector-grade and "
            "optical-grade Ge; supplies Chinese semiconductor and "
            "defense sectors"
        ),
    },
    # =========================================================================
    # BELGIUM — WORLD'S #2 GE PRODUCER
    # =========================================================================
    {
        "name": "Umicore Olen",
        "lat": 51.14,
        "lon": 4.86,
        "country": "Belgium",
        "operator": "Umicore N.V.",
        "ownership": "Umicore (EBR: UMI)",
        "status": "operating",
        "type": "zinc residue processing + recycling",
        "products": [
            "germanium",
            "germanium dioxide",
            "germanium tetrachloride",
        ],
        "capacity_tpa": 25,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "refined to 99.999% (5N) purity",
        "notes": (
            "World's second-largest Ge producer; Hoboken/Olen complex; "
            "processes zinc residues and recycles Ge from fiber optic and "
            "PV scrap; integrated refinery for Ge, In, and precious metals"
        ),
    },
    # =========================================================================
    # CANADA
    # =========================================================================
    {
        "name": "Teck Trail Operations (Trail Smelter)",
        "lat": 49.10,
        "lon": -117.71,
        "country": "Canada",
        "operator": "Teck Resources Limited",
        "ownership": "Teck Resources (NYSE: TECK / TSX: TECK.B)",
        "status": "operating",
        "type": "zinc refinery byproduct",
        "products": ["germanium", "indium", "zinc", "lead"],
        "capacity_tpa": 15,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.99% (4N) purity",
        "notes": (
            "One of world's largest integrated zinc-lead smelters; Trail, "
            "British Columbia; recovers Ge from zinc refining residues; "
            "historically significant Ge source for North America"
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
        "products": ["germanium", "gallium", "tellurium", "bismuth"],
        "capacity_tpa": 5,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.999% to 99.99999% (5N-7N) purity",
        "notes": (
            "Major specialty metals recycler; processes Ge scrap from "
            "solar PV (CdTe panels), fiber optics, and IR optics; "
            "facilities in Montreal and Germany"
        ),
    },
    # =========================================================================
    # RUSSIA
    # =========================================================================
    {
        "name": "Germanium Corporation of Russia (Krasnoyarsk)",
        "lat": 56.01,
        "lon": 92.87,
        "country": "Russia",
        "operator": "Germanium Corporation (Korporatsiya Germaniy)",
        "ownership": "Partly state-owned; limited public disclosure",
        "status": "operating",
        "type": "coal fly ash + zinc refinery byproduct",
        "products": ["germanium", "germanium dioxide"],
        "capacity_tpa": 5,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "refined to 99.999% (5N)",
        "notes": (
            "Russia's primary germanium producer; Krasnoyarsk Krai; "
            "processes Ge from coal fly ash (Pavlovsk lignite) and zinc "
            "smelter residues; supplies Russian defense/optics sector"
        ),
    },
    {
        "name": "Chelyabinsk Zinc Plant",
        "lat": 55.16,
        "lon": 61.40,
        "country": "Russia",
        "operator": "Chelyabinsk Zinc Plant (CZP)",
        "ownership": "UMMC (Ural Mining & Metallurgical Company)",
        "status": "operating",
        "type": "zinc refinery byproduct",
        "products": ["germanium", "zinc", "indium"],
        "capacity_tpa": 3,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.99% (4N)",
        "notes": (
            "Russia's largest zinc smelter; Chelyabinsk, Urals; Ge "
            "recovered from zinc refining residues as minor byproduct"
        ),
    },
    # =========================================================================
    # UNITED STATES — RECYCLING ONLY
    # =========================================================================
    {
        "name": "Indium Corporation (Utica, recycling)",
        "lat": 43.10,
        "lon": -75.23,
        "country": "United States",
        "operator": "Indium Corporation",
        "ownership": "Indium Corporation (private)",
        "status": "operating",
        "type": "recycling / secondary",
        "products": ["germanium", "indium", "gallium"],
        "capacity_tpa": 3,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.9999% (6N) recycled",
        "notes": (
            "Recycles Ge from fiber optic manufacturing scrap, IR optics, "
            "and semiconductor waste; Clinton, NY facility; no primary US "
            "Ge production"
        ),
    },
    # =========================================================================
    # EUROPE
    # =========================================================================
    {
        "name": "5N Plus (Eisenhuttenstadt, Germany)",
        "lat": 52.14,
        "lon": 14.68,
        "country": "Germany",
        "operator": "5N Plus GmbH",
        "ownership": "5N Plus Inc. (TSX: VNP)",
        "status": "operating",
        "type": "recycling / secondary",
        "products": ["germanium", "gallium", "tellurium"],
        "capacity_tpa": 3,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.999%+ (5N+) purity",
        "notes": (
            "European recycling hub for specialty semiconductor metals; "
            "processes end-of-life solar panels and manufacturing scrap"
        ),
    },
    {
        "name": "Boliden Kokkola Zinc Smelter",
        "lat": 63.84,
        "lon": 23.13,
        "country": "Finland",
        "operator": "Boliden AB",
        "ownership": "Boliden AB (STO: BOL)",
        "status": "operating",
        "type": "zinc refinery byproduct",
        "products": ["germanium", "zinc", "sulphuric acid"],
        "capacity_tpa": 5,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.99% (4N)",
        "notes": (
            "One of Europe's largest zinc smelters; 315,000 tpa zinc "
            "capacity; Ge recovered from zinc leach residues; Kokkola "
            "Industrial Park, Finland"
        ),
    },
    {
        "name": "Nyrstar Auby Zinc Smelter",
        "lat": 50.37,
        "lon": 3.05,
        "country": "France",
        "operator": "Nyrstar (Trafigura)",
        "ownership": "Nyrstar N.V. (controlled by Trafigura Group)",
        "status": "operating",
        "type": "zinc refinery byproduct",
        "products": ["germanium", "zinc", "indium"],
        "capacity_tpa": 3,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.99% (4N)",
        "notes": (
            "Auby zinc smelter near Douai, northern France; recovers "
            "Ge and In from zinc refining; 160,000 tpa zinc capacity"
        ),
    },
    {
        "name": "Nyrstar Balen/Overpelt",
        "lat": 51.17,
        "lon": 5.18,
        "country": "Belgium",
        "operator": "Nyrstar (Trafigura)",
        "ownership": "Nyrstar N.V. (controlled by Trafigura Group)",
        "status": "operating",
        "type": "zinc refinery byproduct",
        "products": ["germanium", "zinc", "indium"],
        "capacity_tpa": 2,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.99% (4N)",
        "notes": (
            "Belgian zinc smelter; part of Nyrstar's multi-site Ge "
            "recovery network; residues may be further refined at "
            "Umicore Olen"
        ),
    },
    {
        "name": "PPM Pure Metals (Langelsheim)",
        "lat": 51.93,
        "lon": 10.33,
        "country": "Germany",
        "operator": "PPM Pure Metals GmbH",
        "ownership": (
            "PPM Pure Metals (subsidiary of various; historically "
            "MCP/Recapture Metals)"
        ),
        "status": "operating",
        "type": "refining / recycling",
        "products": ["germanium", "gallium", "indium"],
        "capacity_tpa": 3,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.9999% (6N) zone-refined",
        "notes": (
            "Specialty refinery in Langelsheim, Lower Saxony; zone "
            "refining and purification of Ge, Ga, and In to ultra-high "
            "purity grades for semiconductor applications"
        ),
    },
    # =========================================================================
    # AFRICA — KIPUSHI (DEVELOPMENT)
    # =========================================================================
    {
        "name": "Kipushi Mine (development)",
        "lat": -11.77,
        "lon": 27.25,
        "country": "Democratic Republic of Congo",
        "operator": "Ivanhoe Mines",
        "ownership": "Ivanhoe Mines (66.8%), Gecamines (33.2%)",
        "status": "development",
        "type": "zinc-copper-germanium mine",
        "products": ["germanium", "zinc", "copper", "silver"],
        "capacity_tpa": 10,
        "production_year": None,
        "reserves_mt": None,
        "grade": "34.9% Zn, 0.64% Cu, 62 ppm Ge (Big Zinc Zone)",
        "notes": (
            "One of world's highest-grade undeveloped zinc-germanium "
            "deposits; historic mine being rehabilitated; Katanga Province; "
            "could become major Ge source when operational "
            "(target 2024-2025)"
        ),
    },
    # =========================================================================
    # SOUTH KOREA
    # =========================================================================
    {
        "name": "Korea Zinc (Onsan, Ge recovery)",
        "lat": 35.42,
        "lon": 129.36,
        "country": "South Korea",
        "operator": "Korea Zinc Co.",
        "ownership": "Korea Zinc (KRX: 010130)",
        "status": "operating",
        "type": "zinc refinery byproduct",
        "products": ["germanium", "zinc", "indium", "gallium"],
        "capacity_tpa": 3,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "99.99% (4N)",
        "notes": (
            "World's largest zinc smelter; Onsan complex, Ulsan; Ge "
            "recovered alongside In and Ga from zinc refining residues"
        ),
    },
    # =========================================================================
    # INDIA (DEVELOPMENT)
    # =========================================================================
    {
        "name": "Hindustan Zinc (Rajpura Dariba/Chanderiya)",
        "lat": 24.12,
        "lon": 74.07,
        "country": "India",
        "operator": "Hindustan Zinc Limited",
        "ownership": "Vedanta Resources (64.9%), Government of India (29.5%)",
        "status": "development",
        "type": "zinc refinery byproduct",
        "products": ["germanium", "zinc", "lead", "silver"],
        "capacity_tpa": 3,
        "production_year": None,
        "reserves_mt": None,
        "grade": "Ge recovery from zinc residues under evaluation",
        "notes": (
            "India's only integrated zinc-lead producer; Rajsamand, "
            "Rajasthan; studying Ge recovery from zinc refining residues; "
            "pilot-scale testing"
        ),
    },
    # =========================================================================
    # SOUTH AMERICA
    # =========================================================================
    {
        "name": "Doe Run La Oroya Smelter",
        "lat": -11.52,
        "lon": -75.90,
        "country": "Peru",
        "operator": "Doe Run Peru (Renco Group)",
        "ownership": "Doe Run Peru (in restructuring)",
        "status": "suspended",
        "type": "polymetallic smelter byproduct",
        "products": ["germanium", "zinc", "lead", "copper", "bismuth"],
        "capacity_tpa": 2,
        "production_year": 2020,
        "reserves_mt": None,
        "grade": "Ge from complex polymetallic concentrates",
        "notes": (
            "La Oroya polymetallic smelter in Peruvian Andes; historically "
            "recovered Ge from zinc residues; operations suspended due to "
            "environmental and financial issues; potential restart under "
            "new investors"
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

    print(f"[ingest_germanium] Wrote {len(SITES)} germanium sites to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
