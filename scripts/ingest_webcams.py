#!/usr/bin/env python3
"""
Ingestion script for live webcam layer data.

Discovers, verifies, categorizes, and geolocates YouTube live webcam streams,
then writes 12 category-specific JSON files to data/layers/points/.

REQUIREMENTS:
  - yt-dlp: brew install yt-dlp (or pip install yt-dlp)
  - Python 3.8+
  - Internet connection (queries YouTube search + oEmbed API)

USAGE:
  python3 scripts/ingest_webcams.py              # Full discovery + rebuild
  python3 scripts/ingest_webcams.py --verify-only # Just re-verify existing files
  python3 scripts/ingest_webcams.py --rebuild-only # Rebuild from cached discovery data

SOURCES:
  YouTube Live streams discovered via yt-dlp from:
  - EarthCam (@EarthCam) — city, landmark, wildlife webcams
  - SkylineWebcams (@SkylineWebcams) — European city/beach cams
  - Virtual Railfan (@VirtualRailfan) — US train cameras
  - RailStream (@RailStream) — railway crossing cameras
  - NASASpaceflight (@NASASpaceflight) — SpaceX facility cams
  - explore.org (@explore) — wildlife/nature observation cams
  - Africam (@africaboreal) — African wildlife waterhole cams
  - VolcanoYT (@VolcanoYT) — active volcano monitoring
  - PTZtv (@PTZtv) — pan-tilt-zoom city cameras
  - WorldMonitor (worldmonitor.app) — geopolitical hotspot cams
  - YouTube search for "live cam 24/7" across 100+ category/location queries

VERIFICATION:
  All YouTube IDs verified via YouTube oEmbed API:
  https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={ID}&format=json
  Returns HTTP 200 for valid public videos, 404 for invalid/private.

OUTPUT:
  12 files in data/layers/points/:
    webcams_aurora.json, webcams_aviation.json, webcams_beaches.json,
    webcams_cities.json, webcams_landmarks.json, webcams_maritime.json,
    webcams_nature.json, webcams_rail.json, webcams_space.json,
    webcams_traffic.json, webcams_volcanoes.json, webcams_wildlife.json
"""

import sys
import subprocess
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent

def main():
    args = sys.argv[1:]

    if "--verify-only" in args:
        print("Running verification only...")
        subprocess.run([sys.executable, str(SCRIPT_DIR / "verify_webcams.py")], check=True)
        return

    if "--rebuild-only" in args:
        disc_path = SCRIPT_DIR / "discovered_webcams.json"
        if not disc_path.exists():
            print("ERROR: No discovered_webcams.json found. Run full discovery first.")
            sys.exit(1)
        print("Rebuilding from cached discovery data...")
        subprocess.run([sys.executable, str(SCRIPT_DIR / "rebuild_webcams.py")], check=True)
        return

    # Full pipeline: discover → rebuild
    print("=" * 60)
    print("STEP 1: Discovering live webcam streams via yt-dlp...")
    print("=" * 60)
    subprocess.run([sys.executable, str(SCRIPT_DIR / "discover_webcams.py")], check=True)

    print("\n" + "=" * 60)
    print("STEP 2: Rebuilding webcam data files...")
    print("=" * 60)
    subprocess.run([sys.executable, str(SCRIPT_DIR / "rebuild_webcams.py")], check=True)

    print("\nDone! Webcam data files updated in data/layers/points/webcams_*.json")


if __name__ == "__main__":
    main()
