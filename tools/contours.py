#!/usr/bin/env python3
"""Contour-line tiles for the walking-map background.

    python3 tools/contours.py

Writes site/img/contours-{1,2,3}-{cream,black}-v3.svg (v3: riso blue on cream,
paper white on black; faint, because the lines carry their own opacity). Each tile is a set of
roughly parallel wavy lines that never cross and repeat seamlessly in both
directions.
"""
import math
import pathlib
import random

LINES = {1: 7, 2: 13, 3: 22}
COLOURS = {"cream": ("#1B3BFF", 0.2), "black": ("#F2F2EA", 0.11)}
OUT = pathlib.Path(__file__).resolve().parent.parent / "site" / "img"


def _wave(rng, count, weight_range):
    """A smooth closed wave across the tile: whole-number frequencies only, so
    x=0 and x=size meet. Returns a function of x/size, normalised to +-1."""
    terms = [(rng.choice([1, 2, 3]), rng.uniform(0, math.tau), rng.uniform(*weight_range)) for _ in range(count)]
    norm = sum(t[2] for t in terms)
    return lambda u: sum(w * math.sin(f * math.tau * u + ph) for f, ph, w in terms) / norm


def generate(density, colour, size=1200, seed=7, opacity=1):
    """One shared terrain wave plus a small per-line wobble. The wobble is under
    half the line gap, so neighbouring lines can never cross, and it repeats
    every n lines, so drawing 2 overflow lines above and below makes the tile join
    seamlessly when it repeats vertically."""
    rng = random.Random(seed * 10 + density)
    n = LINES[density]
    gap = size / n
    terrain = _wave(rng, 3, (0.4, 1.0))
    wobbles = [_wave(rng, 2, (0.5, 1.0)) for _ in range(n)]
    steps = 60
    paths = []
    for k in range(-2, n + 2):
        wobble = wobbles[k % n]
        pts = []
        for i in range(steps + 1):
            u = i / steps
            y = gap * (k + 0.5) + 1.4 * gap * terrain(u) + 0.42 * gap * wobble(u)
            pts.append((round(size * u, 1), round(y, 1)))
        d = "M" + " L".join(f"{x} {y}" for x, y in pts)
        paths.append(f'<path d="{d}" fill="none" stroke="{colour}" stroke-width="1.2"' + (f' stroke-opacity="{opacity}"' if opacity != 1 else '') + '/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" '
            f'width="{size}" height="{size}">' + "".join(paths) + "</svg>")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for density in LINES:
        for paper, (colour, opacity) in COLOURS.items():
            dest = OUT / f"contours-{density}-{paper}-v3.svg"
            if dest.exists():
                print("exists, skipping", dest.name)
                continue
            dest.write_text(generate(density, colour, opacity=opacity))
            print("wrote", dest.name)


if __name__ == "__main__":
    main()
