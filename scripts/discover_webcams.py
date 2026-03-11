#!/usr/bin/env python3
"""
Discover live webcam streams on YouTube using yt-dlp.
Searches known webcam channels and search queries to find 24/7 live streams.
Verifies each stream via YouTube oEmbed API.
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

# Known YouTube channels that host 24/7 live webcam streams
CHANNELS = [
    # Wildlife & Nature
    "explore",              # explore.org - wildlife cams
    "africaboreal",         # Africam
    "CornellLabBirdcams",   # Cornell Lab bird cams

    # City & Scenery
    "EarthCam",             # EarthCam - city cams worldwide
    "skyaboreal",           # SkylineWebcams
    "SkylineWebcams",       # SkylineWebcams alt
    "I24NEWS",              # News cams

    # Rail & Transportation
    "VirtualRailfan",       # Virtual Railfan - train cams
    "RailStream",           # RailStream
    "SteelHighwayRailcams", # Multi-rail cams

    # Space
    "NASAtelevision",       # NASA TV
    "SpaceVideos",          # Space exploration
    "EverydayAstronaut",    # SpaceX streams
    "NASASpaceflight",      # SpaceX facility cams

    # Volcano
    "VolcanoYT",            # Volcano streams

    # Weather & Aurora
    "Aurorasaurus",         # Aurora cams

    # Miscellaneous
    "PTZtv",                # PTZ cameras
    "LOFIFRUITS",           # Ambiance
    "AbbeyRoad",            # Abbey Road Studios
]

# Search queries to find live webcam streams
SEARCH_QUERIES = [
    "live webcam 24/7",
    "live traffic cam 24/7",
    "live city cam 24/7 stream",
    "live airport cam 24/7",
    "live beach cam 24/7",
    "live volcano cam 24/7",
    "live train cam 24/7",
    "live wildlife cam 24/7",
    "live aurora cam 24/7",
    "live ship cam 24/7 port",
    "live space cam 24/7 ISS",
    "live underwater cam 24/7",
    "live ski resort cam 24/7",
    "live harbor webcam 24/7",
    "live skyline webcam 24/7",
    "live nature cam 24/7",
    "earthcam live",
    "skylinewebcams live",
    "explore.org live cam",
    "africam live",
    "live cam tokyo",
    "live cam new york",
    "live cam london",
    "live cam paris",
    "live cam dubai",
    "live cam sydney",
    "live cam rome",
    "live cam barcelona",
    "live cam amsterdam",
    "live cam bangkok",
    "live cam istanbul",
    "live cam singapore",
    "live cam hong kong",
    "live cam seoul",
    "live cam mumbai",
    "live cam moscow",
    "live cam rio de janeiro",
    "live cam las vegas",
    "live cam miami beach",
    "live cam hawaii beach",
    "live cam maldives",
    "live cam coral reef",
    "live cam eagle nest",
    "live cam bear cam alaska",
    "live cam penguin",
    "live cam safari africa",
    "live cam whale watching",
    "live cam dolphin",
    "live cam railway crossing",
    "live cam freight train",
    "live cam cruise ship port",
    "live cam lighthouse",
    "live cam bridge traffic",
    "live cam mountain view",
    "live cam lake",
    "live cam river",
    "live cam waterfall",
    "live cam northern lights",
    "live cam sunrise sunset",
    "live cam street view",
    "live cam downtown",
    "live cam highway",
    "live cam expressway",
    "live cam intersection",
    "live cam bay view",
    "live cam ocean",
    "live cam forest",
    "live cam desert",
    "live cam snow mountain",
    "live cam ski slope",
    "live cam ice cam arctic",
    "live cam canal",
    "live cam castle",
    "live cam cathedral",
    "live cam monument",
    "live cam square plaza",
    "live cam boardwalk",
    "live cam pier",
    "live cam marina",
    "live cam ferry",
    "live cam runway",
    "live cam helicopter",
    "live cam construction site",
    "live cam ISS earth",
    "live cam rocket launch pad",
    "live cam observatory",
    "live cam tornado alley weather",
    "live cam storm chaser",
    "live cam geyser old faithful",
    "live cam zoo animal",
    "live cam aquarium",
    "live cam bird feeder",
    "live cam owl nest",
    "live cam hawk nest",
    "live cam manatee",
    "live cam shark",
    "live cam turtle nest",
    "live cam polar bear",
    "live cam wolf",
    "live cam deer",
    "live cam farm animal barn",
]


def run_ytdlp_search(query, max_results=50):
    """Search YouTube for live streams matching a query."""
    try:
        cmd = [
            "yt-dlp",
            f"ytsearch{max_results}:{query}",
            "--flat-playlist",
            "--print", "%(id)s\t%(title)s\t%(is_live)s\t%(channel)s",
            "--no-warnings",
            "--quiet",
            "--socket-timeout", "10",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        entries = []
        for line in result.stdout.strip().split("\n"):
            if not line.strip():
                continue
            parts = line.split("\t")
            if len(parts) >= 2:
                entry = {
                    "id": parts[0],
                    "title": parts[1] if len(parts) > 1 else "",
                    "is_live": parts[2] if len(parts) > 2 else "",
                    "channel": parts[3] if len(parts) > 3 else "",
                }
                entries.append(entry)
        return entries
    except (subprocess.TimeoutExpired, Exception) as e:
        print(f"  Error searching '{query}': {e}", file=sys.stderr)
        return []


def get_channel_live_streams(channel_name, max_results=100):
    """Get live streams from a specific YouTube channel."""
    try:
        cmd = [
            "yt-dlp",
            f"https://www.youtube.com/@{channel_name}/streams",
            "--flat-playlist",
            "--print", "%(id)s\t%(title)s\t%(is_live)s",
            "--no-warnings",
            "--quiet",
            "--socket-timeout", "10",
            "--playlist-end", str(max_results),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        entries = []
        for line in result.stdout.strip().split("\n"):
            if not line.strip():
                continue
            parts = line.split("\t")
            if len(parts) >= 1 and parts[0]:
                entry = {
                    "id": parts[0],
                    "title": parts[1] if len(parts) > 1 else "",
                    "is_live": parts[2] if len(parts) > 2 else "",
                    "channel": channel_name,
                }
                entries.append(entry)
        return entries
    except (subprocess.TimeoutExpired, Exception) as e:
        print(f"  Error fetching channel '{channel_name}': {e}", file=sys.stderr)
        return []


def verify_ytid(ytid):
    """Check if a YouTube video ID is valid via oEmbed API."""
    url = OEMBED_URL.format(ytid)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read())
        return ytid, True, data.get("title", ""), data.get("author_name", "")
    except urllib.error.HTTPError:
        return ytid, False, "", ""
    except Exception:
        return ytid, False, "", ""


def main():
    discovered = {}  # ytid -> {title, channel, source}

    # Phase 1: Search known channels
    print("=" * 60)
    print("PHASE 1: Scanning known webcam channels...")
    print("=" * 60)
    for channel in CHANNELS:
        print(f"\n  Scanning @{channel}...")
        entries = get_channel_live_streams(channel)
        added = 0
        for entry in entries:
            vid = entry["id"]
            if vid and vid not in discovered:
                discovered[vid] = {
                    "title": entry.get("title", ""),
                    "channel": entry.get("channel", channel),
                    "source": f"channel:{channel}",
                    "is_live": entry.get("is_live", ""),
                }
                added += 1
        print(f"    Found {len(entries)} streams, {added} new")

    print(f"\nAfter channel scan: {len(discovered)} unique streams")

    # Phase 2: Search queries
    print("\n" + "=" * 60)
    print("PHASE 2: Searching YouTube for live webcam streams...")
    print("=" * 60)
    for query in SEARCH_QUERIES:
        print(f"\n  Searching: '{query}'...")
        entries = run_ytdlp_search(query, max_results=30)
        added = 0
        for entry in entries:
            vid = entry["id"]
            if vid and vid not in discovered:
                discovered[vid] = {
                    "title": entry.get("title", ""),
                    "channel": entry.get("channel", ""),
                    "source": f"search:{query}",
                    "is_live": entry.get("is_live", ""),
                }
                added += 1
        print(f"    Found {len(entries)} results, {added} new")

    print(f"\nAfter search: {len(discovered)} unique streams")

    # Phase 3: Verify all discovered streams
    print("\n" + "=" * 60)
    print("PHASE 3: Verifying all discovered streams...")
    print("=" * 60)

    verified = []
    invalid_count = 0
    all_ids = list(discovered.keys())

    batch_size = 20
    for batch_start in range(0, len(all_ids), batch_size):
        batch = all_ids[batch_start:batch_start + batch_size]
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {executor.submit(verify_ytid, vid): vid for vid in batch}
            for future in as_completed(futures):
                ytid, is_valid, title, author = future.result()
                if is_valid:
                    info = discovered[ytid]
                    verified.append({
                        "ytId": ytid,
                        "yt_title": title,
                        "yt_author": author,
                        "channel": info.get("channel", ""),
                        "source": info.get("source", ""),
                        "is_live": info.get("is_live", ""),
                    })
                else:
                    invalid_count += 1

        if batch_start + batch_size < len(all_ids):
            time.sleep(0.5)

        # Progress
        processed = min(batch_start + batch_size, len(all_ids))
        print(f"  Verified {processed}/{len(all_ids)}: {len(verified)} valid, {invalid_count} invalid")

    print(f"\n{'='*60}")
    print(f"FINAL RESULTS:")
    print(f"  Discovered: {len(discovered)}")
    print(f"  Verified:   {len(verified)}")
    print(f"  Invalid:    {invalid_count}")

    # Save results
    out_path = Path(__file__).parent / "discovered_webcams.json"
    with open(out_path, "w") as f:
        json.dump(verified, f, indent=2)
    print(f"\nSaved {len(verified)} verified streams to {out_path}")


if __name__ == "__main__":
    main()
