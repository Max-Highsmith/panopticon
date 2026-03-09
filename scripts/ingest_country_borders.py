#!/usr/bin/env python3
"""
Ingest country borders from Natural Earth for the BORDER visual filter.

Source: Natural Earth — naturalearthdata.com
Dataset: ne_110m_admin_0_countries (1:110 million scale)
License: Public domain

Capital cities: CIA World Factbook — cia.gov/the-world-factbook

Downloads the GeoJSON from the Natural Earth vector GitHub repository,
preserves key properties for rendering + info panel display, merges
capital city names, and outputs to the app's data directory.

Usage:
    python3 scripts/ingest_country_borders.py
"""

import json
import os
import sys
import urllib.request

# Natural Earth 110m countries — pre-built GeoJSON from the official repo
URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
OUTPUT = os.path.join(os.path.dirname(__file__), "..", "data", "layers", "regions", "country_borders.json")

# Capital cities by ISO 3166-1 alpha-2 code
# Source: CIA World Factbook (cia.gov/the-world-factbook), cross-referenced with UN data
CAPITALS = {
    "AF": "Kabul", "AL": "Tirana", "DZ": "Algiers", "AO": "Luanda",
    "AR": "Buenos Aires", "AM": "Yerevan", "AU": "Canberra", "AT": "Vienna",
    "AZ": "Baku", "BS": "Nassau", "BD": "Dhaka", "BY": "Minsk",
    "BE": "Brussels", "BZ": "Belmopan", "BJ": "Porto-Novo", "BT": "Thimphu",
    "BO": "Sucre", "BA": "Sarajevo", "BW": "Gaborone", "BR": "Brasilia",
    "BN": "Bandar Seri Begawan", "BG": "Sofia", "BF": "Ouagadougou",
    "BI": "Gitega", "KH": "Phnom Penh", "CM": "Yaounde", "CA": "Ottawa",
    "CF": "Bangui", "TD": "N'Djamena", "CL": "Santiago", "CN": "Beijing",
    "CO": "Bogota", "KM": "Moroni", "CD": "Kinshasa", "CG": "Brazzaville",
    "CR": "San Jose", "CI": "Yamoussoukro", "HR": "Zagreb", "CU": "Havana",
    "CY": "Nicosia", "CZ": "Prague", "DK": "Copenhagen", "DJ": "Djibouti",
    "DO": "Santo Domingo", "EC": "Quito", "EG": "Cairo", "SV": "San Salvador",
    "GQ": "Malabo", "ER": "Asmara", "EE": "Tallinn", "SZ": "Mbabane",
    "ET": "Addis Ababa", "FJ": "Suva", "FI": "Helsinki", "FR": "Paris",
    "GA": "Libreville", "GM": "Banjul", "GE": "Tbilisi", "DE": "Berlin",
    "GH": "Accra", "GR": "Athens", "GL": "Nuuk", "GT": "Guatemala City",
    "GN": "Conakry", "GW": "Bissau", "GY": "Georgetown", "HT": "Port-au-Prince",
    "HN": "Tegucigalpa", "HU": "Budapest", "IS": "Reykjavik", "IN": "New Delhi",
    "ID": "Jakarta", "IR": "Tehran", "IQ": "Baghdad", "IE": "Dublin",
    "IL": "Jerusalem", "IT": "Rome", "JM": "Kingston", "JP": "Tokyo",
    "JO": "Amman", "KZ": "Astana", "KE": "Nairobi", "KP": "Pyongyang",
    "KR": "Seoul", "KW": "Kuwait City", "KG": "Bishkek", "LA": "Vientiane",
    "LV": "Riga", "LB": "Beirut", "LS": "Maseru", "LR": "Monrovia",
    "LY": "Tripoli", "LT": "Vilnius", "LU": "Luxembourg", "MG": "Antananarivo",
    "MW": "Lilongwe", "MY": "Kuala Lumpur", "ML": "Bamako", "MR": "Nouakchott",
    "MX": "Mexico City", "MD": "Chisinau", "MN": "Ulaanbaatar", "ME": "Podgorica",
    "MA": "Rabat", "MZ": "Maputo", "MM": "Naypyidaw", "NA": "Windhoek",
    "NP": "Kathmandu", "NL": "Amsterdam", "NZ": "Wellington", "NI": "Managua",
    "NE": "Niamey", "NG": "Abuja", "MK": "Skopje", "NO": "Oslo",
    "OM": "Muscat", "PK": "Islamabad", "PA": "Panama City", "PG": "Port Moresby",
    "PY": "Asuncion", "PE": "Lima", "PH": "Manila", "PL": "Warsaw",
    "PT": "Lisbon", "QA": "Doha", "RO": "Bucharest", "RU": "Moscow",
    "RW": "Kigali", "SA": "Riyadh", "SN": "Dakar", "RS": "Belgrade",
    "SL": "Freetown", "SK": "Bratislava", "SI": "Ljubljana", "SB": "Honiara",
    "SO": "Mogadishu", "ZA": "Pretoria", "SS": "Juba", "ES": "Madrid",
    "LK": "Sri Jayawardenepura Kotte", "SD": "Khartoum", "SR": "Paramaribo",
    "SE": "Stockholm", "CH": "Bern", "SY": "Damascus", "TW": "Taipei",
    "TJ": "Dushanbe", "TZ": "Dodoma", "TH": "Bangkok", "TL": "Dili",
    "TG": "Lome", "TT": "Port of Spain", "TN": "Tunis", "TR": "Ankara",
    "TM": "Ashgabat", "UG": "Kampala", "UA": "Kyiv", "AE": "Abu Dhabi",
    "GB": "London", "US": "Washington, D.C.", "UY": "Montevideo",
    "UZ": "Tashkent", "VU": "Port Vila", "VE": "Caracas", "VN": "Hanoi",
    "YE": "Sanaa", "ZM": "Lusaka", "ZW": "Harare", "XK": "Pristina",
    "PS": "Ramallah", "EH": "El Aaiun", "NC": "Noumea", "PF": "Papeete",
    "FK": "Stanley", "PR": "San Juan", "SG": "Singapore",
    # Natural Earth non-standard ISO codes for disputed/special territories
    "CN-TW": "Taipei", "TW": "Taipei",
}


def main():
    print(f"Downloading Natural Earth 110m countries from:\n  {URL}")
    try:
        req = urllib.request.Request(URL, headers={"User-Agent": "panopticon-ingest/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = json.load(resp)
    except Exception as e:
        print(f"ERROR: Failed to download: {e}")
        sys.exit(1)

    features = raw.get("features", [])
    print(f"Downloaded {len(features)} country features.")

    # Keep properties needed for rendering, labeling, and info panel
    simplified = []
    missing_capitals = []
    for f in features:
        props = f.get("properties", {})
        iso_a2 = props.get("ISO_A2", "")
        capital = CAPITALS.get(iso_a2, "")
        if not capital and iso_a2 not in ("-99", ""):
            missing_capitals.append(f"{props.get('NAME', '?')} ({iso_a2})")

        simplified.append({
            "type": "Feature",
            "properties": {
                "name": props.get("NAME", "Unknown"),
                "formal_name": props.get("FORMAL_EN", ""),
                "iso_a2": iso_a2,
                "iso_a3": props.get("ISO_A3", ""),
                "continent": props.get("CONTINENT", ""),
                "subregion": props.get("SUBREGION", ""),
                "type": props.get("TYPE", ""),
                "pop_est": props.get("POP_EST", 0),
                "gdp_md": props.get("GDP_MD", 0),
                "economy": props.get("ECONOMY", ""),
                "income_grp": props.get("INCOME_GRP", ""),
                "mapcolor9": props.get("MAPCOLOR9", 1),
                "label_x": props.get("LABEL_X", 0),
                "label_y": props.get("LABEL_Y", 0),
                "capital": capital,
            },
            "geometry": f["geometry"],
        })

    if missing_capitals:
        print(f"Warning: No capital for {len(missing_capitals)} countries: {', '.join(missing_capitals[:10])}")

    output = {
        "_source": {
            "description": "World country borders for geopolitical filter overlay",
            "origin": "Natural Earth — naturalearthdata.com — ne_110m_admin_0_countries (GitHub: nvkelso/natural-earth-vector). Capital cities from CIA World Factbook (cia.gov/the-world-factbook).",
            "retrieved": "2026-03-08",
            "license": "public domain",
            "notes": "110m resolution (1:110M scale). Properties include name, ISO codes, population, GDP, economy/income classification, MAPCOLOR9 for coloring, LABEL_X/LABEL_Y for label placement, and capital cities.",
        },
        "type": "FeatureCollection",
        "features": simplified,
    }

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(output, f)

    size_kb = os.path.getsize(OUTPUT) / 1024
    print(f"Wrote {len(simplified)} countries ({size_kb:.0f} KB) to {OUTPUT}")


if __name__ == "__main__":
    main()
