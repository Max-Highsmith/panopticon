#!/usr/bin/env python3
"""
Panopticon — Webcam Curation & Validation Script

Validates YouTube live stream IDs in webcams.json by checking if they are
currently live/active. Can also be used to add new streams.

Usage:
    python3 scripts/curate_webcams.py                  # Validate all streams
    python3 scripts/curate_webcams.py --check VIDEO_ID # Check a single ID
    python3 scripts/curate_webcams.py --report         # Generate status report
    python3 scripts/curate_webcams.py --prune          # Remove dead streams (writes file)

Requires: pip install requests (or uses urllib as fallback)

Sources:
    YouTube oEmbed API (noembed.com) — free, no API key needed
    YouTube page scraping as fallback
"""

import json
import sys
import os
import time
import argparse
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError
from urllib.parse import quote

DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'layers', 'points', 'webcams.json')

# --- YouTube stream validation ---

def check_youtube_id(yt_id, verbose=False):
    """
    Check if a YouTube video ID is valid and likely live.
    Returns dict with: valid (bool), title (str|None), live (bool|None), error (str|None)
    """
    result = {'valid': False, 'title': None, 'live': None, 'error': None}

    # Method 1: oEmbed check (fast, tells us if video exists)
    try:
        url = f'https://noembed.com/embed?url=https://www.youtube.com/watch?v={quote(yt_id)}'
        req = Request(url, headers={'User-Agent': 'Panopticon/1.0'})
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if 'error' in data:
                result['error'] = data['error']
                return result
            result['valid'] = True
            result['title'] = data.get('title', '')
    except (URLError, HTTPError, json.JSONDecodeError) as e:
        result['error'] = str(e)
        return result

    # Method 2: Check YouTube page for live indicator
    try:
        url = f'https://www.youtube.com/watch?v={quote(yt_id)}'
        req = Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        })
        with urlopen(req, timeout=15) as resp:
            html = resp.read().decode('utf-8', errors='replace')
            # Look for live indicators in the page
            live_indicators = [
                '"isLive":true',
                '"isLiveContent":true',
                '"liveBroadcastDetails"',
                'LIVE_STREAM_OFFLINE',  # stream exists but offline
            ]
            for indicator in live_indicators:
                if indicator in html:
                    if 'LIVE_STREAM_OFFLINE' in html:
                        result['live'] = False
                    else:
                        result['live'] = True
                    break
    except (URLError, HTTPError):
        if verbose:
            print(f'  [!] Could not fetch YouTube page for {yt_id}')

    return result


def check_hls_url(hls_url, verbose=False):
    """Check if an HLS stream URL is accessible."""
    try:
        # Strip the proxy prefix if present
        actual_url = hls_url
        if '/hlsproxy?url=' in hls_url:
            from urllib.parse import unquote
            actual_url = unquote(hls_url.split('/hlsproxy?url=')[1])

        req = Request(actual_url, headers={'User-Agent': 'Panopticon/1.0'})
        with urlopen(req, timeout=10) as resp:
            content = resp.read().decode('utf-8', errors='replace')
            if '#EXTM3U' in content:
                return {'valid': True, 'error': None}
            else:
                return {'valid': False, 'error': 'Not a valid M3U8 playlist'}
    except (URLError, HTTPError) as e:
        return {'valid': False, 'error': str(e)}


# --- Data loading ---

def load_webcams():
    """Load webcams.json and return parsed data."""
    with open(DATA_FILE, 'r') as f:
        return json.load(f)


def save_webcams(data):
    """Save webcams.json with nice formatting."""
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f'Wrote {DATA_FILE}')


# --- Commands ---

def cmd_validate(args):
    """Validate all streams in webcams.json."""
    data = load_webcams()

    # Collect all webcam entries across all categories
    categories = {k: v for k, v in data.items() if k != '_source' and isinstance(v, list)}
    total = sum(len(v) for v in categories.values())

    print(f'Validating {total} webcam streams across {len(categories)} categories...\n')

    stats = {'valid': 0, 'invalid': 0, 'live': 0, 'offline': 0, 'unknown': 0, 'hls_ok': 0, 'hls_fail': 0}

    for cat_name, entries in categories.items():
        print(f'--- {cat_name.upper()} ({len(entries)} streams) ---')
        for entry in entries:
            name = entry.get('name', '???')
            yt_id = entry.get('ytId')
            hls_url = entry.get('hlsUrl')

            status_parts = []

            if yt_id:
                result = check_youtube_id(yt_id, verbose=args.verbose)
                if result['valid']:
                    stats['valid'] += 1
                    if result['live'] is True:
                        status_parts.append('\033[92mLIVE\033[0m')
                        stats['live'] += 1
                    elif result['live'] is False:
                        status_parts.append('\033[93mOFFLINE\033[0m')
                        stats['offline'] += 1
                    else:
                        status_parts.append('\033[96mVALID\033[0m')
                        stats['unknown'] += 1
                else:
                    status_parts.append(f'\033[91mINVALID ({result["error"]})\033[0m')
                    stats['invalid'] += 1
            else:
                status_parts.append('\033[90mNO YT ID\033[0m')

            if hls_url:
                hls_result = check_hls_url(hls_url, verbose=args.verbose)
                if hls_result['valid']:
                    status_parts.append('\033[92mHLS OK\033[0m')
                    stats['hls_ok'] += 1
                else:
                    status_parts.append(f'\033[91mHLS FAIL\033[0m')
                    stats['hls_fail'] += 1

            status = ' | '.join(status_parts)
            print(f'  {name:30s} [{yt_id or "N/A":11s}] {status}')

            # Rate limit to avoid getting blocked
            time.sleep(0.5)

        print()

    # Summary
    print('=== SUMMARY ===')
    print(f'  Total streams:    {total}')
    print(f'  Valid YouTube:    {stats["valid"]}')
    print(f'  Invalid YouTube:  {stats["invalid"]}')
    print(f'  Confirmed Live:   {stats["live"]}')
    print(f'  Offline:          {stats["offline"]}')
    print(f'  Status Unknown:   {stats["unknown"]}')
    print(f'  HLS OK:           {stats["hls_ok"]}')
    print(f'  HLS Failed:       {stats["hls_fail"]}')


def cmd_check(args):
    """Check a single YouTube video ID."""
    yt_id = args.video_id
    print(f'Checking YouTube ID: {yt_id}')
    result = check_youtube_id(yt_id, verbose=True)
    print(f'  Valid:  {result["valid"]}')
    print(f'  Title:  {result["title"]}')
    print(f'  Live:   {result["live"]}')
    if result['error']:
        print(f'  Error:  {result["error"]}')


def cmd_report(args):
    """Generate a markdown status report."""
    data = load_webcams()
    categories = {k: v for k, v in data.items() if k != '_source' and isinstance(v, list)}
    total = sum(len(v) for v in categories.values())

    print(f'# Webcam Status Report')
    print(f'Total: {total} streams across {len(categories)} categories\n')

    for cat_name, entries in categories.items():
        print(f'## {cat_name.replace("_", " ").title()} ({len(entries)})')
        for entry in entries:
            yt = entry.get('ytId', '')
            hls = ' +HLS' if entry.get('hlsUrl') else ''
            loc = f"{entry.get('city', '???')}, {entry.get('country', '??')}"
            print(f'- {entry["name"]} — {loc} [{yt}{hls}]')
        print()


def cmd_prune(args):
    """Remove invalid/dead streams."""
    data = load_webcams()
    categories = {k: v for k, v in data.items() if k != '_source' and isinstance(v, list)}

    removed = 0
    for cat_name, entries in list(categories.items()):
        to_remove = []
        for i, entry in enumerate(entries):
            yt_id = entry.get('ytId')
            if not yt_id:
                continue
            result = check_youtube_id(yt_id)
            if not result['valid']:
                print(f'  REMOVING: {entry["name"]} [{yt_id}] — {result["error"]}')
                to_remove.append(i)
            time.sleep(0.5)

        for i in reversed(to_remove):
            entries.pop(i)
            removed += 1

    if removed > 0:
        save_webcams(data)
        print(f'\nRemoved {removed} dead streams.')
    else:
        print('\nAll streams appear valid — nothing to prune.')


# --- CLI ---

def main():
    parser = argparse.ArgumentParser(description='Panopticon Webcam Curation Tool')
    sub = parser.add_subparsers(dest='command')

    p_validate = sub.add_parser('validate', help='Validate all streams')
    p_validate.add_argument('--verbose', '-v', action='store_true')

    p_check = sub.add_parser('check', help='Check a single YouTube ID')
    p_check.add_argument('video_id', help='YouTube video ID to check')

    p_report = sub.add_parser('report', help='Generate status report')

    p_prune = sub.add_parser('prune', help='Remove dead streams')

    args = parser.parse_args()

    if args.command == 'validate':
        cmd_validate(args)
    elif args.command == 'check':
        cmd_check(args)
    elif args.command == 'report':
        cmd_report(args)
    elif args.command == 'prune':
        cmd_prune(args)
    else:
        # Default to validate
        args.verbose = False
        cmd_validate(args)


if __name__ == '__main__':
    main()
