#!/usr/bin/env python3
"""
Fetch active prediction markets from Kalshi and produce kalshi_markets.json.

Sources:
  - Kalshi Trade API v2 — https://docs.kalshi.com/api-reference
  - Events endpoint: GET /trade-api/v2/events?with_nested_markets=true
  - Public endpoint (no authentication required for market data reads)

Usage:
    python3 scripts/ingest_kalshi.py

Notes:
  - Uses the events endpoint (not markets) to get category data
  - Prices are in USD cents from the API; converted to 0.00-1.00 range
  - Fetches up to 200 highest-volume markets across all categories
  - Output is hand-editable for wargame scenario curation
"""

import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone

BASE_URL = 'https://api.elections.kalshi.com/trade-api/v2'
OUTPUT_PATH = 'data/layers/ambient/kalshi_markets.json'
MAX_MARKETS = 200


def fetch_events(status='open', limit=100, max_pages=5):
    """Fetch events with nested markets from Kalshi public API."""
    all_events = []
    cursor = None

    for page in range(max_pages):
        params = {
            'status': status,
            'limit': limit,
            'with_nested_markets': 'true',
        }
        if cursor:
            params['cursor'] = cursor

        url = f'{BASE_URL}/events?{urllib.parse.urlencode(params)}'
        req = urllib.request.Request(url, headers={
            'Accept': 'application/json',
            'User-Agent': 'Panopticon/1.0 (data ingestion)',
        })

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            print(f'  HTTP error {e.code}: {e.reason}')
            break
        except urllib.error.URLError as e:
            print(f'  URL error: {e.reason}')
            break

        events = data.get('events', [])
        if not events:
            break

        all_events.extend(events)
        print(f'  Page {page + 1}: {len(events)} events (total: {len(all_events)})')

        cursor = data.get('cursor')
        if not cursor:
            break

    return all_events


def cents_to_dollars(val):
    """Convert cent value (0-100) to dollar value (0.00-1.00)."""
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return round(val / 100, 4)
    return 0.0


def parse_markets(events):
    """Extract and flatten markets from events, attaching category."""
    markets = []
    for event in events:
        category = event.get('category', '')
        event_title = event.get('title', '')
        for m in event.get('markets', []):
            # Skip inactive markets
            if m.get('status') not in ('active', 'open'):
                continue
            markets.append({
                'ticker': m.get('ticker', ''),
                'event_ticker': m.get('event_ticker', ''),
                'title': m.get('title', ''),
                'subtitle': m.get('subtitle', ''),
                'event_title': event_title,
                'category': category,
                'yes_bid': cents_to_dollars(m.get('yes_bid')),
                'yes_ask': cents_to_dollars(m.get('yes_ask')),
                'no_bid': cents_to_dollars(m.get('no_bid')),
                'no_ask': cents_to_dollars(m.get('no_ask')),
                'last_price': cents_to_dollars(m.get('last_price')),
                'volume': m.get('volume', 0) or 0,
                'volume_24h': m.get('volume_24h', 0) or 0,
                'open_interest': m.get('open_interest', 0) or 0,
                'expiration': m.get('expected_expiration_time', ''),
                'status': m.get('status', ''),
            })
    return markets


def main():
    print('Fetching Kalshi events with nested markets...')
    events = fetch_events()

    if not events:
        print('No events fetched. Writing empty file.')
        markets = []
    else:
        markets = parse_markets(events)
        # Sort by total volume descending (more stable than 24h)
        markets.sort(key=lambda x: x.get('volume', 0), reverse=True)
        # Cap at MAX_MARKETS
        markets = markets[:MAX_MARKETS]

    # Collect unique categories
    categories = sorted(set(m['category'] for m in markets if m.get('category')))

    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    out = {
        '_source': {
            'description': 'Active prediction markets from Kalshi exchange',
            'origin': 'Kalshi Trade API v2 — https://docs.kalshi.com/api-reference',
            'retrieved': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
            'license': 'Kalshi API Terms of Service — https://kalshi.com/terms',
            'notes': 'Snapshot of active markets. Prices normalized to 0.00-1.00 range. '
                     'Hand-editable for wargame scenarios.',
        },
        'snapshot_ts': now,
        'categories': categories,
        'markets': markets,
    }

    with open(OUTPUT_PATH, 'w') as f:
        json.dump(out, f, indent=2)

    print(f'Wrote {len(markets)} markets ({len(categories)} categories) to {OUTPUT_PATH}')
    if categories:
        print(f'Categories: {", ".join(categories)}')


if __name__ == '__main__':
    main()
