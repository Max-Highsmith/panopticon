#!/usr/bin/env python3
"""Generate scenarios/index.json manifest for static hosting.

Reads all scenario JSON files in scenarios/ and produces a manifest
listing id, label, description, variants, framings, execution_mode,
and variables for each. This replaces the /api/scenarios server endpoint
when hosting as a static site (e.g. GitHub Pages).

Usage:
    python3 scripts/gen_scenario_manifest.py

Output:
    scenarios/index.json
"""

import json
import os
import glob

SCENARIOS_DIR = os.path.join(os.path.dirname(__file__), '..', 'scenarios')

manifest = []
for path in sorted(glob.glob(os.path.join(SCENARIOS_DIR, '*.json'))):
    if os.path.basename(path) == 'index.json':
        continue
    with open(path) as f:
        s = json.load(f)
    manifest.append({
        'id': s['id'],
        'label': s['label'],
        'description': s.get('description', ''),
        'variants': list(s.get('intel_feed', {}).keys()),
        'framings': list(s.get('framings', {}).keys()),
        'execution_mode': s.get('execution_mode', 'turn_based'),
        'variables': s.get('variables', {}),
    })

out_path = os.path.join(SCENARIOS_DIR, 'index.json')
with open(out_path, 'w') as f:
    json.dump(manifest, f, indent=2)

print(f'Wrote {len(manifest)} scenarios to {out_path}')
