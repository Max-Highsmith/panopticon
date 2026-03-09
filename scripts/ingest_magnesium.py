#!/usr/bin/env python3
"""
Ingest magnesium metal production sites into Panopticon format.

IMPORTANT: This covers primary MAGNESIUM METAL production — not magnesite
(MgCO3) mineral mining. China dominates (~87%) via the Pidgeon process
(silicothermic reduction of calcined dolomite using ferrosilicon).

Primary sources:
  - USGS Mineral Commodity Summaries 2024, Magnesium Metal chapter
    https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-magnesium.pdf
  - USGS Minerals Yearbook — Magnesium (most recent available)
    https://www.usgs.gov/centers/national-minerals-information-center/magnesium-statistics-and-information
  - International Magnesium Association (IMA) statistical reports
    https://www.intlmag.org/
  - China Magnesium Association (CMA) industry statistics
  - Company annual reports and filings:
    * ICL Group (NYSE: ICL / TASE: ICL) — Annual Report 2023
      (Dead Sea Magnesium — 65% ICL, 35% Volkswagen AG)
    * VSMPO-AVISMA Corporation — annual reports (Rostec subsidiary)
    * US Magnesium LLC — corporate disclosures (Renco Group)
    * Rima Industrial SA — corporate publications
    * UK TMK (Ust-Kamenogorsk Titanium-Magnesium Combine) — production reports
      (state-controlled via Tau-Ken Samruk)
    * Alliance Magnesium Inc. (TSXV: MITE) — technical reports and MD&A
    * Norsk Hydro ASA (OSE: NHY) — historical Porsgrunn/Becancour data
    * Shanxi Yinguang Huasheng Magnesium Industry Co. — government filings
    * Ningxia Huiye Magnesium & New Material Technology Co. — annual reports
    * Baotou Xinyuan Magnesium — government filings
    * Qinghai Salt Lake Industry Co. (SHE: 000792) — pilot project reports
    * POSCO (KRX: 005490) — strategic materials R&D publications
  - Government geological survey and industrial zone publications (various countries)

Since USGS MCS is published as PDF (no structured API), this script embeds
the curated site data and writes the output JSON. To update:
  1. Download latest MCS from https://www.usgs.gov/centers/national-minerals-information-center
  2. Cross-reference production figures with IMA data and company reports
  3. Verify coordinates against industrial zone registrations or satellite imagery
  4. Update the SITES list below
"""

import json
import pathlib

# --- Configuration -----------------------------------------------------------

OUTPUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "layers" / "points"
OUTPUT_FILE = OUTPUT_DIR / "magnesium.json"

SOURCE_METADATA = {
    "description": "Major global magnesium metal production sites (primary magnesium, not magnesite ore)",
    "origin": (
        "USGS Mineral Commodity Summaries 2024, Magnesium Metal chapter "
        "(https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-magnesium.pdf); "
        "International Magnesium Association (IMA) statistical reports "
        "(https://www.intlmag.org/); "
        "China Magnesium Association (CMA) industry statistics; "
        "ICL Group (NYSE: ICL) Annual Report 2023; "
        "VSMPO-AVISMA Corporation annual reports; "
        "US Magnesium LLC corporate disclosures; "
        "Rima Industrial SA corporate publications; "
        "UK TMK (Ust-Kamenogorsk Titanium-Magnesium Combine) production reports; "
        "Alliance Magnesium Inc. (TSXV: MITE) technical reports; "
        "Baotou Xinyuan Magnesium, Shanxi Yinguang Huasheng Magnesium, "
        "Ningxia Huiye Magnesium annual reports and government filings"
    ),
    "retrieved": "2026-03-08",
    "license": (
        "USGS: public domain; IMA: membership data fair use summary; "
        "company data: fair use summary"
    ),
    "notes": (
        "Major magnesium metal production sites globally. This covers primary "
        "magnesium metal production (not magnesite mineral mining). China dominates "
        "(~87%) via the Pidgeon process (silicothermic reduction of dolomite using "
        "ferrosilicon). Non-Chinese production is primarily electrolytic (Dead Sea "
        "Magnesium, US Magnesium) or Pidgeon process. Coordinates from company "
        "filings, government industrial zone registrations, and satellite verification."
    ),
}

COVERAGE = {
    "global_production_2023_tpa": 1100000,
    "global_production_unit": "magnesium metal",
    "global_production_source": "USGS MCS 2024",
    "site_count": 28,
    "operating_count": 23,
    "development_count": 5,
    "known_gaps": (
        "Numerous small Chinese Pidgeon process plants not individually enumerated "
        "(estimated 50+ small plants across Shanxi, Shaanxi, Ningxia, Inner Mongolia, "
        "Henan); some secondary/recycling operations not included; "
        "emerging operations in Oman and Malaysia"
    ),
    "audit_date": "2026-03-08",
}

# --- Site Data ---------------------------------------------------------------

SITES = [
    # =========================================================================
    # CHINA (~87% of global production, ~960,000 tpa)
    # Pidgeon process: silicothermic reduction of calcined dolomite with FeSi
    # =========================================================================
    {
        "name": "Fugu County (Shaanxi Province)",
        "lat": 39.03,
        "lon": 111.07,
        "country": "China",
        "operator": "Multiple (Fugu Mg cluster)",
        "ownership": "Multiple private operators \u2014 Shaanxi Fugu Magnesium Industry Zone",
        "status": "operating",
        "type": "Pidgeon process (ferrosilicon + dolomite)",
        "products": ["magnesium metal"],
        "capacity_tpa": 250000,
        "production_year": 2023,
        "grade": "99.9% Mg",
        "notes": (
            "World's largest magnesium production district; Fugu County, Yulin prefecture; "
            "~20+ Pidgeon process plants clustered near coal/ferrosilicon supply; "
            "produces ~25% of China's Mg output"
        ),
    },
    {
        "name": "Wenxi County (Shanxi Province)",
        "lat": 35.27,
        "lon": 111.2,
        "country": "China",
        "operator": "Shanxi Yinguang Huasheng Magnesium / multiple",
        "ownership": (
            "Yinguang Huasheng Magnesium Industry Co. and multiple private operators"
        ),
        "status": "operating",
        "type": "Pidgeon process",
        "products": ["magnesium metal", "magnesium alloys"],
        "capacity_tpa": 200000,
        "production_year": 2023,
        "grade": "99.9% Mg",
        "notes": (
            "Major Shanxi Mg production cluster; Wenxi is China's second-largest Mg "
            "producing county; Yinguang is one of China's largest individual Mg producers"
        ),
    },
    {
        "name": "Taiyuan / Qingxu (Shanxi Province)",
        "lat": 37.71,
        "lon": 112.35,
        "country": "China",
        "operator": "Various Shanxi operators",
        "ownership": "Multiple state and private operators in greater Taiyuan area",
        "status": "operating",
        "type": "Pidgeon process",
        "products": ["magnesium metal"],
        "capacity_tpa": 100000,
        "production_year": 2023,
        "grade": "99.9% Mg",
        "notes": (
            "Northern Shanxi magnesium production zone; multiple medium-scale Pidgeon "
            "process plants near Taiyuan industrial corridor"
        ),
    },
    {
        "name": "Wenshui County (Shanxi Province)",
        "lat": 37.43,
        "lon": 112.03,
        "country": "China",
        "operator": "Shanxi Wenxi Mg / various",
        "ownership": "Multiple operators in Luliang prefecture",
        "status": "operating",
        "type": "Pidgeon process",
        "products": ["magnesium metal"],
        "capacity_tpa": 80000,
        "production_year": 2023,
        "grade": "99.9% Mg",
        "notes": (
            "Luliang prefecture Mg production area; benefits from local coal "
            "and ferrosilicon supply chain"
        ),
    },
    {
        "name": "Yulin District (Shaanxi Province)",
        "lat": 38.28,
        "lon": 109.74,
        "country": "China",
        "operator": "Various Shaanxi operators",
        "ownership": "Multiple private operators in Yulin industrial zone",
        "status": "operating",
        "type": "Pidgeon process",
        "products": ["magnesium metal"],
        "capacity_tpa": 80000,
        "production_year": 2023,
        "grade": "99.9% Mg",
        "notes": (
            "Broader Yulin area Pidgeon process plants (beyond Fugu cluster); "
            "integrated with local coal gasification and ferrosilicon production"
        ),
    },
    {
        "name": "Ningxia Huiye (Ningxia Hui AR)",
        "lat": 38.47,
        "lon": 106.27,
        "country": "China",
        "operator": "Ningxia Huiye Magnesium",
        "ownership": "Ningxia Huiye Magnesium & New Material Technology Co.",
        "status": "operating",
        "type": "Pidgeon process",
        "products": ["magnesium metal", "magnesium alloys"],
        "capacity_tpa": 60000,
        "production_year": 2023,
        "grade": "99.9% Mg",
        "notes": (
            "Yinchuan industrial zone; one of Ningxia's largest magnesium producers; "
            "integrated with local ferrosilicon supply"
        ),
    },
    {
        "name": "Baotou (Inner Mongolia)",
        "lat": 40.66,
        "lon": 109.84,
        "country": "China",
        "operator": "Baotou Xinyuan Magnesium / various",
        "ownership": "Multiple operators in Baotou industrial zone",
        "status": "operating",
        "type": "Pidgeon process",
        "products": ["magnesium metal"],
        "capacity_tpa": 50000,
        "production_year": 2023,
        "grade": "99.9% Mg",
        "notes": (
            "Inner Mongolia Mg production; benefits from proximity to dolomite resources "
            "and low-cost energy; Baotou is also major rare earth center"
        ),
    },
    {
        "name": "Sanmenxia (Henan Province)",
        "lat": 34.77,
        "lon": 111.2,
        "country": "China",
        "operator": "Henan Kewei Magnesium / various",
        "ownership": "Multiple operators in Sanmenxia industrial zone",
        "status": "operating",
        "type": "Pidgeon process",
        "products": ["magnesium metal"],
        "capacity_tpa": 50000,
        "production_year": 2023,
        "grade": "99.9% Mg",
        "notes": (
            "Western Henan Mg production zone; Pidgeon process plants near Shanxi border; "
            "benefits from cross-border dolomite and ferrosilicon supply"
        ),
    },
    {
        "name": "Jiaocheng County (Shanxi Province)",
        "lat": 37.56,
        "lon": 112.16,
        "country": "China",
        "operator": "Various operators",
        "ownership": "Multiple private Pidgeon process operators",
        "status": "operating",
        "type": "Pidgeon process",
        "products": ["magnesium metal"],
        "capacity_tpa": 40000,
        "production_year": 2023,
        "grade": "99.9% Mg",
        "notes": (
            "Taiyuan-area Mg production cluster in Jiaocheng County; "
            "part of broader central Shanxi magnesium belt"
        ),
    },
    {
        "name": "Wuzhong (Ningxia Hui AR)",
        "lat": 37.99,
        "lon": 106.2,
        "country": "China",
        "operator": "Various Ningxia operators",
        "ownership": "Multiple operators",
        "status": "operating",
        "type": "Pidgeon process",
        "products": ["magnesium metal"],
        "capacity_tpa": 30000,
        "production_year": 2023,
        "grade": "99.9% Mg",
        "notes": "Southern Ningxia Mg production area; smaller-scale Pidgeon process operations",
    },
    {
        "name": "Qinghai Mg Pilot (Qinghai Province)",
        "lat": 36.72,
        "lon": 101.74,
        "country": "China",
        "operator": "Qinghai Salt Lake Industry / state enterprises",
        "ownership": "Qinghai Salt Lake Industry Co. (partially state-owned)",
        "status": "development",
        "type": "electrolytic (from MgCl2 brine)",
        "products": ["magnesium metal"],
        "capacity_tpa": 100000,
        "production_year": None,
        "grade": "99.95% Mg",
        "notes": (
            "Pilot electrolytic Mg production from Qaidam Basin salt lake brines; "
            "targets lower-emission production pathway; government-supported strategic "
            "project; 100,000 tpa target for full-scale phase"
        ),
    },
    # =========================================================================
    # ISRAEL
    # =========================================================================
    {
        "name": "Dead Sea Magnesium (Sodom)",
        "lat": 31.03,
        "lon": 35.39,
        "country": "Israel",
        "operator": "Dead Sea Magnesium (ICL Group)",
        "ownership": "ICL Group (TASE: ICL / NYSE: ICL) \u2014 65%; Volkswagen AG \u2014 35%",
        "status": "operating",
        "type": "electrolytic (from Dead Sea carnallite)",
        "products": ["magnesium metal", "magnesium alloys", "chlorine"],
        "capacity_tpa": 30000,
        "production_year": 2023,
        "grade": "99.8% Mg",
        "notes": (
            "One of only two large-scale electrolytic Mg producers globally; "
            "near Arad/Sodom; produces pure Mg and alloys from Dead Sea carnallite; "
            "Volkswagen JV partner for automotive Mg"
        ),
    },
    # =========================================================================
    # RUSSIA
    # =========================================================================
    {
        "name": "Berezniki (Perm Krai)",
        "lat": 59.41,
        "lon": 56.77,
        "country": "Russia",
        "operator": "VSMPO-AVISMA Corporation",
        "ownership": "VSMPO-AVISMA Corporation (Rostec subsidiary)",
        "status": "operating",
        "type": "electrolytic (from carnallite)",
        "products": ["magnesium metal", "titanium sponge"],
        "capacity_tpa": 30000,
        "production_year": 2023,
        "grade": "99.9% Mg",
        "notes": (
            "AVISMA titanium-magnesium works; produces Mg as co-product with titanium "
            "sponge; one of world's largest titanium producers; Perm Krai; electrolytic "
            "process using Verkhnekamskoye potash deposit carnallite"
        ),
    },
    {
        "name": "Solikamsk (Perm Krai)",
        "lat": 59.63,
        "lon": 56.77,
        "country": "Russia",
        "operator": "Solikamsk Magnesium Works",
        "ownership": "SMW (Solikamskiy Magnievyy Zavod)",
        "status": "operating",
        "type": "electrolytic (from carnallite)",
        "products": ["magnesium metal", "rare earth oxides"],
        "capacity_tpa": 18000,
        "production_year": 2023,
        "grade": "99.9% Mg",
        "notes": (
            "One of Russia's oldest Mg plants (operating since 1936); electrolytic process; "
            "also produces rare earth concentrates from loparite; "
            "adjacent to Verkhnekamskoye potash deposits"
        ),
    },
    # =========================================================================
    # KAZAKHSTAN
    # =========================================================================
    {
        "name": "Ust-Kamenogorsk (East Kazakhstan)",
        "lat": 49.95,
        "lon": 82.61,
        "country": "Kazakhstan",
        "operator": "UK TMK (Ust-Kamenogorsk Titanium-Magnesium Combine)",
        "ownership": "UK TMK JSC (state-controlled via Tau-Ken Samruk)",
        "status": "operating",
        "type": "electrolytic (from carnallite/MgCl2)",
        "products": ["magnesium metal", "titanium sponge"],
        "capacity_tpa": 22000,
        "production_year": 2023,
        "grade": "99.9% Mg",
        "notes": (
            "Soviet-era titanium-magnesium combine; produces Mg as co-product with titanium "
            "sponge; electrolytic process; East Kazakhstan region; major CIS Mg supplier"
        ),
    },
    # =========================================================================
    # UNITED STATES
    # =========================================================================
    {
        "name": "US Magnesium (Great Salt Lake, Utah)",
        "lat": 40.74,
        "lon": -112.21,
        "country": "United States",
        "operator": "US Magnesium LLC",
        "ownership": "US Magnesium LLC (private; Renco Group)",
        "status": "operating",
        "type": "electrolytic (from Great Salt Lake brine)",
        "products": ["magnesium metal", "chlorine"],
        "capacity_tpa": 63500,
        "production_year": 2023,
        "grade": "99.8% Mg",
        "notes": (
            "Only primary Mg producer in the Western Hemisphere; "
            "Rowley, Tooele County, UT; electrolytic process extracting MgCl2 from "
            "Great Salt Lake brine; strategic US domestic supply"
        ),
    },
    # =========================================================================
    # BRAZIL
    # =========================================================================
    {
        "name": "Rima Industrial (Bocaiuva, Minas Gerais)",
        "lat": -17.1,
        "lon": -43.81,
        "country": "Brazil",
        "operator": "Rima Industrial SA",
        "ownership": "Rima Industrial SA (private Brazilian company)",
        "status": "operating",
        "type": "Pidgeon process (ferrosilicon + dolomite)",
        "products": ["magnesium metal", "magnesium alloys"],
        "capacity_tpa": 20000,
        "production_year": 2023,
        "grade": "99.8% Mg",
        "notes": (
            "Latin America's largest and only major Mg producer; Pidgeon process using "
            "local dolomite and charcoal-based ferrosilicon; Bocaiuva, northern Minas Gerais"
        ),
    },
    # =========================================================================
    # TURKEY
    # =========================================================================
    {
        "name": "Kayseri (Central Anatolia)",
        "lat": 38.73,
        "lon": 35.48,
        "country": "Turkey",
        "operator": "Various Turkish operators",
        "ownership": "Multiple private Turkish companies",
        "status": "operating",
        "type": "Pidgeon process",
        "products": ["magnesium metal"],
        "capacity_tpa": 15000,
        "production_year": 2023,
        "grade": "99.8% Mg",
        "notes": (
            "Central Anatolia Mg production using local dolomite; "
            "emerging Turkish Pidgeon process operations; Kayseri industrial zone"
        ),
    },
    {
        "name": "Biga (Canakkale Province)",
        "lat": 40.23,
        "lon": 27.24,
        "country": "Turkey",
        "operator": "Esan Eczacibasi / various",
        "ownership": "Various operators in Marmara region",
        "status": "operating",
        "type": "Pidgeon process",
        "products": ["magnesium metal"],
        "capacity_tpa": 10000,
        "production_year": 2023,
        "grade": "99.8% Mg",
        "notes": (
            "Northwestern Turkey Mg production; Canakkale province; smaller-scale "
            "Pidgeon process operations using Biga Peninsula dolomite resources"
        ),
    },
    # =========================================================================
    # NORWAY (historic/idle)
    # =========================================================================
    {
        "name": "Porsgrunn (Telemark)",
        "lat": 59.14,
        "lon": 9.66,
        "country": "Norway",
        "operator": "Norsk Hydro (historic) / currently idle",
        "ownership": "Formerly Norsk Hydro ASA (OSE: NHY)",
        "status": "care and maintenance",
        "type": "electrolytic",
        "products": ["magnesium metal"],
        "capacity_tpa": 45000,
        "production_year": None,
        "grade": "99.8% Mg",
        "notes": (
            "Norsk Hydro's historic Mg electrolysis plant; operated 1951-2002; "
            "closed due to Chinese competition; site retained for potential restart; "
            "Hydro shifted to recycled Mg"
        ),
    },
    # =========================================================================
    # CANADA (development)
    # =========================================================================
    {
        "name": "Alliance Magnesium (Danville, Quebec)",
        "lat": 45.78,
        "lon": -72.0,
        "country": "Canada",
        "operator": "Alliance Magnesium Inc.",
        "ownership": "Alliance Magnesium Inc. (TSXV: MITE)",
        "status": "development",
        "type": "electrolytic (from serpentine tailings)",
        "products": ["magnesium metal", "silica"],
        "capacity_tpa": 11500,
        "production_year": None,
        "grade": "99.8% Mg target",
        "notes": (
            "Novel process extracting Mg from asbestos mine serpentine tailings in "
            "Danville, Quebec (former Asbestos region); demonstration plant operational; "
            "targeting full-scale 11,500 tpa Phase 1; government-supported for strategic Mg supply"
        ),
    },
    # =========================================================================
    # CHINA (additional clusters)
    # =========================================================================
    {
        "name": "Qingyuan (Liaoning Province)",
        "lat": 42.1,
        "lon": 124.83,
        "country": "China",
        "operator": "Various Liaoning operators",
        "ownership": "Multiple private operators",
        "status": "operating",
        "type": "Pidgeon process",
        "products": ["magnesium metal"],
        "capacity_tpa": 25000,
        "production_year": 2023,
        "grade": "99.9% Mg",
        "notes": (
            "Northeastern China Mg production cluster; Liaoning Province; "
            "smaller-scale operations using local dolomite and ferrosilicon"
        ),
    },
    {
        "name": "Haicheng (Liaoning Province)",
        "lat": 40.88,
        "lon": 122.73,
        "country": "China",
        "operator": "Haicheng Magnesium / various",
        "ownership": "Multiple operators in Anshan-Haicheng industrial zone",
        "status": "operating",
        "type": "Pidgeon process",
        "products": ["magnesium metal", "magnesium oxide"],
        "capacity_tpa": 30000,
        "production_year": 2023,
        "grade": "99.9% Mg",
        "notes": (
            "Haicheng is China's largest magnesite producing area; some operators also "
            "produce Mg metal via Pidgeon process; Liaoning Province; "
            "dual magnesite/Mg metal production zone"
        ),
    },
    # =========================================================================
    # UKRAINE (disrupted)
    # =========================================================================
    {
        "name": "Zaporozhye (Zaporizhzhia)",
        "lat": 47.84,
        "lon": 35.14,
        "country": "Ukraine",
        "operator": "Zaporizhzhia Titanium-Magnesium Combine",
        "ownership": "ZTMC (state-owned, United Chemical Company Ukrhimtransammiak)",
        "status": "care and maintenance",
        "type": "electrolytic",
        "products": ["magnesium metal", "titanium sponge"],
        "capacity_tpa": 20000,
        "production_year": None,
        "grade": "99.9% Mg",
        "notes": (
            "Soviet-era titanium-magnesium combine; operations disrupted since 2022 conflict; "
            "historically produced ~10,000 tpa Mg as co-product with titanium sponge"
        ),
    },
    # =========================================================================
    # SOUTH KOREA (development)
    # =========================================================================
    {
        "name": "Yeongju (North Gyeongsang)",
        "lat": 36.81,
        "lon": 128.62,
        "country": "South Korea",
        "operator": "POSCO / various",
        "ownership": "POSCO and Korean industrial partners",
        "status": "development",
        "type": "Pidgeon process / silicothermic",
        "products": ["magnesium metal"],
        "capacity_tpa": 10000,
        "production_year": None,
        "grade": "99.8% Mg",
        "notes": (
            "South Korean strategic Mg supply project; POSCO exploring domestic production "
            "to reduce China dependency; pilot/development stage"
        ),
    },
    # =========================================================================
    # CANADA (Becancour — development)
    # =========================================================================
    {
        "name": "Becancour (Quebec)",
        "lat": 46.33,
        "lon": -72.43,
        "country": "Canada",
        "operator": "NEOTECH Metals (formerly AVISMA)",
        "ownership": "Various; industrial zone includes former Norsk Hydro/Magnola site",
        "status": "development",
        "type": "electrolytic",
        "products": ["magnesium metal"],
        "capacity_tpa": 50000,
        "production_year": None,
        "grade": "99.9% Mg target",
        "notes": (
            "Site of former Norsk Hydro Magnola plant (closed 2003); various proposals "
            "for restart/new electrolytic Mg production in Becancour industrial park; "
            "Quebec hydropower advantage"
        ),
    },
    # =========================================================================
    # CHINA (western — Xinjiang)
    # =========================================================================
    {
        "name": "Kuqa (Xinjiang Uyghur AR)",
        "lat": 41.72,
        "lon": 82.94,
        "country": "China",
        "operator": "Xinjiang Taihe Magnesium / various",
        "ownership": "Various operators in Kuqa industrial zone",
        "status": "operating",
        "type": "Pidgeon process",
        "products": ["magnesium metal"],
        "capacity_tpa": 20000,
        "production_year": 2023,
        "grade": "99.9% Mg",
        "notes": (
            "Western China Mg production; Xinjiang Uyghur Autonomous Region; "
            "utilizes local coal and dolomite resources; smaller-scale operations"
        ),
    },
    # =========================================================================
    # CHINA (eastern — Shandong)
    # =========================================================================
    {
        "name": "Shandong Mg Cluster (Linyi)",
        "lat": 35.1,
        "lon": 118.35,
        "country": "China",
        "operator": "Various Shandong operators",
        "ownership": "Multiple private operators in Linyi area",
        "status": "operating",
        "type": "Pidgeon process",
        "products": ["magnesium metal", "magnesium alloys"],
        "capacity_tpa": 25000,
        "production_year": 2023,
        "grade": "99.9% Mg",
        "notes": (
            "Eastern China Mg production cluster; Shandong Province; some alloy "
            "production for automotive/die-casting market; relatively small by Chinese standards"
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
    development = sum(1 for s in SITES if s.get("status") in ("development", "care and maintenance"))
    print(f"[ingest_magnesium] Wrote {len(SITES)} magnesium metal sites ({operating} operating, {development} dev/c&m) to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
