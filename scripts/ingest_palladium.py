#!/usr/bin/env python3
"""
Ingest palladium mining and processing sites into Panopticon format.

Primary sources:
  - USGS Mineral Commodity Summaries 2024, Platinum-Group Metals chapter
    https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-platinum.pdf
  - Johnson Matthey PGM Market Report 2024
    https://matthey.com/pgm-market-report
  - S&P Global Market Intelligence mine profiles
  - Company annual/sustainability reports:
      Nornickel Annual Report 2023 (nornickel.com)
      Sibanye-Stillwater Annual Report 2023 (sibanyestillwater.com)
      Anglo American Platinum Annual Report 2023 (angloamericanplatinum.com)
      Impala Platinum (Implats) Annual Report 2023 (implats.co.za)
      Northam Platinum Annual Report 2023 (northam.co.za)
      Vale Annual Report 2023 (vale.com)
      Glencore Annual Report 2023 (glencore.com)
      Zimplats Holdings Annual Report 2023 (zimplats.com)
  - South African Minerals Council PGM Fact Sheet
    https://www.mineralscouncil.org.za/

Since USGS MCS and Johnson Matthey reports are published as PDF and mine-level
data requires aggregation from multiple non-API sources, this script embeds
curated site data directly.

Note: Palladium and platinum are co-products from the same PGM mines. Many
sites appear in both the platinum and palladium datasets. The key difference is
the Pd:Pt ratio — Nornickel and Stillwater operations are Pd-dominant, while
Bushveld Complex operations are Pt-dominant but still produce significant Pd.

Run with: python3 scripts/ingest_palladium.py
Output:   data/layers/points/palladium.json
"""

import json
import os
import pathlib

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
OUTPUT_PATH = PROJECT_ROOT / "data" / "layers" / "points" / "palladium.json"

SOURCE_META = {
    "description": "Major global palladium mining, processing, and refining sites",
    "origin": (
        "USGS Mineral Commodity Summaries 2024 — Platinum-Group Metals "
        "(https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-platinum.pdf); "
        "Johnson Matthey PGM Market Report 2024 (matthey.com/pgm-market-report); "
        "S&P Global Market Intelligence mine profiles; "
        "Nornickel Annual Report 2023 (nornickel.com); "
        "Sibanye-Stillwater Annual Report 2023 (sibanyestillwater.com); "
        "Anglo American Platinum Annual Report 2023 (angloamericanplatinum.com); "
        "Impala Platinum (Implats) Annual Report 2023 (implats.co.za); "
        "Northam Platinum Annual Report 2023 (northam.co.za); "
        "Vale Annual Report 2023 (vale.com); Glencore Annual Report 2023; "
        "Zimplats Holdings Annual Report 2023 (zimplats.com); "
        "South African Minerals Council PGM Fact Sheet (mineralscouncil.org.za)"
    ),
    "retrieved": "2026-03-08",
    "license": "USGS: public domain; Johnson Matthey: public market report; company data: fair use summary",
    "notes": (
        "Global palladium operations — mines, smelters, and refineries. "
        "Russia (~37%, Nornickel) and South Africa (~37%) each produce about "
        "one-third of global palladium. Palladium is primarily used in catalytic converters. "
        "Capacity figures in kg Pd metal content per annum where available. "
        "Coordinates from USGS MRDS, company filings, and Google Earth. "
        "Global production ~210 tonnes/yr (~6.8M troy oz) per USGS MCS 2024. "
        "Many sites co-produce platinum, rhodium, and other PGMs. "
        "Pd:Pt ratio varies by deposit: Nornickel ~3:1 Pd:Pt, Bushveld ~0.6:1 Pd:Pt, "
        "Stillwater ~3.5:1 Pd:Pt."
    ),
}

# ---------- curated site data ----------

SITES = [
    # ===== Russia (3 sites) =====
    {
        "name": "Norilsk-Talnakh (Polar Division)",
        "lat": 69.35,
        "lon": 88.19,
        "country": "Russia",
        "operator": "Nornickel (MMC Norilsk Nickel)",
        "ownership": "PJSC MMC Norilsk Nickel (publicly traded)",
        "status": "operating",
        "type": "underground (massive sulfide)",
        "products": ["palladium", "nickel", "copper", "platinum", "rhodium", "cobalt"],
        "capacity_tpa": 30000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "~7 g/t Pt+Pd combined (Pd-dominant, ~3:1 Pd:Pt ratio)",
        "notes": (
            "World's single largest source of palladium — Nornickel produces ~37% of "
            "global Pd supply. Talnakh ore field includes Oktyabrsky, Taimyrsky, and "
            "Komsomolsky underground mines. Massive Ni-Cu sulfide ores with exceptionally "
            "high PGM content. PGMs are economically critical co-products. "
            "Nornickel produced ~2.6 Moz Pd in 2023."
        ),
    },
    {
        "name": "Kola Division (Monchegorsk)",
        "lat": 67.94,
        "lon": 32.90,
        "country": "Russia",
        "operator": "Kola MMC (Nornickel subsidiary)",
        "ownership": "PJSC MMC Norilsk Nickel",
        "status": "operating",
        "type": "smelter + refinery",
        "products": ["palladium", "platinum", "nickel", "copper", "cobalt"],
        "capacity_tpa": 5000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": None,
        "notes": (
            "PGM refining and Ni-Cu smelting complex on the Kola Peninsula. "
            "Processes concentrates from Norilsk-Talnakh and local Pechenga mines. "
            "Produces refined palladium, platinum, nickel, and copper. "
            "Nornickel's Kola Division."
        ),
    },
    {
        "name": "Krasnoyarsk PGM Refinery",
        "lat": 56.01,
        "lon": 92.85,
        "country": "Russia",
        "operator": "Krastsvetmet",
        "ownership": "Krasnoyarsk regional government (majority)",
        "status": "operating",
        "type": "refinery",
        "products": ["palladium", "platinum", "rhodium", "gold", "silver"],
        "capacity_tpa": None,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": None,
        "notes": (
            "One of the world's largest precious metals refineries. "
            "Refines Nornickel's PGM concentrate into pure palladium, platinum, and rhodium. "
            "Also processes gold and silver. "
            "London and Zurich Good Delivery listed."
        ),
    },
    # ===== South Africa — Bushveld Complex (14 sites) =====
    {
        "name": "Mogalakwena",
        "lat": -23.68,
        "lon": 28.94,
        "country": "South Africa",
        "operator": "Anglo American Platinum",
        "ownership": "Anglo American Platinum (100%)",
        "status": "operating",
        "type": "open-pit",
        "products": ["platinum", "palladium", "rhodium", "nickel", "copper"],
        "capacity_tpa": 9000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "3.2 g/t 4E PGM (Platreef — higher Pd:Pt ratio than Merensky)",
        "notes": (
            "World's largest open-pit PGM mine. The Platreef on the northern limb "
            "has a higher Pd:Pt ratio than the Merensky Reef, making Mogalakwena "
            "a significant Pd source. ~300+ koz Pd/yr."
        ),
    },
    {
        "name": "Amandelbult",
        "lat": -24.78,
        "lon": 27.31,
        "country": "South Africa",
        "operator": "Anglo American Platinum",
        "ownership": "Anglo American Platinum (100%)",
        "status": "operating",
        "type": "underground",
        "products": ["platinum", "palladium", "rhodium"],
        "capacity_tpa": 5500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "5.5 g/t 4E PGM (Merensky + UG2 reefs)",
        "notes": (
            "Major underground PGM mine on the western Bushveld limb. "
            "Merensky reef typically yields Pd:Pt ~0.5:1, while UG2 yields ~0.8:1. "
            "Significant Pd co-production from both reefs."
        ),
    },
    {
        "name": "Impala (Rustenburg)",
        "lat": -25.52,
        "lon": 27.24,
        "country": "South Africa",
        "operator": "Impala Platinum (Implats)",
        "ownership": "Impala Platinum Holdings (100%)",
        "status": "operating",
        "type": "underground",
        "products": ["platinum", "palladium", "rhodium", "ruthenium", "iridium"],
        "capacity_tpa": 12000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "4.8 g/t 6E PGM (Merensky + UG2)",
        "notes": (
            "One of the world's largest PGM mining complexes. "
            "Produces ~400+ koz Pd/yr alongside ~700 koz Pt. "
            "Integrated concentrating, smelting, and refining. "
            "Pd is major co-product."
        ),
    },
    {
        "name": "Marikana (Rustenburg Operations)",
        "lat": -25.70,
        "lon": 27.48,
        "country": "South Africa",
        "operator": "Sibanye-Stillwater",
        "ownership": "Sibanye-Stillwater (100%)",
        "status": "operating",
        "type": "underground",
        "products": ["platinum", "palladium", "rhodium", "gold"],
        "capacity_tpa": 10000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "4.5 g/t 4E PGM (Merensky + UG2)",
        "notes": (
            "Formerly Lonmin operations. Significant Pd co-production alongside Pt. "
            "UG2 reef operations yield higher Pd:Pt ratio. "
            "Sibanye's SA PGM operations produce significant Pd ounces."
        ),
    },
    {
        "name": "Kroondal",
        "lat": -25.60,
        "lon": 27.27,
        "country": "South Africa",
        "operator": "Sibanye-Stillwater",
        "ownership": "Sibanye-Stillwater (50%), Anglo American Platinum (50%)",
        "status": "operating",
        "type": "underground",
        "products": ["platinum", "palladium", "rhodium", "chrome"],
        "capacity_tpa": 3000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "3.8 g/t 4E PGM (UG2 reef)",
        "notes": (
            "Pool-and-share JV on the western Bushveld limb. "
            "UG2 reef mining yields significant Pd alongside Pt and chrome."
        ),
    },
    {
        "name": "Zondereinde",
        "lat": -24.34,
        "lon": 27.99,
        "country": "South Africa",
        "operator": "Northam Platinum",
        "ownership": "Northam Platinum Holdings (100%)",
        "status": "operating",
        "type": "underground",
        "products": ["platinum", "palladium", "rhodium"],
        "capacity_tpa": 5000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "5.0 g/t 4E PGM (Merensky + UG2)",
        "notes": (
            "Northam's flagship deep-level PGM mine. "
            "Both Merensky and UG2 reefs mined to 2,200m depth. "
            "Pd is significant co-product from both reef types."
        ),
    },
    {
        "name": "Booysendal",
        "lat": -24.72,
        "lon": 29.96,
        "country": "South Africa",
        "operator": "Northam Platinum",
        "ownership": "Northam Platinum Holdings (100%)",
        "status": "operating",
        "type": "underground",
        "products": ["platinum", "palladium", "rhodium", "chrome"],
        "capacity_tpa": 4500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "3.8 g/t 4E PGM (UG2 reef)",
        "notes": (
            "Mechanized UG2 mine on the eastern Bushveld limb. "
            "UG2 reef produces relatively higher Pd proportions. "
            "Low-cost mechanized operation."
        ),
    },
    {
        "name": "Royal Bafokeng Platinum (BRPM)",
        "lat": -25.53,
        "lon": 27.16,
        "country": "South Africa",
        "operator": "Impala Platinum (Implats)",
        "ownership": "Impala Platinum Holdings (majority), Royal Bafokeng Nation",
        "status": "operating",
        "type": "underground",
        "products": ["platinum", "palladium", "rhodium"],
        "capacity_tpa": 3500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "4.0 g/t 4E PGM (Merensky + UG2)",
        "notes": (
            "Western Bushveld limb PGM mine. "
            "Merged into Implats in 2024. Pd co-production from both reefs."
        ),
    },
    {
        "name": "Modikwa",
        "lat": -24.63,
        "lon": 29.95,
        "country": "South Africa",
        "operator": "African Rainbow Minerals / Anglo American Platinum JV",
        "ownership": "ARM (50%), Anglo American Platinum (50%)",
        "status": "operating",
        "type": "underground",
        "products": ["platinum", "palladium", "rhodium"],
        "capacity_tpa": 2500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "4.2 g/t 4E PGM (UG2 + Merensky)",
        "notes": (
            "JV on the eastern Bushveld limb. "
            "Both UG2 and Merensky reefs mined. "
            "Significant Pd co-production."
        ),
    },
    {
        "name": "Marula",
        "lat": -24.51,
        "lon": 29.99,
        "country": "South Africa",
        "operator": "Impala Platinum (Implats)",
        "ownership": "Impala Platinum Holdings (73%), communities (27%)",
        "status": "operating",
        "type": "underground",
        "products": ["platinum", "palladium", "rhodium"],
        "capacity_tpa": 2200,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "4.2 g/t 4E PGM (UG2 reef)",
        "notes": (
            "UG2 reef operation on the eastern Bushveld limb. "
            "Community equity partnership. Pd is key co-product."
        ),
    },
    {
        "name": "Mototolo",
        "lat": -24.57,
        "lon": 30.07,
        "country": "South Africa",
        "operator": "Anglo American Platinum",
        "ownership": "Anglo American Platinum (100%)",
        "status": "operating",
        "type": "underground",
        "products": ["platinum", "palladium", "rhodium", "chrome"],
        "capacity_tpa": 3500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "4.0 g/t 4E PGM (UG2 reef)",
        "notes": (
            "UG2 reef mine on the eastern Bushveld limb. "
            "Pd is significant co-product. Chrome also recovered."
        ),
    },
    {
        "name": "Precious Metals Refinery (Rustenburg)",
        "lat": -25.65,
        "lon": 27.24,
        "country": "South Africa",
        "operator": "Anglo American Platinum",
        "ownership": "Anglo American Platinum (100%)",
        "status": "operating",
        "type": "refinery",
        "products": ["palladium", "platinum", "rhodium", "ruthenium", "iridium", "osmium"],
        "capacity_tpa": None,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": None,
        "notes": (
            "World's largest PGM refinery complex. "
            "Refines all six PGMs including significant Pd volumes. "
            "Processes Anglo American Platinum's full production plus third-party material."
        ),
    },
    {
        "name": "Limpopo (Bauba)",
        "lat": -24.20,
        "lon": 29.50,
        "country": "South Africa",
        "operator": "Bauba Resources",
        "ownership": "Bauba Resources (74%)",
        "status": "operating",
        "type": "open-pit + underground",
        "products": ["chrome", "PGMs"],
        "capacity_tpa": 600,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "2.5 g/t 4E PGM (UG2 reef + chrome)",
        "notes": (
            "Chrome and PGM operation on the northern Bushveld limb. "
            "PGMs including Pd recovered as co-product from UG2 mining."
        ),
    },
    {
        "name": "Bathopele",
        "lat": -25.66,
        "lon": 27.26,
        "country": "South Africa",
        "operator": "Anglo American Platinum",
        "ownership": "Anglo American Platinum (100%)",
        "status": "operating",
        "type": "underground",
        "products": ["platinum", "palladium", "rhodium"],
        "capacity_tpa": 2000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "5.0 g/t 4E PGM (Merensky reef)",
        "notes": (
            "Underground Merensky reef mine. "
            "Merensky reef yields Pd as significant co-product. "
            "Fully mechanized mining."
        ),
    },
    # ===== Zimbabwe (3 sites) =====
    {
        "name": "Zimplats (Ngezi & Selous)",
        "lat": -18.93,
        "lon": 29.60,
        "country": "Zimbabwe",
        "operator": "Zimplats Holdings",
        "ownership": "Impala Platinum Holdings (87%), Zimbabwe (13%)",
        "status": "operating",
        "type": "underground",
        "products": ["platinum", "palladium", "rhodium", "gold", "nickel"],
        "capacity_tpa": 4500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "3.5 g/t 4E PGM (MSZ — Main Sulphide Zone)",
        "notes": (
            "Zimbabwe's largest PGM producer on the Great Dyke. "
            "MSZ ore yields Pd alongside Pt. "
            "Ngezi mine complex with multiple portals. "
            "Zimbabwe produces ~8% of global Pd."
        ),
    },
    {
        "name": "Unki",
        "lat": -19.85,
        "lon": 29.76,
        "country": "Zimbabwe",
        "operator": "Anglo American Platinum",
        "ownership": "Anglo American Platinum (100%)",
        "status": "operating",
        "type": "underground",
        "products": ["platinum", "palladium", "rhodium", "nickel"],
        "capacity_tpa": 1500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "3.7 g/t 4E PGM (MSZ)",
        "notes": (
            "PGM mine on the Great Dyke. Anglo American Platinum's only "
            "operation outside South Africa. Pd is key co-product."
        ),
    },
    {
        "name": "Mimosa",
        "lat": -19.67,
        "lon": 29.74,
        "country": "Zimbabwe",
        "operator": "Mimosa Mining Company",
        "ownership": "Sibanye-Stillwater (50%), Impala Platinum (50%)",
        "status": "operating",
        "type": "underground",
        "products": ["platinum", "palladium", "rhodium", "gold", "nickel"],
        "capacity_tpa": 2000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "3.8 g/t 4E PGM (MSZ)",
        "notes": (
            "JV PGM mine on the Wedza sub-chamber of the Great Dyke. "
            "Pd is significant co-product from the MSZ."
        ),
    },
    # ===== USA (2 sites) =====
    {
        "name": "Stillwater Mine",
        "lat": 45.38,
        "lon": -109.87,
        "country": "USA",
        "operator": "Sibanye-Stillwater",
        "ownership": "Sibanye-Stillwater (100%)",
        "status": "operating",
        "type": "underground",
        "products": ["palladium", "platinum", "rhodium"],
        "capacity_tpa": 8000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "~15 g/t Pd+Pt combined (3.5:1 Pd:Pt ratio)",
        "notes": (
            "Only primary PGM mine in the United States. Mines the J-M Reef in the "
            "Stillwater Complex, Montana. PALLADIUM-DOMINANT — one of the most Pd-rich "
            "deposits globally. Very high grade but narrow reef (~1m wide). "
            "Sibanye-Stillwater US PGM operations produced ~460 koz 2E (Pd+Pt) in 2023. "
            "~340 koz Pd from Stillwater alone."
        ),
    },
    {
        "name": "East Boulder Mine",
        "lat": 45.49,
        "lon": -110.10,
        "country": "USA",
        "operator": "Sibanye-Stillwater",
        "ownership": "Sibanye-Stillwater (100%)",
        "status": "operating",
        "type": "underground",
        "products": ["palladium", "platinum"],
        "capacity_tpa": 5000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "~13 g/t Pd+Pt combined (Pd-dominant, ~3.5:1 Pd:Pt)",
        "notes": (
            "Underground PGM mine ~30 km west of Stillwater mine in Montana. "
            "Also mines the J-M Reef. Pd-dominant like Stillwater. "
            "~120 koz Pd/yr. Sister operation to Stillwater mine."
        ),
    },
    # ===== Canada (4 sites) =====
    {
        "name": "Lac des Iles",
        "lat": 49.16,
        "lon": -89.58,
        "country": "Canada",
        "operator": "Impala Canada (formerly North American Palladium)",
        "ownership": "Impala Platinum Holdings (100%)",
        "status": "operating",
        "type": "underground + open-pit",
        "products": ["palladium", "platinum", "gold", "nickel", "copper"],
        "capacity_tpa": 6500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "3.5 g/t Pd, 0.3 g/t Pt (Pd-dominant)",
        "notes": (
            "One of the world's few PRIMARY palladium mines. Located near Thunder Bay, "
            "Ontario. Pd-dominant mafic intrusion deposit (Offset Zone). "
            "Acquired by Implats in 2019. Produces ~200 koz Pd/yr. "
            "Underground mining is primary, with limited remaining open-pit ore."
        ),
    },
    {
        "name": "Sudbury Operations (PGM)",
        "lat": 46.49,
        "lon": -81.01,
        "country": "Canada",
        "operator": "Vale / Glencore",
        "ownership": "Vale (multiple mines), Glencore (Sudbury INO)",
        "status": "operating",
        "type": "underground (massive sulfide)",
        "products": ["nickel", "copper", "PGMs", "cobalt", "gold"],
        "capacity_tpa": 2500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "~0.5-1.0 g/t Pt+Pd combined (byproduct of Ni-Cu)",
        "notes": (
            "PGMs (including significant Pd) recovered as byproduct from Sudbury Basin "
            "Ni-Cu massive sulfide mines. Multiple underground operations. "
            "Canada's largest PGM-producing district after Lac des Iles."
        ),
    },
    {
        "name": "Marathon PGM",
        "lat": 48.72,
        "lon": -86.37,
        "country": "Canada",
        "operator": "Generation Mining",
        "ownership": "Generation Mining Ltd (100%)",
        "status": "development",
        "type": "open-pit",
        "products": ["palladium", "platinum", "copper", "gold"],
        "capacity_tpa": 3000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.6 g/t Pd, 0.2 g/t Pt, 0.25% Cu (Pd-dominant)",
        "notes": (
            "PGM-copper deposit near Marathon, Ontario. Pd-dominant. "
            "Federal environmental approval received 2024. "
            "One of few greenfield PGM projects in North America. "
            "Planned ~100+ koz Pd/yr."
        ),
    },
    {
        "name": "Raglan Mine (PGM)",
        "lat": 61.68,
        "lon": -73.64,
        "country": "Canada",
        "operator": "Glencore",
        "ownership": "Glencore (100%)",
        "status": "operating",
        "type": "underground",
        "products": ["nickel", "copper", "PGMs", "cobalt"],
        "capacity_tpa": 600,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "~0.5 g/t PGM (byproduct)",
        "notes": (
            "Ni-Cu-PGM mine in Nunavik, northern Quebec. "
            "PGMs including Pd recovered as byproduct from komatiite-hosted sulfides."
        ),
    },
    # ===== Finland (1 site) =====
    {
        "name": "Kevitsa",
        "lat": 67.70,
        "lon": 26.05,
        "country": "Finland",
        "operator": "Boliden",
        "ownership": "Boliden AB (100%)",
        "status": "operating",
        "type": "open-pit",
        "products": ["nickel", "copper", "PGMs", "gold", "cobalt"],
        "capacity_tpa": 600,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.3 g/t PGM (byproduct of Ni-Cu mining)",
        "notes": (
            "Large open-pit Ni-Cu mine in Finnish Lapland with PGM byproduct. "
            "One of the few PGM-producing mines in the EU. Pd included in PGM credits."
        ),
    },
    # ===== Japan (1 site — refinery) =====
    {
        "name": "Saganoseki Smelter & Refinery",
        "lat": 33.25,
        "lon": 131.89,
        "country": "Japan",
        "operator": "Pan Pacific Copper (JX Metals / Mitsui Mining JV)",
        "ownership": "JX Metals (66%), Mitsui Mining & Smelting (34%)",
        "status": "operating",
        "type": "smelter + refinery",
        "products": ["copper", "palladium", "platinum", "gold", "silver", "selenium"],
        "capacity_tpa": 800,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": None,
        "notes": (
            "Major copper smelter that recovers PGMs as byproducts from copper anode slimes. "
            "Japan is one of the largest PGM refiners globally, processing imported concentrates "
            "and recycled material. Pd recovered from electronic scrap and Cu concentrate."
        ),
    },
    # ===== UK (1 site — refinery) =====
    {
        "name": "Johnson Matthey Royston",
        "lat": 52.06,
        "lon": -0.03,
        "country": "United Kingdom",
        "operator": "Johnson Matthey",
        "ownership": "Johnson Matthey PLC (publicly traded)",
        "status": "operating",
        "type": "refinery",
        "products": ["palladium", "platinum", "rhodium"],
        "capacity_tpa": None,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": None,
        "notes": (
            "Major PGM refining and fabrication facility. "
            "Johnson Matthey is the world's leading PGM refiner and technology company. "
            "Refines virgin PGMs and recycled automotive catalysts. "
            "LBMA and LPPM accredited refiner."
        ),
    },
    # ===== Belgium (1 site — refinery) =====
    {
        "name": "Umicore Hoboken",
        "lat": 51.18,
        "lon": 4.36,
        "country": "Belgium",
        "operator": "Umicore",
        "ownership": "Umicore SA/NV (publicly traded)",
        "status": "operating",
        "type": "smelter + refinery",
        "products": ["palladium", "platinum", "rhodium", "gold", "silver", "copper"],
        "capacity_tpa": None,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": None,
        "notes": (
            "World's largest precious metals recycling complex. "
            "Major PGM refiner processing secondary material (spent auto catalysts, "
            "electronic scrap) and primary concentrates. "
            "Umicore processes ~500,000 tonnes of complex feed per year."
        ),
    },
]


def main():
    # Compute coverage statistics
    operating = [s for s in SITES if s["status"] == "operating"]
    development = [s for s in SITES if s["status"] == "development"]
    total_capacity = sum(s["capacity_tpa"] for s in SITES if s.get("capacity_tpa"))

    output = {
        "_source": SOURCE_META,
        "_coverage": {
            "global_production_2023_kg": 210000,
            "global_production_2023_troy_oz": 6800000,
            "global_production_unit": "palladium metal content",
            "global_production_source": "USGS MCS 2024",
            "site_count": len(SITES),
            "operating_count": len(operating),
            "development_count": len(development),
            "known_gaps": (
                "Pd from autocatalyst recycling (~35% of total Pd supply) is handled at "
                "refineries (Umicore Hoboken, Johnson Matthey, BASF) but recycling supply "
                "is not shown as mining production; Chinese Jinchuan PGM byproduct not "
                "separately listed; numerous smaller Bushveld operations not individually mapped"
            ),
            "audit_date": "2026-03-08",
        },
        "sites": SITES,
    }

    os.makedirs(OUTPUT_PATH.parent, exist_ok=True)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False, default=str)

    print(f"[OK] Wrote {len(SITES)} palladium sites -> {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
