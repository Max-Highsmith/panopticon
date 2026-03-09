#!/usr/bin/env python3
"""
Fetch trending news headlines from Google News RSS and produce trending_news.json.

Sources:
  - Google News RSS — https://news.google.com/rss
  - Direct XML parse (no CORS issues in Python, unlike browser)

Usage:
    python3 scripts/ingest_news.py

Notes:
  - Browser live-polling uses rss2json.com as a CORS proxy.
  - This script fetches RSS directly and parses XML.
  - Headlines are factual titles; display constitutes fair use.
"""

import json
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
import email.utils

RSS_URL = 'https://news.google.com/rss'
OUTPUT_PATH = 'data/layers/ambient/trending_news.json'
MAX_HEADLINES = 50


def fetch_rss():
    """Fetch Google News RSS feed."""
    req = urllib.request.Request(RSS_URL, headers={
        'User-Agent': 'Panopticon/1.0 (data ingestion)',
    })

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read().decode('utf-8')
    except Exception as e:
        print(f'Error fetching RSS: {e}')
        return None


def parse_source_from_title(title):
    """Extract source name from Google News title format: 'Headline - Source Name'."""
    if ' - ' in title:
        parts = title.rsplit(' - ', 1)
        return parts[1].strip()
    return ''


def parse_rss(xml_text):
    """Parse RSS XML into headline objects."""
    root = ET.fromstring(xml_text)
    headlines = []

    for item in root.findall('.//item'):
        title_el = item.find('title')
        link_el = item.find('link')
        pubdate_el = item.find('pubDate')

        title = title_el.text if title_el is not None else ''
        link = link_el.text if link_el is not None else ''
        pub_date_raw = pubdate_el.text if pubdate_el is not None else ''

        # Parse RFC 2822 date to ISO 8601
        pub_date = ''
        if pub_date_raw:
            try:
                parsed = email.utils.parsedate_to_datetime(pub_date_raw)
                pub_date = parsed.isoformat()
            except Exception:
                pub_date = pub_date_raw

        source = parse_source_from_title(title)
        # Clean title by removing source suffix
        clean_title = title.rsplit(' - ', 1)[0].strip() if source else title

        headlines.append({
            'title': clean_title,
            'link': link,
            'source': source,
            'pubDate': pub_date,
        })

    return headlines[:MAX_HEADLINES]


def main():
    print('Fetching Google News RSS feed...')
    xml_text = fetch_rss()

    if not xml_text:
        print('No data fetched. Writing empty file.')
        headlines = []
    else:
        headlines = parse_rss(xml_text)
        print(f'  Parsed {len(headlines)} headlines')

    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    out = {
        '_source': {
            'description': 'Recent top news headlines from Google News RSS feed',
            'origin': 'Google News RSS — https://news.google.com/rss',
            'retrieved': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
            'license': 'Google News Terms of Service. Headlines are factual titles, fair use for display.',
            'notes': 'Static snapshot for fallback. Live polling uses rss2json.com as CORS proxy.',
        },
        'snapshot_ts': now,
        'headlines': headlines,
    }

    with open(OUTPUT_PATH, 'w') as f:
        json.dump(out, f, indent=2)

    print(f'Wrote {len(headlines)} headlines to {OUTPUT_PATH}')
    if headlines:
        print(f'  Latest: {headlines[0]["title"][:80]}...')


if __name__ == '__main__':
    main()
