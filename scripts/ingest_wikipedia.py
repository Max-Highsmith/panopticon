#!/usr/bin/env python3
"""
Fetch Wikipedia geosearch articles for strategic locations and produce wikipedia_geo.json.

Sources:
  - Wikipedia MediaWiki API geosearch — https://en.wikipedia.org/w/api.php
  - Endpoint: action=query&list=geosearch (for nearby articles)
  - Endpoint: action=query&prop=extracts|info (for summaries)
  - No authentication required
  - Content license: CC-BY-SA 3.0

Usage:
    python3 scripts/ingest_wikipedia.py

Output:
    data/layers/ambient/wikipedia_geo.json
"""

import json
import urllib.request
import urllib.parse
import time
from datetime import datetime, timezone

OUTPUT_PATH = 'data/layers/ambient/wikipedia_geo.json'
API_URL = 'https://en.wikipedia.org/w/api.php'
QUERY_DELAY_S = 1  # Be polite to Wikipedia

# Strategic coordinates: chokepoints, capitals, flashpoints, contested regions
STRATEGIC_COORDS = [
    (26.57, 56.25, 'Strait of Hormuz'),
    (30.70, 32.34, 'Suez Canal'),
    (9.08, -79.68, 'Panama Canal'),
    (24.50, 119.50, 'Taiwan Strait'),
    (16.00, 114.00, 'South China Sea'),
    (78.00, 16.00, 'Svalbard / Arctic'),
    (41.12, 29.05, 'Bosphorus'),
    (2.50, 101.50, 'Strait of Malacca'),
    (27.00, 50.00, 'Persian Gulf'),
    (43.00, 34.00, 'Black Sea'),
    (37.95, 126.97, 'Korean DMZ'),
    (59.00, 20.00, 'Baltic Sea'),
    (35.00, 33.00, 'Eastern Mediterranean'),
    (11.50, 43.00, 'Horn of Africa'),
    (-51.75, -59.00, 'Falkland Islands'),
    (38.90, -77.04, 'Washington DC'),
    (55.75, 37.62, 'Moscow'),
    (39.90, 116.40, 'Beijing'),
    (35.69, 51.39, 'Tehran'),
    (39.03, 125.75, 'Pyongyang'),
]


def api_get(params):
    """Make a GET request to the Wikipedia API."""
    url = f'{API_URL}?{urllib.parse.urlencode(params)}'
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Panopticon/1.0 (strategic globe tool; data ingestion)',
        'Accept': 'application/json',
    })
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode('utf-8'))


def fetch_geosearch(lat, lon, radius=10000, limit=50):
    """Query Wikipedia geosearch for articles near a coordinate."""
    return api_get({
        'action': 'query',
        'list': 'geosearch',
        'gscoord': f'{lat}|{lon}',
        'gsradius': str(radius),
        'gslimit': str(limit),
        'format': 'json',
        'origin': '*',
    })


def fetch_extracts(pageids):
    """Fetch extracts and URLs for a batch of page IDs (max 50)."""
    return api_get({
        'action': 'query',
        'pageids': '|'.join(str(pid) for pid in pageids),
        'prop': 'extracts|info',
        'exintro': 'true',
        'explaintext': 'true',
        'exlimit': str(len(pageids)),
        'inprop': 'url',
        'format': 'json',
        'origin': '*',
    })


def main():
    # Step 1: Collect all geotagged articles
    all_geo = {}  # pageid -> {pageid, title, lat, lon, dist}
    for lat, lon, label in STRATEGIC_COORDS:
        print(f'Querying {label} ({lat}, {lon})...')
        try:
            raw = fetch_geosearch(lat, lon)
            results = raw.get('query', {}).get('geosearch', [])
            for r in results:
                pid = r['pageid']
                if pid not in all_geo:
                    all_geo[pid] = {
                        'pageid': pid,
                        'title': r['title'],
                        'lat': r['lat'],
                        'lon': r['lon'],
                    }
            print(f'  Found {len(results)} articles')
        except Exception as e:
            print(f'  Error: {e}')
        time.sleep(QUERY_DELAY_S)

    print(f'\n{len(all_geo)} unique articles found. Fetching extracts...')

    # Step 2: Batch-fetch extracts (50 at a time)
    pageids = list(all_geo.keys())
    extracts = {}  # pageid -> {extract, fullurl}
    for i in range(0, len(pageids), 50):
        batch = pageids[i:i+50]
        try:
            raw = fetch_extracts(batch)
            pages = raw.get('query', {}).get('pages', {})
            for pid_str, p in pages.items():
                extracts[int(pid_str)] = {
                    'extract': (p.get('extract') or '')[:300],
                    'fullurl': p.get('fullurl', ''),
                }
            print(f'  Fetched extracts for batch {i//50 + 1} ({len(batch)} pages)')
        except Exception as e:
            print(f'  Error fetching extracts: {e}')
        time.sleep(QUERY_DELAY_S)

    # Step 3: Merge and build output
    articles = []
    for pid, geo in all_geo.items():
        ext = extracts.get(pid, {})
        articles.append({
            'pageid': pid,
            'name': geo['title'],
            'title': geo['title'],
            'lat': geo['lat'],
            'lon': geo['lon'],
            'extract': ext.get('extract', ''),
            'url': ext.get('fullurl') or f"https://en.wikipedia.org/?curid={pid}",
            'distKm': 0,
        })

    articles.sort(key=lambda a: a['title'])

    out = {
        '_source': {
            'description': 'Pre-cached Wikipedia articles for strategic regions worldwide',
            'origin': 'Wikipedia MediaWiki API geosearch — https://en.wikipedia.org/w/api.php',
            'retrieved': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
            'license': 'CC-BY-SA 3.0 (Wikipedia content license)',
            'notes': (
                f'Static snapshot for offline fallback. '
                f'Queried {len(STRATEGIC_COORDS)} strategic coordinates, '
                f'deduplicated to {len(articles)} unique articles. '
                f'Extracts truncated to 300 chars.'
            ),
        },
        'queryLat': None,
        'queryLon': None,
        'snapshot_ts': datetime.now(timezone.utc).isoformat() + 'Z',
        'articles': articles,
    }

    with open(OUTPUT_PATH, 'w') as f:
        json.dump(out, f, indent=2)

    print(f'\nWrote {len(articles)} unique articles to {OUTPUT_PATH}')


if __name__ == '__main__':
    main()
