#!/usr/bin/env python3
"""Generate synthetic SAR-looking sample images for Panopticon wargame POC.

Output: assets/sar/*.png — 512x512 grayscale PNGs with speckle noise + bright
target returns simulating Synthetic Aperture Radar imagery.

Requires: Pillow (pip install Pillow)

Source reference: Imagery characteristics modeled after Sentinel-1 C-band SAR
(ESA Copernicus) IW mode — 5m ground range resolution, VV polarization.
These are synthetic/procedural, not real sensor data.
"""

import os
import random
import math
from PIL import Image, ImageDraw, ImageFilter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(SCRIPT_DIR, '..', 'assets', 'sar')


def generate_base_terrain(width, height, rng):
    """Multi-scale noise to simulate terrain backscatter."""
    img = Image.new('L', (width, height), 0)
    pixels = img.load()

    # Start with base intensity
    for y in range(height):
        for x in range(width):
            pixels[x, y] = rng.randint(30, 60)

    # Layer noise at multiple scales for terrain texture
    for scale in [2, 4, 8, 16, 32]:
        layer = Image.new('L', (width, height), 0)
        lp = layer.load()
        # Generate coarse random blocks then blur
        block = max(1, scale)
        for by in range(0, height, block):
            for bx in range(0, width, block):
                val = rng.randint(0, int(40 / (scale ** 0.2)))
                for dy in range(min(block, height - by)):
                    for dx in range(min(block, width - bx)):
                        lp[bx + dx, by + dy] = val
        layer = layer.filter(ImageFilter.GaussianBlur(radius=scale * 0.8))
        lp = layer.load()
        for y in range(height):
            for x in range(width):
                pixels[x, y] = max(0, min(255, pixels[x, y] + lp[x, y]))

    return img


def add_linear_features(img, rng, count=5):
    """Add linear bright features (roads, runways, fences)."""
    draw = ImageDraw.Draw(img)
    w, h = img.size
    for _ in range(count):
        x1, y1 = rng.randint(0, w), rng.randint(0, h)
        angle = rng.uniform(0, math.pi)
        length = rng.randint(60, 200)
        x2 = int(x1 + length * math.cos(angle))
        y2 = int(y1 + length * math.sin(angle))
        brightness = rng.randint(100, 160)
        draw.line([(x1, y1), (x2, y2)], fill=brightness, width=rng.randint(1, 2))


def add_targets(img, rng, num_targets, target_type='mixed'):
    """Add bright point/cluster targets (vehicles, buildings, ships)."""
    draw = ImageDraw.Draw(img)
    w, h = img.size
    targets = []

    for _ in range(num_targets):
        tx = rng.randint(40, w - 40)
        ty = rng.randint(40, h - 40)
        brightness = rng.randint(180, 255)

        shape = rng.choice(['rect', 'point', 'cluster'])
        if shape == 'rect':
            # Building/structure
            sw = rng.randint(3, 10)
            sh = rng.randint(3, 8)
            draw.rectangle([tx - sw, ty - sh, tx + sw, ty + sh], fill=brightness)
        elif shape == 'point':
            # Vehicle/small target
            r = rng.randint(1, 3)
            draw.ellipse([tx - r, ty - r, tx + r, ty + r], fill=brightness)
        else:
            # Cluster of small returns
            for _ in range(rng.randint(3, 7)):
                ox = rng.randint(-15, 15)
                oy = rng.randint(-15, 15)
                r = rng.randint(1, 2)
                b = rng.randint(160, 240)
                draw.ellipse([tx + ox - r, ty + oy - r, tx + ox + r, ty + oy + r], fill=b)

        targets.append((tx, ty))

    return targets


def add_speckle_noise(img, rng):
    """Apply multiplicative speckle noise characteristic of SAR."""
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            # Exponential distribution for speckle
            speckle = max(0.2, rng.expovariate(1.2))
            val = int(pixels[x, y] * min(speckle, 3.0))
            pixels[x, y] = max(0, min(255, val))


def add_range_artifacts(img, rng):
    """Add horizontal banding artifacts typical of SAR range processing."""
    pixels = img.load()
    w, h = img.size
    for _ in range(rng.randint(3, 8)):
        y = rng.randint(0, h - 1)
        intensity = rng.randint(5, 20)
        band_h = rng.randint(1, 3)
        for dy in range(band_h):
            if y + dy >= h:
                break
            for x in range(w):
                pixels[x, y + dy] = max(0, min(255, pixels[x, y + dy] + intensity))


def generate_sar_image(width, height, num_targets, seed, linear_features=5):
    """Generate a complete synthetic SAR image."""
    rng = random.Random(seed)

    img = generate_base_terrain(width, height, rng)
    add_linear_features(img, rng, count=linear_features)
    add_targets(img, rng, num_targets)
    add_range_artifacts(img, rng)
    add_speckle_noise(img, rng)

    # Slight blur to simulate SAR resolution cell
    img = img.filter(ImageFilter.GaussianBlur(radius=0.5))

    return img


SAMPLES = [
    {
        'name': 'compound_alpha',
        'targets': 6,
        'seed': 42,
        'linear': 3,
        'desc': 'Suspected military compound — 6 structural returns',
    },
    {
        'name': 'port_facility',
        'targets': 12,
        'seed': 137,
        'linear': 8,
        'desc': 'Port facility with vessel/crane returns — 12 bright targets',
    },
    {
        'name': 'convoy_movement',
        'targets': 8,
        'seed': 256,
        'linear': 4,
        'desc': 'Road convoy — 8 vehicle-sized returns along linear feature',
    },
]


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for s in SAMPLES:
        print(f"Generating {s['name']}.png — {s['desc']}...")
        img = generate_sar_image(512, 512, s['targets'], s['seed'], s.get('linear', 5))
        path = os.path.join(OUT_DIR, f"{s['name']}.png")
        img.save(path, optimize=True)
        size_kb = os.path.getsize(path) / 1024
        print(f"  -> {path} ({size_kb:.1f} KB)")
    print("Done.")


if __name__ == '__main__':
    main()
