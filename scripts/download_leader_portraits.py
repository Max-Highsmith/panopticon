#!/usr/bin/env python3
"""
Panopticon — Download Head of State Portraits from Wikimedia Commons

Fetches official portrait images for world leaders from Wikipedia/Wikimedia
Commons. Uses the Wikipedia REST API to find the main image for each leader's
article, then downloads and saves it locally.

Usage:
    python3 scripts/download_leader_portraits.py

    # Re-download all (even existing):
    python3 scripts/download_leader_portraits.py --force

Output:
    assets/leaders/<country_code>.png  (or <name_slug>.png for shared monarchs)

Source: Wikimedia Commons — images are typically official government portraits
(public domain as government works) or freely licensed (CC-BY, CC-BY-SA).

No external Python dependencies — uses only stdlib.
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
import urllib.parse

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(SCRIPT_DIR, '..')
DATA_FILE = os.path.join(PROJECT_ROOT, 'data', 'layers', 'ambient', 'heads_of_state.json')
ASSETS_DIR = os.path.join(PROJECT_ROOT, 'assets', 'leaders')

# Wikipedia API endpoints
WIKI_API = 'https://en.wikipedia.org/w/api.php'
WIKI_REST = 'https://en.wikipedia.org/api/rest_v1/page/summary/'

# Explicit Wikipedia article titles for leaders whose names may be ambiguous
# or don't match their Wikipedia article title exactly.
WIKI_OVERRIDES = {
    # Monarchs & special titles
    "King Charles III": "Charles III",
    "King Mswati III": "Mswati III",
    "King Mohammed VI": "Mohammed VI of Morocco",
    "King Letsie III": "Letsie III",
    "King Philippe": "Philippe of Belgium",
    "King Frederik X": "Frederik X",
    "King Felipe VI": "Felipe VI",
    "King Carl XVI Gustaf": "Carl XVI Gustaf",
    "King Harald V": "Harald V",
    "King Willem-Alexander": "Willem-Alexander of the Netherlands",
    "Grand Duke Henri": "Henri, Grand Duke of Luxembourg",
    "Prince Hans-Adam II": "Hans-Adam II, Prince of Liechtenstein",
    "Prince Albert II": "Albert II, Prince of Monaco",
    "King Hamad bin Isa Al Khalifa": "Hamad bin Isa Al Khalifa",
    "King Jigme Khesar Namgyel Wangchuck": "Jigme Khesar Namgyel Wangchuck",
    "Sultan Hassanal Bolkiah": "Hassanal Bolkiah",
    "King Norodom Sihamoni": "Norodom Sihamoni",
    "Emperor Naruhito": "Naruhito",
    "King Abdullah II": "Abdullah II of Jordan",
    "King Salman bin Abdulaziz": "Salman of Saudi Arabia",
    "Sultan Ibrahim": "Ibrahim of Johor",
    "King Maha Vajiralongkorn": "Vajiralongkorn",
    "Sultan Haitham bin Tariq": "Haitham bin Tariq",
    "Emir Tamim bin Hamad Al Thani": "Tamim bin Hamad Al Thani",
    "Emir Mishal Al-Ahmad Al-Jaber Al-Sabah": "Mishal Al-Ahmad Al-Jaber Al-Sabah",
    "King Tupou VI": "Tupou VI",
    # Leaders with disambiguation issues
    "Emmanuel Macron": "Emmanuel Macron",
    "Xi Jinping": "Xi Jinping",
    "Vladimir Putin": "Vladimir Putin",
    "Donald Trump": "Donald Trump",
    "Volodymyr Zelenskyy": "Volodymyr Zelenskyy",
    "Kim Jong-un": "Kim Jong Un",  # Wikipedia uses no hyphen
    "Pope Leo XIV": "Pope Leo XIV",
    "Luiz Inácio Lula da Silva": "Luiz Inácio Lula da Silva",
    "Ferdinand Marcos Jr.": "Bongbong Marcos",
    "Dina Boluarte": "Dina Boluarte",
    "Claudia Sheinbaum": "Claudia Sheinbaum",
    "Recep Tayyip Erdoğan": "Recep Tayyip Erdoğan",
    "Abdel Fattah el-Sisi": "Abdel Fattah el-Sisi",
    "Nayib Bukele": "Nayib Bukele",
    "Javier Milei": "Javier Milei",
    "Narendra Modi": "Narendra Modi",
    "Cyril Ramaphosa": "Cyril Ramaphosa",
    "Bassirou Diomaye Faye": "Bassirou Diomaye Faye",
    "Joseph Aoun": "Joseph Aoun",
    "Ahmad al-Sharaa": "Abu Mohammed al-Julani",
    "Karin Keller-Sutter": "Karin Keller-Sutter",
    "Hibatullah Akhundzada": "Hibatullah Akhundzada",
    "Min Aung Hlaing": "Min Aung Hlaing",
    "Mahmoud Abbas": "Mahmoud Abbas",
    "Lai Ching-te": "Lai Ching-te",
    "Lương Cường": "Lương Cường",
    "Mohamed al-Menfi": "Mohamed al-Menfi",
    "Prabowo Subianto": "Prabowo Subianto",
    "Masoud Pezeshkian": "Masoud Pezeshkian",
    "Isaac Herzog": "Isaac Herzog",
    "Tuimalealiifano Va'aletoa Sualauvi II": "Tuimalealiifano Va'aletoa Sualauvi II",
    "Rashad al-Alimi": "Rashad al-Alimi",
    "Teodoro Obiang Nguema Mbasogo": "Teodoro Obiang Nguema Mbasogo",
}

USER_AGENT = 'PanopticonBot/1.0 (educational project; portrait downloader)'


def fetch_json(url):
    """Fetch JSON from a URL with proper User-Agent."""
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))


THUMB_SIZE = 300  # px — use thumbnails to avoid rate limiting on originals


def get_image_url(leader_name):
    """Get a thumbnail portrait URL from Wikipedia for a leader.

    Uses the MediaWiki API prop=pageimages to get a properly-sized thumbnail.
    This is the approach recommended by Wikimedia for bulk downloads.
    Falls back to REST API summary if needed.
    """
    wiki_title = WIKI_OVERRIDES.get(leader_name, leader_name)

    # Strategy 1: MediaWiki API with pageimages (preferred — gives proper thumbnails)
    try:
        params = urllib.parse.urlencode({
            'action': 'query',
            'titles': wiki_title,
            'prop': 'pageimages',
            'pithumbsize': THUMB_SIZE,
            'format': 'json',
        })
        url = f'{WIKI_API}?{params}'
        data = fetch_json(url)
        pages = data.get('query', {}).get('pages', {})
        for page in pages.values():
            if 'thumbnail' in page:
                return page['thumbnail']['source']
    except (urllib.error.HTTPError, KeyError):
        pass

    # Strategy 2: REST API summary thumbnail
    try:
        encoded_title = urllib.parse.quote(wiki_title.replace(' ', '_'))
        url = f'{WIKI_REST}{encoded_title}'
        data = fetch_json(url)
        if 'thumbnail' in data:
            return data['thumbnail']['source']
    except (urllib.error.HTTPError, KeyError):
        pass

    return None


def download_image(url, filepath, max_retries=3):
    """Download an image from URL and save to filepath, with retry on 429."""
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = resp.read()

            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, 'wb') as f:
                f.write(data)

            return len(data)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < max_retries - 1:
                wait = (attempt + 1) * 5  # 5s, 10s, 15s
                time.sleep(wait)
                continue
            raise

    return 0


def main():
    force = '--force' in sys.argv

    # Load the heads of state data
    with open(DATA_FILE) as f:
        data = json.load(f)

    all_leaders = (data.get('located') or []) + (data.get('unlocated') or [])
    print(f'Source: {DATA_FILE}')
    print(f'Found {len(all_leaders)} leaders')
    print(f'Output: {ASSETS_DIR}/')
    print()

    # Deduplicate by image path (shared monarchs)
    seen_images = set()
    unique_leaders = []
    for l in all_leaders:
        img = l.get('image', '')
        if img and img not in seen_images:
            seen_images.add(img)
            unique_leaders.append(l)

    print(f'Unique images to fetch: {len(unique_leaders)}')
    print()

    downloaded = 0
    skipped = 0
    failed = 0
    not_found = []

    for i, leader in enumerate(unique_leaders, start=1):
        img_rel = leader.get('image', '')
        if not img_rel:
            skipped += 1
            continue

        filepath = os.path.join(PROJECT_ROOT, img_rel)

        # Skip if exists (unless --force)
        if os.path.exists(filepath) and not force:
            print(f'  [{i:3d}/{len(unique_leaders)}] SKIP {leader["name"]} (exists)')
            skipped += 1
            continue

        print(f'  [{i:3d}/{len(unique_leaders)}] {leader["name"]} ({leader["country"]})...', end=' ', flush=True)

        try:
            img_url = get_image_url(leader['name'])
            if not img_url:
                print('NOT FOUND on Wikipedia')
                not_found.append(leader['name'])
                failed += 1
                continue

            nbytes = download_image(img_url, filepath)
            print(f'OK ({nbytes:,} bytes)')
            downloaded += 1
        except Exception as e:
            print(f'FAILED: {e}')
            failed += 1

        # Be polite to Wikipedia servers
        time.sleep(1.5)

    print(f'\nDone: {downloaded} downloaded, {skipped} skipped, {failed} failed')

    if not_found:
        print(f'\nNot found ({len(not_found)}):')
        for name in not_found:
            print(f'  - {name}')


if __name__ == '__main__':
    main()
