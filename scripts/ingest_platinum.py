#!/usr/bin/env python3
"""
Ingest platinum mining and processing sites into Panopticon format.

Primary sources:
  - USGS Mineral Commodity Summaries 2024, Platinum-Group Metals chapter
    https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-platinum.pdf
  - Johnson Matthey PGM Market Report 2024
    https://matthey.com/pgm-market-report
  - S&P Global Market Intelligence mine profiles
  - Company annual/sustainability reports:
      Anglo American Platinum Annual Report 2023 (angloamericanplatinum.com)
      Impala Platinum (Implats) Annual Report 2023 (implats.co.za)
      Sibanye-Stillwater Annual Report 2023 (sibanyestillwater.com)
      Northam Platinum Annual Report 2023 (northam.co.za)
      Nornickel Annual Report 2023 (nornickel.com)
      Vale Annual Report 2023 (vale.com)
      Glencore Annual Report 2023 (glencore.com)
      Zimplats Holdings Annual Report 2023 (zimplats.com)
      Generation Mining Ltd corporate filings (genmining.com)
  - South African Minerals Council PGM Fact Sheet
    https://www.mineralscouncil.org.za/
  - Zimbabwe Chamber of Mines Annual Report

Since USGS MCS and Johnson Matthey reports are published as PDF and mine-level
data requires aggregation from multiple non-API sources, this script embeds
curated site data directly.
Run with: python3 scripts/ingest_platinum.py
Output:   data/layers/points/platinum.json
"""

import json
import os
import pathlib

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
OUTPUT_PATH = PROJECT_ROOT / "data" / "layers" / "points" / "platinum.json"

SOURCE_META = {
    "description": "Major global platinum mining, processing, and refining sites",
    "origin": (
        "USGS Mineral Commodity Summaries 2024 — Platinum-Group Metals "
        "(https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-platinum.pdf); "
        "Johnson Matthey PGM Market Report 2024 (matthey.com/pgm-market-report); "
        "S&P Global Market Intelligence mine profiles; "
        "Anglo American Platinum Annual Report 2023 (angloamericanplatinum.com); "
        "Impala Platinum (Implats) Annual Report 2023 (implats.co.za); "
        "Sibanye-Stillwater Annual Report 2023 (sibanyestillwater.com); "
        "Northam Platinum Annual Report 2023 (northam.co.za); "
        "Nornickel Annual Report 2023 (nornickel.com); "
        "Vale Annual Report 2023 (vale.com); Glencore Annual Report 2023; "
        "Zimplats Holdings Annual Report 2023 (zimplats.com); "
        "South African Minerals Council PGM Fact Sheet (mineralscouncil.org.za); "
        "Zimbabwe Chamber of Mines Annual Report"
    ),
    "retrieved": "2026-03-08",
    "license": "USGS: public domain; Johnson Matthey: public market report; company data: fair use summary",
    "notes": (
        "Global platinum operations — mines, smelters, and refineries. "
        "South Africa's Bushveld Complex produces ~72% of global platinum. "
        "Capacity figures in kg Pt metal content per annum where available. "
        "Coordinates from USGS MRDS, company filings, and Google Earth. "
        "Global production ~190 tonnes/yr (~6.1M troy oz) per USGS MCS 2024. "
        "Many sites are co-producers of palladium, rhodium, and other PGMs."
    ),
}

# ---------- curated site data ----------

SITES = [
    # ===== South Africa — Bushveld Complex (18 sites) =====
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
        "capacity_tpa": 14000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "3.2 g/t 4E PGM (Pt-dominant, Platreef)",
        "notes": (
            "World's largest open-pit platinum mine on the Platreef, northern limb "
            "of the Bushveld Complex. Anglo American Platinum's flagship operation. "
            "Produces ~450 koz Pt/yr. Mechanized mining with ultra-large trucks."
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
        "capacity_tpa": 9000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "5.5 g/t 4E PGM (Merensky + UG2 reefs)",
        "notes": (
            "Major underground PGM mine on the western limb of the Bushveld Complex. "
            "Mines both the Merensky and UG2 reefs. One of Anglo American Platinum's "
            "largest operations by 4E ounces."
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
        "capacity_tpa": 5500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "4.0 g/t 4E PGM (UG2 reef)",
        "notes": (
            "UG2 reef mine on the eastern limb of the Bushveld Complex. "
            "Includes Der Brochen and Mototolo sections. "
            "Chrome co-product from UG2 ore."
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
        "capacity_tpa": 20000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "4.8 g/t 6E PGM (Merensky + UG2)",
        "notes": (
            "One of the world's largest platinum mining complexes, located near "
            "Rustenburg on the western limb of the Bushveld Complex. "
            "Multiple shaft systems mining Merensky and UG2 reefs. "
            "Includes concentrating, smelting, and refining on site. "
            "Implats reported ~700 koz Pt from Impala in 2023."
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
        "capacity_tpa": 3500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "4.2 g/t 4E PGM (UG2 reef)",
        "notes": (
            "UG2 reef operation on the eastern limb of the Bushveld Complex. "
            "Community equity partnership. Concentrator on site."
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
        "capacity_tpa": 18000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "4.5 g/t 4E PGM (Merensky + UG2)",
        "notes": (
            "Formerly Lonmin operations, acquired by Sibanye-Stillwater in 2019. "
            "Includes Marikana, K4, Rowland, and Saffy shafts. "
            "One of the largest PGM complexes globally. Site of the 2012 Marikana "
            "massacre. Sibanye's SA PGM operations produced ~1.1 Moz 4E in 2023."
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
        "capacity_tpa": 5000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "3.8 g/t 4E PGM (UG2 reef)",
        "notes": (
            "Pool-and-share joint venture between Sibanye-Stillwater and "
            "Anglo American Platinum on the western limb of the Bushveld. "
            "UG2 reef mining with chrome co-product."
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
        "capacity_tpa": 8500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "5.0 g/t 4E PGM (Merensky + UG2)",
        "notes": (
            "Deep-level PGM mine on the northern sector of the western Bushveld limb. "
            "Northam's flagship mine, operating since 1993. "
            "Mines both Merensky and UG2 reefs at depths up to 2,200m. "
            "Includes smelter and BMR (base metals refinery) on site."
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
        "capacity_tpa": 7000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "3.8 g/t 4E PGM (UG2 reef)",
        "notes": (
            "Mechanized UG2 mine on the eastern limb of the Bushveld Complex. "
            "Acquired from Atlatsa Mining. One of the lowest-cost PGM operations "
            "in South Africa due to mechanized mining methods. "
            "Ramping up the North mine section."
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
        "capacity_tpa": 6000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "4.0 g/t 4E PGM (Merensky + UG2)",
        "notes": (
            "Formerly Royal Bafokeng Platinum, merged into Implats in 2024. "
            "Located on the western Bushveld limb near Rustenburg. "
            "North and South shaft complexes mining Merensky and UG2 reefs."
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
        "capacity_tpa": 4000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "4.2 g/t 4E PGM (UG2 + Merensky)",
        "notes": (
            "Joint venture on the eastern limb of the Bushveld Complex. "
            "Mines both UG2 and Merensky reefs. "
            "North and South shaft complexes."
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
        "capacity_tpa": 3500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "5.0 g/t 4E PGM (Merensky reef)",
        "notes": (
            "Underground Merensky reef mine on the western limb. "
            "Part of Anglo American Platinum's Rustenburg section. "
            "Fully mechanized mining."
        ),
    },
    {
        "name": "Thembelani (formerly Siphumelele)",
        "lat": -25.71,
        "lon": 27.33,
        "country": "South Africa",
        "operator": "Anglo American Platinum",
        "ownership": "Anglo American Platinum (100%)",
        "status": "operating",
        "type": "underground",
        "products": ["platinum", "palladium", "rhodium"],
        "capacity_tpa": 4500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "4.8 g/t 4E PGM (Merensky + UG2)",
        "notes": (
            "Underground PGM mine near Rustenburg, part of Anglo American Platinum's "
            "Rustenburg section. Mining Merensky and UG2 reefs."
        ),
    },
    {
        "name": "Polokwane Smelter",
        "lat": -23.91,
        "lon": 29.46,
        "country": "South Africa",
        "operator": "Anglo American Platinum",
        "ownership": "Anglo American Platinum (100%)",
        "status": "operating",
        "type": "smelter",
        "products": ["platinum", "palladium", "rhodium", "base metals"],
        "capacity_tpa": None,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": None,
        "notes": (
            "PGM smelter processing concentrate from Anglo American Platinum's "
            "eastern and northern limb mines. Electric furnace smelting "
            "producing PGM-bearing matte."
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
        "products": ["platinum", "palladium", "rhodium", "ruthenium", "iridium", "osmium"],
        "capacity_tpa": None,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": None,
        "notes": (
            "World's largest PGM refinery complex. Refines all six PGMs plus gold. "
            "Located in Rustenburg. Processes Anglo American Platinum's "
            "full production plus third-party material."
        ),
    },
    {
        "name": "Waterval Smelter & BMR",
        "lat": -25.67,
        "lon": 27.28,
        "country": "South Africa",
        "operator": "Anglo American Platinum",
        "ownership": "Anglo American Platinum (100%)",
        "status": "operating",
        "type": "smelter + base metals refinery",
        "products": ["platinum", "palladium", "nickel", "copper"],
        "capacity_tpa": None,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": None,
        "notes": (
            "PGM smelter and base metals refinery at Rustenburg. "
            "Processes western limb concentrates. Produces converter matte "
            "for the Precious Metals Refinery."
        ),
    },
    {
        "name": "Mortimer Smelter",
        "lat": -24.59,
        "lon": 30.15,
        "country": "South Africa",
        "operator": "Sibanye-Stillwater",
        "ownership": "Sibanye-Stillwater (100%)",
        "status": "operating",
        "type": "smelter",
        "products": ["platinum", "palladium", "rhodium"],
        "capacity_tpa": None,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": None,
        "notes": (
            "PGM smelter on the eastern Bushveld limb, processing concentrate "
            "from Sibanye-Stillwater and third-party operations. "
            "Formerly owned by Eastern Platinum."
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
        "capacity_tpa": 1000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "2.5 g/t 4E PGM (UG2 reef + chrome)",
        "notes": (
            "Chrome and PGM operation on the northern limb of the Bushveld. "
            "Smaller-scale producer with PGMs as co-product from UG2 mining."
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
        "capacity_tpa": 7500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "3.5 g/t 4E PGM (MSZ — Main Sulphide Zone)",
        "notes": (
            "Zimbabwe's largest PGM producer. Located on the Great Dyke. "
            "Ngezi mine complex with Bimha, Mupfuti, and Mtshingwe portals. "
            "Selous metallurgical complex for concentrating and smelting. "
            "Zimplats produced ~480 koz 6E PGM in FY2023."
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
        "capacity_tpa": 2500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "3.7 g/t 4E PGM (MSZ)",
        "notes": (
            "PGM mine on the Great Dyke of Zimbabwe. "
            "Anglo American Platinum's only operation outside South Africa. "
            "Mechanized underground mining of the Main Sulphide Zone."
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
        "capacity_tpa": 3500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "3.8 g/t 4E PGM (MSZ)",
        "notes": (
            "Joint venture PGM mine on the Wedza sub-chamber of the Great Dyke. "
            "Fully mechanized underground operation. "
            "Produces ~120 koz 6E PGM annually."
        ),
    },
    # ===== Russia (2 sites) =====
    {
        "name": "Norilsk-Talnakh",
        "lat": 69.35,
        "lon": 88.19,
        "country": "Russia",
        "operator": "Nornickel (MMC Norilsk Nickel)",
        "ownership": "PJSC MMC Norilsk Nickel (publicly traded)",
        "status": "operating",
        "type": "underground (massive sulfide)",
        "products": ["palladium", "platinum", "nickel", "copper", "rhodium", "cobalt"],
        "capacity_tpa": 6000,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "~7 g/t Pt+Pd combined (Pd-dominant, ~3:1 Pd:Pt ratio)",
        "notes": (
            "World's largest nickel-copper-PGM mining complex above the Arctic Circle. "
            "Talnakh ore field (Oktyabrsky, Taimyrsky, Komsomolsky mines). "
            "Russia produces ~11% of global platinum, mostly from Nornickel. "
            "Pt production ~650-700 koz/yr. PGMs are byproduct of Ni-Cu mining."
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
        "products": ["platinum", "palladium", "nickel", "copper", "cobalt"],
        "capacity_tpa": 1500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": None,
        "notes": (
            "PGM refining and Ni-Cu smelting complex on the Kola Peninsula. "
            "Processes concentrates from Norilsk-Talnakh and local Pechenga mines. "
            "Produces refined PGMs, nickel, and copper."
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
        "capacity_tpa": 500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "3.5 g/t Pd, 0.3 g/t Pt (Pd-dominant)",
        "notes": (
            "Primary PGM mine near Thunder Bay, Ontario. "
            "Pd-dominant deposit — one of the few primary palladium mines outside Russia. "
            "Underground (Offset Zone) and limited open-pit mining. "
            "Acquired by Implats in 2019."
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
        "capacity_tpa": 800,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "~0.5-1.0 g/t Pt+Pd combined (byproduct of Ni-Cu)",
        "notes": (
            "PGMs recovered as byproduct from the Sudbury Basin Ni-Cu mines. "
            "Multiple underground operations (Creighton, Coleman, Totten, Nickel Rim South). "
            "Vale's Long Harbour Processing Plant in NL refines PGM-bearing matte."
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
        "capacity_tpa": 400,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.6 g/t Pd, 0.2 g/t Pt, 0.25% Cu",
        "notes": (
            "PGM-copper deposit near Marathon, Ontario. "
            "Federal environmental approval received 2024. "
            "Planned as an open-pit Cu-PGM mine. "
            "One of the few greenfield PGM projects in North America."
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
        "capacity_tpa": 200,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "~0.5 g/t PGM (byproduct)",
        "notes": (
            "Ni-Cu-PGM mine in Nunavik, northern Quebec. "
            "PGMs recovered as byproduct from komatiite-hosted sulfides. "
            "Fly-in/fly-out operation in extreme Arctic conditions."
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
        "capacity_tpa": 800,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "~15 g/t Pd+Pt combined (3.5:1 Pd:Pt ratio)",
        "notes": (
            "Only primary PGM mine in the United States, located in Montana. "
            "Mines the J-M Reef in the Stillwater Complex. "
            "Very high grade but narrow reef (~1m wide). "
            "Palladium-dominant. Sibanye-Stillwater US PGM operations "
            "produced ~460 koz 2E (Pd+Pt) in 2023."
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
        "capacity_tpa": 600,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "~13 g/t Pd+Pt combined (Pd-dominant)",
        "notes": (
            "Underground PGM mine ~30 km west of Stillwater mine in Montana. "
            "Also mines the J-M Reef in the Stillwater Complex. "
            "Sister operation to the Stillwater mine."
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
        "capacity_tpa": 300,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "0.3 g/t PGM (byproduct of Ni-Cu mining)",
        "notes": (
            "Large open-pit Ni-Cu mine in Finnish Lapland with PGM byproduct. "
            "One of the few PGM-producing mines in the EU. "
            "Boliden acquired from FQM in 2016."
        ),
    },
    # ===== Colombia (1 site) =====
    {
        "name": "Choco Platinum District",
        "lat": 5.08,
        "lon": -76.65,
        "country": "Colombia",
        "operator": "Various (artisanal + small scale)",
        "ownership": "Multiple operators",
        "status": "operating",
        "type": "alluvial",
        "products": ["platinum", "gold"],
        "capacity_tpa": 500,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "alluvial placer PGMs",
        "notes": (
            "Alluvial platinum district in the Choco department of western Colombia. "
            "Colombia is the largest platinum producer in South America. "
            "Primarily artisanal and small-scale mining of placer deposits. "
            "Production ~1-1.5 t Pt/yr."
        ),
    },
    # ===== Ethiopia (1 site) =====
    {
        "name": "Yubdo (Wellega)",
        "lat": 9.03,
        "lon": 35.15,
        "country": "Ethiopia",
        "operator": "Various (artisanal)",
        "ownership": "Ethiopian government / artisanal miners",
        "status": "operating",
        "type": "alluvial + hard-rock",
        "products": ["platinum"],
        "capacity_tpa": 100,
        "production_year": 2023,
        "reserves_mt": None,
        "grade": "alluvial + laterite-hosted PGM",
        "notes": (
            "Historic platinum district in western Ethiopia. "
            "One of the few known PGM deposits in Africa outside the Bushveld "
            "and Great Dyke. Small-scale production from alluvial sources."
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
            "global_production_2023_kg": 190000,
            "global_production_2023_troy_oz": 6100000,
            "global_production_unit": "platinum metal content",
            "global_production_source": "USGS MCS 2024",
            "site_count": len(SITES),
            "operating_count": len(operating),
            "development_count": len(development),
            "known_gaps": (
                "Small artisanal operations in Colombia, Ethiopia, and Papua New Guinea "
                "are partially represented but exact site locations are generalized; "
                "Chinese Jinchuan PGM byproduct not separately listed; "
                "recycling operations (significant secondary supply ~30% of total Pt) not included"
            ),
            "audit_date": "2026-03-08",
        },
        "sites": SITES,
    }

    os.makedirs(OUTPUT_PATH.parent, exist_ok=True)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False, default=str)

    print(f"[OK] Wrote {len(SITES)} platinum sites -> {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
