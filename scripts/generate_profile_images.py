#!/usr/bin/env python3
"""
Panopticon — Generate Profile Images via OpenAI gpt-image-1

Reads profiles from a JSON file and generates a photorealistic portrait
for each one using OpenAI's latest image model. Output paths are taken
from each profile's "image" field.

Usage:
    # Default: generates images for the main profiles layer
    python3 scripts/generate_profile_images.py

    # Regenerate all (even existing):
    python3 scripts/generate_profile_images.py --force

Requires: OPENAI_API_KEY in root .env file.
No external Python dependencies — uses only stdlib.
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
import base64

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(SCRIPT_DIR, '..')
DEFAULT_PROFILES = os.path.join(PROJECT_ROOT, 'data', 'layers', 'ambient', 'profiles.json')
ENV_PATH = os.path.join(PROJECT_ROOT, '.env')

API_URL = 'https://api.openai.com/v1/images/generations'
IMAGE_SIZE = '1024x1024'
MODEL = 'gpt-image-1'


def load_env(path):
    """Parse a .env file and return a dict of key=value pairs."""
    env = {}
    if not os.path.exists(path):
        return env
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, _, value = line.partition('=')
            env[key.strip()] = value.strip().strip('"').strip("'")
    return env


FEMALE_NAMES = {
    'amara', 'elena', 'fatima', 'yuki', 'maria', 'priya',
    'kim', 'nadia', 'ana', 'cristina', 'sun-hee', 'sarah',
    'amina', 'dr.', 'katarzyna',
}

def infer_gender(name):
    """Simple heuristic to infer gender from first name for prompt construction."""
    # Handle "Dr. FirstName LastName" pattern
    parts = name.split()
    first = parts[1].lower() if len(parts) > 1 and parts[0].lower() in ('dr.', 'dr') else parts[0].lower()
    if first in FEMALE_NAMES:
        return 'woman'
    return 'man'


def build_prompt(profile):
    """Build an image generation prompt from profile attributes."""
    age = profile['age']
    nationality = profile['nationality']
    gender = infer_gender(profile['name'])
    status = profile.get('status', 'active')
    threat = profile.get('threat_level', 'LOW')
    dossier = profile.get('dossier', '')

    prompt = (
        f"Photograph of a {age}-year-old {nationality} {gender}. "
        f"Tight headshot, head and upper shoulders only. "
        f"Shot with a 85mm lens, shallow depth of field. "
        f"Neutral gray background. Natural skin texture and lighting. "
        f"The person is looking slightly off-camera with a composed, unreadable expression. "
        f"Realistic photo, not illustration."
    )

    # Contextual details based on role / status
    if status == 'missing':
        prompt += " Slightly grainy quality, as if captured from CCTV or a passport scan."
    elif status == 'protected':
        prompt += " Soft lighting, slightly washed out colors, as if from an ID badge photo."
    elif status == 'inactive':
        prompt += " Relaxed expression, natural daylight feel."

    # Dictator / military figures
    if threat == 'CRITICAL' and 'military' in dossier.lower():
        prompt += " The person wears a formal military-style uniform with medals. Stern, authoritative expression."
    # Humanitarian workers
    elif 'humanitarian' in dossier.lower() or 'doctors without borders' in dossier.lower() or 'red cross' in dossier.lower():
        prompt += " The person is wearing a plain polo shirt or field vest. Kind but tired eyes."

    return prompt


def generate_image(api_key, prompt):
    """Call OpenAI image generation API and return raw PNG bytes."""
    payload = json.dumps({
        'model': MODEL,
        'prompt': prompt,
        'n': 1,
        'size': IMAGE_SIZE,
        'quality': 'high',
    }).encode('utf-8')

    req = urllib.request.Request(
        API_URL,
        data=payload,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}',
            'User-Agent': 'Panopticon/1.0 (profile image generation)',
        },
    )

    with urllib.request.urlopen(req, timeout=180) as resp:
        body = json.loads(resp.read().decode('utf-8'))

    b64_data = body['data'][0]['b64_json']
    return base64.b64decode(b64_data)


def main():
    force = '--force' in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith('--')]

    # Determine input file
    if args:
        profiles_path = os.path.join(PROJECT_ROOT, args[0]) if not os.path.isabs(args[0]) else args[0]
    else:
        profiles_path = DEFAULT_PROFILES

    # Load API key
    env = load_env(ENV_PATH)
    api_key = env.get('OPENAI_API_KEY') or os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print('ERROR: OPENAI_API_KEY not found in .env or environment.')
        print(f'       Add it to {ENV_PATH}')
        sys.exit(1)

    # Load profiles
    with open(profiles_path) as f:
        data = json.load(f)

    all_profiles = (data.get('located') or []) + (data.get('unlocated') or [])
    print(f'Source: {profiles_path}')
    print(f'Found {len(all_profiles)} profiles')
    print(f'Model: {MODEL}')

    generated = 0
    skipped = 0
    failed = 0

    for i, profile in enumerate(all_profiles, start=1):
        # Use the image field from the profile for the output path
        image_rel = profile.get('image')
        if not image_rel:
            print(f'  [{i:2d}/{len(all_profiles)}] SKIP {profile["name"]} (no image field)')
            skipped += 1
            continue

        filepath = os.path.join(PROJECT_ROOT, image_rel)
        filename = os.path.basename(filepath)

        # Ensure directory exists
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        # Skip if already exists (unless --force)
        if os.path.exists(filepath) and not force:
            print(f'  [{i:2d}/{len(all_profiles)}] SKIP {filename} (exists)')
            skipped += 1
            continue

        prompt = build_prompt(profile)
        print(f'  [{i:2d}/{len(all_profiles)}] Generating {filename} — {profile["name"]}...')

        try:
            png_bytes = generate_image(api_key, prompt)
            with open(filepath, 'wb') as f:
                f.write(png_bytes)
            print(f'           Saved ({len(png_bytes):,} bytes)')
            generated += 1
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8', errors='replace')
            print(f'           FAILED: HTTP {e.code} — {error_body[:200]}')
            failed += 1
        except Exception as e:
            print(f'           FAILED: {e}')
            failed += 1

        # Rate limit: pause between requests
        if i < len(all_profiles):
            time.sleep(2)

    print(f'\nDone: {generated} generated, {skipped} skipped, {failed} failed')


if __name__ == '__main__':
    main()
