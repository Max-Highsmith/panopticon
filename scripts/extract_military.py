#!/usr/bin/env python3
"""Extract military aircraft traces for a specific time window and output replay JSON.

DATA SOURCE: adsb.lol daily ADS-B trace archives
  Download:  https://globe.adsbexchange.com/globe_history/{YYYY}/{MM}/{DD}/traces/
  Alt:       https://adsb.lol/data/
  Archive:   v{YYYY}.{MM}.{DD}-planes-readsb-prod-0.tar (split with `split -b 2G`)
  Extract:   cat *.tar.aa *.tar.ab | tar xf -
  Result:    traces/{00..ff}/trace_full_{icao}{xx}.json (gzipped JSON per aircraft)

Used archive: v2026.03.01-planes-readsb-prod-0.tar
"""
import gzip
import json
import os
import sys

TRACES_DIR = "./traces"
# 2026-03-01 16:17:09Z ±15 min => 16:02 - 16:32 UTC
TIME_START = 57720  # 16:02 UTC
TIME_END = 59520    # 16:32 UTC
DATE_LABEL = "2026-03-01"
SAMPLE_INTERVAL = 10  # seconds between samples for replay

military = []
total_checked = 0

for subdir in os.listdir(TRACES_DIR):
    subpath = os.path.join(TRACES_DIR, subdir)
    if not os.path.isdir(subpath):
        continue
    for fname in os.listdir(subpath):
        if not fname.endswith(".json"):
            continue
        fpath = os.path.join(subpath, fname)
        total_checked += 1
        if total_checked % 5000 == 0:
            print(f"  Checked {total_checked} aircraft...", file=sys.stderr)
        try:
            with open(fpath, "rb") as f:
                data = json.loads(gzip.decompress(f.read()))
        except Exception:
            continue

        # Check military flag
        if not (data.get("dbFlags", 0) & 1):
            continue

        # Filter trace points to time window
        trace = data.get("trace", [])
        filtered = []
        for pt in trace:
            t = pt[0]  # seconds since midnight UTC
            if TIME_START <= t <= TIME_END:
                filtered.append({
                    "t": round(t, 1),
                    "lat": pt[1],
                    "lon": pt[2],
                    "alt": pt[3],  # baro alt in feet
                    "gs": pt[4],   # ground speed knots
                    "track": pt[5],
                })

        if not filtered:
            continue

        military.append({
            "hex": data.get("icao", ""),
            "r": data.get("r", ""),
            "t": data.get("t", ""),
            "desc": data.get("desc", ""),
            "trace": filtered,
        })

print(f"Found {len(military)} military aircraft with data in time window", file=sys.stderr)
print(f"Total trace points: {sum(len(m['trace']) for m in military)}", file=sys.stderr)

# Output as JSON
output = {
    "date": DATE_LABEL,
    "time_start_utc": TIME_START,
    "time_end_utc": TIME_END,
    "aircraft": military,
}

with open("military_feb28.json", "w") as f:
    json.dump(output, f)

print(f"Written to military_feb28.json", file=sys.stderr)
