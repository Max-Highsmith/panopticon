#!/usr/bin/env python3
"""Generate a PNG architecture diagram of the Panopticon JS codebase."""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np

fig, ax = plt.subplots(figsize=(22, 16))
fig.patch.set_facecolor('#0a0a0a')
ax.set_facecolor('#0a0a0a')
ax.set_xlim(0, 22)
ax.set_ylim(0, 16)
ax.axis('off')

# ── Color palette ──
C_GREEN  = '#00ff41'
C_BLUE   = '#4488ff'
C_ORANGE = '#ff8800'
C_PURPLE = '#cc44ff'
C_CYAN   = '#00cccc'
C_RED    = '#ff4444'
C_YELLOW = '#ffcc00'
C_WHITE  = '#cccccc'
C_DIM    = '#555555'
C_BG     = '#111111'
C_BG2    = '#1a1a1a'

def draw_box(x, y, w, h, label, color, sublabel=None, fontsize=9, bold=True):
    rect = FancyBboxPatch((x, y), w, h,
        boxstyle="round,pad=0.1", linewidth=1.5,
        edgecolor=color, facecolor=C_BG, alpha=0.95)
    ax.add_patch(rect)
    weight = 'bold' if bold else 'normal'
    ax.text(x + w/2, y + h/2 + (0.1 if sublabel else 0), label,
        ha='center', va='center', fontsize=fontsize, color=color,
        fontfamily='monospace', fontweight=weight)
    if sublabel:
        ax.text(x + w/2, y + h/2 - 0.18, sublabel,
            ha='center', va='center', fontsize=6.5, color=C_DIM,
            fontfamily='monospace')

def draw_group(x, y, w, h, title, color, items=None, fontsize=7.5):
    rect = FancyBboxPatch((x, y), w, h,
        boxstyle="round,pad=0.15", linewidth=1.2,
        edgecolor=color, facecolor='#0d0d0d', alpha=0.85, linestyle='--')
    ax.add_patch(rect)
    ax.text(x + w/2, y + h - 0.22, title,
        ha='center', va='top', fontsize=9, color=color,
        fontfamily='monospace', fontweight='bold')
    if items:
        for i, item in enumerate(items):
            col = i // ((len(items) + 2) // 3) if len(items) > 6 else 0
            row = i % ((len(items) + 2) // 3) if len(items) > 6 else i
            if len(items) <= 6:
                ix = x + w/2
                iy = y + h - 0.55 - i * 0.28
            else:
                cols = 3 if len(items) > 12 else 2
                per_col = (len(items) + cols - 1) // cols
                col = i // per_col
                row = i % per_col
                col_w = w / cols
                ix = x + col_w/2 + col * col_w
                iy = y + h - 0.55 - row * 0.26
            ax.text(ix, iy, item, ha='center', va='center',
                fontsize=fontsize, color=C_DIM, fontfamily='monospace')

def arrow(x1, y1, x2, y2, color=C_DIM, style='->', lw=1.0):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
        arrowprops=dict(arrowstyle=style, color=color, lw=lw, shrinkA=3, shrinkB=3))

# ── Title ──
ax.text(11, 15.6, 'PANOPTICON — JavaScript Architecture', ha='center', va='center',
    fontsize=18, color=C_GREEN, fontfamily='monospace', fontweight='bold')
ax.text(11, 15.25, 'ES Modules · No Build Step · CesiumJS Globe', ha='center', va='center',
    fontsize=10, color=C_DIM, fontfamily='monospace')

# ═══════════════════════════════════════
# ROW 1: Entry Point (y=13.5)
# ═══════════════════════════════════════
draw_box(8.5, 13.5, 5, 0.7, 'app.js', C_GREEN, 'Entry Point · Orchestrator')

# ═══════════════════════════════════════
# ROW 2: Core Modules (y=11.8)
# ═══════════════════════════════════════
core_modules = [
    (0.3,  'globe.js',       C_BLUE,   'Viewer + State'),
    (3.3,  'config.js',      C_ORANGE, 'Constants + API'),
    (6.3,  'utils.js',       C_CYAN,   'Formatting + Geo'),
    (9.3,  'icons.js',       C_YELLOW, '30+ Canvas Icons'),
    (12.3, 'layercatalog.js',C_PURPLE, '95 Layer Registry'),
    (15.3, 'layerselector.js',C_PURPLE,'Search + Pin UI'),
    (18.3, 'filters.js',    C_RED,     'CRT/NVG/FLIR'),
]
for (x, label, color, sub) in core_modules:
    draw_box(x, 11.8, 2.7, 0.65, label, color, sub, fontsize=8)
    arrow(11, 13.5, x + 1.35, 12.45, color=C_DIM, lw=0.7)

# ═══════════════════════════════════════
# ROW 3: Secondary Systems (y=10.2)
# ═══════════════════════════════════════
secondary = [
    (0.5,  'audio.js',    C_CYAN,   'Music Player'),
    (3.5,  'overlays.js', C_ORANGE, 'Blackout Zones'),
    (6.5,  'wargame.js',  C_RED,    'AI Wargame Mode'),
    (9.5,  'earthmap.js', C_CYAN,   'Ortho Projection'),
]
for (x, label, color, sub) in secondary:
    draw_box(x, 10.2, 2.7, 0.65, label, color, sub, fontsize=8)
    arrow(11, 13.5, x + 1.35, 10.85, color=C_DIM, lw=0.5)

# ═══════════════════════════════════════
# ROW 3b: Detail Panels (y=10.2, right side)
# ═══════════════════════════════════════
draw_group(13, 9.7, 8.5, 1.6, 'Detail Panel Viewers', C_YELLOW,
    ['satview.js', 'planeview.js', 'siteview.js', 'airportview.js', 'webcamview.js'])
arrow(11, 13.5, 17, 11.3, color=C_DIM, lw=0.5)

# ═══════════════════════════════════════
# ROW 4: Layer Factories (y=7.8)
# ═══════════════════════════════════════
ax.text(11, 9.2, '── Layer System ──', ha='center', va='center',
    fontsize=11, color=C_GREEN, fontfamily='monospace', fontweight='bold')

# Horizontal divider line
ax.plot([0.5, 21.5], [9.0, 9.0], color=C_DIM, lw=0.5, linestyle='--', alpha=0.4)

factories = [
    (0.5,  'datalayer.js',  C_BLUE,   'Point Factory'),
    (5.0,  'livelayer.js',  C_GREEN,  'Live Entity CRUD'),
    (9.5,  'pathlayer.js',  C_ORANGE, 'Polyline Factory'),
    (14.0, 'regionlayer.js',C_PURPLE, 'Polygon Factory'),
    (18.5, 'custom.js',     C_CYAN,   'User Datasets'),
]
for (x, label, color, sub) in factories:
    draw_box(x, 7.6, 3.2, 0.65, label, color, sub, fontsize=8.5)

# ═══════════════════════════════════════
# ROW 5: Concrete Layers (y=2.0-7.0)
# ═══════════════════════════════════════

# Live layers (uses livelayer.js)
draw_group(0.3, 5.0, 4.0, 2.2, 'Live Tracking (5)', C_GREEN,
    ['military.js', 'commercial.js', 'ships.js', 'satellites.js', 'pogo.js'])
arrow(2.3, 7.2, 6.5, 7.6, color=C_GREEN, lw=0.8)

# Static Point layers (uses datalayer.js)
draw_group(4.6, 2.6, 6.8, 4.6, 'Static Point Layers (40+)', C_BLUE, [
    'mines.js', 'militarybases.js', 'nuclearplants.js',
    'airports.js', 'powerplants.js', 'refineries.js',
    'platforms.js', 'radar.js', 'spaceports.js',
    'volcanoes.js', 'earthquakes.js', 'wildfires.js',
    'webcams.js', 'infrastructure.js', 'strategicnuclear.js',
    'arcticmining.js', 'rareearth.js', 'drillingleases.js',
    'lightning.js', 'meteors.js', 'cosmic.js',
    'ionosphere.js', 'seaice.js', 'oceantemp.js',
    'ports.js', 'fishingfleets.js', 'spacedebris.js',
    'whales.js', 'seaturtles.js', 'birds.js',
    'elephants.js', 'ixps.js', 'arcticdeposits.js',
], fontsize=6.5)
arrow(8, 7.2, 2.1, 7.6, color=C_BLUE, lw=0.8)

# Polyline layers (uses pathlayer.js)
draw_group(11.7, 3.5, 4.6, 3.7, 'Polyline Layers (12+)', C_ORANGE, [
    'cables.js', 'pipelines.js',
    'traderoutes.js', 'arcticroutes.js',
    'chokepoints.js', 'electricalgrid.js',
    'commodityflows.js', 'cargoroutes.js',
    'oceancurrents.js',
], fontsize=7)
arrow(14, 7.2, 11, 7.6, color=C_ORANGE, lw=0.8)

# Region layers (uses regionlayer.js)
draw_group(16.6, 5.0, 4.8, 2.2, 'Region Layers', C_PURPLE,
    ['fisheries.js', '(future expansion)'])
arrow(19, 7.2, 15.6, 7.6, color=C_PURPLE, lw=0.8)

# ═══════════════════════════════════════
# External connections
# ═══════════════════════════════════════
# Server box
draw_box(16.8, 1.2, 4.4, 1.2, 'server/', C_RED,
    'Express + WebSocket + LLM')
ax.text(19, 0.9, 'anthropic · openai · google · xai · baseline', ha='center',
    fontsize=6, color=C_DIM, fontfamily='monospace')

# Arrow from wargame to server
arrow(7.85, 10.2, 18, 2.4, color=C_RED, lw=1.0)
ax.text(12.2, 6.9, 'WebSocket', ha='center', fontsize=7, color=C_RED,
    fontfamily='monospace', rotation=25)

# Data directory
draw_box(0.3, 1.2, 3.8, 1.2, 'data/', C_YELLOW,
    'JSON: points + polylines')
ax.text(2.2, 0.9, '50+ data files · _source provenance', ha='center',
    fontsize=6, color=C_DIM, fontfamily='monospace')

# Arrow from data layers to data/
arrow(5.5, 2.6, 4.1, 2.1, color=C_YELLOW, lw=0.8)

# External APIs
draw_box(7.0, 0.5, 8.5, 1.0, 'External APIs', C_CYAN,
    'ADS-B Exchange · OpenSky · AIS Stream · CelesTrak TLE')
arrow(2.3, 5.0, 11, 1.5, color=C_CYAN, lw=0.7)

# ═══════════════════════════════════════
# Legend
# ═══════════════════════════════════════
legend_items = [
    (C_GREEN,  'Entry / Live'),
    (C_BLUE,   'Viewer / Data Points'),
    (C_ORANGE, 'Config / Polylines'),
    (C_PURPLE, 'Catalog / Regions'),
    (C_CYAN,   'Utilities / APIs'),
    (C_YELLOW, 'Icons / Data Files'),
    (C_RED,    'Effects / Wargame'),
]
for i, (color, label) in enumerate(legend_items):
    lx = 17.5
    ly = 15.4 - i * 0.28
    ax.plot(lx, ly, 's', color=color, markersize=6)
    ax.text(lx + 0.2, ly, label, va='center', fontsize=7, color=C_WHITE,
        fontfamily='monospace')

plt.tight_layout(pad=0.5)
plt.savefig('/Users/maxhighsmith/Desktop/Code/panopticon/architecture.png',
    dpi=200, facecolor='#0a0a0a', edgecolor='none',
    bbox_inches='tight', pad_inches=0.3)
print("Saved architecture.png")
