#!/usr/bin/env python3
"""
Supplemental webcam discovery — targeted searches for specific locations
to fill gaps and reach the 1000 target.
"""

import json
import subprocess
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

OEMBED_URL = "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={}&format=json"

# More specific location-focused searches
EXTRA_SEARCHES = [
    # European cities
    "live webcam prague 24/7",
    "live webcam budapest 24/7",
    "live webcam vienna 24/7",
    "live webcam lisbon 24/7",
    "live webcam copenhagen 24/7",
    "live webcam stockholm 24/7",
    "live webcam warsaw 24/7",
    "live webcam bucharest 24/7",
    "live webcam athens 24/7",
    "live webcam zurich 24/7",
    "live webcam venice 24/7",
    "live webcam florence 24/7",
    "live webcam naples 24/7",
    "live webcam dubrovnik 24/7",
    "live webcam santorini 24/7",
    "live webcam brussels 24/7",
    "live webcam edinburgh 24/7",
    "live webcam munich 24/7",
    "live webcam hamburg 24/7",
    "live webcam nice france 24/7",
    "live webcam marseille 24/7",
    "live webcam milan 24/7",
    "live webcam kyiv ukraine 24/7",
    "live webcam oslo 24/7",
    "live webcam reykjavik 24/7",
    "live webcam malta 24/7",
    "live webcam tenerife 24/7",
    "live webcam madeira 24/7",
    # Asian cities
    "live webcam tokyo shibuya 24/7",
    "live webcam osaka 24/7",
    "live webcam kyoto 24/7",
    "live webcam taipei 24/7",
    "live webcam kuala lumpur 24/7",
    "live webcam jakarta 24/7",
    "live webcam manila 24/7",
    "live webcam hanoi 24/7",
    "live webcam delhi 24/7",
    "live webcam mumbai 24/7",
    "live webcam dubai 24/7",
    "live webcam istanbul 24/7",
    "live webcam singapore 24/7",
    "live webcam busan 24/7",
    # Latin America
    "live webcam mexico city 24/7",
    "live webcam buenos aires 24/7",
    "live webcam bogota 24/7",
    "live webcam lima 24/7",
    "live webcam santiago chile 24/7",
    "live webcam cartagena 24/7",
    "live webcam cusco 24/7",
    # Africa & Middle East
    "live webcam cape town 24/7",
    "live webcam nairobi 24/7",
    "live webcam cairo 24/7",
    "live webcam marrakech 24/7",
    "live webcam jerusalem 24/7",
    "live webcam tel aviv 24/7",
    # Oceania
    "live webcam melbourne 24/7",
    "live webcam brisbane 24/7",
    "live webcam auckland 24/7",
    "live webcam gold coast 24/7",
    # More specific US searches
    "live webcam san diego 24/7",
    "live webcam denver 24/7",
    "live webcam nashville 24/7",
    "live webcam austin texas 24/7",
    "live webcam new orleans 24/7",
    "live webcam savannah ga 24/7",
    "live webcam key west 24/7",
    "live webcam anchorage alaska 24/7",
    # Specific themes
    "skylinewebcams live",
    "webcam playa live beach",
    "cámaras en vivo 24/7",
    "webcam live port harbor",
    "live airport runway cam",
    "live ski resort webcam mountain",
    "live coral reef underwater cam",
    "live northern lights aurora cam",
]


def run_search(query, max_results=20):
    try:
        cmd = [
            "yt-dlp",
            f"ytsearch{max_results}:{query}",
            "--flat-playlist",
            "--print", "%(id)s\t%(title)s\t%(channel)s",
            "--no-warnings", "--quiet",
            "--socket-timeout", "10",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=45)
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
        return []


def verify_ytid(ytid):
    url = OEMBED_URL.format(ytid)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read())
        return ytid, True, data.get("title", ""), data.get("author_name", "")
    except:
        return ytid, False, "", ""


def main():
    # Load existing discovered to avoid duplicates
    disc_path = Path(__file__).parent / "discovered_webcams.json"
    existing = set()
    if disc_path.exists():
        with open(disc_path) as f:
            for item in json.load(f):
                existing.add(item.get("ytId", ""))

    print(f"Existing discovered: {len(existing)}")

    discovered = {}
    for query in EXTRA_SEARCHES:
        print(f"  Searching: '{query}'...")
        entries = run_search(query)
        added = 0
        for entry in entries:
            vid = entry["id"]
            if vid and vid not in existing and vid not in discovered:
                discovered[vid] = entry
                added += 1
        print(f"    Found {len(entries)}, {added} new")

    print(f"\nNew unique streams to verify: {len(discovered)}")

    # Verify
    verified = []
    all_ids = list(discovered.keys())
    batch_size = 20
    for batch_start in range(0, len(all_ids), batch_size):
        batch = all_ids[batch_start:batch_start + batch_size]
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {executor.submit(verify_ytid, vid): vid for vid in batch}
            for future in as_completed(futures):
                ytid, is_valid, title, author = future.result()
                if is_valid:
                    verified.append({
                        "ytId": ytid,
                        "yt_title": title,
                        "yt_author": author,
                        "channel": discovered[ytid].get("channel", ""),
                        "source": "extra_search",
                        "is_live": "",
                    })
        if batch_start + batch_size < len(all_ids):
            time.sleep(0.5)

    print(f"Verified: {len(verified)} new streams")

    # Append to existing discovered
    with open(disc_path) as f:
        all_discovered = json.load(f)
    all_discovered.extend(verified)
    with open(disc_path, "w") as f:
        json.dump(all_discovered, f, indent=2)
    print(f"Updated {disc_path} — now {len(all_discovered)} total")


if __name__ == "__main__":
    main()
