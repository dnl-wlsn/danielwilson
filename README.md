# dnl wlsn

Daniel Wilson's personal site. Hand-coded, animated with GSAP + ScrollTrigger + Lenis,
deployed to Cloudflare Pages from `site/` only.

Design spec: `docs/superpowers/specs/2026-10-13-personal-site-design.md`

## Run it

```sh
npm install && npx playwright install chromium
python3 -m http.server 4173 --bind 127.0.0.1 --directory site
```

Playwright is pinned to 1.60.0 because newer versions won't install Chromium on macOS 12.

## Test it

```sh
npm test            # unit (node), py (stdlib unittest), e2e (Playwright, desktop + phone)
npm run test:perf   # 55 fps floor on a 4x-throttled phone
```

## Update content

| What | Where |
|---|---|
| Any copy | `site/index.html` |
| CV | edit `cv/cv.html`, then `npm run cv` (tests fail if a phone number appears) |
| Race | `python3 tools/gpx_to_profile.py race.gpx -o site/data/race.json --name "..." --date YYYY-MM-DD`, then copy the printed totals into `.run__stats` and the `.run__summary` sentence in `index.html` and remove `data-placeholder="race"` |
| Images | add a new versioned file (`-v2`); never overwrite, `/img/*` is cached for a year |

Content still waiting on Dan is marked `data-placeholder="..."`; `npm run test:e2e` prints the list.

## Deploy

```sh
npm run deploy      # runs all tests, then: wrangler pages deploy site --project-name dnlwlsn --branch main
```

Never deploy the repo root.
