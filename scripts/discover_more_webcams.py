#!/usr/bin/env python3
"""
Discover ~1000+ NEW live webcam streams on YouTube.
Searches broadly, deduplicates against existing data, and verifies every ID via oEmbed.

Outputs: scripts/new_discovered_webcams.json with verified, geolocated, categorized entries.
Then appends them to existing webcams_*.json files.

USAGE:
  python3 scripts/discover_more_webcams.py
"""

import json
import subprocess
import sys
import time
import urllib.request
import urllib.error
import re
import os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import defaultdict
from datetime import date

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "data" / "layers" / "points"
OEMBED_URL = "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={}&format=json"

# ── Load existing IDs to skip ─────────────────────────────────────────────
def load_existing_ids():
    """Load all ytIds already in the data files."""
    existing = set()
    for f in DATA_DIR.glob("webcams_*.json"):
        with open(f) as fh:
            data = json.load(fh)
        for k, v in data.items():
            if k != "_source" and isinstance(v, list):
                for entry in v:
                    if "ytId" in entry:
                        existing.add(entry["ytId"])
    return existing


# ── YouTube search via yt-dlp ─────────────────────────────────────────────
def ytdlp_search(query, max_results=50):
    """Search YouTube via yt-dlp, return list of {id, title, channel}."""
    try:
        cmd = [
            "yt-dlp",
            f"ytsearch{max_results}:{query}",
            "--flat-playlist",
            "--print", "%(id)s\t%(title)s\t%(channel)s",
            "--no-warnings", "--quiet",
            "--socket-timeout", "10",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
        entries = []
        for line in result.stdout.strip().split("\n"):
            if not line.strip():
                continue
            parts = line.split("\t")
            if len(parts) >= 1 and parts[0]:
                entries.append({
                    "id": parts[0],
                    "title": parts[1] if len(parts) > 1 else "",
                    "channel": parts[2] if len(parts) > 2 else "",
                })
        return entries
    except Exception as e:
        print(f"    [ERR] '{query}': {e}", file=sys.stderr)
        return []


def ytdlp_channel(channel, max_results=100):
    """Get streams from a YouTube channel."""
    try:
        cmd = [
            "yt-dlp",
            f"https://www.youtube.com/@{channel}/streams",
            "--flat-playlist",
            "--print", "%(id)s\t%(title)s",
            "--no-warnings", "--quiet",
            "--socket-timeout", "10",
            "--playlist-end", str(max_results),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
        entries = []
        for line in result.stdout.strip().split("\n"):
            if not line.strip():
                continue
            parts = line.split("\t")
            if len(parts) >= 1 and parts[0]:
                entries.append({
                    "id": parts[0],
                    "title": parts[1] if len(parts) > 1 else "",
                    "channel": channel,
                })
        return entries
    except Exception as e:
        print(f"    [ERR] @{channel}: {e}", file=sys.stderr)
        return []


# ── oEmbed verification ───────────────────────────────────────────────────
def verify_oembed(ytid):
    """Check if a YouTube video ID is valid via oEmbed API. Returns (ytid, valid, title, author)."""
    url = OEMBED_URL.format(ytid)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read())
        return ytid, True, data.get("title", ""), data.get("author_name", "")
    except:
        return ytid, False, "", ""


def batch_verify(ids, workers=15):
    """Verify a list of IDs via oEmbed, return dict of valid {id: (title, author)}."""
    valid = {}
    total = len(ids)
    done = 0

    for batch_start in range(0, total, 50):
        batch = ids[batch_start:batch_start + 50]
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {pool.submit(verify_oembed, vid): vid for vid in batch}
            for future in as_completed(futures):
                ytid, is_valid, title, author = future.result()
                if is_valid:
                    valid[ytid] = (title, author)
                done += 1

        if batch_start + 50 < total:
            time.sleep(0.3)

        print(f"    Verified {min(done, total)}/{total} — {len(valid)} valid so far")

    return valid


# ── Content filter ────────────────────────────────────────────────────────
EXCLUDE_KEYWORDS = [
    "music", "lofi", "lo-fi", "beats", "chill mix", "jazz", "hip hop",
    "gaming", "gameplay", "minecraft", "fortnite", "roblox",
    "podcast", "interview", "tutorial", "how to", "cooking",
    "asmr", "meditation", "sleep sound", "relaxing sound",
    "news analysis", "commentary", "debate", "reaction",
    "compilation", "highlights", "best of", "top 10",
    "review", "unboxing", "haul", "workout", "fitness", "yoga",
    "vlog", "q&a", "karaoke", "rain sounds", "white noise",
    "stock market", "crypto", "forex", "trading",
    "recorded footage", "replay", "rerun", "archived recording",
    "new year's eve", "firework", "championship", "parade",
    "solar eclipse", "super bowl", "demolition",
    "caught on camera", "shooting", "stabbing", "robbery",
    "body cam", "bodycam", "dash cam", "dashcam",
    "security camera", "cctv footage", "drone footage",
    "time lapse", "timelapse", "gopro",
    "night walk", "city walk", "4k walk", "walking tour",
    "walking", "exploring", "trip to", "travel guide",
    "christmas lights", "christmas eve",
    "attack on camera", "was bombed", "destroy camera",
    "crashes caught", "tornado warning", "abc news",
    "relaxation film", "scams", "hidden camera",
    "full episode", "full broadcast", "breaking news",
    "press conference", "testimony", "hearing",
    "product review", "unboxing",
    "confession", "trial", "verdict",
    "shot and killed", "murder", "arrested",
    "fight", "brawl", "confrontation",
    "weather update", "road conditions",
    "complete tour", "festive", "holiday",
]

POSITIVE_KEYWORDS = [
    "live cam", "webcam", "24/7", "earthcam", "skylinewebcam",
    "explore.org", "africam", "railcam", "railfan",
    "traffic cam", "airport cam", "beach cam", "volcano cam",
    "wildlife cam", "nature cam", "city cam", "harbor cam",
    "train cam", "port cam", "ski cam", "weather cam",
    "live stream", "livestream", "live view", "tower cam",
    "bird feeder", "nest cam", "zoo cam", "aquarium cam",
    "surf cam", "mountain cam", "river cam", "lake cam",
    "panorama cam", "ptz", "steelhighway",
    "cruise cam", "marina cam", "canal cam",
    "observatory", "launch pad", "rocket cam",
    "aurora cam", "northern lights", "night sky cam",
    "street cam", "intersection cam", "highway cam",
    "construction cam", "building cam",
]

def is_webcam(title, channel=""):
    """Check if a stream looks like a webcam."""
    t = title.lower()
    c = channel.lower()
    combined = f"{t} {c}"
    for kw in EXCLUDE_KEYWORDS:
        if kw in t:
            return False
    for kw in POSITIVE_KEYWORDS:
        if kw in combined:
            return True
    # Need 2+ weak signals
    weak = ["live", "cam", "stream", "24/7", "view", "watch", "hd", "4k", "monitor", "camera", "feed"]
    return sum(1 for w in weak if w in t) >= 2


# ── Geolocation (import from rebuild script) ──────────────────────────────
# Inline a large city database
CITY_COORDS = {
    # Major world cities
    "new york": (40.7128, -74.0060, "US", "New York"),
    "nyc": (40.7128, -74.0060, "US", "New York"),
    "times square": (40.7580, -73.9855, "US", "New York"),
    "manhattan": (40.7831, -73.9712, "US", "New York"),
    "brooklyn": (40.6782, -73.9442, "US", "New York"),
    "los angeles": (34.0522, -118.2437, "US", "Los Angeles"),
    "hollywood": (34.0928, -118.3287, "US", "Los Angeles"),
    "san francisco": (37.7749, -122.4194, "US", "San Francisco"),
    "chicago": (41.8781, -87.6298, "US", "Chicago"),
    "houston": (29.7604, -95.3698, "US", "Houston"),
    "miami": (25.7617, -80.1918, "US", "Miami"),
    "miami beach": (25.7907, -80.1300, "US", "Miami Beach"),
    "boston": (42.3601, -71.0589, "US", "Boston"),
    "philadelphia": (39.9526, -75.1652, "US", "Philadelphia"),
    "seattle": (47.6062, -122.3321, "US", "Seattle"),
    "washington": (38.9072, -77.0369, "US", "Washington DC"),
    "denver": (39.7392, -104.9903, "US", "Denver"),
    "portland": (45.5152, -122.6784, "US", "Portland"),
    "las vegas": (36.1699, -115.1398, "US", "Las Vegas"),
    "atlanta": (33.7490, -84.3880, "US", "Atlanta"),
    "dallas": (32.7767, -96.7970, "US", "Dallas"),
    "san diego": (32.7157, -117.1611, "US", "San Diego"),
    "phoenix": (33.4484, -112.0740, "US", "Phoenix"),
    "nashville": (36.1627, -86.7816, "US", "Nashville"),
    "austin": (30.2672, -97.7431, "US", "Austin"),
    "honolulu": (21.3069, -157.8583, "US", "Honolulu"),
    "hawaii": (19.8968, -155.5828, "US", "Hawaii"),
    "waikiki": (21.2793, -157.8294, "US", "Honolulu"),
    "key west": (24.5551, -81.7800, "US", "Key West"),
    "anchorage": (61.2181, -149.9003, "US", "Anchorage"),
    "st. louis": (38.6270, -90.1994, "US", "St. Louis"),
    "detroit": (42.3314, -83.0458, "US", "Detroit"),
    "minneapolis": (44.9778, -93.2650, "US", "Minneapolis"),
    "kansas city": (39.0997, -94.5786, "US", "Kansas City"),
    "new orleans": (29.9511, -90.0715, "US", "New Orleans"),
    "salt lake": (40.7608, -111.8910, "US", "Salt Lake City"),
    "jacksonville": (30.3322, -81.6557, "US", "Jacksonville"),
    "orlando": (28.5383, -81.3792, "US", "Orlando"),
    "tampa": (27.9506, -82.4572, "US", "Tampa"),
    "charlotte": (35.2271, -80.8431, "US", "Charlotte"),
    "baltimore": (39.2904, -76.6122, "US", "Baltimore"),
    "pittsburgh": (40.4406, -79.9959, "US", "Pittsburgh"),
    "cleveland": (41.4993, -81.6944, "US", "Cleveland"),
    "indianapolis": (39.7684, -86.1581, "US", "Indianapolis"),
    "columbus": (39.9612, -82.9988, "US", "Columbus"),
    "milwaukee": (43.0389, -87.9065, "US", "Milwaukee"),
    "memphis": (35.1495, -90.0490, "US", "Memphis"),
    "louisville": (38.2527, -85.7585, "US", "Louisville"),
    "san antonio": (29.4241, -98.4936, "US", "San Antonio"),
    "myrtle beach": (33.6891, -78.8867, "US", "Myrtle Beach"),
    "niagara falls": (43.0896, -79.0849, "US", "Niagara Falls"),
    "gatlinburg": (35.7143, -83.5102, "US", "Gatlinburg"),
    "fort lauderdale": (26.1224, -80.1373, "US", "Fort Lauderdale"),
    "savannah": (32.0809, -81.0912, "US", "Savannah"),
    "charleston": (32.7765, -79.9311, "US", "Charleston"),
    "destin": (30.3935, -86.4958, "US", "Destin"),
    "clearwater": (27.9659, -82.8001, "US", "Clearwater"),
    "galveston": (29.3013, -94.7977, "US", "Galveston"),
    "daytona": (29.2108, -81.0228, "US", "Daytona Beach"),
    "huntington beach": (33.6595, -117.9988, "US", "Huntington Beach"),
    "monterey": (36.6002, -121.8947, "US", "Monterey"),
    "hilton head": (32.2163, -80.7526, "US", "Hilton Head"),
    "panama city beach": (30.1766, -85.8055, "US", "Panama City Beach"),
    "pensacola": (30.4213, -87.2169, "US", "Pensacola"),
    "outer banks": (35.5585, -75.4665, "US", "Outer Banks"),
    "newport": (41.4901, -71.3128, "US", "Newport"),
    "cape cod": (41.6688, -70.2962, "US", "Cape Cod"),
    "south padre": (26.1118, -97.1681, "US", "South Padre Island"),
    "ocean city": (38.3365, -75.0849, "US", "Ocean City"),
    "virginia beach": (36.8529, -75.9780, "US", "Virginia Beach"),
    "santa cruz": (36.9741, -122.0308, "US", "Santa Cruz"),
    "laguna beach": (33.5427, -117.7854, "US", "Laguna Beach"),
    "santa barbara": (34.4208, -119.6982, "US", "Santa Barbara"),
    "san jose": (37.3382, -121.8863, "US", "San Jose"),
    "sacramento": (38.5816, -121.4944, "US", "Sacramento"),
    "reno": (39.5296, -119.8138, "US", "Reno"),
    "boise": (43.6150, -116.2023, "US", "Boise"),
    "albuquerque": (35.0844, -106.6504, "US", "Albuquerque"),
    "tucson": (32.2226, -110.9747, "US", "Tucson"),
    "el paso": (31.7619, -106.4850, "US", "El Paso"),
    "omaha": (41.2565, -95.9345, "US", "Omaha"),
    "des moines": (41.5868, -93.6250, "US", "Des Moines"),
    "fort madison": (40.6297, -91.3149, "US", "Fort Madison"),
    "flagstaff": (35.1983, -111.6513, "US", "Flagstaff"),
    "yellowstone": (44.4280, -110.5885, "US", "Yellowstone"),
    "jackson hole": (43.4799, -110.7624, "US", "Jackson Hole"),
    "big bear": (34.2439, -116.9114, "US", "Big Bear"),
    "katmai": (58.7519, -155.7847, "US", "Katmai"),
    "brooks falls": (58.7519, -155.7847, "US", "Katmai"),
    "decorah": (43.3033, -91.7857, "US", "Decorah"),
    "duluth": (46.7867, -92.1005, "US", "Duluth"),
    "burlington": (44.4759, -73.2121, "US", "Burlington"),
    "grand canyon": (36.1069, -112.1129, "US", "Grand Canyon"),
    "yosemite": (37.8651, -119.5383, "US", "Yosemite"),
    "cape canaveral": (28.3922, -80.6077, "US", "Cape Canaveral"),
    "kennedy space": (28.5721, -80.6480, "US", "Kennedy Space Center"),
    "boca chica": (25.9970, -97.1567, "US", "Boca Chica"),
    "starbase": (25.9970, -97.1567, "US", "Boca Chica"),
    "mauna kea": (19.8207, -155.4681, "US", "Mauna Kea"),
    "kilauea": (19.4069, -155.2834, "US", "Hawaii"),
    # Canada
    "toronto": (43.6532, -79.3832, "CA", "Toronto"),
    "vancouver": (49.2827, -123.1207, "CA", "Vancouver"),
    "montreal": (45.5017, -73.5673, "CA", "Montreal"),
    "ottawa": (45.4215, -75.6972, "CA", "Ottawa"),
    "calgary": (51.0447, -114.0719, "CA", "Calgary"),
    "banff": (51.1784, -115.5708, "CA", "Banff"),
    "halifax": (44.6488, -63.5752, "CA", "Halifax"),
    "winnipeg": (49.8951, -97.1384, "CA", "Winnipeg"),
    "quebec": (46.8139, -71.2080, "CA", "Quebec City"),
    "victoria bc": (48.4284, -123.3656, "CA", "Victoria"),
    "yellowknife": (62.4540, -114.3718, "CA", "Yellowknife"),
    "churchill": (58.7684, -94.1636, "CA", "Churchill"),
    "niagara": (43.0896, -79.0849, "CA", "Niagara Falls"),
    # Mexico / Caribbean
    "mexico city": (19.4326, -99.1332, "MX", "Mexico City"),
    "cancun": (21.1619, -86.8515, "MX", "Cancun"),
    "cabo": (22.8905, -109.9167, "MX", "Cabo San Lucas"),
    "playa del carmen": (20.6296, -87.0739, "MX", "Playa del Carmen"),
    "popocatepetl": (19.0226, -98.6278, "MX", "Puebla"),
    "colima": (19.2452, -103.7241, "MX", "Colima"),
    "nassau": (25.0343, -77.3963, "BS", "Nassau"),
    "san juan": (18.4655, -66.1057, "PR", "San Juan"),
    "barbados": (13.1939, -59.5432, "BB", "Barbados"),
    "aruba": (12.5211, -69.9683, "AW", "Aruba"),
    "bermuda": (32.3078, -64.7505, "BM", "Bermuda"),
    "cayman": (19.3133, -81.2546, "KY", "Grand Cayman"),
    "jamaica": (18.1096, -77.2975, "JM", "Jamaica"),
    "trinidad": (10.6918, -61.2225, "TT", "Trinidad"),
    "st. john": (18.3358, -64.7282, "VI", "St. John"),
    "st. thomas": (18.3358, -64.9301, "VI", "St. Thomas"),
    # South America
    "rio de janeiro": (22.9068, -43.1729, "BR", "Rio de Janeiro"),
    "sao paulo": (23.5505, -46.6333, "BR", "São Paulo"),
    "buenos aires": (34.6037, -58.3816, "AR", "Buenos Aires"),
    "bogota": (4.7110, -74.0721, "CO", "Bogotá"),
    "lima": (12.0464, -77.0428, "PE", "Lima"),
    "santiago": (33.4489, -70.6693, "CL", "Santiago"),
    "cartagena": (10.3910, -75.5364, "CO", "Cartagena"),
    "cusco": (13.5320, -71.9675, "PE", "Cusco"),
    "montevideo": (34.9011, -56.1645, "UY", "Montevideo"),
    "quito": (0.1807, -78.4678, "EC", "Quito"),
    "medellín": (6.2442, -75.5812, "CO", "Medellín"),
    "medellin": (6.2442, -75.5812, "CO", "Medellín"),
    "valparaiso": (33.0472, -71.6127, "CL", "Valparaíso"),
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
    "frankfurt": (50.1109, 8.6821, "DE", "Frankfurt"),
    "cologne": (50.9375, 6.9603, "DE", "Cologne"),
    "nice": (43.7102, 7.2620, "FR", "Nice"),
    "marseille": (43.2965, 5.3698, "FR", "Marseille"),
    "lyon": (45.7640, 4.8357, "FR", "Lyon"),
    "manchester": (53.4808, -2.2426, "GB", "Manchester"),
    "liverpool": (53.4084, -2.9916, "GB", "Liverpool"),
    "glasgow": (55.8642, -4.2518, "GB", "Glasgow"),
    "cardiff": (51.4816, -3.1791, "GB", "Cardiff"),
    "moscow": (55.7558, 37.6173, "RU", "Moscow"),
    "st. petersburg": (59.9343, 30.3351, "RU", "St. Petersburg"),
    "saint petersburg": (59.9343, 30.3351, "RU", "St. Petersburg"),
    "kyiv": (50.4501, 30.5234, "UA", "Kyiv"),
    "kiev": (50.4501, 30.5234, "UA", "Kyiv"),
    "odessa": (46.4825, 30.7233, "UA", "Odessa"),
    "reykjavik": (64.1466, -21.9426, "IS", "Reykjavik"),
    "iceland": (64.9631, -19.0208, "IS", "Iceland"),
    "dubrovnik": (42.6507, 18.0944, "HR", "Dubrovnik"),
    "santorini": (36.3932, 25.4615, "GR", "Santorini"),
    "mykonos": (37.4467, 25.3289, "GR", "Mykonos"),
    "tenerife": (28.2916, -16.6291, "ES", "Tenerife"),
    "malta": (35.8989, 14.5146, "MT", "Malta"),
    "sicily": (37.5990, 14.0154, "IT", "Sicily"),
    "etna": (37.7510, 14.9934, "IT", "Mount Etna"),
    "stromboli": (38.7891, 15.2131, "IT", "Stromboli"),
    "vesuvius": (40.8210, 14.4260, "IT", "Vesuvius"),
    "zermatt": (46.0207, 7.7491, "CH", "Zermatt"),
    "chamonix": (45.9237, 6.8694, "FR", "Chamonix"),
    "monaco": (43.7384, 7.4246, "MC", "Monaco"),
    "split": (43.5081, 16.4402, "HR", "Split"),
    "porto": (41.1579, -8.6291, "PT", "Porto"),
    "seville": (37.3891, -5.9845, "ES", "Seville"),
    "malaga": (36.7213, -4.4214, "ES", "Malaga"),
    "granada": (37.1773, -3.5986, "ES", "Granada"),
    "tallinn": (59.4370, 24.7536, "EE", "Tallinn"),
    "riga": (56.9496, 24.1052, "LV", "Riga"),
    "vilnius": (54.6872, 25.2797, "LT", "Vilnius"),
    "bratislava": (48.1486, 17.1077, "SK", "Bratislava"),
    "zagreb": (45.8150, 15.9819, "HR", "Zagreb"),
    "belgrade": (44.7866, 20.4489, "RS", "Belgrade"),
    "sofia": (42.6977, 23.3219, "BG", "Sofia"),
    "innsbruck": (47.2692, 11.4041, "AT", "Innsbruck"),
    "salzburg": (47.8095, 13.0550, "AT", "Salzburg"),
    "gothenburg": (57.7089, 11.9746, "SE", "Gothenburg"),
    "bergen": (60.3913, 5.3221, "NO", "Bergen"),
    "tromsø": (69.6492, 18.9553, "NO", "Tromsø"),
    "tromso": (69.6492, 18.9553, "NO", "Tromsø"),
    "nordkapp": (71.1694, 25.7841, "NO", "Nordkapp"),
    "svalbard": (78.2232, 15.6267, "NO", "Svalbard"),
    "levi": (67.7948, 24.8129, "FI", "Levi"),
    "rovaniemi": (66.5039, 25.7294, "FI", "Rovaniemi"),
    "kiruna": (67.8558, 20.2253, "SE", "Kiruna"),
    "abisko": (68.3496, 18.8313, "SE", "Abisko"),
    # Middle East
    "dubai": (25.2048, 55.2708, "AE", "Dubai"),
    "abu dhabi": (24.4539, 54.3773, "AE", "Abu Dhabi"),
    "doha": (25.2854, 51.5310, "QA", "Doha"),
    "jerusalem": (31.7683, 35.2137, "IL", "Jerusalem"),
    "tel aviv": (32.0853, 34.7818, "IL", "Tel Aviv"),
    "mecca": (21.3891, 39.8579, "SA", "Mecca"),
    "makkah": (21.3891, 39.8579, "SA", "Makkah"),
    "medina": (24.5247, 39.5692, "SA", "Medina"),
    "beirut": (33.8938, 35.5018, "LB", "Beirut"),
    "tehran": (35.6892, 51.3890, "IR", "Tehran"),
    "amman": (31.9454, 35.9284, "JO", "Amman"),
    "riyadh": (24.7136, 46.6753, "SA", "Riyadh"),
    # Asia
    "tokyo": (35.6762, 139.6503, "JP", "Tokyo"),
    "osaka": (34.6937, 135.5023, "JP", "Osaka"),
    "kyoto": (35.0116, 135.7681, "JP", "Kyoto"),
    "yokohama": (35.4437, 139.6380, "JP", "Yokohama"),
    "sapporo": (43.0618, 141.3545, "JP", "Sapporo"),
    "nagoya": (35.1815, 136.9066, "JP", "Nagoya"),
    "okinawa": (26.3344, 127.8056, "JP", "Okinawa"),
    "shibuya": (35.6595, 139.7004, "JP", "Tokyo"),
    "shinjuku": (35.6938, 139.7034, "JP", "Tokyo"),
    "akihabara": (35.7022, 139.7745, "JP", "Tokyo"),
    "mount fuji": (35.3606, 138.7274, "JP", "Mount Fuji"),
    "fuji": (35.3606, 138.7274, "JP", "Mount Fuji"),
    "sakurajima": (31.5855, 130.6560, "JP", "Kagoshima"),
    "seoul": (37.5665, 126.9780, "KR", "Seoul"),
    "busan": (35.1796, 129.0756, "KR", "Busan"),
    "beijing": (39.9042, 116.4074, "CN", "Beijing"),
    "shanghai": (31.2304, 121.4737, "CN", "Shanghai"),
    "hong kong": (22.3193, 114.1694, "HK", "Hong Kong"),
    "shenzhen": (22.5431, 114.0579, "CN", "Shenzhen"),
    "taipei": (25.0330, 121.5654, "TW", "Taipei"),
    "singapore": (1.3521, 103.8198, "SG", "Singapore"),
    "bangkok": (13.7563, 100.5018, "TH", "Bangkok"),
    "phuket": (7.8804, 98.3923, "TH", "Phuket"),
    "mumbai": (19.0760, 72.8777, "IN", "Mumbai"),
    "delhi": (28.7041, 77.1025, "IN", "Delhi"),
    "new delhi": (28.6139, 77.2090, "IN", "New Delhi"),
    "kolkata": (22.5726, 88.3639, "IN", "Kolkata"),
    "kuala lumpur": (3.1390, 101.6869, "MY", "Kuala Lumpur"),
    "jakarta": (6.2088, 106.8456, "ID", "Jakarta"),
    "bali": (8.3405, 115.0920, "ID", "Bali"),
    "manila": (14.5995, 120.9842, "PH", "Manila"),
    "hanoi": (21.0278, 105.8342, "VN", "Hanoi"),
    "ho chi minh": (10.8231, 106.6297, "VN", "Ho Chi Minh City"),
    "phnom penh": (11.5564, 104.9282, "KH", "Phnom Penh"),
    "maldives": (3.2028, 73.2207, "MV", "Maldives"),
    "kathmandu": (27.7172, 85.3240, "NP", "Kathmandu"),
    # Oceania
    "sydney": (33.8688, 151.2093, "AU", "Sydney"),
    "melbourne": (37.8136, 144.9631, "AU", "Melbourne"),
    "brisbane": (27.4705, 153.0260, "AU", "Brisbane"),
    "perth": (31.9505, 115.8605, "AU", "Perth"),
    "gold coast": (28.0167, 153.4000, "AU", "Gold Coast"),
    "auckland": (36.8485, 174.7633, "NZ", "Auckland"),
    "wellington": (41.2865, 174.7762, "NZ", "Wellington"),
    "queenstown": (45.0312, 168.6626, "NZ", "Queenstown"),
    "fiji": (18.1248, 178.4501, "FJ", "Fiji"),
    # Africa
    "cape town": (33.9249, 18.4241, "ZA", "Cape Town"),
    "johannesburg": (26.2041, 28.0473, "ZA", "Johannesburg"),
    "south africa": (33.9249, 18.4241, "ZA", "South Africa"),
    "nairobi": (1.2921, 36.8219, "KE", "Nairobi"),
    "kruger": (24.0112, 31.4847, "ZA", "Kruger"),
    "sabi sand": (24.7939, 31.4917, "ZA", "Sabi Sand"),
    "serengeti": (2.3333, 34.8333, "TZ", "Serengeti"),
    "cairo": (30.0444, 31.2357, "EG", "Cairo"),
    "marrakech": (31.6295, -7.9811, "MA", "Marrakech"),
    "lagos": (6.5244, 3.3792, "NG", "Lagos"),
    "zanzibar": (6.1659, 39.2026, "TZ", "Zanzibar"),
    "etosha": (18.8556, 16.3299, "NA", "Etosha"),
    # Volcanoes
    "fuego": (14.4747, -90.8806, "GT", "Guatemala"),
    "semeru": (8.1077, 112.9224, "ID", "Java"),
    "merapi": (7.5407, 110.4457, "ID", "Java"),
    "aso": (32.8842, 131.1040, "JP", "Aso"),
    "cotopaxi": (0.6838, -78.4378, "EC", "Cotopaxi"),
    "mayon": (13.2570, 123.6850, "PH", "Albay"),
    "piton de la fournaise": (21.2494, 55.7080, "RE", "Reunion"),
    "old faithful": (44.4605, -110.8281, "US", "Yellowstone"),
    # Space
    "iss": (0, 0, "XX", "ISS"),
    "nasa": (28.5721, -80.6480, "US", "Kennedy Space Center"),
    "spacex": (25.9970, -97.1567, "US", "Boca Chica"),
}

# US state abbreviation pattern
US_STATE_ABBREVS = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
}

US_STATE_COORDS = {
    "AL": (32.81, -86.79), "AK": (61.37, -152.40), "AZ": (33.73, -111.43),
    "AR": (34.97, -92.37), "CA": (36.12, -119.68), "CO": (39.06, -105.31),
    "CT": (41.60, -72.76), "DE": (39.32, -75.51), "FL": (27.77, -81.69),
    "GA": (33.04, -83.64), "HI": (21.09, -157.50), "ID": (44.24, -114.48),
    "IL": (40.35, -88.99), "IN": (39.85, -86.26), "IA": (42.01, -93.21),
    "KS": (38.53, -96.73), "KY": (37.67, -84.67), "LA": (31.17, -91.87),
    "ME": (44.69, -69.38), "MD": (39.06, -76.80), "MA": (42.23, -71.53),
    "MI": (43.33, -84.54), "MN": (45.69, -93.90), "MS": (32.74, -89.68),
    "MO": (38.46, -92.29), "MT": (46.92, -110.45), "NE": (41.13, -98.27),
    "NV": (38.31, -117.06), "NH": (43.45, -71.56), "NJ": (40.30, -74.52),
    "NM": (34.84, -106.25), "NY": (42.17, -74.95), "NC": (35.63, -79.81),
    "ND": (47.53, -99.78), "OH": (40.39, -82.76), "OK": (35.57, -96.93),
    "OR": (44.57, -122.07), "PA": (40.59, -77.21), "RI": (41.68, -71.51),
    "SC": (33.86, -80.95), "SD": (44.30, -99.44), "TN": (35.75, -86.69),
    "TX": (31.05, -97.56), "UT": (40.15, -111.86), "VT": (44.05, -72.71),
    "VA": (37.77, -78.17), "WA": (47.40, -121.49), "WV": (38.49, -80.95),
    "WI": (44.27, -89.62), "WY": (42.76, -107.30),
}

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


def extract_location(title, channel=""):
    """Try to geolocate a stream from its title."""
    t = title.lower()

    # Try "City, STATE" pattern
    for m in re.finditer(r'([A-Za-z\s\.\']+),\s*([A-Z]{2})\b', title):
        city_text = m.group(1).strip().lower()
        state = m.group(2)
        if state in US_STATE_ABBREVS:
            if city_text in CITY_COORDS:
                return CITY_COORDS[city_text]
            lat, lon = US_STATE_COORDS.get(state, (0, 0))
            if lat:
                return (lat, lon, "US", m.group(1).strip())

    # Try "City, State Name" pattern
    for m in re.finditer(r'([A-Za-z\s\.\']+),\s*([A-Za-z\s]+)', title):
        city_text = m.group(1).strip().lower()
        region = m.group(2).strip().lower()
        if region in US_STATE_NAMES:
            if city_text in CITY_COORDS:
                return CITY_COORDS[city_text]
            abbrev = US_STATE_NAMES[region]
            lat, lon = US_STATE_COORDS.get(abbrev, (0, 0))
            if lat:
                return (lat, lon, "US", m.group(1).strip())

    # Longest city match in title
    best = None
    best_len = 0
    for key, coords in CITY_COORDS.items():
        if len(key) >= 4 and key in t and len(key) > best_len:
            best = coords
            best_len = len(key)
    if best:
        return best

    # Try channel name
    c = channel.lower()
    for key, coords in CITY_COORDS.items():
        if len(key) >= 5 and key in c:
            return coords

    return None


# ── Category classification ───────────────────────────────────────────────
CATEGORY_RULES = {
    "traffic": ["traffic", "highway", "expressway", "freeway", "motorway", "intersection", "road cam"],
    "aviation": ["airport", "runway", "aviation", "plane", "aircraft", "landing", "takeoff"],
    "rail": ["train", "rail", "railway", "railroad", "locomotive", "freight", "railcam", "railfan", "crossing", "bnsf", "csx", "union pacific", "steelhighway", "mainline"],
    "space": ["iss", "nasa", "space", "spacex", "rocket", "launch pad", "orbit", "starship", "starbase", "boca chica", "telescope", "observatory"],
    "volcanoes": ["volcano", "lava", "eruption", "geyser", "kilauea", "etna", "fuego", "popocatepetl", "semeru", "merapi", "old faithful", "sakurajima", "stromboli"],
    "wildlife": ["wildlife", "animal", "bird", "eagle", "owl", "hawk", "bear", "wolf", "deer", "elephant", "lion", "penguin", "whale", "shark", "turtle", "seal", "otter", "reef", "aquarium", "feeder", "nest cam", "zoo", "safari", "waterhole", "africam", "explore.org", "puffin", "osprey", "condor", "gorilla", "panda"],
    "beaches": ["beach", "surf", "surfing", "wave", "coast", "shore", "pier", "boardwalk", "ocean cam", "sea cam", "tropical", "island cam", "sand", "bay cam", "cove", "tide"],
    "cities": ["city", "skyline", "downtown", "square", "plaza", "street", "urban", "tower cam", "rooftop", "panorama", "times square", "shibuya"],
    "landmarks": ["statue", "monument", "cathedral", "church", "mosque", "temple", "castle", "palace", "bridge", "tower", "gate", "capitol", "parliament", "abbey", "basilica", "colosseum", "eiffel", "big ben", "golden gate", "liberty"],
    "maritime": ["port", "harbor", "harbour", "marina", "ship", "vessel", "ferry", "cruise", "cargo", "canal", "dock", "lighthouse", "boat", "yacht", "maritime", "lock"],
    "nature": ["mountain", "lake", "river", "waterfall", "forest", "valley", "glacier", "canyon", "desert", "fjord", "rainforest", "national park", "scenic", "ski", "slope", "alpine", "snow cam", "weather cam"],
    "aurora": ["aurora", "northern lights", "borealis", "southern lights", "night sky", "meteor", "milky way", "dark sky"],
}

def classify(title, channel=""):
    t = (title + " " + channel).lower()
    scores = {}
    for cat, kws in CATEGORY_RULES.items():
        s = sum(len(kw) for kw in kws if kw in t)
        if s > 0:
            scores[cat] = s
    if scores:
        return max(scores, key=scores.get)
    if any(w in t for w in ["cam", "live", "webcam"]):
        return "cities"
    return "cities"


# ── Search queries ────────────────────────────────────────────────────────
# Designed to maximize coverage while minimizing overlap
SEARCH_QUERIES = [
    # === Geographic: Cities by region ===
    # US cities not yet well-covered
    "live webcam Portland Oregon 24/7",
    "live webcam Denver Colorado 24/7",
    "live webcam Nashville Tennessee 24/7",
    "live webcam Austin Texas 24/7",
    "live webcam New Orleans 24/7",
    "live webcam San Diego 24/7",
    "live webcam Phoenix Arizona 24/7",
    "live webcam Atlanta Georgia 24/7",
    "live webcam Charlotte 24/7",
    "live webcam Tampa Florida 24/7",
    "live webcam Jacksonville Florida 24/7",
    "live webcam Memphis 24/7",
    "live webcam Louisville Kentucky 24/7",
    "live webcam Savannah Georgia 24/7",
    "live webcam Charleston South Carolina 24/7",
    "live webcam Boise Idaho 24/7",
    "live webcam Albuquerque 24/7",
    "live webcam Tucson 24/7",
    "live webcam Salt Lake City 24/7",
    "live webcam Omaha Nebraska 24/7",
    "live cam Pittsburgh 24/7",
    "live cam Cleveland Ohio 24/7",
    "live cam Indianapolis 24/7",
    "live cam Columbus Ohio 24/7",
    "live cam Oklahoma City 24/7",
    "live cam Raleigh 24/7",
    "live cam Richmond Virginia 24/7",
    "live cam Birmingham Alabama 24/7",
    "live cam Burlington Vermont 24/7",
    "live cam Duluth Minnesota 24/7",
    # European cities
    "live webcam Prague 24/7",
    "live webcam Budapest 24/7",
    "live webcam Warsaw 24/7",
    "live webcam Munich 24/7",
    "live webcam Hamburg 24/7",
    "live webcam Zurich 24/7",
    "live webcam Brussels 24/7",
    "live webcam Lisbon 24/7",
    "live webcam Porto 24/7",
    "live webcam Seville 24/7",
    "live webcam Valencia 24/7",
    "live webcam Florence Italy 24/7",
    "live webcam Venice Italy 24/7",
    "live webcam Naples Italy 24/7",
    "live webcam Milan 24/7",
    "live webcam Nice France 24/7",
    "live webcam Monaco 24/7",
    "live webcam Dubrovnik 24/7",
    "live webcam Split Croatia 24/7",
    "live webcam Tallinn 24/7",
    "live webcam Riga 24/7",
    "live webcam Sofia Bulgaria 24/7",
    "live webcam Belgrade 24/7",
    "live webcam Bucharest 24/7",
    "live webcam Bratislava 24/7",
    "live webcam Innsbruck 24/7",
    "live webcam Salzburg 24/7",
    "live webcam Gothenburg Sweden 24/7",
    "live webcam Bergen Norway 24/7",
    # Asia
    "live webcam Tokyo 24/7",
    "live webcam Osaka 24/7",
    "live webcam Kyoto 24/7",
    "live webcam Seoul 24/7",
    "live webcam Busan 24/7",
    "live webcam Hong Kong 24/7",
    "live webcam Shanghai 24/7",
    "live webcam Beijing 24/7",
    "live webcam Taipei 24/7",
    "live webcam Singapore 24/7",
    "live webcam Bangkok 24/7",
    "live webcam Mumbai India 24/7",
    "live webcam Delhi India 24/7",
    "live webcam Kuala Lumpur 24/7",
    "live webcam Jakarta 24/7",
    "live webcam Manila 24/7",
    "live webcam Hanoi 24/7",
    "live webcam Ho Chi Minh 24/7",
    # Middle East
    "live webcam Dubai 24/7",
    "live webcam Istanbul 24/7",
    "live webcam Jerusalem 24/7",
    "live webcam Tel Aviv 24/7",
    "live webcam Doha 24/7",
    "live webcam Mecca 24/7",
    # Oceania
    "live webcam Sydney 24/7",
    "live webcam Melbourne 24/7",
    "live webcam Auckland 24/7",
    "live webcam Gold Coast 24/7",
    # South America
    "live webcam Rio de Janeiro 24/7",
    "live webcam Buenos Aires 24/7",
    "live webcam Bogota 24/7",
    "live webcam Lima Peru 24/7",
    "live webcam Santiago Chile 24/7",
    "live webcam Medellin 24/7",
    "live webcam Cartagena Colombia 24/7",
    # Africa
    "live webcam Cape Town 24/7",
    "live webcam Nairobi 24/7",
    "live webcam Cairo 24/7",
    "live webcam Marrakech 24/7",
    # Canada
    "live webcam Vancouver 24/7",
    "live webcam Toronto 24/7",
    "live webcam Montreal 24/7",
    "live webcam Calgary 24/7",
    "live webcam Halifax 24/7",
    "live webcam Banff 24/7",
    # Caribbean / Mexico
    "live webcam Cancun 24/7",
    "live webcam Bahamas 24/7",
    "live webcam Jamaica 24/7",
    "live webcam Barbados 24/7",
    "live webcam Aruba 24/7",
    "live webcam Bermuda 24/7",
    "live webcam Cayman Islands 24/7",
    "live webcam St Thomas 24/7",
    "live webcam Cabo San Lucas 24/7",

    # === Category-focused queries ===
    # Beaches (more specific)
    "live beach webcam 24/7 surf",
    "live beach cam Caribbean 24/7",
    "live beach cam Pacific 24/7",
    "live beach cam Mediterranean 24/7",
    "live beach cam Australia 24/7",
    "live beach cam Thailand 24/7",
    "live beach cam Brazil 24/7",
    "live beach cam Mexico 24/7",
    "live surf cam California 24/7",
    "live surf cam Hawaii 24/7",
    "live surf cam Portugal 24/7",
    "live surf cam Bali 24/7",
    "live beach cam Florida 24/7",
    "live beach cam Spain 24/7",
    "live beach cam Italy coast 24/7",
    "live beach cam Greece 24/7",
    # Wildlife
    "live wildlife cam Africa 24/7 safari",
    "live eagle nest cam 24/7",
    "live bear cam 24/7 Alaska",
    "live penguin cam 24/7",
    "live coral reef cam 24/7",
    "live aquarium cam 24/7",
    "live bird cam feeder 24/7",
    "live osprey nest cam 24/7",
    "live owl cam 24/7",
    "live hawk cam 24/7",
    "live whale cam 24/7",
    "live dolphin cam 24/7",
    "live manatee cam 24/7",
    "live panda cam 24/7",
    "live zoo animal webcam 24/7",
    "live farm cam animals 24/7",
    "live deer cam 24/7",
    "live wolf cam 24/7",
    "live elk cam 24/7",
    "live bison cam 24/7",
    "live gorilla cam 24/7",
    "explore.org live cam",
    "africam live 24/7",
    "cornell lab bird cam live",
    # Rail
    "live train cam USA 24/7",
    "virtual railfan live",
    "railstream live 24/7",
    "steelhighway live railcam",
    "live train cam UK 24/7",
    "live train cam Japan 24/7",
    "live train cam Europe 24/7",
    "live railway crossing cam 24/7",
    "live freight train cam 24/7",
    "live train cam Canada 24/7",
    "live train cam Australia 24/7",
    "live train cam India 24/7",
    # Aviation
    "live airport cam 24/7",
    "live airport webcam runway 24/7",
    "live airport cam Europe 24/7",
    "live airport cam Asia 24/7",
    "live plane spotting cam 24/7",
    "live heathrow cam 24/7",
    "live schiphol cam 24/7",
    "live frankfurt airport cam 24/7",
    "live LAX cam 24/7",
    "live JFK cam 24/7",
    "live airport cam landing takeoff 24/7",
    # Maritime
    "live port cam 24/7 ship",
    "live harbor webcam 24/7",
    "live marina cam 24/7",
    "live cruise ship cam 24/7",
    "live lighthouse cam 24/7",
    "live canal cam 24/7",
    "live ship traffic cam 24/7",
    "live ferry cam 24/7",
    "live cargo port cam 24/7",
    # Nature / Mountains / Ski
    "live mountain webcam 24/7",
    "live ski cam 24/7",
    "live waterfall cam 24/7",
    "live lake cam 24/7",
    "live river cam 24/7",
    "live glacier cam 24/7",
    "live fjord cam Norway 24/7",
    "live national park webcam 24/7",
    "live Alps webcam 24/7 Switzerland",
    "live Rockies mountain cam 24/7",
    "live forest cam 24/7",
    "live canyon cam 24/7",
    "live ski resort webcam 24/7",
    # Volcanoes
    "live volcano cam 24/7",
    "live volcano webcam eruption 24/7",
    "live geyser old faithful cam 24/7",
    "live Etna cam 24/7",
    "live Kilauea cam 24/7",
    "live Popocatepetl cam 24/7",
    "live Sakurajima cam 24/7",
    # Space
    "live ISS cam 24/7 earth",
    "live rocket launch pad cam 24/7",
    "live SpaceX Starbase cam 24/7",
    "live NASA cam 24/7",
    "live telescope observatory cam 24/7",
    # Traffic
    "live traffic cam 24/7 highway",
    "live traffic webcam city 24/7",
    "live freeway cam 24/7",
    "live intersection cam 24/7",
    "live highway cam 24/7 USA",
    "live traffic cam Europe 24/7",
    # Landmarks
    "live landmark webcam 24/7",
    "live Eiffel Tower cam 24/7",
    "live Golden Gate Bridge cam 24/7",
    "live Colosseum Rome cam 24/7",
    "live Big Ben London cam 24/7",
    "live Statue of Liberty cam 24/7",
    "live Tower Bridge London cam 24/7",
    "live cathedral webcam 24/7",
    # Aurora
    "live aurora borealis cam 24/7",
    "live northern lights webcam 24/7",
    "live aurora cam Norway 24/7",
    "live aurora cam Finland 24/7",
    "live aurora cam Iceland 24/7",
    "live aurora cam Alaska 24/7",
    "live night sky cam 24/7",
    # Miscellaneous discovery
    "EarthCam live 24/7",
    "SkylineWebcams live 24/7",
    "PTZtv live cam 24/7",
    "WorldMonitor live cam",
    "live webcam 4K 24/7",
    "live webcam HD 24/7 stream",
    "24/7 webcam live stream world",
    "live cam around the world 24/7",
]

# Additional channels to scan
CHANNELS = [
    "EarthCam",
    "SkylineWebcams",
    "VirtualRailfan",
    "RailStream",
    "SteelHighwayRailcams",
    "PTZtv",
    "explore",
    "africaboreal",
    "VolcanoYT",
    "NASAtelevision",
    "NASASpaceflight",
    "CornellLabBirdcams",
    "StreamTimeUSA",
    "LiveRailCam",
    "AirlineVideosLive",
    "FrontierWeather",
    "AboveTheTideTV",
    "SurflineVideos",
    "CharliesBirdCam",
    "slopeviews",
    "tromsolive",
]


def main():
    existing_ids = load_existing_ids()
    print(f"Loaded {len(existing_ids)} existing webcam IDs to skip\n")

    candidates = {}  # id -> {title, channel}

    # Phase 1: Channel scans
    print("=" * 70)
    print("PHASE 1: Scanning YouTube channels for live streams")
    print("=" * 70)
    for channel in CHANNELS:
        print(f"  @{channel}...", end=" ", flush=True)
        entries = ytdlp_channel(channel, max_results=200)
        added = 0
        for e in entries:
            vid = e["id"]
            if vid and vid not in existing_ids and vid not in candidates:
                if is_webcam(e["title"], e["channel"]):
                    candidates[vid] = {"title": e["title"], "channel": e["channel"]}
                    added += 1
        print(f"{len(entries)} found, {added} new webcam candidates")

    print(f"\nAfter channels: {len(candidates)} new candidates\n")

    # Phase 2: Search queries
    print("=" * 70)
    print(f"PHASE 2: Running {len(SEARCH_QUERIES)} search queries")
    print("=" * 70)
    for i, query in enumerate(SEARCH_QUERIES):
        print(f"  [{i+1}/{len(SEARCH_QUERIES)}] '{query}'...", end=" ", flush=True)
        entries = ytdlp_search(query, max_results=30)
        added = 0
        for e in entries:
            vid = e["id"]
            if vid and vid not in existing_ids and vid not in candidates:
                if is_webcam(e["title"], e.get("channel", "")):
                    candidates[vid] = {"title": e["title"], "channel": e.get("channel", "")}
                    added += 1
        print(f"{len(entries)} results, {added} new")

    print(f"\nAfter search: {len(candidates)} total new candidates\n")

    # Phase 3: Verify ALL via oEmbed
    print("=" * 70)
    print(f"PHASE 3: Verifying {len(candidates)} candidates via oEmbed API")
    print("=" * 70)
    all_ids = list(candidates.keys())
    verified = batch_verify(all_ids, workers=15)
    print(f"\n  Verified: {len(verified)} valid out of {len(all_ids)}\n")

    # Phase 4: Geolocate and classify
    print("=" * 70)
    print("PHASE 4: Geolocating and classifying")
    print("=" * 70)

    categorized = defaultdict(list)
    no_location = 0

    for ytid, (yt_title, yt_author) in verified.items():
        info = candidates.get(ytid, {})
        title = yt_title or info.get("title", "")
        channel = yt_author or info.get("channel", "")

        loc = extract_location(title, channel)
        if not loc:
            no_location += 1
            continue

        lat, lon, country, city = loc
        category = classify(title, channel)

        # Clean name
        name = title
        for prefix in [r"🔴\s*LIVE\s*", r"LIVE\s*", r"【LIVE】\s*", r"▶️\s*"]:
            name = re.sub(prefix, "", name, flags=re.IGNORECASE)
        name = re.sub(r'#\S+', '', name)
        name = re.sub(r'[\U0001F300-\U0001F9FF\U00002600-\U000027BF]+', '', name)
        name = name.strip(" -–—|,.")
        if len(name) > 60:
            name = name[:57] + "..."

        entry = {
            "name": name,
            "lat": round(lat, 4) if lat else 0,
            "lon": round(lon, 4) if lon else 0,
            "country": country,
            "city": city,
            "ytId": ytid,
        }
        categorized[category].append(entry)

    total = sum(len(v) for v in categorized.values())
    print(f"  Located and classified: {total}")
    print(f"  Could not geolocate: {no_location}")
    print(f"\n  By category:")
    for cat in sorted(categorized.keys()):
        print(f"    {cat}: {len(categorized[cat])}")

    # Phase 5: Deduplicate within categories
    for cat in categorized:
        entries = categorized[cat]
        seen = set()
        deduped = []
        for e in entries:
            key = e["ytId"]
            if key not in seen:
                seen.add(key)
                deduped.append(e)
        categorized[cat] = deduped

    total = sum(len(v) for v in categorized.values())
    print(f"\n  After dedup: {total}")

    # Phase 6: Append to existing files
    print("\n" + "=" * 70)
    print("PHASE 5: Appending to existing data files")
    print("=" * 70)

    today = date.today().isoformat()
    grand_total_added = 0

    for category, new_entries in categorized.items():
        if not new_entries:
            continue

        filepath = DATA_DIR / f"webcams_{category}.json"
        if not filepath.exists():
            print(f"  SKIP {category} — no file exists")
            continue

        with open(filepath) as f:
            data = json.load(f)

        # Find the array key (not _source)
        array_key = None
        for k, v in data.items():
            if k != "_source" and isinstance(v, list):
                array_key = k
                break

        if not array_key:
            print(f"  SKIP {category} — no array found in file")
            continue

        # Get existing ytIds in this file
        existing_in_file = {e["ytId"] for e in data[array_key] if "ytId" in e}

        # Filter out any that are already in this file
        truly_new = [e for e in new_entries if e["ytId"] not in existing_in_file]

        if not truly_new:
            print(f"  {category}: 0 new (all already existed)")
            continue

        # Sort new entries
        truly_new.sort(key=lambda e: (e.get("country", ""), e.get("city", ""), e.get("name", "")))

        # Append
        data[array_key].extend(truly_new)

        # Update source date
        if "_source" in data:
            data["_source"]["retrieved"] = today

        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)
            f.write("\n")

        print(f"  {category}: +{len(truly_new)} new entries (total now: {len(data[array_key])})")
        grand_total_added += len(truly_new)

    # Save raw results for reference
    raw_path = SCRIPT_DIR / "new_discovered_webcams.json"
    raw_output = []
    for cat, entries in categorized.items():
        for e in entries:
            e["_category"] = cat
            raw_output.append(e)
    with open(raw_path, "w") as f:
        json.dump(raw_output, f, indent=2)

    print(f"\n{'=' * 70}")
    print(f"COMPLETE: Added {grand_total_added} new verified webcam entries")
    print(f"Raw results saved to {raw_path}")
    print(f"{'=' * 70}")


if __name__ == "__main__":
    main()
