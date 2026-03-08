#!/usr/bin/env python3
"""Download OurAirports data and produce a filtered airports.json for Panopticon."""

import csv
import json
import io
import urllib.request

URL = 'https://ourairports.com/data/airports.csv'

def main():
    print('Downloading OurAirports CSV ...')
    with urllib.request.urlopen(URL) as resp:
        text = resp.read().decode('utf-8')

    airports = []
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        if row['type'] not in ('large_airport', 'medium_airport'):
            continue

        try:
            lat = round(float(row['latitude_deg']), 5)
            lon = round(float(row['longitude_deg']), 5)
        except (ValueError, KeyError):
            continue

        try:
            elev = int(float(row.get('elevation_ft') or 0))
        except ValueError:
            elev = 0

        iata = (row.get('iata_code') or '').strip() or None
        icao = (row.get('ident') or '').strip()
        name = (row.get('name') or '').strip()
        country = (row.get('iso_country') or '').strip()

        airports.append({
            'icao': icao,
            'iata': iata,
            'name': name,
            'lat': lat,
            'lon': lon,
            'elevation_ft': elev,
            'country': country,
            'type': row['type'],
        })

    out_path = 'data/airports.json'
    with open(out_path, 'w') as f:
        json.dump({'airports': airports}, f, separators=(',', ':'))

    large = sum(1 for a in airports if a['type'] == 'large_airport')
    medium = sum(1 for a in airports if a['type'] == 'medium_airport')
    print(f'Wrote {len(airports)} airports ({large} large, {medium} medium) to {out_path}')

if __name__ == '__main__':
    main()
