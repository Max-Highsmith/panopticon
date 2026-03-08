#!/usr/bin/env python3
"""Extract ALL aircraft traces for a specific time window and region.

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
# 2026-03-01 16:17:09Z ±15 min
TIME_START = 57720  # 16:02 UTC
TIME_END = 59520    # 16:32 UTC
OUTPUT_FILE = "../military_feb28.json"

# Bounding box: Iran + all border countries
LAT_MIN = 12.0
LAT_MAX = 44.0
LON_MIN = 26.0
LON_MAX = 74.0

# Subsample interval: military gets full resolution, civilian every 15s
CIV_SAMPLE_INTERVAL = 15  # seconds

# Government/military ICAO hex ranges for countries in this region
# Aircraft in these ranges with NO registration are likely military/govt
MIL_HEX_RANGES = [
    (0x700000, 0x70FFFF, "Oman"),
    (0x710000, 0x71FFFF, "Saudi"),
    (0x730000, 0x73FFFF, "Qatar"),
    (0x740000, 0x74FFFF, "UAE"),
    (0x750000, 0x75FFFF, "Kuwait/Bahrain"),
    (0x760000, 0x76FFFF, "Iraq"),
    (0x500000, 0x50FFFF, "Israel"),
    (0xADF7C0, 0xAFFFFF, "US"),
    (0x3F0000, 0x3FFFFF, "France"),
    (0x3E0000, 0x3EFFFF, "Germany"),
    (0x43C000, 0x43CFFF, "UK"),
]

def classify_military(icao_hex, reg, db_flags):
    """Classify an aircraft as military using multiple heuristics."""
    # Database flag
    if db_flags & 1:
        return True
    # Unregistered aircraft in government hex ranges
    if not reg or reg.strip() == "":
        try:
            val = int(icao_hex, 16)
            for lo, hi, _country in MIL_HEX_RANGES:
                if lo <= val <= hi:
                    return True
        except ValueError:
            pass
    return False


aircraft_list = []
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

        icao = data.get("icao", "")
        reg = data.get("r", "")
        db_flags = data.get("dbFlags", 0)
        is_mil = classify_military(icao, reg, db_flags)

        trace = data.get("trace", [])
        filtered = []
        last_kept_t = -999

        for pt in trace:
            t = pt[0]
            if TIME_START <= t <= TIME_END:
                lat, lon = pt[1], pt[2]
                if lat is None or lon is None:
                    continue
                # Check bounding box
                if not (LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX):
                    continue
                # Subsample civilian traces
                if not is_mil and (t - last_kept_t) < CIV_SAMPLE_INTERVAL:
                    continue
                last_kept_t = t
                filtered.append({
                    "t": round(t, 1),
                    "lat": round(lat, 4),
                    "lon": round(lon, 4),
                    "alt": pt[3],
                    "gs": pt[4],
                    "track": pt[5],
                })

        if not filtered:
            continue

        aircraft_list.append({
            "hex": icao,
            "r": reg,
            "t": data.get("t", ""),
            "desc": data.get("desc", ""),
            "mil": is_mil,
            "trace": filtered,
        })

mil_count = sum(1 for a in aircraft_list if a["mil"])
civ_count = sum(1 for a in aircraft_list if not a["mil"])
print(f"Found {len(aircraft_list)} aircraft ({mil_count} military/govt, {civ_count} civilian)", file=sys.stderr)
print(f"Total trace points: {sum(len(a['trace']) for a in aircraft_list)}", file=sys.stderr)

# Show military aircraft found
for a in sorted([x for x in aircraft_list if x["mil"]], key=lambda x: -max((p["gs"] or 0) for p in x["trace"])):
    max_gs = max((p["gs"] or 0) for p in a["trace"])
    print(f"  MIL: {a['hex']} reg={a['r'] or '???':12s} type={a['t'] or '???':6s} gs_max={max_gs:.0f}", file=sys.stderr)

output = {
    "date": "2026-03-01",
    "time_start_utc": TIME_START,
    "time_end_utc": TIME_END,
    "aircraft": aircraft_list,
}

with open(OUTPUT_FILE, "w") as f:
    json.dump(output, f)

print(f"Written to {OUTPUT_FILE}", file=sys.stderr)
