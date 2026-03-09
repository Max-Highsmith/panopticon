#!/usr/bin/env python3
"""
Fetch top cryptocurrencies from CoinGecko and produce crypto_markets.json.

Sources:
  - CoinGecko API v3 — https://www.coingecko.com/en/api
  - Endpoint: GET /api/v3/coins/markets
  - Free tier, no authentication required
  - Rate limit: ~10-30 calls/minute

Usage:
    python3 scripts/ingest_crypto.py
"""

import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone

API_URL = 'https://api.coingecko.com/api/v3/coins/markets'
OUTPUT_PATH = 'data/layers/ambient/crypto_markets.json'
MAX_COINS = 50


def fetch_markets():
    """Fetch top coins by market cap from CoinGecko."""
    params = {
        'vs_currency': 'usd',
        'order': 'market_cap_desc',
        'per_page': str(MAX_COINS),
        'page': '1',
        'sparkline': 'false',
    }
    url = f'{API_URL}?{urllib.parse.urlencode(params)}'
    req = urllib.request.Request(url, headers={
        'Accept': 'application/json',
        'User-Agent': 'Panopticon/1.0 (data ingestion)',
    })

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f'HTTP error {e.code}: {e.reason}')
        return []
    except urllib.error.URLError as e:
        print(f'URL error: {e.reason}')
        return []


def main():
    print(f'Fetching top {MAX_COINS} cryptocurrencies from CoinGecko...')
    raw = fetch_markets()

    if not raw:
        print('No data fetched. Writing empty file.')
        coins = []
    else:
        coins = []
        for c in raw:
            coins.append({
                'id': c.get('id', ''),
                'symbol': (c.get('symbol', '') or '').upper(),
                'name': c.get('name', ''),
                'image': c.get('image', ''),
                'price': c.get('current_price', 0) or 0,
                'change_24h': round(c.get('price_change_percentage_24h', 0) or 0, 2),
                'market_cap': c.get('market_cap', 0) or 0,
                'volume_24h': c.get('total_volume', 0) or 0,
                'rank': c.get('market_cap_rank', 0) or 0,
            })
        print(f'  Fetched {len(coins)} coins')

    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    out = {
        '_source': {
            'description': 'Top 50 cryptocurrencies by market capitalization with current prices and 24h change',
            'origin': 'CoinGecko API v3 — https://www.coingecko.com/en/api',
            'retrieved': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
            'license': 'CoinGecko Free API Terms — https://www.coingecko.com/en/api_terms',
            'notes': 'Free tier, no authentication required. Rate limited to ~10-30 calls/minute. Prices in USD.',
        },
        'snapshot_ts': now,
        'coins': coins,
    }

    with open(OUTPUT_PATH, 'w') as f:
        json.dump(out, f, indent=2)

    print(f'Wrote {len(coins)} coins to {OUTPUT_PATH}')


if __name__ == '__main__':
    main()
