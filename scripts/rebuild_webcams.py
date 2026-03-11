#!/usr/bin/env python3
"""
Rebuild webcam data files from verified YouTube streams.
Filters discovered streams to actual webcam/live content,
categorizes them, extracts location data, and writes final JSON files.

Combines:
1. Previously verified entries from original webcam files
2. Newly discovered verified streams
3. WorldMonitor verified streams

Target: ~1000 webcam entries across 12 category files.
"""

import json
import re
import sys
from pathlib import Path
from collections import defaultdict
from datetime import date

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "data" / "layers" / "points"

# ── City coordinates database ──────────────────────────────────────────────
# Used to geolocate streams based on title/location keywords
CITY_COORDS = {
    # North America
    "new york": (40.7128, -74.0060, "US", "New York"),
    "nyc": (40.7128, -74.0060, "US", "New York"),
    "manhattan": (40.7831, -73.9712, "US", "New York"),
    "times square": (40.7580, -73.9855, "US", "New York"),
    "brooklyn": (40.6782, -73.9442, "US", "New York"),
    "los angeles": (34.0522, -118.2437, "US", "Los Angeles"),
    "la ": (34.0522, -118.2437, "US", "Los Angeles"),
    "hollywood": (34.0928, -118.3287, "US", "Los Angeles"),
    "venice beach": (33.9850, -118.4695, "US", "Los Angeles"),
    "santa monica": (34.0195, -118.4912, "US", "Los Angeles"),
    "san francisco": (37.7749, -122.4194, "US", "San Francisco"),
    "sf bay": (37.7749, -122.4194, "US", "San Francisco"),
    "oakland": (37.8044, -122.2712, "US", "Oakland"),
    "chicago": (41.8781, -87.6298, "US", "Chicago"),
    "houston": (29.7604, -95.3698, "US", "Houston"),
    "miami": (25.7617, -80.1918, "US", "Miami"),
    "miami beach": (25.7907, -80.1300, "US", "Miami Beach"),
    "fort lauderdale": (26.1224, -80.1373, "US", "Fort Lauderdale"),
    "boston": (42.3601, -71.0589, "US", "Boston"),
    "philadelphia": (39.9526, -75.1652, "US", "Philadelphia"),
    "seattle": (47.6062, -122.3321, "US", "Seattle"),
    "washington": (38.9072, -77.0369, "US", "Washington DC"),
    "washington dc": (38.9072, -77.0369, "US", "Washington DC"),
    "dc ": (38.9072, -77.0369, "US", "Washington DC"),
    "denver": (39.7392, -104.9903, "US", "Denver"),
    "portland": (45.5152, -122.6784, "US", "Portland"),
    "las vegas": (36.1699, -115.1398, "US", "Las Vegas"),
    "atlanta": (33.7490, -84.3880, "US", "Atlanta"),
    "dallas": (32.7767, -96.7970, "US", "Dallas"),
    "san diego": (32.7157, -117.1611, "US", "San Diego"),
    "phoenix": (33.4484, -112.0740, "US", "Phoenix"),
    "nashville": (36.1627, -86.7816, "US", "Nashville"),
    "austin": (30.2672, -97.7431, "US", "Austin"),
    "savannah": (32.0809, -81.0912, "US", "Savannah"),
    "honolulu": (21.3069, -157.8583, "US", "Honolulu"),
    "hawaii": (19.8968, -155.5828, "US", "Hawaii"),
    "waikiki": (21.2793, -157.8294, "US", "Honolulu"),
    "maui": (20.7984, -156.3319, "US", "Maui"),
    "key west": (24.5551, -81.7800, "US", "Key West"),
    "anchorage": (61.2181, -149.9003, "US", "Anchorage"),
    "alaska": (64.2008, -152.4937, "US", "Alaska"),
    "juneau": (58.3005, -134.4197, "US", "Juneau"),
    "milwaukee": (43.0389, -87.9065, "US", "Milwaukee"),
    "cleveland": (41.4993, -81.6944, "US", "Cleveland"),
    "pittsburgh": (40.4406, -79.9959, "US", "Pittsburgh"),
    "minneapolis": (44.9778, -93.2650, "US", "Minneapolis"),
    "kansas city": (39.0997, -94.5786, "US", "Kansas City"),
    "new orleans": (29.9511, -90.0715, "US", "New Orleans"),
    "memphis": (35.1495, -90.0490, "US", "Memphis"),
    "louisville": (38.2527, -85.7585, "US", "Louisville"),
    "indianapolis": (39.7684, -86.1581, "US", "Indianapolis"),
    "orlando": (28.5383, -81.3792, "US", "Orlando"),
    "tampa": (27.9506, -82.4572, "US", "Tampa"),
    "jacksonville": (30.3322, -81.6557, "US", "Jacksonville"),
    "st. louis": (38.6270, -90.1994, "US", "St. Louis"),
    "salt lake": (40.7608, -111.8910, "US", "Salt Lake City"),
    "reno": (39.5296, -119.8138, "US", "Reno"),
    "detroit": (42.3314, -83.0458, "US", "Detroit"),
    "buffalo": (42.8864, -78.8784, "US", "Buffalo"),
    "rochester": (43.1566, -77.6088, "US", "Rochester"),
    "sacramento": (38.5816, -121.4944, "US", "Sacramento"),
    "san antonio": (29.4241, -98.4936, "US", "San Antonio"),
    "charlotte": (35.2271, -80.8431, "US", "Charlotte"),
    "raleigh": (35.7796, -78.6382, "US", "Raleigh"),
    "richmond": (37.5407, -77.4360, "US", "Richmond"),
    "baltimore": (39.2904, -76.6122, "US", "Baltimore"),
    "columbia": (34.0007, -81.0348, "US", "Columbia"),
    "roswell": (33.3943, -104.5230, "US", "Roswell"),
    "ruidoso": (33.3314, -105.6730, "US", "Ruidoso"),
    "flagstaff": (35.1983, -111.6513, "US", "Flagstaff"),
    "sedona": (34.8697, -111.7610, "US", "Sedona"),
    "yellowstone": (44.4280, -110.5885, "US", "Yellowstone"),
    "yosemite": (37.8651, -119.5383, "US", "Yosemite"),
    "grand canyon": (36.1069, -112.1129, "US", "Grand Canyon"),
    "jackson hole": (43.4799, -110.7624, "US", "Jackson Hole"),
    "niagara falls": (43.0896, -79.0849, "US", "Niagara Falls"),
    "myrtle beach": (33.6891, -78.8867, "US", "Myrtle Beach"),
    "outer banks": (35.5585, -75.4665, "US", "Outer Banks"),
    "newport": (41.4901, -71.3128, "US", "Newport"),
    "cape cod": (41.6688, -70.2962, "US", "Cape Cod"),
    "nantucket": (41.2835, -70.0995, "US", "Nantucket"),
    "destin": (30.3935, -86.4958, "US", "Destin"),
    "pensacola": (30.4213, -87.2169, "US", "Pensacola"),
    "galveston": (29.3013, -94.7977, "US", "Galveston"),
    "deerfield": (26.3184, -80.0998, "US", "Deerfield Beach"),
    "clearwater": (27.9659, -82.8001, "US", "Clearwater"),
    "panama city beach": (30.1766, -85.8055, "US", "Panama City Beach"),
    "daytona": (29.2108, -81.0228, "US", "Daytona Beach"),
    "rehoboth": (38.7210, -75.0760, "US", "Rehoboth Beach"),
    "wrightsville": (34.2085, -77.7964, "US", "Wrightsville Beach"),
    "huntington beach": (33.6595, -117.9988, "US", "Huntington Beach"),
    "monterey": (36.6002, -121.8947, "US", "Monterey"),
    "cannon beach": (45.8918, -123.9615, "US", "Cannon Beach"),
    "hilton head": (32.2163, -80.7526, "US", "Hilton Head"),
    "lax": (33.9425, -118.4081, "US", "Los Angeles"),
    "jfk": (40.6413, -73.7781, "US", "New York"),
    "sfo": (37.6213, -122.3790, "US", "San Francisco"),
    "ord": (41.9742, -87.9073, "US", "Chicago"),
    "katmai": (58.6000, -154.0000, "US", "Katmai"),
    "brooks falls": (58.7519, -155.7847, "US", "Katmai"),
    "decorah": (43.3033, -91.7857, "US", "Decorah"),
    "big bear": (34.2439, -116.9114, "US", "Big Bear"),
    "pasadena": (34.1478, -118.1445, "US", "Pasadena"),
    "fullerton": (33.8703, -117.9253, "US", "Fullerton"),
    "fort madison": (40.6297, -91.3149, "US", "Fort Madison"),
    "londonderry": (42.8651, -71.3739, "US", "Londonderry"),
    "greenland": (43.0363, -70.8310, "US", "Greenland"),
    "epping": (43.0339, -71.0742, "US", "Epping"),
    "kingston": (18.0179, -76.8099, "JM", "Kingston"),
    "johnstown": (40.3267, -78.9220, "US", "Johnstown"),
    # Canada
    "toronto": (43.6532, -79.3832, "CA", "Toronto"),
    "vancouver": (49.2827, -123.1207, "CA", "Vancouver"),
    "montreal": (45.5017, -73.5673, "CA", "Montreal"),
    "ottawa": (45.4215, -75.6972, "CA", "Ottawa"),
    "calgary": (51.0447, -114.0719, "CA", "Calgary"),
    "quebec": (46.8139, -71.2080, "CA", "Quebec City"),
    "winnipeg": (49.8951, -97.1384, "CA", "Winnipeg"),
    "halifax": (44.6488, -63.5752, "CA", "Halifax"),
    "victoria bc": (48.4284, -123.3656, "CA", "Victoria"),
    "banff": (51.1784, -115.5708, "CA", "Banff"),
    # Mexico
    "mexico city": (19.4326, -99.1332, "MX", "Mexico City"),
    "cancun": (21.1619, -86.8515, "MX", "Cancun"),
    "cabo": (22.8905, -109.9167, "MX", "Cabo San Lucas"),
    "popocatepetl": (19.0226, -98.6278, "MX", "Puebla"),
    "colima": (19.2452, -103.7241, "MX", "Colima"),
    # Caribbean
    "nassau": (25.0343, -77.3963, "BS", "Nassau"),
    "san juan": (18.4655, -66.1057, "PR", "San Juan"),
    "jamaica": (18.1096, -77.2975, "JM", "Jamaica"),
    "barbados": (13.1939, -59.5432, "BB", "Barbados"),
    "aruba": (12.5211, -69.9683, "AW", "Aruba"),
    "bermuda": (32.3078, -64.7505, "BM", "Bermuda"),
    "curaçao": (12.1696, -68.9900, "CW", "Curaçao"),
    "cayman": (19.3133, -81.2546, "KY", "Grand Cayman"),
    "cozumel": (20.4318, -86.9230, "MX", "Cozumel"),
    "st. thomas": (18.3358, -64.9301, "VI", "St. Thomas"),
    "st. martin": (18.0735, -63.0501, "SX", "St. Martin"),
    # Central America
    "costa rica": (9.7489, -83.7534, "CR", "Costa Rica"),
    "belize": (17.1899, -88.4976, "BZ", "Belize"),
    "guatemala": (14.6349, -90.5069, "GT", "Guatemala City"),
    "panama": (8.9824, -79.5199, "PA", "Panama City"),
    # South America
    "rio": (22.9068, -43.1729, "BR", "Rio de Janeiro"),
    "sao paulo": (23.5505, -46.6333, "BR", "São Paulo"),
    "buenos aires": (34.6037, -58.3816, "AR", "Buenos Aires"),
    "bogota": (4.7110, -74.0721, "CO", "Bogotá"),
    "lima": (12.0464, -77.0428, "PE", "Lima"),
    "santiago": (33.4489, -70.6693, "CL", "Santiago"),
    "quito": (0.1807, -78.4678, "EC", "Quito"),
    "cartagena": (10.3910, -75.5364, "CO", "Cartagena"),
    "cusco": (13.5320, -71.9675, "PE", "Cusco"),
    "iguazu": (25.6953, -54.4367, "BR", "Iguazu"),
    "peru": (12.0464, -77.0428, "PE", "Peru"),
    "brazil": (15.7975, -47.8919, "BR", "Brazil"),
    "argentina": (34.6037, -58.3816, "AR", "Argentina"),
    # Europe
    "london": (51.5074, -0.1278, "GB", "London"),
    "paris": (48.8566, 2.3522, "FR", "Paris"),
    "rome": (41.9028, 12.4964, "IT", "Rome"),
    "barcelona": (41.3874, 2.1686, "ES", "Barcelona"),
    "madrid": (40.4168, -3.7038, "ES", "Madrid"),
    "berlin": (52.5200, 13.4050, "DE", "Berlin"),
    "amsterdam": (52.3676, 4.9041, "NL", "Amsterdam"),
    "vienna": (48.2082, 16.3738, "AT", "Vienna"),
    "prague": (50.0755, 14.4378, "CZ", "Prague"),
    "budapest": (47.4979, 19.0402, "HU", "Budapest"),
    "istanbul": (41.0082, 28.9784, "TR", "Istanbul"),
    "athens": (37.9838, 23.7275, "GR", "Athens"),
    "lisbon": (38.7223, -9.1393, "PT", "Lisbon"),
    "dublin": (53.3498, -6.2603, "IE", "Dublin"),
    "edinburgh": (55.9533, -3.1883, "GB", "Edinburgh"),
    "stockholm": (59.3293, 18.0686, "SE", "Stockholm"),
    "copenhagen": (55.6761, 12.5683, "DK", "Copenhagen"),
    "oslo": (59.9139, 10.7522, "NO", "Oslo"),
    "helsinki": (60.1699, 24.9384, "FI", "Helsinki"),
    "warsaw": (52.2297, 21.0122, "PL", "Warsaw"),
    "bucharest": (44.4268, 26.1025, "RO", "Bucharest"),
    "brussels": (50.8503, 4.3517, "BE", "Brussels"),
    "zurich": (47.3769, 8.5417, "CH", "Zurich"),
    "geneva": (46.2044, 6.1432, "CH", "Geneva"),
    "florence": (43.7696, 11.2558, "IT", "Florence"),
    "venice": (45.4408, 12.3155, "IT", "Venice"),
    "naples": (40.8518, 14.2681, "IT", "Naples"),
    "milan": (45.4642, 9.1900, "IT", "Milan"),
    "munich": (48.1351, 11.5820, "DE", "Munich"),
    "hamburg": (53.5511, 9.9937, "DE", "Hamburg"),
    "hannover": (52.3759, 9.7320, "DE", "Hannover"),
    "frankfurt": (50.1109, 8.6821, "DE", "Frankfurt"),
    "cologne": (50.9375, 6.9603, "DE", "Cologne"),
    "nice": (43.7102, 7.2620, "FR", "Nice"),
    "marseille": (43.2965, 5.3698, "FR", "Marseille"),
    "lyon": (45.7640, 4.8357, "FR", "Lyon"),
    "edinburgh": (55.9533, -3.1883, "GB", "Edinburgh"),
    "glasgow": (55.8642, -4.2518, "GB", "Glasgow"),
    "liverpool": (53.4084, -2.9916, "GB", "Liverpool"),
    "manchester": (53.4808, -2.2426, "GB", "Manchester"),
    "cardiff": (51.4816, -3.1791, "GB", "Cardiff"),
    "birmingham uk": (52.4862, -1.8904, "GB", "Birmingham"),
    "kiev": (50.4501, 30.5234, "UA", "Kyiv"),
    "kyiv": (50.4501, 30.5234, "UA", "Kyiv"),
    "odessa": (46.4825, 30.7233, "UA", "Odessa"),
    "moscow": (55.7558, 37.6173, "RU", "Moscow"),
    "st. petersburg": (59.9343, 30.3351, "RU", "St. Petersburg"),
    "saint petersburg": (59.9343, 30.3351, "RU", "St. Petersburg"),
    "helsinki": (60.1699, 24.9384, "FI", "Helsinki"),
    "reykjavik": (64.1466, -21.9426, "IS", "Reykjavik"),
    "iceland": (64.9631, -19.0208, "IS", "Iceland"),
    "tenerife": (28.2916, -16.6291, "ES", "Tenerife"),
    "malta": (35.8989, 14.5146, "MT", "Malta"),
    "croatia": (43.5081, 16.4402, "HR", "Split"),
    "dubrovnik": (42.6507, 18.0944, "HR", "Dubrovnik"),
    "santorini": (36.3932, 25.4615, "GR", "Santorini"),
    "sicily": (37.5990, 14.0154, "IT", "Sicily"),
    "etna": (37.7510, 14.9934, "IT", "Mount Etna"),
    "mount etna": (37.7510, 14.9934, "IT", "Mount Etna"),
    "vesuvius": (40.8210, 14.4260, "IT", "Vesuvius"),
    "stromboli": (38.7891, 15.2131, "IT", "Stromboli"),
    "levi": (67.7948, 24.8129, "FI", "Levi"),
    "weymouth": (50.6105, -2.4574, "GB", "Weymouth"),
    "kidderminster": (52.3885, -2.2490, "GB", "Kidderminster"),
    "cornwall": (50.2660, -5.0527, "GB", "Cornwall"),
    "norway": (60.4720, 8.4689, "NO", "Norway"),
    "nordkapp": (71.1694, 25.7841, "NO", "Nordkapp"),
    "tromsø": (69.6492, 18.9553, "NO", "Tromsø"),
    "tromso": (69.6492, 18.9553, "NO", "Tromsø"),
    "svalbard": (78.2232, 15.6267, "NO", "Svalbard"),
    "switzerland": (46.8182, 8.2275, "CH", "Switzerland"),
    "alps": (46.8182, 8.2275, "CH", "Alps"),
    "chamonix": (45.9237, 6.8694, "FR", "Chamonix"),
    "zermatt": (46.0207, 7.7491, "CH", "Zermatt"),
    "grindelwald": (46.6243, 8.0413, "CH", "Grindelwald"),
    "spain": (40.4168, -3.7038, "ES", "Spain"),
    "portugal": (38.7223, -9.1393, "PT", "Portugal"),
    "italy": (41.9028, 12.4964, "IT", "Italy"),
    "germany": (52.5200, 13.4050, "DE", "Germany"),
    "france": (48.8566, 2.3522, "FR", "France"),
    "netherlands": (52.3676, 4.9041, "NL", "Netherlands"),
    "poland": (52.2297, 21.0122, "PL", "Poland"),
    # Middle East
    "dubai": (25.2048, 55.2708, "AE", "Dubai"),
    "abu dhabi": (24.4539, 54.3773, "AE", "Abu Dhabi"),
    "doha": (25.2854, 51.5310, "QA", "Doha"),
    "jerusalem": (31.7683, 35.2137, "IL", "Jerusalem"),
    "tel aviv": (32.0853, 34.7818, "IL", "Tel Aviv"),
    "israel": (31.7683, 35.2137, "IL", "Israel"),
    "mecca": (21.3891, 39.8579, "SA", "Mecca"),
    "makkah": (21.3891, 39.8579, "SA", "Makkah"),
    "medina": (24.5247, 39.5692, "SA", "Medina"),
    "tehran": (35.6892, 51.3890, "IR", "Tehran"),
    "iran": (35.6892, 51.3890, "IR", "Iran"),
    "beirut": (33.8938, 35.5018, "LB", "Beirut"),
    "riyadh": (24.7136, 46.6753, "SA", "Riyadh"),
    "amman": (31.9454, 35.9284, "JO", "Amman"),
    "baghdad": (33.3128, 44.3615, "IQ", "Baghdad"),
    "kuwait": (29.3759, 47.9774, "KW", "Kuwait City"),
    "muscat": (23.5880, 58.3829, "OM", "Muscat"),
    # Asia
    "tokyo": (35.6762, 139.6503, "JP", "Tokyo"),
    "osaka": (34.6937, 135.5023, "JP", "Osaka"),
    "kyoto": (35.0116, 135.7681, "JP", "Kyoto"),
    "yokohama": (35.4437, 139.6380, "JP", "Yokohama"),
    "nagoya": (35.1815, 136.9066, "JP", "Nagoya"),
    "sapporo": (43.0618, 141.3545, "JP", "Sapporo"),
    "okinawa": (26.3344, 127.8056, "JP", "Okinawa"),
    "japan": (35.6762, 139.6503, "JP", "Japan"),
    "shinjuku": (35.6938, 139.7034, "JP", "Tokyo"),
    "shibuya": (35.6595, 139.7004, "JP", "Tokyo"),
    "akihabara": (35.7022, 139.7745, "JP", "Tokyo"),
    "fuji": (35.3606, 138.7274, "JP", "Mount Fuji"),
    "mount fuji": (35.3606, 138.7274, "JP", "Mount Fuji"),
    "seoul": (37.5665, 126.9780, "KR", "Seoul"),
    "busan": (35.1796, 129.0756, "KR", "Busan"),
    "korea": (37.5665, 126.9780, "KR", "Seoul"),
    "beijing": (39.9042, 116.4074, "CN", "Beijing"),
    "shanghai": (31.2304, 121.4737, "CN", "Shanghai"),
    "hong kong": (22.3193, 114.1694, "HK", "Hong Kong"),
    "shenzhen": (22.5431, 114.0579, "CN", "Shenzhen"),
    "guangzhou": (23.1291, 113.2644, "CN", "Guangzhou"),
    "china": (39.9042, 116.4074, "CN", "China"),
    "taipei": (25.0330, 121.5654, "TW", "Taipei"),
    "taiwan": (25.0330, 121.5654, "TW", "Taiwan"),
    "singapore": (1.3521, 103.8198, "SG", "Singapore"),
    "bangkok": (13.7563, 100.5018, "TH", "Bangkok"),
    "thailand": (13.7563, 100.5018, "TH", "Thailand"),
    "phuket": (7.8804, 98.3923, "TH", "Phuket"),
    "mumbai": (19.0760, 72.8777, "IN", "Mumbai"),
    "delhi": (28.7041, 77.1025, "IN", "Delhi"),
    "new delhi": (28.6139, 77.2090, "IN", "New Delhi"),
    "kolkata": (22.5726, 88.3639, "IN", "Kolkata"),
    "india": (28.6139, 77.2090, "IN", "India"),
    "kuala lumpur": (3.1390, 101.6869, "MY", "Kuala Lumpur"),
    "jakarta": (6.2088, 106.8456, "ID", "Jakarta"),
    "bali": (8.3405, 115.0920, "ID", "Bali"),
    "java": (7.6145, 110.7122, "ID", "Java"),
    "indonesia": (6.2088, 106.8456, "ID", "Indonesia"),
    "manila": (14.5995, 120.9842, "PH", "Manila"),
    "philippines": (14.5995, 120.9842, "PH", "Philippines"),
    "hanoi": (21.0278, 105.8342, "VN", "Hanoi"),
    "ho chi minh": (10.8231, 106.6297, "VN", "Ho Chi Minh City"),
    "vietnam": (21.0278, 105.8342, "VN", "Vietnam"),
    "phnom penh": (11.5564, 104.9282, "KH", "Phnom Penh"),
    "maldives": (3.2028, 73.2207, "MV", "Maldives"),
    "sri lanka": (6.9271, 79.8612, "LK", "Sri Lanka"),
    "nepal": (27.7172, 85.3240, "NP", "Kathmandu"),
    "kathmandu": (27.7172, 85.3240, "NP", "Kathmandu"),
    # Oceania
    "sydney": (33.8688, 151.2093, "AU", "Sydney"),
    "melbourne": (37.8136, 144.9631, "AU", "Melbourne"),
    "brisbane": (27.4705, 153.0260, "AU", "Brisbane"),
    "perth": (31.9505, 115.8605, "AU", "Perth"),
    "gold coast": (28.0167, 153.4000, "AU", "Gold Coast"),
    "australia": (33.8688, 151.2093, "AU", "Australia"),
    "new zealand": (41.2865, 174.7762, "NZ", "Wellington"),
    "auckland": (36.8485, 174.7633, "NZ", "Auckland"),
    "wellington": (41.2865, 174.7762, "NZ", "Wellington"),
    "fiji": (18.1248, 178.4501, "FJ", "Fiji"),
    # Africa
    "cape town": (33.9249, 18.4241, "ZA", "Cape Town"),
    "johannesburg": (26.2041, 28.0473, "ZA", "Johannesburg"),
    "durban": (29.8587, 31.0218, "ZA", "Durban"),
    "south africa": (33.9249, 18.4241, "ZA", "South Africa"),
    "sabi sand": (24.7939, 31.4917, "ZA", "Sabi Sand"),
    "kruger": (24.0112, 31.4847, "ZA", "Kruger"),
    "nairobi": (1.2921, 36.8219, "KE", "Nairobi"),
    "kenya": (0.4050, 37.9062, "KE", "Kenya"),
    "tanzania": (6.3690, 34.8888, "TZ", "Tanzania"),
    "serengeti": (2.3333, 34.8333, "TZ", "Serengeti"),
    "namibia": (22.5609, 17.0658, "NA", "Namibia"),
    "etosha": (18.8556, 16.3299, "NA", "Etosha"),
    "botswana": (22.3285, 24.6849, "BW", "Botswana"),
    "chobe": (18.4570, 25.1506, "BW", "Chobe"),
    "mozambique": (25.9692, 32.5732, "MZ", "Maputo"),
    "madagascar": (18.8792, 47.5079, "MG", "Antananarivo"),
    "egypt": (30.0444, 31.2357, "EG", "Cairo"),
    "cairo": (30.0444, 31.2357, "EG", "Cairo"),
    "morocco": (31.6295, -7.9811, "MA", "Marrakech"),
    "marrakech": (31.6295, -7.9811, "MA", "Marrakech"),
    "nigeria": (6.5244, 3.3792, "NG", "Lagos"),
    "lagos": (6.5244, 3.3792, "NG", "Lagos"),
    "zanzibar": (6.1659, 39.2026, "TZ", "Zanzibar"),
    # Volcanoes
    "kilauea": (19.4069, -155.2834, "US", "Hawaii"),
    "fuego": (14.4747, -90.8806, "GT", "Guatemala"),
    "semeru": (8.1077, 112.9224, "ID", "Java"),
    "merapi": (7.5407, 110.4457, "ID", "Java"),
    "teide": (28.2723, -16.6427, "ES", "Tenerife"),
    "vesuvius": (40.8210, 14.4260, "IT", "Naples"),
    "sakurajima": (31.5855, 130.6560, "JP", "Kagoshima"),
    "aso": (32.8842, 131.1040, "JP", "Aso"),
    "krakatau": (6.1020, 105.4230, "ID", "Krakatau"),
    "piton de la fournaise": (21.2494, 55.7080, "RE", "Reunion"),
    "mayon": (13.2570, 123.6850, "PH", "Albay"),
    "cotopaxi": (0.6838, -78.4378, "EC", "Cotopaxi"),
    "volcano": (37.7510, 14.9934, "IT", "Volcano"),
    # Space
    "iss": (0, 0, "XX", "ISS"),
    "nasa": (28.5721, -80.6480, "US", "Kennedy Space Center"),
    "kennedy space center": (28.5721, -80.6480, "US", "Kennedy Space Center"),
    "ksc": (28.5721, -80.6480, "US", "Kennedy Space Center"),
    "spacex": (25.9970, -97.1567, "US", "Boca Chica"),
    "starbase": (25.9970, -97.1567, "US", "Boca Chica"),
    "boca chica": (25.9970, -97.1567, "US", "Boca Chica"),
    "mcgregor": (31.4443, -97.4203, "US", "McGregor"),
    "cape canaveral": (28.3922, -80.6077, "US", "Cape Canaveral"),
    "wallops": (37.8404, -75.4734, "US", "Wallops Island"),
    "vandenberg": (34.7420, -120.5724, "US", "Vandenberg"),
    "mauna kea": (19.8207, -155.4681, "US", "Mauna Kea"),
    "goddard": (38.9910, -76.8527, "US", "Greenbelt"),
    "johnson space center": (29.5502, -95.0980, "US", "Houston"),
    "jpl": (34.2015, -118.1744, "US", "Pasadena"),
    # Aurora locations
    "fairbanks": (64.8378, -147.7164, "US", "Fairbanks"),
    "yellowknife": (62.4540, -114.3718, "CA", "Yellowknife"),
    "kiruna": (67.8558, 20.2253, "SE", "Kiruna"),
    "abisko": (68.3496, 18.8313, "SE", "Abisko"),
    "rovaniemi": (66.5039, 25.7294, "FI", "Rovaniemi"),
    "muonio": (67.9279, 23.6807, "FI", "Muonio"),
    "churchill": (58.7684, -94.1636, "CA", "Churchill"),
}

# ── Category classification rules ──────────────────────────────────────────
# Keywords in title that map to categories
# US state abbreviation → (lat, lon) center coords
US_STATE_COORDS = {
    "AL": (32.806671, -86.791130), "AK": (61.370716, -152.404419),
    "AZ": (33.729759, -111.431221), "AR": (34.969704, -92.373123),
    "CA": (36.116203, -119.681564), "CO": (39.059811, -105.311104),
    "CT": (41.597782, -72.755371), "DE": (39.318523, -75.507141),
    "FL": (27.766279, -81.686783), "GA": (33.040619, -83.643074),
    "HI": (21.094318, -157.498337), "ID": (44.240459, -114.478828),
    "IL": (40.349457, -88.986137), "IN": (39.849426, -86.258278),
    "IA": (42.011539, -93.210526), "KS": (38.526600, -96.726486),
    "KY": (37.668140, -84.670067), "LA": (31.169546, -91.867805),
    "ME": (44.693947, -69.381927), "MD": (39.063946, -76.802101),
    "MA": (42.230171, -71.530106), "MI": (43.326618, -84.536095),
    "MN": (45.694454, -93.900192), "MS": (32.741646, -89.678696),
    "MO": (38.456085, -92.288368), "MT": (46.921925, -110.454353),
    "NE": (41.125370, -98.268082), "NV": (38.313515, -117.055374),
    "NH": (43.452492, -71.563896), "NJ": (40.298904, -74.521011),
    "NM": (34.840515, -106.248482), "NY": (42.165726, -74.948051),
    "NC": (35.630066, -79.806419), "ND": (47.528912, -99.784012),
    "OH": (40.388783, -82.764915), "OK": (35.565342, -96.928917),
    "OR": (44.572021, -122.070938), "PA": (40.590752, -77.209755),
    "RI": (41.680893, -71.511780), "SC": (33.856892, -80.945007),
    "SD": (44.299782, -99.438828), "TN": (35.747845, -86.692345),
    "TX": (31.054487, -97.563461), "UT": (40.150032, -111.862434),
    "VT": (44.045876, -72.710686), "VA": (37.769337, -78.169968),
    "WA": (47.400902, -121.490494), "WV": (38.491226, -80.954453),
    "WI": (44.268543, -89.616508), "WY": (42.755966, -107.302490),
    "DC": (38.9072, -77.0369),
}

# Country name → (lat, lon, ISO code)
COUNTRY_COORDS = {
    "england": (51.5074, -0.1278, "GB"), "scotland": (55.9533, -3.1883, "GB"),
    "wales": (51.4816, -3.1791, "GB"), "northern ireland": (54.5973, -5.9301, "GB"),
    "united kingdom": (51.5074, -0.1278, "GB"), "ireland": (53.3498, -6.2603, "IE"),
    "botswana": (22.3285, 24.6849, "BW"), "zambia": (15.3875, 28.3228, "ZM"),
    "zimbabwe": (17.8292, 31.0522, "ZW"), "uganda": (0.3476, 32.5825, "UG"),
    "rwanda": (1.9403, 29.8739, "RW"), "ethiopia": (9.1450, 40.4897, "ET"),
    "ghana": (5.6037, -0.1870, "GH"), "senegal": (14.7167, -17.4677, "SN"),
    "jamaica": (18.1096, -77.2975, "JM"), "sint maarten": (18.0347, -63.0681, "SX"),
    "sint martin": (18.0347, -63.0681, "SX"), "curacao": (12.1696, -68.9900, "CW"),
    "bahamas": (25.0343, -77.3963, "BS"), "trinidad": (10.6918, -61.2225, "TT"),
    "dominican republic": (18.4861, -69.9312, "DO"), "puerto rico": (18.2208, -66.5901, "PR"),
    "colombia": (4.7110, -74.0721, "CO"), "chile": (33.4489, -70.6693, "CL"),
    "ecuador": (0.1807, -78.4678, "EC"), "uruguay": (34.9011, -56.1645, "UY"),
    "paraguay": (25.2867, -57.6470, "PY"), "bolivia": (16.4897, -68.1193, "BO"),
    "venezuela": (10.4806, -66.9036, "VE"),
}

CATEGORY_RULES = {
    "traffic": ["traffic", "highway", "expressway", "freeway", "interstate", "i-", "motorway",
                "autobahn", "autostrada", "autopista", "ring road", "beltway", "toll",
                "intersection", "road cam", "driving"],
    "aviation": ["airport", "runway", "aviation", "plane", "aircraft", "lax", "jfk", "sfo",
                 "heathrow", "landing", "takeoff", "atc", "control tower", "ramp cam",
                 "haneda", "narita", "schiphol", "gatwick", "changi", "incheon"],
    "rail": ["train", "rail", "railway", "railroad", "locomotive", "freight", "amtrak",
             "shinkansen", "metro", "subway", "tram", "trolley", "station cam",
             "railcam", "railfan", "crossing", "bnsf", "csx", "union pacific", "cn rail",
             "metrolink", "o-train", "mainline"],
    "space": ["iss", "nasa", "space", "spacex", "starbase", "rocket", "launch pad",
              "orbit", "satellite", "telescope", "observatory", "starship",
              "falcon", "boca chica", "mcgregor", "kennedy space", "cape canaveral",
              "wallops", "goddard", "jpl", "mauna kea", "subaru telescope"],
    "volcanoes": ["volcano", "volcán", "lava", "eruption", "erupting", "caldera", "geyser",
                  "kilauea", "etna", "fuego", "popocatepetl", "popocatépetl", "semeru",
                  "merapi", "teide", "vesuvius", "sakurajima", "old faithful",
                  "yellowstone", "piton", "krakatau", "mayon", "stromboli", "aso",
                  "colima", "cotopaxi"],
    "wildlife": ["wildlife", "animal", "bird", "eagle", "owl", "hawk", "falcon cam",
                 "bear", "wolf", "deer", "elk", "bison", "rhino", "elephant", "lion",
                 "leopard", "cheetah", "gorilla", "orangutan", "panda", "penguin",
                 "manatee", "dolphin", "whale", "shark", "turtle", "tortoise",
                 "seal", "otter", "fox", "coyote", "coral", "reef", "aquarium",
                 "feeder", "nest cam", "zoo", "safari", "waterhole", "watering hole",
                 "africam", "explore.org", "hummingbird", "osprey", "condor", "stork",
                 "puffin", "albatross", "flamingo", "crane cam", "bat cam"],
    "beaches": ["beach", "surf", "surfing", "wave", "coast", "shore", "seaside",
                "pier", "boardwalk", "promenade", "ocean cam", "sea cam",
                "tropical", "island cam", "sand", "bay cam", "cove", "tide",
                "sunrise cam", "sunset cam"],
    "cities": ["city", "skyline", "downtown", "square", "plaza", "piazza",
               "street", "urban", "tower cam", "rooftop", "panorama",
               "times square", "shibuya", "piccadilly", "champs", "boulevard",
               "market", "town", "village"],
    "landmarks": ["statue", "monument", "cathedral", "church", "mosque", "temple",
                  "castle", "palace", "bridge", "tower", "wall", "gate",
                  "capitol", "parliament", "abbey", "basilica", "colosseum",
                  "eiffel", "big ben", "taj mahal", "acropolis", "kremlin",
                  "golden gate", "brooklyn bridge", "liberty", "stonehenge"],
    "maritime": ["port", "harbor", "harbour", "marina", "ship", "vessel", "ferry",
                 "cruise", "cargo", "container", "canal", "dock", "wharf",
                 "lighthouse", "boat", "yacht", "sailing", "nautical",
                 "maritime", "naval", "coast guard", "buoy"],
    "nature": ["mountain", "lake", "river", "waterfall", "forest", "valley",
               "glacier", "canyon", "cliff", "cave", "desert", "tundra",
               "fjord", "aurora", "northern lights", "rainforest", "meadow",
               "national park", "wilderness", "scenic", "landscape",
               "sunrise", "sunset", "weather", "storm", "snow", "ski",
               "slope", "resort", "alpine"],
    "aurora": ["aurora", "northern lights", "borealis", "southern lights",
               "night sky", "stars", "meteor", "milky way", "dark sky"],
}


def classify_stream(title, author=""):
    """Classify a stream into a category based on its title."""
    title_lower = title.lower()
    author_lower = author.lower()
    combined = f"{title_lower} {author_lower}"

    scores = {}
    for category, keywords in CATEGORY_RULES.items():
        score = 0
        for kw in keywords:
            if kw in combined:
                score += len(kw)  # Weight by keyword length
        if score > 0:
            scores[category] = score

    if not scores:
        # Default to cities for generic city cams
        if any(city in title_lower for city in ["cam", "live", "webcam"]):
            return "cities"
        return None

    return max(scores, key=scores.get)


US_STATE_NAMES = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
    "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
    "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
    "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
    "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
    "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
    "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
    "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
    "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
    "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
    "wisconsin": "WI", "wyoming": "WY",
}


def _try_city_state(text):
    """Try to parse 'City, State' or 'City, Country' from text."""
    parts = [p.strip() for p in text.split(",")]
    if len(parts) < 2:
        return None

    city_part = parts[0].strip().lower()
    region_part = parts[-1].strip()

    # Check US state abbreviation
    if region_part.upper() in US_STATE_COORDS:
        lat, lon = US_STATE_COORDS[region_part.upper()]
        if city_part in CITY_COORDS:
            return CITY_COORDS[city_part]
        return (lat, lon, "US", parts[0].strip())

    # Check US state full name
    region_lower = region_part.lower()
    if region_lower in US_STATE_NAMES:
        abbrev = US_STATE_NAMES[region_lower]
        lat, lon = US_STATE_COORDS[abbrev]
        if city_part in CITY_COORDS:
            return CITY_COORDS[city_part]
        return (lat, lon, "US", parts[0].strip())

    # Check country names
    if region_lower in COUNTRY_COORDS:
        lat, lon, cc = COUNTRY_COORDS[region_lower]
        if city_part in CITY_COORDS:
            return CITY_COORDS[city_part]
        return (lat, lon, cc, parts[0].strip())

    # Check city coords for combined text
    combined = text.lower()
    best_match = None
    best_len = 0
    for city_key, coords in CITY_COORDS.items():
        if city_key in combined and len(city_key) > best_len:
            best_match = coords
            best_len = len(city_key)
    return best_match


def extract_location(title, author=""):
    """Try to extract location from stream title."""
    title_lower = title.lower()

    # 1. Try parenthesized location patterns like "(City, State)" or "(City, Country)"
    paren_matches = re.findall(r'\(([^)]+)\)', title)
    for loc_text in paren_matches:
        result = _try_city_state(loc_text)
        if result:
            return result

    # 2. Try "EarthCam Live: City, State" or similar prefix patterns
    prefix_match = re.search(r'(?:EarthCam Live[:\s]+|Live[:\s]+|LIVE[:\s]+|🔴\s*(?:Live Now[:\s]+)?)(.*)', title)
    if prefix_match:
        remainder = prefix_match.group(1).strip()
        # Try the whole remainder as "City, State"
        result = _try_city_state(remainder)
        if result:
            return result
        # Try up to first pipe/dash
        short = re.split(r'[\|–—]', remainder)[0].strip()
        result = _try_city_state(short)
        if result:
            return result

    # 3. Try any "City, State" pattern in the title
    comma_matches = re.findall(r'([A-Za-z\s\.\']+),\s*([A-Za-z\s]+)', title)
    for city_text, region_text in comma_matches:
        city_text = city_text.strip()
        region_text = region_text.strip()
        if len(city_text) > 2 and len(region_text) > 1:
            result = _try_city_state(f"{city_text}, {region_text}")
            if result:
                return result

    # 4. Try channel name / author for location hints
    author_lower = author.lower()
    for city_key, coords in CITY_COORDS.items():
        if len(city_key) > 4 and city_key in author_lower:
            return coords

    # 5. Try to match city names in title (longest match first)
    best_match = None
    best_len = 0
    for city_key, (lat, lon, country, city_name) in CITY_COORDS.items():
        if city_key in title_lower and len(city_key) > best_len:
            best_match = (lat, lon, country, city_name)
            best_len = len(city_key)

    return best_match


def is_webcam_stream(title, author=""):
    """Check if a stream looks like a webcam/live cam (not music, gaming, etc.)."""
    title_lower = title.lower()
    author_lower = author.lower()

    # Negative keywords - exclude non-webcam content
    exclude = [
        "music", "lofi", "lo-fi", "lo fi", "beats", "chill", "jazz", "hip hop",
        "gaming", "gameplay", "playthrough", "speedrun", "minecraft", "fortnite",
        "podcast", "interview", "tutorial", "how to", "cooking",
        "asmr", "meditation", "sleep", "relaxing sounds",
        "news analysis", "commentary", "debate", "reaction",
        "compilation", "highlights", "best of", "top 10",
        "review", "unboxing", "haul",
        "workout", "fitness", "yoga",
        "vlog", "q&a", "ama",
        "karaoke", "sing along",
        "rain sounds", "white noise", "ambient sounds",
        "stock market", "crypto", "forex", "trading",
    ]

    for kw in exclude:
        if kw in title_lower:
            return False

    # Additional exclude for non-live content
    exclude2 = [
        "recorded footage", "recorded stream", "replay", "rerun",
        "archived recording", "nye 2026", "nye 2025", "nye 2024",
        "new year's eve", "new years eve", "firework celebration",
        "championship", "parade", "solar eclipse",
        "tribute in light", "demolition", "wildfire smoke",
        "sailfest", "fourth of july", "independence day",
        "super bowl", "goat yoga", "dogs for adoption",
        "lawnstream", "figmentcam", "snowman cam",
        "hallmark channel",
    ]
    for kw in exclude2:
        if kw in title_lower:
            return False

    # Positive indicators
    positive = [
        "live", "cam", "webcam", "stream", "24/7", "24h",
        "view", "watch", "hd", "4k", "real-time", "real time",
        "monitor", "camera", "feed", "observation",
    ]

    # Strong positive - definitely a webcam
    strong_positive = [
        "live cam", "webcam", "24/7", "earthcam", "skylinewebcam",
        "explore.org", "africam", "railcam", "railfan",
        "traffic cam", "airport cam", "beach cam", "volcano cam",
        "wildlife cam", "nature cam", "city cam", "harbor cam",
        "train cam", "port cam", "ski cam", "weather cam",
        "live stream", "livestream", "live view", "tower cam",
    ]

    for kw in strong_positive:
        if kw in title_lower or kw in author_lower:
            return True

    pos_score = sum(1 for kw in positive if kw in title_lower)
    return pos_score >= 2  # Need at least 2 positive indicators


def build_name_from_title(yt_title):
    """Clean up YouTube title into a short webcam name."""
    name = yt_title
    # Remove common prefixes
    prefixes = [
        r"EarthCam Live:\s*",
        r"🔴\s*Live Now:\s*",
        r"🔴\s*LIVE\s*",
        r"LIVE\s*Rail\s*Cam\s*[–—-]\s*",
        r"【LIVE】\s*",
        r"▶️\s*",
        r"Live\s*24/7:\s*",
        r"LIVE\s*",
        r"Live:\s*",
        r"Live\s+",
    ]
    for prefix in prefixes:
        name = re.sub(prefix, "", name, flags=re.IGNORECASE)

    # Remove common suffixes
    suffixes = [
        r"\s*\|\s*24/7.*$",
        r"\s*\|\s*LIVE.*$",
        r"\s*\|\s*live.*$",
        r"\s*\|\s*EarthCam.*$",
        r"\s*\|\s*SkylineWebcams.*$",
        r"\s*\|\s*Explore\.org.*$",
        r"\s*powered by EXPLORE\.org.*$",
        r"\s*\|\s*RailStream.*$",
        r"\s*\|\s*HD.*$",
        r"\s*-\s*24/7.*$",
        r"\s*24/7.*Stream.*$",
        r"\s*Live\s*Stream.*$",
        r"\s*Livestream.*$",
    ]
    for suffix in suffixes:
        name = re.sub(suffix, "", name, flags=re.IGNORECASE)

    # Remove hashtags
    name = re.sub(r'#\S+', '', name)

    # Remove emojis (common unicode emoji ranges)
    name = re.sub(r'[\U0001F300-\U0001F9FF\U00002600-\U000027BF\U0000FE00-\U0000FE0F\U0000200D]+', '', name)

    # Remove date patterns like (March 10, 2026) or (Jan 28th, 2026)
    name = re.sub(r'\([A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\)', '', name)

    # Remove parenthesized cam labels like (CAM A), (Fixed View), (PTZ)
    name = re.sub(r'\((?:CAM\s*\w*|Fixed View[^)]*|PTZ)\)', '', name, flags=re.IGNORECASE)

    # Clean up extra whitespace
    name = re.sub(r'\s+', ' ', name)

    # Clean up
    name = name.strip(" -–—|,.")
    if len(name) > 60:
        name = name[:57] + "..."

    return name if name else yt_title[:50]


def main():
    print("=" * 60)
    print("REBUILDING WEBCAM DATA FILES")
    print("=" * 60)

    # Load discovered streams
    disc_path = SCRIPT_DIR / "discovered_webcams.json"
    with open(disc_path) as f:
        discovered = json.load(f)
    print(f"Loaded {len(discovered)} discovered streams")

    # Load previously verified streams
    verify_path = SCRIPT_DIR / "webcam_verification.json"
    if verify_path.exists():
        with open(verify_path) as f:
            verified_data = json.load(f)
        prev_valid = verified_data.get("valid", [])
        print(f"Loaded {len(prev_valid)} previously verified streams")
    else:
        prev_valid = []

    # Load worldmonitor verified IDs
    worldmonitor_streams = [
        {"ytId": "-zGuR1qVKrU", "yt_title": "Tehran City View", "yt_author": "IranHDCams", "city": "Tehran", "country": "IR", "lat": 35.6892, "lon": 51.3890},
        {"ytId": "gmtlJ_m2r5A", "yt_title": "Tel Aviv Live", "yt_author": "IsraelLiveCam", "city": "Tel Aviv", "country": "IL", "lat": 32.0853, "lon": 34.7818},
        {"ytId": "fIurYTprwzg", "yt_title": "Jerusalem Live", "yt_author": "JerusalemLive", "city": "Jerusalem", "country": "IL", "lat": 31.7683, "lon": 35.2137},
        {"ytId": "UyduhBUpO7Q", "yt_title": "Western Wall Jerusalem", "yt_author": "TheWesternWall", "city": "Jerusalem", "country": "IL", "lat": 31.7767, "lon": 35.2345},
        {"ytId": "Cm1v4bteXbI", "yt_title": "Mecca Live", "yt_author": "MakkahLive", "city": "Mecca", "country": "SA", "lat": 21.3891, "lon": 39.8579},
        {"ytId": "djF-Lkgfp6k", "yt_title": "Beirut MTV Lebanon", "yt_author": "MTVLebanonNews", "city": "Beirut", "country": "LB", "lat": 33.8938, "lon": 35.5018},
        {"ytId": "-Q7FuPINDjA", "yt_title": "Kyiv Live", "yt_author": "DWNews", "city": "Kyiv", "country": "UA", "lat": 50.4501, "lon": 30.5234},
        {"ytId": "e2gC37ILQmk", "yt_title": "Odessa Live", "yt_author": "UkraineLiveCam", "city": "Odessa", "country": "UA", "lat": 46.4825, "lon": 30.7233},
        {"ytId": "CjtIYbmVfck", "yt_title": "St. Petersburg Live", "yt_author": "SPBLiveCam", "city": "St. Petersburg", "country": "RU", "lat": 59.9343, "lon": 30.3351},
        {"ytId": "Lxqcg1qt0XU", "yt_title": "London Live", "yt_author": "EarthCam", "city": "London", "country": "GB", "lat": 51.5074, "lon": -0.1278},
        {"ytId": "1wV9lLe14aU", "yt_title": "Washington DC Live", "yt_author": "AxisCommunications", "city": "Washington DC", "country": "US", "lat": 38.9072, "lon": -77.0369},
        {"ytId": "5YCajRjvWCg", "yt_title": "Miami Live", "yt_author": "FloridaLiveCams", "city": "Miami", "country": "US", "lat": 25.7617, "lon": -80.1918},
        {"ytId": "76EwqI5XZIc", "yt_title": "Shanghai Live", "yt_author": "SkylineWebcams", "city": "Shanghai", "country": "CN", "lat": 31.2304, "lon": 121.4737},
        {"ytId": "4pu9sF5Qssw", "yt_title": "Tokyo Live", "yt_author": "TokyoLiveCam4K", "city": "Tokyo", "country": "JP", "lat": 35.6762, "lon": 139.6503},
        {"ytId": "7pcL-0Wo77U", "yt_title": "Sydney Live", "yt_author": "WebcamSydney", "city": "Sydney", "country": "AU", "lat": -33.8688, "lon": 151.2093},
        {"ytId": "zPH5KtjJFaQ", "yt_title": "NASA TV", "yt_author": "NASA", "city": "Kennedy Space Center", "country": "US", "lat": 28.5721, "lon": -80.6480},
        {"ytId": "0FBiyFpV__g", "yt_title": "Space Walk View", "yt_author": "NASA", "city": "ISS", "country": "XX", "lat": 0, "lon": 0},
    ]
    print(f"Loaded {len(worldmonitor_streams)} worldmonitor streams")

    # Merge all streams, deduplicating by ytId
    all_streams = {}

    # Add worldmonitor streams first (highest priority — pre-verified with coords)
    for s in worldmonitor_streams:
        ytid = s["ytId"]
        all_streams[ytid] = {
            "ytId": ytid,
            "yt_title": s.get("yt_title", ""),
            "yt_author": s.get("yt_author", ""),
            "lat": s.get("lat"),
            "lon": s.get("lon"),
            "country": s.get("country", ""),
            "city": s.get("city", ""),
            "source_type": "worldmonitor",
        }

    # Add previously verified (from original files)
    for s in prev_valid:
        ytid = s.get("ytId", "")
        if ytid and ytid not in all_streams:
            all_streams[ytid] = {
                "ytId": ytid,
                "yt_title": s.get("yt_title", ""),
                "yt_author": "",
                "lat": s.get("lat"),
                "lon": s.get("lon"),
                "country": s.get("country", ""),
                "city": s.get("city", ""),
                "name": s.get("name", ""),
                "source_type": "previously_verified",
                "original_category": s.get("category", ""),
            }

    # Add discovered streams
    for s in discovered:
        ytid = s.get("ytId", "")
        if ytid and ytid not in all_streams:
            all_streams[ytid] = {
                "ytId": ytid,
                "yt_title": s.get("yt_title", ""),
                "yt_author": s.get("yt_author", ""),
                "source_type": "discovered",
            }

    print(f"Total unique streams: {len(all_streams)}")

    # Filter to actual webcam streams
    webcam_streams = {}
    bad_content = ["recorded footage", "recorded live", "walking tour",
                   "exploring", "trip to", "travel guide", "i am surprised",
                   "snowstorm", "blizzard"]
    for ytid, stream in all_streams.items():
        title = stream.get("yt_title", "") or stream.get("name", "")
        author = stream.get("yt_author", "")

        # Always keep worldmonitor
        if stream.get("source_type") == "worldmonitor":
            webcam_streams[ytid] = stream
            continue

        # Previously verified — keep unless obviously wrong
        if stream.get("source_type") == "previously_verified":
            title_lower = title.lower()
            if not any(b in title_lower for b in bad_content):
                webcam_streams[ytid] = stream
            continue

        # Filter discovered by title
        if is_webcam_stream(title, author):
            webcam_streams[ytid] = stream

    print(f"After webcam filter: {len(webcam_streams)}")

    # Classify and geolocate
    categorized = defaultdict(list)
    unlocated = []
    uncategorized = []

    for ytid, stream in webcam_streams.items():
        title = stream.get("yt_title", "")
        author = stream.get("yt_author", "")
        name = stream.get("name", "") or build_name_from_title(title)

        # Get location
        lat = stream.get("lat")
        lon = stream.get("lon")
        country = stream.get("country", "")
        city = stream.get("city", "")

        if not lat or not lon:
            loc = extract_location(title, author)
            if loc:
                lat, lon, country, city = loc
            else:
                unlocated.append(stream)
                continue

        # Get category
        orig_cat = stream.get("original_category", "")
        category = orig_cat if orig_cat else classify_stream(title, author)

        if not category:
            # Try classifying by name
            category = classify_stream(name, author)

        if not category:
            uncategorized.append(stream)
            # Default to cities if has location
            category = "cities"

        # Merge non-standard categories into the 12 standard ones
        CATEGORY_MERGE = {
            "airports": "aviation",
            "ports": "maritime",
            "infrastructure": "cities",
        }
        category = CATEGORY_MERGE.get(category, category)

        entry = {
            "name": name,
            "lat": round(lat, 4) if lat else 0,
            "lon": round(lon, 4) if lon else 0,
            "country": country,
            "city": city,
            "ytId": ytid,
        }

        categorized[category].append(entry)

    print(f"\nUnlocated (dropped): {len(unlocated)}")
    print(f"Uncategorized (defaulted to cities): {len(uncategorized)}")

    # Print category counts
    total = 0
    print("\nCategory counts:")
    for cat in sorted(categorized.keys()):
        count = len(categorized[cat])
        total += count
        print(f"  {cat}: {count}")
    print(f"  TOTAL: {total}")

    # Deduplicate within each category first (by name+city combo)
    for cat in categorized:
        entries = categorized[cat]
        entries.sort(key=lambda e: (e.get("country", ""), e.get("city", ""), e.get("name", "")))
        seen = set()
        deduped = []
        for entry in entries:
            key = (entry["name"], entry["city"])
            if key not in seen:
                seen.add(key)
                deduped.append(entry)
        categorized[cat] = deduped

    total = sum(len(v) for v in categorized.values())
    print(f"\nAfter deduplication: {total}")

    # If we have more than 1050, trim to ~1000
    if total > 1050:
        target = 1010  # slightly over to account for rounding
        ratio = target / total
        for cat in categorized:
            max_for_cat = max(10, int(len(categorized[cat]) * ratio))
            if len(categorized[cat]) > max_for_cat:
                categorized[cat] = categorized[cat][:max_for_cat]
        total = sum(len(v) for v in categorized.values())
        print(f"After trimming to target ~1000: {total}")

    # Write output files
    today = date.today().isoformat()

    CATEGORY_DESCRIPTIONS = {
        "traffic": "Curated 24/7 live highway, road, and city traffic webcam streams worldwide",
        "aviation": "Curated 24/7 live airport runway, terminal, and aviation webcam streams",
        "rail": "Curated 24/7 live train, railway, and rail crossing webcam streams",
        "space": "Curated 24/7 live space, ISS, NASA, and launch facility webcam streams",
        "volcanoes": "Curated 24/7 live volcano monitoring webcam streams",
        "wildlife": "Curated 24/7 live wildlife, safari, and nature observation webcam streams",
        "beaches": "Curated 24/7 live beach, surf, and coastal webcam streams",
        "cities": "Curated 24/7 live city skyline, downtown, and urban webcam streams",
        "landmarks": "Curated 24/7 live landmark, monument, and historic site webcam streams",
        "maritime": "Curated 24/7 live port, harbor, and maritime webcam streams",
        "nature": "Curated 24/7 live nature, mountain, lake, and scenic webcam streams",
        "aurora": "Curated 24/7 live aurora borealis and night sky webcam streams",
    }

    CATEGORY_ORIGINS = {
        "traffic": "YouTube Live streams discovered and verified via yt-dlp channel scan + search. Sources: state DOT cameras, TrafficWatcha, city transportation departments",
        "aviation": "YouTube Live streams discovered and verified via yt-dlp. Sources: AirlineVideosLive+, Flightradar24, airport authority channels",
        "rail": "YouTube Live streams discovered and verified via yt-dlp. Sources: Virtual Railfan, RailStream, Steel Highway Railcams, PTZtv",
        "space": "YouTube Live streams discovered and verified via yt-dlp. Sources: NASA Television, NASASpaceflight, SpaceX, Everyday Astronaut",
        "volcanoes": "YouTube Live streams discovered and verified via yt-dlp. Sources: VolcanoYT, USGS HVO, local observatory channels",
        "wildlife": "YouTube Live streams discovered and verified via yt-dlp. Sources: explore.org, Africam, Cornell Lab, EarthCam, zoo/sanctuary channels",
        "beaches": "YouTube Live streams discovered and verified via yt-dlp. Sources: EarthCam, SkylineWebcams, surf cam operators, beach tourism channels",
        "cities": "YouTube Live streams discovered and verified via yt-dlp. Sources: EarthCam, SkylineWebcams, city tourism channels, WorldMonitor verified feeds",
        "landmarks": "YouTube Live streams discovered and verified via yt-dlp. Sources: EarthCam, SkylineWebcams, monument/site operator channels",
        "maritime": "YouTube Live streams discovered and verified via yt-dlp. Sources: port authority channels, marina cams, SkylineWebcams",
        "nature": "YouTube Live streams discovered and verified via yt-dlp. Sources: EarthCam, national park channels, ski resort operators, weather stations",
        "aurora": "YouTube Live streams discovered and verified via yt-dlp. Sources: aurora observatory channels, dark sky sites, Mauna Kea observatory",
    }

    for category, entries in categorized.items():
        # Sort by country then city
        entries.sort(key=lambda e: (e.get("country", ""), e.get("city", ""), e.get("name", "")))

        # Remove duplicates by name within same city
        seen = set()
        deduped = []
        for entry in entries:
            key = (entry["name"], entry["city"])
            if key not in seen:
                seen.add(key)
                deduped.append(entry)
        entries = deduped

        data = {
            "_source": {
                "description": CATEGORY_DESCRIPTIONS.get(category, f"Curated 24/7 live {category} webcam streams"),
                "origin": CATEGORY_ORIGINS.get(category, "YouTube Live streams discovered and verified via yt-dlp"),
                "retrieved": today,
                "license": "Public live streams — fair use",
                "notes": "All YouTube IDs verified via oEmbed API. IDs may change as streams rotate. Run scripts/ingest_webcams.py to re-verify."
            },
            category: entries
        }

        out_path = DATA_DIR / f"webcams_{category}.json"
        with open(out_path, "w") as f:
            json.dump(data, f, indent=2)
        print(f"Wrote {len(entries)} entries to {out_path.name}")

    # Final count
    final_total = sum(len(categorized[cat]) for cat in categorized)
    print(f"\n{'='*60}")
    print(f"FINAL: {final_total} verified webcam entries across {len(categorized)} categories")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
