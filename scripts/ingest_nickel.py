#!/usr/bin/env python3
"""
Ingest nickel mining, smelting, and refining sites into Panopticon format.

Primary sources:
  - USGS Mineral Commodity Summaries 2024, Nickel chapter
    https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-nickel.pdf
  - USGS Mineral Resources Data System (MRDS)
    https://mrdata.usgs.gov/mrds/
  - S&P Global Market Intelligence mine profiles
  - Indonesian ESDM (Ministry of Energy and Mineral Resources) nickel production data
  - Company annual reports and filings:
    * Nornickel Annual Report 2023
    * Vale S.A. Production Report 2023
    * BHP Operational Review 2023
    * First Quantum Minerals Annual Report 2023
    * Glencore Annual Report 2023
    * Nickel Asia Corp. Annual Report 2023
    * Sherritt International Annual Report 2023
    * Eramet Annual Report 2023
    * South32 Annual Report 2023
    * IGO Limited Annual Report 2023
    * Boliden Annual Report 2023
    * Anglo American Production Report 2023
    * Lifezone Metals / Kabanga Nickel NI 43-101 Technical Report
    * African Rainbow Minerals Annual Report 2023
    * Sandfire Resources Annual Report 2023

Since USGS MCS is published as PDF and company data comes from annual reports,
this script embeds curated site data rather than downloading from an API.
Coordinates sourced from USGS MRDS, company filings, and ESDM ministry records.

Usage:
    python3 scripts/ingest_nickel.py

Output:
    data/layers/points/nickel.json
"""

import json
import pathlib

# Repository root (one level up from scripts/)
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "data" / "layers" / "points" / "nickel.json"

SOURCE_METADATA = {
    "description": "Major global nickel mining, smelting, and refining sites",
    "origin": (
        "USGS Mineral Commodity Summaries 2024 "
        "(https://pubs.usgs.gov/periodicals/mcs2024/); "
        "USGS Mineral Resources Data System "
        "(https://mrdata.usgs.gov/mrds/); "
        "S&P Global Market Intelligence mine database; "
        "Indonesian ESDM ministry nickel production data; "
        "Company annual reports: Nornickel, Vale, BHP, Glencore, "
        "Nickel Asia, First Quantum, Eramet, South32, IGO Ltd, "
        "Boliden, Anglo American"
    ),
    "retrieved": "2026-03-08",
    "license": "USGS: public domain; company data: fair use summary",
    "notes": (
        "Major nickel operations globally covering mining, smelting, and "
        "refining. Indonesia is world's largest producer (~50% of global "
        "output). Coordinates from USGS MRDS, company filings, and ESDM "
        "ministry records. Capacity figures are nickel metal equivalent "
        "tpa — nameplate or most recent reported annual production "
        "capability. Norilsk/Talnakh split to avoid double-counting "
        "(total Nornickel Norilsk Division ~175k tpa; Talnakh mines ~130k, "
        "Norilsk smelter/refinery ~45k). Weda Bay adjusted to ~80k tpa Ni "
        "(HPAL + RKEF, ramping). Development project capacities reflect "
        "feasibility study or PEA targets."
    ),
}

SITES = [
    # =========================================================================
    # INDONESIA (world's #1 producer, ~50% of global output)
    # =========================================================================
    {
        "name": "Sorowako",
        "lat": -2.53,
        "lon": 121.34,
        "country": "Indonesia",
        "operator": "PT Vale Indonesia",
        "ownership": "Vale (43.8%), Indonesian govt interests",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel", "nickel matte"],
        "capacity_tpa": 75000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 1.7-1.8% Ni",
        "notes": (
            "One of Indonesia's oldest nickel operations, producing nickel "
            "matte since 1968. Located on Lake Matano, Sulawesi."
        ),
    },
    {
        "name": "Weda Bay",
        "lat": 0.35,
        "lon": 127.95,
        "country": "Indonesia",
        "operator": "Weda Bay Nickel (Tsingshan/Eramet JV)",
        "ownership": "Tsingshan (56.6%), Eramet (38.7%)",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel", "NPI", "mixed hydroxide precipitate"],
        "capacity_tpa": 80000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 1.3-1.5% Ni",
        "notes": (
            "Major HPAL and NPI complex on Halmahera island. One of the "
            "world's largest laterite deposits with ~4.7 Bt ore resource. "
            "Capacity ~80k tpa Ni metal equivalent from HPAL + RKEF lines "
            "(ramping up)."
        ),
    },
    {
        "name": "Morowali IMIP",
        "lat": -2.02,
        "lon": 121.63,
        "country": "Indonesia",
        "operator": "Indonesia Morowali Industrial Park (Tsingshan-led)",
        "ownership": "Tsingshan Holding Group consortium",
        "status": "operating",
        "type": "integrated industrial park",
        "products": ["nickel pig iron", "stainless steel", "battery-grade nickel"],
        "capacity_tpa": 200000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 1.2-1.8% Ni",
        "notes": (
            "Massive industrial nickel park with multiple smelters and HPAL "
            "plants. Transformed Indonesia into the world's dominant NPI producer."
        ),
    },
    {
        "name": "Pomalaa",
        "lat": -4.18,
        "lon": 121.62,
        "country": "Indonesia",
        "operator": "PT Aneka Tambang (ANTAM)",
        "ownership": "ANTAM (Indonesian state-owned, 65% govt)",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel", "ferronickel"],
        "capacity_tpa": 27000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 1.8-2.0% Ni",
        "notes": (
            "ANTAM's flagship ferronickel smelter in Southeast Sulawesi. One "
            "of Indonesia's longest-running nickel operations, producing "
            "ferronickel since 1976."
        ),
    },
    {
        "name": "Obi Island",
        "lat": -1.55,
        "lon": 127.75,
        "country": "Indonesia",
        "operator": "PT Trimegah Bangun Persada (Harita Nickel)",
        "ownership": "Harita Group",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel", "mixed hydroxide precipitate"],
        "capacity_tpa": 60000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 1.0-1.4% Ni",
        "notes": (
            "HPAL operation on Obi Island, North Maluku. Harita Nickel is one "
            "of Indonesia's fastest-growing nickel producers, supplying "
            "battery-grade MHP."
        ),
    },
    {
        "name": "Konawe IWIP",
        "lat": -3.55,
        "lon": 122.15,
        "country": "Indonesia",
        "operator": "Indonesia Weda Bay Industrial Park (VDNI/Tsingshan)",
        "ownership": "Virtue Dragon Nickel Industry (VDNI), Tsingshan consortium",
        "status": "operating",
        "type": "integrated industrial park",
        "products": ["nickel pig iron", "stainless steel"],
        "capacity_tpa": 150000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 1.2-1.6% Ni",
        "notes": (
            "Large NPI industrial park in Southeast Sulawesi. Multiple RKEF "
            "smelter lines operated by Chinese-Indonesian joint ventures."
        ),
    },
    {
        "name": "Bantaeng",
        "lat": -5.53,
        "lon": 119.97,
        "country": "Indonesia",
        "operator": "PT Huadi Nickel-Alloy Indonesia",
        "ownership": "Fujian Huadi Steel (China)",
        "status": "operating",
        "type": "smelter",
        "products": ["nickel pig iron", "stainless steel"],
        "capacity_tpa": 50000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": None,
        "notes": (
            "NPI smelter in South Sulawesi. Processes laterite ore from "
            "various Southeast Sulawesi mining operations."
        ),
    },
    {
        "name": "Kolaka",
        "lat": -4.06,
        "lon": 121.59,
        "country": "Indonesia",
        "operator": "Various (multiple IUP holders)",
        "ownership": "Multiple Indonesian and Chinese-Indonesian JVs",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel ore", "nickel pig iron"],
        "capacity_tpa": 30000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 1.2-1.8% Ni",
        "notes": (
            "Major nickel mining district in Southeast Sulawesi with numerous "
            "operating mines. Key ore supply zone for nearby smelters. "
            "Aggregate estimate across multiple small IUP holders producing NPI."
        ),
    },
    {
        "name": "South Halmahera",
        "lat": -0.65,
        "lon": 127.4,
        "country": "Indonesia",
        "operator": "Multiple operators",
        "ownership": "Various (PT IWIP, local IUP holders)",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel ore", "nickel pig iron", "mixed hydroxide precipitate"],
        "capacity_tpa": 40000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 1.0-1.5% Ni",
        "notes": (
            "Cluster of nickel mining and processing operations on southern "
            "Halmahera. Multiple RKEF and HPAL facilities under development "
            "or recently commissioned. Aggregate estimate across multiple "
            "laterite operations."
        ),
    },
    # =========================================================================
    # RUSSIA
    # =========================================================================
    {
        "name": "Norilsk",
        "lat": 69.35,
        "lon": 88.19,
        "country": "Russia",
        "operator": "Nornickel (MMC Norilsk Nickel)",
        "ownership": (
            "Nornickel (publicly traded, Potanin/Deripaska major shareholders)"
        ),
        "status": "operating",
        "type": "smelter/refinery",
        "products": ["nickel", "copper", "palladium", "platinum", "cobalt"],
        "capacity_tpa": 45000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "massive sulfide, 1.5-3.5% Ni",
        "notes": (
            "Nornickel's Norilsk smelter/refinery complex processes ore from "
            "Talnakh mines. Capacity here reflects the Norilsk Nickel Plant "
            "refined output (~45k tpa Ni); the bulk of Nornickel's Norilsk "
            "Division mine capacity (~130k tpa Ni) is attributed to Talnakh. "
            "Total Nornickel Norilsk Division: ~175k tpa Ni. Operates in "
            "Arctic conditions."
        ),
    },
    {
        "name": "Talnakh",
        "lat": 69.5,
        "lon": 88.5,
        "country": "Russia",
        "operator": "Nornickel (MMC Norilsk Nickel)",
        "ownership": "Nornickel",
        "status": "operating",
        "type": "underground",
        "products": ["nickel", "copper", "PGMs", "cobalt"],
        "capacity_tpa": 130000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "massive sulfide, 2.0-4.0% Ni",
        "notes": (
            "Underground Cu-Ni-PGM mining complex north of Norilsk. Includes "
            "Oktyabrsky and Taimyrsky mines. Contains some of the highest-grade "
            "Ni-Cu-PGM ores in the world. Primary mine capacity for Nornickel's "
            "Norilsk Division (~130k tpa Ni from Talnakh/Oktyabrsky mines)."
        ),
    },
    {
        "name": "Pechenga",
        "lat": 69.24,
        "lon": 30.26,
        "country": "Russia",
        "operator": "Nornickel (Kola MMC subsidiary)",
        "ownership": "Nornickel",
        "status": "operating",
        "type": "underground",
        "products": ["nickel", "copper", "cobalt"],
        "capacity_tpa": 40000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "sulfide, 0.8-1.5% Ni",
        "notes": (
            "Underground Ni-Cu mining complex on the Kola Peninsula near the "
            "Finnish and Norwegian borders. Includes Zhdanov and Zapolyarny "
            "mines with smelting at Monchegorsk."
        ),
    },
    {
        "name": "Buruktal",
        "lat": 51.7,
        "lon": 58.4,
        "country": "Russia",
        "operator": "Yuzhuralnickel (Mechel subsidiary)",
        "ownership": "Mechel PAO",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel", "ferronickel"],
        "capacity_tpa": 12000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 0.7-1.0% Ni",
        "notes": (
            "Ferronickel operation in the Southern Urals, Orenburg Oblast. "
            "One of Russia's few laterite nickel operations, processing "
            "oxidized ores."
        ),
    },
    # =========================================================================
    # CANADA
    # =========================================================================
    {
        "name": "Sudbury Basin",
        "lat": 46.49,
        "lon": -81.01,
        "country": "Canada",
        "operator": "Vale Canada (formerly Inco)",
        "ownership": "Vale S.A.",
        "status": "operating",
        "type": "underground",
        "products": ["nickel", "copper", "cobalt", "PGMs", "gold", "silver"],
        "capacity_tpa": 85000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "sulfide, 1.2-2.0% Ni",
        "notes": (
            "World's second-largest nickel deposit formed by a 1.85-billion-"
            "year-old meteorite impact. Multiple underground mines including "
            "Creighton and Coleman."
        ),
    },
    {
        "name": "Thompson",
        "lat": 55.74,
        "lon": -97.86,
        "country": "Canada",
        "operator": "Vale Canada",
        "ownership": "Vale S.A.",
        "status": "operating",
        "type": "underground",
        "products": ["nickel", "copper", "cobalt"],
        "capacity_tpa": 25000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "sulfide, 1.5-2.5% Ni",
        "notes": (
            "Located on the Thompson Nickel Belt in northern Manitoba. "
            "Includes multiple underground mines and a smelter/refinery complex."
        ),
    },
    {
        "name": "Raglan",
        "lat": 61.68,
        "lon": -73.63,
        "country": "Canada",
        "operator": "Glencore Canada (formerly Xstrata/Falconbridge)",
        "ownership": "Glencore plc",
        "status": "operating",
        "type": "underground",
        "products": ["nickel", "copper", "cobalt", "PGMs"],
        "capacity_tpa": 40000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "sulfide, 2.7-3.0% Ni",
        "notes": (
            "High-grade komatiite-hosted sulfide deposit in Nunavik, northern "
            "Quebec. Remote Arctic fly-in camp operation. Raglan Agreement "
            "with Inuit provides benefits sharing."
        ),
    },
    {
        "name": "Voisey's Bay",
        "lat": 56.33,
        "lon": -62.09,
        "country": "Canada",
        "operator": "Vale Canada",
        "ownership": "Vale S.A.",
        "status": "operating",
        "type": "open-pit and underground",
        "products": ["nickel", "copper", "cobalt"],
        "capacity_tpa": 45000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "sulfide, 1.6-2.9% Ni",
        "notes": (
            "Major Ni-Cu-Co sulfide deposit in Labrador. Open-pit mining "
            "completed; transitioned to underground (Reid Brook and Eastern "
            "Deeps). Concentrate processed at Long Harbour hydromet plant."
        ),
    },
    {
        "name": "Dumont",
        "lat": 48.8,
        "lon": -78.45,
        "country": "Canada",
        "operator": "Waterton Global Resource Management / Magneto Investments",
        "ownership": "Waterton / Magneto JV",
        "status": "development",
        "type": "open-pit",
        "products": ["nickel", "cobalt"],
        "capacity_tpa": 33000,
        "production_year": None,
        "reserves_mt": 6.9,
        "grade": "sulfide, 0.27% Ni",
        "notes": (
            "One of the world's largest undeveloped nickel sulfide deposits "
            "in Abitibi, Quebec. Large tonnage, low grade. Feasibility study "
            "target capacity of ~33k tpa Ni."
        ),
    },
    {
        "name": "Turnagain",
        "lat": 58.4,
        "lon": -128.8,
        "country": "Canada",
        "operator": "Giga Metals Corp.",
        "ownership": "Giga Metals Corp.",
        "status": "development",
        "type": "open-pit",
        "products": ["nickel", "cobalt"],
        "capacity_tpa": 40000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "sulfide, 0.21% Ni",
        "notes": (
            "Large undeveloped nickel-cobalt sulfide deposit in northern "
            "British Columbia. PEA target capacity of ~40k tpa Ni. "
            "Positioned as a future battery metals supply source."
        ),
    },
    # =========================================================================
    # AUSTRALIA
    # =========================================================================
    {
        "name": "Mt Keith",
        "lat": -27.23,
        "lon": 120.55,
        "country": "Australia",
        "operator": "BHP Nickel West",
        "ownership": "BHP Group",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel", "nickel concentrate"],
        "capacity_tpa": 45000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "disseminated sulfide, 0.52% Ni",
        "notes": (
            "World's largest known disseminated nickel sulfide deposit. Part "
            "of BHP Nickel West integrated supply chain feeding Kwinana refinery."
        ),
    },
    {
        "name": "Leinster",
        "lat": -28.01,
        "lon": 120.7,
        "country": "Australia",
        "operator": "BHP Nickel West",
        "ownership": "BHP Group",
        "status": "operating",
        "type": "underground",
        "products": ["nickel", "nickel concentrate"],
        "capacity_tpa": 35000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "sulfide, 1.5-2.5% Ni",
        "notes": (
            "Underground nickel sulfide operation in WA's Goldfields. Includes "
            "multiple ore sources (Perseverance, Harmony, Rocky's Reward). "
            "Feeds BHP's Kwinana refinery."
        ),
    },
    {
        "name": "Kambalda",
        "lat": -31.2,
        "lon": 121.67,
        "country": "Australia",
        "operator": "Various (BHP legacy district)",
        "ownership": "Multiple (Mincor, BHP, others)",
        "status": "operating",
        "type": "underground",
        "products": ["nickel", "nickel concentrate"],
        "capacity_tpa": 15000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "sulfide, 2.0-4.0% Ni",
        "notes": (
            "Historic nickel sulfide district in WA, where Australia's nickel "
            "industry began in 1966 (Western Mining Corp). Komatiite-hosted "
            "deposits. Multiple small underground mines."
        ),
    },
    {
        "name": "Nova-Bollinger",
        "lat": -31.82,
        "lon": 123.19,
        "country": "Australia",
        "operator": "IGO Limited",
        "ownership": "IGO Limited",
        "status": "operating",
        "type": "underground",
        "products": ["nickel", "copper", "cobalt"],
        "capacity_tpa": 28000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "sulfide, 1.8-2.2% Ni",
        "notes": (
            "Underground Ni-Cu-Co sulfide mine in the Fraser Range, WA. "
            "Discovered 2012 by Sirius Resources. IGO's flagship nickel "
            "operation."
        ),
    },
    {
        "name": "Cosmos",
        "lat": -27.0,
        "lon": 120.53,
        "country": "Australia",
        "operator": "IGO Limited",
        "ownership": "IGO Limited",
        "status": "care and maintenance",
        "type": "underground",
        "products": ["nickel"],
        "capacity_tpa": 12000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "sulfide, 2.0-3.5% Ni",
        "notes": (
            "Underground nickel sulfide mine in WA's northern Goldfields. "
            "Placed on care and maintenance since 2023 due to low nickel "
            "prices. Significant remaining resource. Capacity reflects "
            "nameplate prior to suspension."
        ),
    },
    {
        "name": "Forrestania",
        "lat": -32.37,
        "lon": 119.81,
        "country": "Australia",
        "operator": "IGO Limited (formerly Western Areas)",
        "ownership": "IGO Limited",
        "status": "care and maintenance",
        "type": "underground",
        "products": ["nickel", "nickel concentrate"],
        "capacity_tpa": 18000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "sulfide, 3.0-5.0% Ni",
        "notes": (
            "Underground nickel sulfide operation including Flying Fox and "
            "Spotted Quoll deposits. High-grade but nearing depletion. "
            "Acquired by IGO from Western Areas in 2022."
        ),
    },
    {
        "name": "Kalgoorlie Nickel Smelter",
        "lat": -30.79,
        "lon": 121.46,
        "country": "Australia",
        "operator": "BHP Nickel West",
        "ownership": "BHP Group",
        "status": "operating",
        "type": "smelter",
        "products": ["nickel matte"],
        "capacity_tpa": 100000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": None,
        "notes": (
            "Flash furnace nickel smelter processing concentrates from BHP "
            "Nickel West mines. Produces nickel matte shipped to Kwinana "
            "refinery for electrolytic refining."
        ),
    },
    {
        "name": "Ravensthorpe",
        "lat": -33.58,
        "lon": 120.05,
        "country": "Australia",
        "operator": "First Quantum Minerals",
        "ownership": "First Quantum Minerals Ltd.",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel", "cobalt", "mixed hydroxide"],
        "capacity_tpa": 28000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 0.8-1.0% Ni",
        "notes": (
            "Laterite operation in Western Australia producing mixed hydroxide "
            "precipitate via atmospheric leach. Previously owned by BHP."
        ),
    },
    # =========================================================================
    # NEW CALEDONIA
    # =========================================================================
    {
        "name": "Goro",
        "lat": -22.27,
        "lon": 166.93,
        "country": "New Caledonia",
        "operator": "Prony Resources",
        "ownership": "Prony Resources (consortium incl. Trafigura)",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel", "cobalt", "nickel hydroxide"],
        "capacity_tpa": 35000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 1.42% Ni",
        "notes": (
            "Large HPAL operation in southern New Caledonia. Formerly Vale NC. "
            "Produces battery-grade nickel and cobalt hydroxide."
        ),
    },
    {
        "name": "Koniambo",
        "lat": -21.0,
        "lon": 164.83,
        "country": "New Caledonia",
        "operator": "Koniambo Nickel SAS",
        "ownership": "Glencore (49%), SMSP/Societe Le Nickel (51%)",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel", "ferronickel"],
        "capacity_tpa": 55000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "saprolite, 2.0-2.5% Ni",
        "notes": (
            "High-grade saprolite deposit on the northwest coast of Grande "
            "Terre. Pyrometallurgical ferronickel smelter."
        ),
    },
    # =========================================================================
    # PHILIPPINES (#2 laterite producer)
    # =========================================================================
    {
        "name": "Surigao",
        "lat": 9.78,
        "lon": 125.5,
        "country": "Philippines",
        "operator": "Nickel Asia Corp. / RRHI",
        "ownership": "Nickel Asia Corp.",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel ore", "laterite"],
        "capacity_tpa": 50000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 1.0-1.8% Ni",
        "notes": (
            "Major nickel laterite mining district on Mindanao's Surigao "
            "peninsula. Primarily exports direct-shipping ore (DSO) to China. "
            "Multiple mine sites operated by Nickel Asia subsidiaries. "
            "Nickel Asia DSO district, major exporter."
        ),
    },
    {
        "name": "Taganito",
        "lat": 9.85,
        "lon": 126.02,
        "country": "Philippines",
        "operator": "Taganito HPAL (Nickel Asia/SMSP/THPAL JV)",
        "ownership": "Nickel Asia Corp., Sumitomo Metal Mining, Mitsui",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel", "cobalt", "mixed sulfide"],
        "capacity_tpa": 36000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 1.0-1.5% Ni",
        "notes": (
            "HPAL operation in Surigao del Norte, Mindanao. The Philippines "
            "is a major nickel ore exporter, primarily to China."
        ),
    },
    {
        "name": "Zambales",
        "lat": 15.67,
        "lon": 120.07,
        "country": "Philippines",
        "operator": "Benguet Corp. / LNL Archipelago Minerals",
        "ownership": "Various (Benguet, LNL Archipelago)",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel ore", "chromite"],
        "capacity_tpa": 15000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 1.0-1.5% Ni",
        "notes": (
            "Nickel laterite and chromite mining district on Luzon. Sta Cruz "
            "mine area. Exports DSO primarily to China. Benguet Corp + LNL, "
            "smaller operations."
        ),
    },
    {
        "name": "Rio Tuba",
        "lat": 8.51,
        "lon": 117.45,
        "country": "Philippines",
        "operator": "Coral Bay Nickel / Rio Tuba Nickel Mining Corp.",
        "ownership": "Nickel Asia Corp., Sumitomo Metal Mining, SMSP",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel", "cobalt", "mixed sulfide"],
        "capacity_tpa": 24000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 1.2-1.5% Ni",
        "notes": (
            "HPAL operation on southern Palawan island. Coral Bay Nickel "
            "produces nickel-cobalt mixed sulfide. One of the Philippines' "
            "downstream processing operations."
        ),
    },
    {
        "name": "Cagdianao",
        "lat": 10.13,
        "lon": 125.63,
        "country": "Philippines",
        "operator": "Cagdianao Mining Corp. (Nickel Asia subsidiary)",
        "ownership": "Nickel Asia Corp.",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel ore"],
        "capacity_tpa": 20000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 1.0-1.5% Ni",
        "notes": (
            "Laterite nickel mine on Dinagat Island, northeastern Mindanao. "
            "Exports DSO. Part of the Nickel Asia group of mines (Nickel "
            "Asia's Dinagat operations)."
        ),
    },
    # =========================================================================
    # CUBA
    # =========================================================================
    {
        "name": "Moa",
        "lat": 20.65,
        "lon": -75.57,
        "country": "Cuba",
        "operator": "Moa Nickel S.A. (Sherritt/Cuban govt JV)",
        "ownership": (
            "Sherritt International (50%), General Nickel Co. of Cuba (50%)"
        ),
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel", "cobalt", "mixed sulfides"],
        "capacity_tpa": 33000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 1.3% Ni",
        "notes": (
            "Acid leach (Caron process) operation in eastern Cuba. Mixed "
            "sulfide intermediates shipped to Sherritt's Fort Saskatchewan "
            "refinery in Alberta."
        ),
    },
    # =========================================================================
    # BRAZIL
    # =========================================================================
    {
        "name": "Onca Puma",
        "lat": -6.57,
        "lon": -51.1,
        "country": "Brazil",
        "operator": "Vale S.A.",
        "ownership": "Vale S.A.",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel", "ferronickel"],
        "capacity_tpa": 54000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 1.6-1.8% Ni",
        "notes": (
            "Large laterite deposit in Para state, Brazilian Amazon. Produces "
            "ferronickel using rotary kiln-electric furnace (RKEF) technology."
        ),
    },
    {
        "name": "Barro Alto",
        "lat": -14.95,
        "lon": -48.98,
        "country": "Brazil",
        "operator": "Anglo American",
        "ownership": "Anglo American plc",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel", "ferronickel"],
        "capacity_tpa": 44000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 1.5-1.7% Ni",
        "notes": (
            "Ferronickel operation in Goias state, central Brazil. Uses RKEF "
            "process. Anglo American's primary nickel producing asset."
        ),
    },
    {
        "name": "Niquelandia",
        "lat": -14.47,
        "lon": -48.45,
        "country": "Brazil",
        "operator": "Anglo American",
        "ownership": "Anglo American plc",
        "status": "care and maintenance",
        "type": "open-pit",
        "products": ["nickel", "ferronickel"],
        "capacity_tpa": 14000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 1.4-1.6% Ni",
        "notes": (
            "Ferronickel operation in Goias state near Barro Alto. Placed on "
            "care and maintenance. One of Brazil's older nickel laterite "
            "operations."
        ),
    },
    {
        "name": "Vermelho (Carajas)",
        "lat": -6.07,
        "lon": -49.92,
        "country": "Brazil",
        "operator": "Vale S.A.",
        "ownership": "Vale S.A.",
        "status": "development",
        "type": "open-pit",
        "products": ["nickel", "cobalt"],
        "capacity_tpa": 46000,
        "production_year": None,
        "reserves_mt": None,
        "grade": "laterite, 1.0-1.3% Ni",
        "notes": (
            "Nickel laterite project in the Carajas mineral province, Para "
            "state. Vale's planned HPAL operation for battery-grade nickel "
            "with target capacity of ~46k tpa Ni."
        ),
    },
    # =========================================================================
    # COLOMBIA
    # =========================================================================
    {
        "name": "Cerro Matoso",
        "lat": 7.95,
        "lon": -75.53,
        "country": "Colombia",
        "operator": "South32 Cerro Matoso S.A.",
        "ownership": "South32 Limited",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel", "ferronickel"],
        "capacity_tpa": 41000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 1.5-2.0% Ni",
        "notes": (
            "Latin America's largest ferronickel producer, located in Cordoba "
            "department. Open-pit laterite mine with integrated RKEF smelter. "
            "Operating since 1982."
        ),
    },
    # =========================================================================
    # AFRICA
    # =========================================================================
    {
        "name": "Ambatovy",
        "lat": -18.85,
        "lon": 48.3,
        "country": "Madagascar",
        "operator": "Ambatovy JV",
        "ownership": (
            "Sumitomo Corp., Korea Mine Rehabilitation and Mineral Resources Corp."
        ),
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel", "cobalt", "ammonium sulfate"],
        "capacity_tpa": 60000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "laterite, 0.9-1.2% Ni",
        "notes": (
            "One of the world's largest laterite nickel mines with integrated "
            "HPAL processing. Located near Moramanga in eastern Madagascar. "
            "Formerly Sherritt-led."
        ),
    },
    {
        "name": "Kabanga",
        "lat": -3.0,
        "lon": 30.5,
        "country": "Tanzania",
        "operator": "Kabanga Nickel (Lifezone Metals/BHP JV)",
        "ownership": "Lifezone Metals, BHP Group, Tanzanian government",
        "status": "development",
        "type": "underground",
        "products": ["nickel", "copper", "cobalt"],
        "capacity_tpa": 40000,
        "production_year": None,
        "reserves_mt": 1.52,
        "grade": "sulfide, 2.6% Ni",
        "notes": (
            "One of the world's largest undeveloped high-grade nickel sulfide "
            "deposits in Kagera Region, western Tanzania. BHP/Lifezone JV "
            "with Tanzanian government. Planned hydromet processing. "
            "Feasibility study target capacity of ~40k tpa Ni."
        ),
    },
    {
        "name": "Nkomati",
        "lat": -25.7,
        "lon": 30.7,
        "country": "South Africa",
        "operator": "African Rainbow Minerals / Norilsk Nickel Africa",
        "ownership": "African Rainbow Minerals (50%), Nornickel (50%)",
        "status": "care and maintenance",
        "type": "open-pit and underground",
        "products": ["nickel", "copper", "cobalt", "PGMs", "chrome"],
        "capacity_tpa": 16500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "sulfide, 0.3-0.6% Ni",
        "notes": (
            "Ni-Cu-PGM-Cr deposit in Mpumalanga, South Africa. JV between ARM "
            "and Nornickel. Operations suspended due to low nickel prices. "
            "Located on the Uitkomst Complex."
        ),
    },
    # =========================================================================
    # EUROPE
    # =========================================================================
    {
        "name": "Kevitsa",
        "lat": 67.7,
        "lon": 26.02,
        "country": "Finland",
        "operator": "Boliden",
        "ownership": "Boliden AB",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel", "copper", "gold", "PGMs"],
        "capacity_tpa": 15000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "sulfide, 0.27% Ni, 0.41% Cu",
        "notes": (
            "Open-pit Ni-Cu-PGM mine in Finnish Lapland above the Arctic "
            "Circle. Acquired by Boliden from First Quantum in 2016. One of "
            "Europe's most significant nickel mines."
        ),
    },
    {
        "name": "Harjavalta Refinery",
        "lat": 61.31,
        "lon": 22.12,
        "country": "Finland",
        "operator": "Nornickel Harjavalta (Norilsk Nickel subsidiary)",
        "ownership": "Nornickel",
        "status": "operating",
        "type": "refinery",
        "products": ["nickel cathode", "nickel briquettes", "cobalt", "copper"],
        "capacity_tpa": 66000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": None,
        "notes": (
            "Major European nickel refinery in Satakunta, Finland. Processes "
            "nickel matte from Nornickel's Kola operations and third-party "
            "feed. Produces LME-grade nickel cathode and briquettes."
        ),
    },
    {
        "name": "Sandouville Refinery",
        "lat": 49.49,
        "lon": 0.26,
        "country": "France",
        "operator": "Eramet",
        "ownership": "Eramet S.A.",
        "status": "operating",
        "type": "refinery",
        "products": ["nickel metal", "nickel salts", "high-purity nickel"],
        "capacity_tpa": 12000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": None,
        "notes": (
            "Nickel hydrometallurgical refinery near Le Havre, Normandy. "
            "Produces high-purity nickel metal and salts for battery and "
            "specialty markets. Fed by New Caledonia matte."
        ),
    },
    {
        "name": "Aguablanca",
        "lat": 38.07,
        "lon": -6.33,
        "country": "Spain",
        "operator": "Matsa Mining (Sandfire Resources subsidiary)",
        "ownership": "Sandfire Resources (formerly Mubadala)",
        "status": "operating",
        "type": "underground",
        "products": ["nickel", "copper", "PGMs"],
        "capacity_tpa": 6000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "sulfide, 0.6-0.8% Ni, 0.5% Cu",
        "notes": (
            "Only primary nickel mine in the Iberian Peninsula, located in "
            "Extremadura. Underground Ni-Cu-PGM deposit. Small but "
            "strategically significant for European supply."
        ),
    },
]


def main():
    output = {"_source": SOURCE_METADATA, "sites": SITES}

    # Ensure output directory exists
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(SITES)} nickel sites to {OUTPUT}")


if __name__ == "__main__":
    main()
