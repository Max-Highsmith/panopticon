#!/usr/bin/env python3
"""
Ingest underwater webcam data for Panopticon.

Sources:
  - Coral City Camera: coralcitycamera.com (YouTube Live)
  - Deerfield Beach / Lower FL Keys: Florida Fish and Wildlife (YouTube Live)
  - Utopia Village Reef Cam: utopiautila.com (YouTube Live)
  - Explore.org Shark Cam: explore.org/livecams (YouTube Live)
  - Monterey Bay Aquarium: montereybayaquarium.org (YouTube Live)
  - Georgia Aquarium: georgiaaquarium.org (YouTube Live)
  - National Aquarium: aqua.org (YouTube Live)
  - Vancouver Aquarium: vanaqua.org (YouTube Live)

These are curated public YouTube live streams. Since YouTube stream IDs can
rotate, this script embeds the known IDs at time of curation and outputs the
layer JSON. To update, verify each stream URL and update the ytId fields below.

Usage:
    python3 scripts/ingest_underwater_webcams.py
"""

import json
import os

OUTPUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'layers', 'points', 'underwater_webcams.json')

CAMERAS = [
    {
        "name": "Coral City Camera",
        "lat": 25.7743, "lon": -80.1709,
        "country": "US", "city": "PortMiami, FL",
        "ytId": "7i8ARjIeM2k",
        "notes": "Fixed camera under a pier monitoring fish biodiversity in an urban harbor",
        "url": "https://www.youtube.com/live/7i8ARjIeM2k"
    },
    {
        "name": "Deerfield Beach Underwater Cam",
        "lat": 26.3184, "lon": -80.0728,
        "country": "US", "city": "Deerfield Beach, FL",
        "ytId": "V7c7pBbH150",
        "notes": "Camera mounted on the fishing pier showing reef fish and occasional sharks",
        "url": "https://www.youtube.com/live/V7c7pBbH150"
    },
    {
        "name": "Lower Florida Keys Underwater Cam",
        "lat": 24.5551, "lon": -81.7800,
        "country": "US", "city": "Florida Keys, FL",
        "ytId": "qi0mY6zVQnY",
        "notes": "Reef-edge camera streaming tropical fish and rays",
        "url": "https://www.youtube.com/live/qi0mY6zVQnY"
    },
    {
        "name": "Utopia Village Reef Cam",
        "lat": 16.0936, "lon": -86.9311,
        "country": "HN", "city": "Utila, Honduras",
        "ytId": "1zcIUk66HX4",
        "notes": "Fixed reef camera (~25 ft deep) showing Caribbean reef ecosystem",
        "url": "https://www.youtube.com/live/1zcIUk66HX4"
    },
    {
        "name": "Explore.org Shark Cam",
        "lat": 24.7500, "lon": -76.0000,
        "country": "BS", "city": "Bahamas",
        "ytId": None,
        "ytChannel": "exploreorg",
        "notes": "Stationary reef camera where Caribbean reef sharks appear frequently",
        "url": "https://www.youtube.com/@exploreorg/live"
    },
    {
        "name": "Monterey Bay – Kelp Forest Cam",
        "lat": 36.6181, "lon": -121.9018,
        "country": "US", "city": "Monterey, CA",
        "ytId": None,
        "ytChannel": "MontereyBayAquarium",
        "notes": "Large kelp forest tank with fish and sharks (public livestream)",
        "url": "https://www.youtube.com/@MontereyBayAquarium/live"
    },
    {
        "name": "Monterey Bay – Jelly Cam",
        "lat": 36.6181, "lon": -121.9016,
        "country": "US", "city": "Monterey, CA",
        "ytId": None,
        "ytChannel": "MontereyBayAquarium",
        "notes": "Continuous jellyfish tank livestream",
        "url": "https://www.youtube.com/@MontereyBayAquarium/live"
    },
    {
        "name": "Georgia Aquarium Ocean Cam",
        "lat": 33.7634, "lon": -84.3951,
        "country": "US", "city": "Atlanta, GA",
        "ytId": None,
        "ytChannel": "GeorgiaAquarium",
        "notes": "Large ocean tank with whale sharks and manta rays",
        "url": "https://www.youtube.com/@GeorgiaAquarium/live"
    },
    {
        "name": "National Aquarium Cam",
        "lat": 39.2856, "lon": -76.6083,
        "country": "US", "city": "Baltimore, MD",
        "ytId": None,
        "ytChannel": "NationalAquarium",
        "notes": "Reef tank livestream showing coral reef ecosystem",
        "url": "https://www.youtube.com/@NationalAquarium/live"
    },
    {
        "name": "Vancouver Aquarium Cam",
        "lat": 49.3006, "lon": -123.1310,
        "country": "CA", "city": "Vancouver, BC",
        "ytId": None,
        "ytChannel": "vanaqua",
        "notes": "Underwater tank livestream with marine fish and mammals",
        "url": "https://www.youtube.com/@vanaqua/live"
    },
]


def main():
    # Build output entries (strip url field used only for reference)
    entries = []
    for cam in CAMERAS:
        entry = {k: v for k, v in cam.items() if k != 'url'}
        entries.append(entry)

    output = {
        "_source": {
            "description": "Curated live underwater webcam streams from marine environments — reef cams, aquarium tanks, and ocean floor cameras",
            "origin": "YouTube Live streams from Coral City Camera (coralcitycamera.com), Deerfield Beach/Lower Florida Keys (Florida Fish and Wildlife), Utopia Village (utopiautila.com), Explore.org (explore.org/livecams), Monterey Bay Aquarium (montereybayaquarium.org), Georgia Aquarium (georgiaaquarium.org), National Aquarium (aqua.org), Vancouver Aquarium (vanaqua.org)",
            "retrieved": "2026-03-08",
            "license": "Public live streams — fair use",
            "notes": "YouTube IDs may change as streams rotate. Aquarium cams are captive exhibits; reef cams are wild environments."
        },
        "underwater": entries
    }

    out_path = os.path.normpath(OUTPUT)
    with open(out_path, 'w') as f:
        json.dump(output, f, indent=2)

    print(f'Wrote {len(entries)} underwater webcams to {out_path}')


if __name__ == '__main__':
    main()
