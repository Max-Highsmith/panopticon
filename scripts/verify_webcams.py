#!/usr/bin/env python3
"""
Verify YouTube video IDs in webcam data files.
Checks each ytId against YouTube's oEmbed API to determine if the video exists.
Outputs a report of valid vs invalid IDs.
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

WEBCAM_DIR = Path(__file__).parent.parent / "data" / "layers" / "points"
OEMBED_URL = "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={}&format=json"

def check_ytid(ytid, name=""):
    """Check if a YouTube video ID is valid via oEmbed API."""
    url = OEMBED_URL.format(ytid)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read())
        title = data.get("title", "")
        return ytid, True, title
    except urllib.error.HTTPError as e:
        return ytid, False, f"HTTP {e.code}"
    except Exception as e:
        return ytid, False, str(e)

def main():
    # Find all webcam files
    webcam_files = sorted(WEBCAM_DIR.glob("webcams_*.json"))
    if not webcam_files:
        print("No webcam files found!")
        sys.exit(1)

    print(f"Found {len(webcam_files)} webcam files\n")

    all_entries = []  # (file, category_key, entry, index)

    for fpath in webcam_files:
        with open(fpath) as f:
            data = json.load(f)
        # Find the category key (not _source)
        cat_key = [k for k in data.keys() if k != "_source"][0]
        entries = data[cat_key]
        for i, entry in enumerate(entries):
            ytid = entry.get("ytId", "")
            if ytid:
                all_entries.append((fpath.name, cat_key, entry, i, ytid))

    print(f"Total entries to verify: {len(all_entries)}")
    print("Verifying... (this may take a few minutes)\n")

    valid = []
    invalid = []

    # Use thread pool for concurrent checks (rate-limited)
    batch_size = 20
    for batch_start in range(0, len(all_entries), batch_size):
        batch = all_entries[batch_start:batch_start + batch_size]
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {}
            for fname, cat, entry, idx, ytid in batch:
                future = executor.submit(check_ytid, ytid, entry.get("name", ""))
                futures[future] = (fname, cat, entry, idx)

            for future in as_completed(futures):
                fname, cat, entry, idx = futures[future]
                ytid, is_valid, info = future.result()
                name = entry.get("name", "unknown")
                if is_valid:
                    valid.append((fname, cat, entry, idx, info))
                    print(f"  VALID: {name} ({ytid}) — {info}")
                else:
                    invalid.append((fname, cat, entry, idx, info))
                    print(f"  INVALID: {name} ({ytid}) — {info}")

        # Small delay between batches to avoid rate limiting
        if batch_start + batch_size < len(all_entries):
            time.sleep(1)

    print(f"\n{'='*60}")
    print(f"RESULTS:")
    print(f"  Valid:   {len(valid)}")
    print(f"  Invalid: {len(invalid)}")
    print(f"  Total:   {len(all_entries)}")
    print(f"  Valid %: {100*len(valid)/len(all_entries):.1f}%")

    # Save results
    results = {
        "valid": [],
        "invalid": []
    }
    for fname, cat, entry, idx, info in valid:
        results["valid"].append({
            "file": fname,
            "category": cat,
            "name": entry.get("name", ""),
            "ytId": entry.get("ytId", ""),
            "yt_title": info,
            "lat": entry.get("lat"),
            "lon": entry.get("lon"),
            "country": entry.get("country", ""),
            "city": entry.get("city", "")
        })
    for fname, cat, entry, idx, info in invalid:
        results["invalid"].append({
            "file": fname,
            "category": cat,
            "name": entry.get("name", ""),
            "ytId": entry.get("ytId", ""),
            "error": info,
        })

    out_path = Path(__file__).parent.parent / "scripts" / "webcam_verification.json"
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nDetailed results saved to {out_path}")

    # Print valid entries by file for reference
    print(f"\n{'='*60}")
    print("VALID ENTRIES BY FILE:")
    from collections import Counter
    valid_by_file = Counter(fname for fname, _, _, _, _ in valid)
    invalid_by_file = Counter(fname for fname, _, _, _, _ in invalid)
    all_files = sorted(set(list(valid_by_file.keys()) + list(invalid_by_file.keys())))
    for fname in all_files:
        v = valid_by_file.get(fname, 0)
        inv = invalid_by_file.get(fname, 0)
        print(f"  {fname}: {v} valid, {inv} invalid")

if __name__ == "__main__":
    main()
