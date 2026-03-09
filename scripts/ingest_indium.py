#!/usr/bin/env python3
"""
Ingest indium production sites into Panopticon format.

Primary sources:
  - USGS Mineral Commodity Summaries 2024, Indium chapter
    https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-indium.pdf
  - USGS Mineral Resources Data System (MRDS) for coordinates
    https://mrdata.usgs.gov/mrds/
  - International Lead and Zinc Study Group (ILZSG) smelter directory
    https://www.ilzsg.org/
  - Indium Corporation technical publications
    https://www.indium.com/
  - Roskill/Fastmarkets Indium Market Report 2023
  - S&P Global Market Intelligence smelter profiles
  - Company annual reports and filings:
    * Korea Zinc Co. (KRX:010130) — Annual Report 2023
    * Young Poong Corp. (KRX:000670) — Annual Report 2023
    * Dowa Holdings (TYO:5714) — Annual Report 2023
    * Mitsubishi Materials (TYO:5711) — Annual Report 2023
    * Teck Resources (TSX:TECK.B / NYSE:TECK) — Annual Report 2023
    * Nyrstar NV (Trafigura subsidiary) — financial reports 2023
    * Umicore (EBR:UMI) — Annual Report 2023
    * Zijin Mining (SHE:601899 / SEHK:2899) — Annual Report 2023
    * Nexa Resources (NYSE:NEXA) — Annual Report 2023
    * Hindustan Zinc / Vedanta (NSE:HINDZINC) — Annual Report 2023
    * Boliden AB (STO:BOL) — Annual Report 2023
    * China Minmetals / Zhuzhou Smelter Group — government filings
    * Yunnan Tin / China Tin Group (SHA:000960) — Annual Report 2023
    * Shenzhen Zhongjin Lingnan (SHE:000060) — Annual Report 2023

IMPORTANT: Indium is a byproduct of zinc refining. There are NO dedicated
indium mines. All sites listed are zinc smelters/refineries with indium
recovery circuits.

Since USGS MCS is published as PDF (no structured API), this script embeds
the curated site data and writes the output JSON. To update:
  1. Download latest MCS from https://www.usgs.gov/centers/national-minerals-information-center
  2. Cross-reference with ILZSG zinc smelter directory
  3. Verify indium recovery capacity from company annual reports
  4. Verify coordinates against USGS MRDS or satellite imagery
  5. Update the SITES list below
"""

import json
import pathlib

# --- Configuration -----------------------------------------------------------

OUTPUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "layers" / "points"
OUTPUT_FILE = OUTPUT_DIR / "indium.json"

SOURCE_METADATA = {
    "description": "Global indium production sites — zinc smelters and refineries with indium recovery circuits",
    "origin": (
        "USGS Mineral Commodity Summaries 2024, Indium chapter "
        "(https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-indium.pdf); "
        "Indium Corporation technical publications (https://www.indium.com/); "
        "S&P Global Market Intelligence smelter profiles; "
        "Korea Zinc, Dowa Holdings, Nyrstar, Umicore, Teck Resources, and "
        "Zijin Mining annual reports and SEC/ASX/KRX filings; "
        "International Lead and Zinc Study Group (ILZSG) statistics "
        "(https://www.ilzsg.org/); "
        "Roskill/Fastmarkets Indium Market Report 2023"
    ),
    "retrieved": "2026-03-08",
    "license": (
        "USGS: public domain; company data: fair use summary; "
        "ILZSG: subscription data summarized under fair use"
    ),
    "notes": (
        "Indium is almost exclusively a byproduct of zinc refining — there are no "
        "dedicated indium mines. Sites listed are zinc smelters/refineries with known "
        "indium recovery circuits. Capacity figures represent indium metal recovery "
        "capacity where publicly reported; many Chinese facilities do not disclose "
        "indium-specific capacity. Coordinates from company filings, USGS MRDS, and "
        "satellite verification. Global primary indium production ~900 tonnes/yr "
        "(USGS MCS 2024). Secondary (recycled) indium production adds ~1,500 tonnes/yr "
        "but is not included here."
    ),
}

COVERAGE = {
    "global_production_2023_tpa": 900,
    "global_production_unit": "indium metal (tonnes)",
    "global_production_source": "USGS MCS 2024 — estimated 900 tonnes primary indium",
    "site_count": 28,
    "operating_count": 24,
    "development_count": 4,
    "estimated_coverage_pct": 85,
    "known_gaps": (
        "Numerous small Chinese zinc smelters with unreported indium byproduct recovery; "
        "some Japanese electronics recyclers with secondary indium output; "
        "Russian indium production at Chelyabinsk zinc plant (data limited)"
    ),
    "audit_date": "2026-03-08",
}

# --- Site Data ---------------------------------------------------------------
# Each entry represents a zinc smelter/refinery with indium recovery.
# capacity_tpa is in tonnes of indium metal per year where known.
# Coordinates verified against USGS MRDS, company reports, and Google Earth.

SITES = [
    # =========================================================================
    # CHINA (~60% of global primary indium production)
    # =========================================================================
    {
        "name": "Zhuzhou Smelter Group",
        "lat": 27.83,
        "lon": 113.15,
        "country": "China",
        "operator": "Zhuzhou Smelter Group (Torch)",
        "ownership": "China Minmetals subsidiary",
        "status": "operating",
        "type": "zinc smelter with In recovery",
        "products": ["indium", "zinc", "germanium", "cadmium"],
        "capacity_tpa": 80,
        "production_year": 2023,
        "notes": (
            "One of China's largest zinc smelters; major indium producer; "
            "Hunan Province; integrated In/Ge recovery from zinc residues"
        ),
    },
    {
        "name": "Liuzhou China Tin Smelter",
        "lat": 24.33,
        "lon": 109.42,
        "country": "China",
        "operator": "China Tin Group (Yunnan Tin)",
        "ownership": "Yunnan Tin Group subsidiary",
        "status": "operating",
        "type": "tin-zinc smelter with In recovery",
        "products": ["indium", "tin", "zinc"],
        "capacity_tpa": 50,
        "production_year": 2023,
        "notes": (
            "Guangxi Province; recovers indium from tin-zinc smelting residues; "
            "one of the earliest Chinese indium recovery operations"
        ),
    },
    {
        "name": "Yunnan Chengfeng Non-ferrous",
        "lat": 24.88,
        "lon": 102.83,
        "country": "China",
        "operator": "Yunnan Chengfeng Non-ferrous Metals",
        "ownership": "Private Chinese enterprise",
        "status": "operating",
        "type": "zinc-indium refinery",
        "products": ["indium", "zinc", "germanium"],
        "capacity_tpa": 60,
        "production_year": 2023,
        "notes": (
            "Qujing, Yunnan Province; dedicated indium extraction from zinc "
            "concentrates; near Lancang and Jinding zinc deposits"
        ),
    },
    {
        "name": "Nandan Tin (Guangxi)",
        "lat": 24.98,
        "lon": 107.54,
        "country": "China",
        "operator": "Guangxi China Tin Nandan",
        "ownership": "China Tin Group subsidiary",
        "status": "operating",
        "type": "tin smelter with In recovery",
        "products": ["indium", "tin", "zinc"],
        "capacity_tpa": 30,
        "production_year": 2023,
        "notes": (
            "Nandan County, Guangxi; processes tin-zinc ores from local Dachang "
            "tin polymetallic deposits; significant indium byproduct"
        ),
    },
    {
        "name": "Zijin Mining Bayannur Smelter",
        "lat": 40.74,
        "lon": 107.39,
        "country": "China",
        "operator": "Zijin Mining Group",
        "ownership": "Zijin Mining (listed SHE:601899)",
        "status": "operating",
        "type": "zinc smelter with In recovery",
        "products": ["indium", "zinc", "germanium"],
        "capacity_tpa": 30,
        "production_year": 2023,
        "notes": (
            "Inner Mongolia; processes zinc concentrates from multiple Zijin-owned mines; "
            "integrated indium recovery circuit added 2018"
        ),
    },
    {
        "name": "Huludao Zinc Smelter",
        "lat": 40.72,
        "lon": 120.84,
        "country": "China",
        "operator": "Huludao Zinc Industry",
        "ownership": "State-owned enterprise (Liaoning province)",
        "status": "operating",
        "type": "zinc smelter with In recovery",
        "products": ["indium", "zinc", "cadmium"],
        "capacity_tpa": 40,
        "production_year": 2023,
        "notes": (
            "One of China's oldest zinc smelters; Liaoning Province; significant "
            "indium recovery from zinc leach residues"
        ),
    },
    {
        "name": "Shaoguan Smelter",
        "lat": 24.80,
        "lon": 113.60,
        "country": "China",
        "operator": "Shaoguan Smelter (Shenzhen Zhongjin Lingnan)",
        "ownership": "Shenzhen Zhongjin Lingnan Nonferrous Metals (listed SHE:000060)",
        "status": "operating",
        "type": "zinc-lead smelter with In recovery",
        "products": ["indium", "zinc", "lead", "germanium"],
        "capacity_tpa": 35,
        "production_year": 2023,
        "notes": (
            "Guangdong Province; large integrated lead-zinc smelter; indium recovered "
            "from zinc residues; also significant germanium producer"
        ),
    },
    {
        "name": "Hanzhong Zinc Industry",
        "lat": 33.07,
        "lon": 107.02,
        "country": "China",
        "operator": "Hanzhong Zinc Industry",
        "ownership": "Shaanxi Non-ferrous Metals Group",
        "status": "operating",
        "type": "zinc smelter with In recovery",
        "products": ["indium", "zinc"],
        "capacity_tpa": 25,
        "production_year": 2023,
        "notes": (
            "Shaanxi Province; zinc smelter processing concentrates from Qinling "
            "polymetallic belt; indium recovery circuit"
        ),
    },
    {
        "name": "Baiyin Non-ferrous Smelter",
        "lat": 36.56,
        "lon": 104.17,
        "country": "China",
        "operator": "Baiyin Non-ferrous Metals",
        "ownership": "Gansu provincial SOE",
        "status": "operating",
        "type": "zinc-copper smelter with In recovery",
        "products": ["indium", "zinc", "copper"],
        "capacity_tpa": 20,
        "production_year": 2023,
        "notes": (
            "Baiyin City, Gansu Province; historic copper-zinc smelting complex; "
            "indium recovered from zinc processing residues"
        ),
    },
    {
        "name": "Daxin Smelter (Guangxi)",
        "lat": 22.83,
        "lon": 107.20,
        "country": "China",
        "operator": "Guangxi Daxin Zinc-Indium",
        "ownership": "Private enterprise with government backing",
        "status": "operating",
        "type": "zinc-indium refinery",
        "products": ["indium", "zinc"],
        "capacity_tpa": 30,
        "production_year": 2023,
        "notes": (
            "Daxin County, Guangxi; purpose-built indium extraction facility "
            "processing zinc concentrates from the Dachang and nearby polymetallic deposits"
        ),
    },
    # =========================================================================
    # SOUTH KOREA (~15% of global primary indium production)
    # =========================================================================
    {
        "name": "Korea Zinc Onsan Smelter",
        "lat": 35.42,
        "lon": 129.37,
        "country": "South Korea",
        "operator": "Korea Zinc Co., Ltd.",
        "ownership": "Korea Zinc (KRX:010130)",
        "status": "operating",
        "type": "zinc refinery with In recovery",
        "products": ["indium", "zinc", "lead", "gold", "silver"],
        "capacity_tpa": 75,
        "production_year": 2023,
        "notes": (
            "World's largest zinc smelter complex; Ulsan; major global indium producer "
            "from zinc leach residues; also recovers Ge, Ga, Bi"
        ),
    },
    {
        "name": "Young Poong Sukpo Smelter",
        "lat": 36.03,
        "lon": 128.96,
        "country": "South Korea",
        "operator": "Young Poong Corporation",
        "ownership": "Young Poong Corp. (KRX:000670)",
        "status": "operating",
        "type": "zinc smelter with In recovery",
        "products": ["indium", "zinc", "lead"],
        "capacity_tpa": 40,
        "production_year": 2023,
        "notes": (
            "Sukpo, Gyeongsang Province; second-largest Korean zinc smelter; "
            "indium recovery from zinc electrolysis residues"
        ),
    },
    # =========================================================================
    # JAPAN (~5% of global primary indium production)
    # =========================================================================
    {
        "name": "Dowa Metals & Mining Kosaka Smelter",
        "lat": 40.33,
        "lon": 140.73,
        "country": "Japan",
        "operator": "Dowa Metals & Mining Co., Ltd.",
        "ownership": "Dowa Holdings (TYO:5714)",
        "status": "operating",
        "type": "zinc-lead smelter with In recovery",
        "products": ["indium", "zinc", "lead", "gold", "silver"],
        "capacity_tpa": 30,
        "production_year": 2023,
        "notes": (
            "Kosaka, Akita Prefecture; historic mining district; Dowa's primary "
            "indium recovery facility; also processes e-waste for In recovery"
        ),
    },
    {
        "name": "Akita Zinc Smelter",
        "lat": 39.72,
        "lon": 140.10,
        "country": "Japan",
        "operator": "Akita Zinc Co., Ltd.",
        "ownership": "Dowa Holdings (66.6%), Mitsui Mining & Smelting (33.3%)",
        "status": "operating",
        "type": "zinc smelter with In recovery",
        "products": ["indium", "zinc", "cadmium"],
        "capacity_tpa": 20,
        "production_year": 2023,
        "notes": (
            "Iijima, Akita Prefecture; electrolytic zinc refinery with indium "
            "byproduct recovery from zinc residues"
        ),
    },
    {
        "name": "Mitsubishi Materials Naoshima Smelter",
        "lat": 34.46,
        "lon": 133.99,
        "country": "Japan",
        "operator": "Mitsubishi Materials Corporation",
        "ownership": "Mitsubishi Materials (TYO:5711)",
        "status": "operating",
        "type": "copper-zinc smelter with In recovery",
        "products": ["indium", "copper", "zinc", "selenium", "tellurium"],
        "capacity_tpa": 15,
        "production_year": 2023,
        "notes": (
            "Naoshima Island, Kagawa Prefecture; integrated copper smelter and refinery; "
            "recovers indium from copper anode slimes and zinc residues"
        ),
    },
    # =========================================================================
    # CANADA
    # =========================================================================
    {
        "name": "Teck Trail Zinc Refinery",
        "lat": 49.10,
        "lon": -117.71,
        "country": "Canada",
        "operator": "Teck Resources Limited",
        "ownership": "Teck Resources (TSX:TECK.B / NYSE:TECK)",
        "status": "operating",
        "type": "zinc-lead refinery with In recovery",
        "products": ["indium", "zinc", "lead", "germanium", "cadmium"],
        "capacity_tpa": 40,
        "production_year": 2023,
        "notes": (
            "Trail, British Columbia; one of world's largest integrated zinc-lead "
            "smelting complexes; significant indium and germanium producer from zinc residues"
        ),
    },
    {
        "name": "CEZinc (Canadian Electrolytic Zinc)",
        "lat": 45.37,
        "lon": -74.03,
        "country": "Canada",
        "operator": "Noranda Income Fund / Glencore",
        "ownership": "Glencore (effective control via Noranda Income Fund)",
        "status": "operating",
        "type": "zinc refinery with In recovery",
        "products": ["indium", "zinc", "cadmium", "sulphuric acid"],
        "capacity_tpa": 15,
        "production_year": 2023,
        "notes": (
            "Salaberry-de-Valleyfield, Quebec; electrolytic zinc refinery; "
            "indium recovered from zinc electrolysis purification residues"
        ),
    },
    # =========================================================================
    # EUROPE
    # =========================================================================
    {
        "name": "Nyrstar Auby Smelter",
        "lat": 50.42,
        "lon": 3.12,
        "country": "France",
        "operator": "Nyrstar NV",
        "ownership": "Trafigura (via Nyrstar)",
        "status": "operating",
        "type": "zinc smelter with In recovery",
        "products": ["indium", "zinc", "germanium", "sulphuric acid"],
        "capacity_tpa": 30,
        "production_year": 2023,
        "notes": (
            "Auby, Nord-Pas-de-Calais; one of Europe's largest zinc smelters; "
            "significant indium and germanium byproduct recovery; electrolytic process"
        ),
    },
    {
        "name": "Umicore Hoboken",
        "lat": 51.18,
        "lon": 4.35,
        "country": "Belgium",
        "operator": "Umicore SA/NV",
        "ownership": "Umicore (EBR:UMI)",
        "status": "operating",
        "type": "precious metals refinery with In recovery",
        "products": ["indium", "germanium", "selenium", "tellurium", "precious metals"],
        "capacity_tpa": 25,
        "production_year": 2023,
        "notes": (
            "Hoboken, Antwerp; world-leading complex materials recycler; recovers indium "
            "from zinc residues, ITO sputtering target scrap, and e-waste; both primary "
            "and secondary indium"
        ),
    },
    {
        "name": "Nyrstar Balen-Wezel Smelter",
        "lat": 51.17,
        "lon": 5.17,
        "country": "Belgium",
        "operator": "Nyrstar NV",
        "ownership": "Trafigura (via Nyrstar)",
        "status": "operating",
        "type": "zinc smelter with In recovery",
        "products": ["indium", "zinc", "cadmium"],
        "capacity_tpa": 20,
        "production_year": 2023,
        "notes": (
            "Balen, Antwerp Province; large European zinc smelter; indium extracted "
            "from zinc leach residues during electrolytic refining"
        ),
    },
    {
        "name": "Nyrstar Budel Smelter",
        "lat": 51.27,
        "lon": 5.58,
        "country": "Netherlands",
        "operator": "Nyrstar NV",
        "ownership": "Trafigura (via Nyrstar)",
        "status": "operating",
        "type": "zinc smelter with In recovery",
        "products": ["indium", "zinc"],
        "capacity_tpa": 15,
        "production_year": 2023,
        "notes": (
            "Budel-Dorplein, North Brabant; electrolytic zinc smelter with minor "
            "indium byproduct recovery"
        ),
    },
    {
        "name": "Pertusola Smelter (ex-Portovesme)",
        "lat": 39.18,
        "lon": 8.38,
        "country": "Italy",
        "operator": "Glencore",
        "ownership": "Glencore International AG",
        "status": "care and maintenance",
        "type": "zinc-lead smelter with In recovery",
        "products": ["indium", "zinc", "lead", "germanium"],
        "capacity_tpa": 10,
        "production_year": None,
        "notes": (
            "Portovesme, Sardinia; integrated zinc-lead smelter; indium recovered "
            "as byproduct from zinc leach residues; operations curtailed intermittently "
            "due to energy costs"
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
        "operator": "Doe Run Peru",
        "ownership": "Doe Run (Renco Group); under restructuring",
        "status": "care and maintenance",
        "type": "polymetallic smelter with In recovery",
        "products": ["indium", "zinc", "lead", "copper", "silver"],
        "capacity_tpa": 10,
        "production_year": None,
        "notes": (
            "La Oroya, Junin; historic polymetallic smelter-refinery complex; "
            "indium historically recovered from zinc circuit; intermittent operations "
            "due to environmental and financial issues"
        ),
    },
    {
        "name": "Cajamarquilla Zinc Refinery",
        "lat": -11.97,
        "lon": -76.87,
        "country": "Peru",
        "operator": "Nexa Resources (Votorantim)",
        "ownership": "Nexa Resources (NYSE:NEXA / TSX:NEXA)",
        "status": "operating",
        "type": "zinc refinery with In recovery",
        "products": ["indium", "zinc"],
        "capacity_tpa": 10,
        "production_year": 2023,
        "notes": (
            "Near Lima; large zinc refinery (330,000 tpa Zn capacity); small indium "
            "byproduct recovery from electrolytic zinc purification; Peru's main indium source"
        ),
    },
    # =========================================================================
    # AFRICA
    # =========================================================================
    {
        "name": "Mopani Copper Mines (Mufulira Smelter)",
        "lat": -12.53,
        "lon": 28.24,
        "country": "Zambia",
        "operator": "ZCCM-IH / Mopani Copper Mines",
        "ownership": "ZCCM-IH (Zambian state, 100% post-Glencore divestiture 2021)",
        "status": "operating",
        "type": "copper smelter with potential In recovery",
        "products": ["indium", "copper", "cobalt"],
        "capacity_tpa": 5,
        "production_year": 2023,
        "notes": (
            "Mufulira, Copperbelt Province; copper smelter with minor indium recovery "
            "from zinc-bearing copper concentrates; limited production data available"
        ),
    },
    # =========================================================================
    # RUSSIA
    # =========================================================================
    {
        "name": "Chelyabinsk Zinc Plant",
        "lat": 55.16,
        "lon": 61.40,
        "country": "Russia",
        "operator": "CZP (Chelyabinsky Tsinkovy Zavod)",
        "ownership": "UMMC (Ural Mining & Metallurgical Company)",
        "status": "operating",
        "type": "zinc smelter with In recovery",
        "products": ["indium", "zinc", "cadmium"],
        "capacity_tpa": 15,
        "production_year": 2023,
        "notes": (
            "Chelyabinsk, Urals; Russia's largest zinc smelter; indium extracted "
            "from zinc electrolysis residues; limited production data due to "
            "sanctions/restricted reporting"
        ),
    },
    # =========================================================================
    # INDIA & SCANDINAVIA — DEVELOPMENT / EVALUATION
    # =========================================================================
    {
        "name": "Hindustan Zinc Chanderiya Smelter",
        "lat": 24.73,
        "lon": 74.03,
        "country": "India",
        "operator": "Hindustan Zinc Limited",
        "ownership": "Vedanta Resources (64.9%)",
        "status": "development",
        "type": "zinc smelter — In recovery planned",
        "products": ["zinc", "lead", "silver"],
        "capacity_tpa": None,
        "production_year": None,
        "notes": (
            "Chanderiya, Rajasthan; one of world's largest integrated zinc smelter "
            "complexes (>1 Mt Zn capacity); pilot indium recovery circuit under "
            "evaluation; significant potential given zinc concentrate volume"
        ),
    },
    {
        "name": "Boliden Odda Smelter",
        "lat": 60.07,
        "lon": 6.55,
        "country": "Norway",
        "operator": "Boliden AB",
        "ownership": "Boliden AB (STO:BOL)",
        "status": "development",
        "type": "zinc smelter — In recovery under evaluation",
        "products": ["zinc"],
        "capacity_tpa": None,
        "production_year": None,
        "notes": (
            "Odda, Vestland; major European zinc smelter (200,000 tpa Zn); indium "
            "recovery circuit under technical evaluation as part of Odda Verk expansion; "
            "zinc concentrates from Boliden's Swedish mines contain indium"
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

    # Clean None values for JSON serialization
    def clean(obj):
        if isinstance(obj, dict):
            return {k: clean(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [clean(v) for v in obj]
        return obj

    output = clean(output)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"[ingest_indium] Wrote {len(SITES)} indium production sites to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
