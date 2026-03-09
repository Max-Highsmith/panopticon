#!/usr/bin/env python3
"""
Fetch recent large Bitcoin transactions from mempool.space and produce whale_btc.json.

Sources:
  - mempool.space REST API — https://mempool.space/docs/api/rest
  - Recent blocks: GET /api/blocks
  - Block transactions: GET /api/block/{hash}/txs
  - BTC price: GET /api/v1/prices
  - License: AGPL-3.0 (open source), API is free, no authentication

Usage:
    python3 scripts/ingest_whale_btc.py

Notes:
  - Scans recent blocks for transactions with total output value >= 10 BTC
  - Transaction values calculated from output sums (in satoshis, converted to BTC)
  - USD estimates based on mempool.space price endpoint
"""

import json
import urllib.request
from datetime import datetime, timezone

API_BASE = 'https://mempool.space/api'
OUTPUT_PATH = 'data/layers/ambient/whale_btc.json'
THRESHOLD_BTC = 10
MAX_BLOCKS = 3
MAX_TXS = 50
SATS_PER_BTC = 100_000_000


def api_get(path):
    """Fetch JSON from mempool.space API."""
    url = f'{API_BASE}{path}'
    req = urllib.request.Request(url, headers={
        'Accept': 'application/json',
        'User-Agent': 'Panopticon/1.0 (data ingestion)',
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f'  Error fetching {path}: {e}')
        return None


def get_btc_price():
    """Get current BTC price in USD from mempool.space."""
    data = api_get('/v1/prices')
    if data and 'USD' in data:
        return data['USD']
    return 0


def get_recent_blocks(count=MAX_BLOCKS):
    """Get recent blocks."""
    blocks = api_get('/blocks')
    if blocks:
        return blocks[:count]
    return []


def get_block_txs(block_hash):
    """Get transactions for a block."""
    txs = api_get(f'/block/{block_hash}/txs')
    return txs or []


def extract_whale_txs(txs, btc_price):
    """Filter transactions for whale-sized transfers (>= THRESHOLD_BTC)."""
    whales = []
    for tx in txs:
        # Sum all outputs in satoshis
        total_sats = sum(out.get('value', 0) for out in tx.get('vout', []))
        total_btc = total_sats / SATS_PER_BTC

        if total_btc >= THRESHOLD_BTC:
            whales.append({
                'txid': tx.get('txid', ''),
                'value_btc': round(total_btc, 4),
                'value_usd': round(total_btc * btc_price, 2) if btc_price else None,
                'fee_sats': tx.get('fee', 0),
                'size': tx.get('size', 0),
                'weight': tx.get('weight', 0),
                'time': datetime.fromtimestamp(
                    tx.get('status', {}).get('block_time', 0),
                    tz=timezone.utc
                ).isoformat() if tx.get('status', {}).get('block_time') else '',
                'inputs': len(tx.get('vin', [])),
                'outputs': len(tx.get('vout', [])),
            })

    return whales


def main():
    print('Fetching BTC price from mempool.space...')
    btc_price = get_btc_price()
    print(f'  BTC price: ${btc_price:,.0f}')

    print(f'Fetching recent {MAX_BLOCKS} blocks...')
    blocks = get_recent_blocks()

    all_whales = []
    for block in blocks:
        block_hash = block.get('id', '')
        height = block.get('height', 0)
        print(f'  Block {height} ({block_hash[:12]}...)...')
        txs = get_block_txs(block_hash)
        whales = extract_whale_txs(txs, btc_price)
        all_whales.extend(whales)
        print(f'    {len(txs)} txs, {len(whales)} whale txs (>= {THRESHOLD_BTC} BTC)')

    # Sort by value descending
    all_whales.sort(key=lambda x: x['value_btc'], reverse=True)
    all_whales = all_whales[:MAX_TXS]

    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    out = {
        '_source': {
            'description': 'Recent large Bitcoin transactions (whale movements) from the mempool and recent blocks',
            'origin': 'mempool.space REST API — https://mempool.space/docs/api/rest',
            'retrieved': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
            'license': 'mempool.space is open source (AGPL-3.0). API is free, no authentication required.',
            'notes': f'Threshold set at {THRESHOLD_BTC} BTC. Transaction values calculated from output sums. USD estimates based on snapshot BTC price.',
        },
        'snapshot_ts': now,
        'btc_price_usd': btc_price,
        'threshold_btc': THRESHOLD_BTC,
        'transactions': all_whales,
    }

    with open(OUTPUT_PATH, 'w') as f:
        json.dump(out, f, indent=2)

    print(f'Wrote {len(all_whales)} whale transactions to {OUTPUT_PATH}')
    if all_whales:
        print(f'  Largest: {all_whales[0]["value_btc"]:.4f} BTC (${all_whales[0].get("value_usd", 0):,.0f})')


if __name__ == '__main__':
    main()
