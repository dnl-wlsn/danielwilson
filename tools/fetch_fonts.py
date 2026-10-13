#!/usr/bin/env python3
"""Download the latin-subset woff2 files for Archivo (variable, wdth + wght) and
IBM Plex Mono 400/500 from Google Fonts into site/fonts/.

    python3 tools/fetch_fonts.py

Run once. Files are versioned (-v1); never overwrite, bump to -v2 instead.
"""
import pathlib
import re
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "fonts"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36"

JOBS = [
    ("https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&display=swap",
     {"100 900": "archivo-var-v1.woff2"}),
    ("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap",
     {"400": "plex-mono-400-v1.woff2", "500": "plex-mono-500-v1.woff2"}),
    ("https://fonts.googleapis.com/css2?family=Anton&display=swap",
     {"400": "anton-400-v1.woff2"}),
]
BLOCK = re.compile(r"/\* latin \*/\s*@font-face\s*\{(.*?)\}", re.S)


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req) as r:
        return r.read()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for css_url, wanted in JOBS:
        css = get(css_url).decode()
        for block in BLOCK.findall(css):
            weight = re.search(r"font-weight:\s*([^;]+);", block).group(1).strip()
            src = re.search(r"url\((https://[^)]+\.woff2)\)", block).group(1)
            name = wanted.get(weight)
            if not name:
                continue
            dest = OUT / name
            if dest.exists():
                print("exists, skipping", dest.name)
                continue
            dest.write_bytes(get(src))
            print("wrote", dest.name, dest.stat().st_size, "bytes")
    missing = [n for _, w in JOBS for n in w.values() if not (OUT / n).exists()]
    if missing:
        sys.exit("missing: " + ", ".join(missing))


if __name__ == "__main__":
    main()
