# Daniel Wilson

Daniel Wilson's personal site, v2: "the bug hunt". Seven deliberate bugs to find and fix,
cream and black sections in turns, and a Matter.js letter playground as the prize.
Hand-coded, animated with GSAP + ScrollTrigger + Lenis, deployed to Cloudflare Pages from `site/` only.

Design spec: `docs/superpowers/specs/2026-10-13-v2-bug-hunt-design.md`.
v1 ("the route") is tag `v1`, still live on Pages project `dnlwlsn`.

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
| Race | `python3 tools/gpx_to_profile.py race.gpx -o site/data/race.json --name "..." --date YYYY-MM-DD --time <Strava moving time h:mm:ss> --climb <Strava climb m> --calories <kcal>`, then copy the printed totals into `.run__stats`, the big distance in `.run__big` and the `.run__summary` sentence in `index.html`. `--time` and `--climb` make the counters finish on Strava's figures while keeping the profile's shape. (Don't rely on `--moving`: GPS dropouts look like pauses in a GPX, which put the 2026 Maverick time out by 33 minutes.) The GPX's GPS coordinates are never written out. |
| A bug | definitions in `site/js/bug-defs.js`; the `[data-bug]` slot in `index.html` always holds the correct content |
| Images | add a new versioned file (`-v2`); never overwrite, `/img/*` is cached for a year |

Content still waiting on Dan is marked `data-placeholder="..."`; `npm run test:e2e` prints the list.

## Deploy

```sh
export CLOUDFLARE_ACCOUNT_ID=REDACTED_ACCOUNT_ID   # personal account; wrangler also sees a client's
npm run deploy      # runs all tests, then: wrangler pages deploy site --project-name danielwilson --branch main
```

v2 lives on Pages project `danielwilson`. Never deploy it to `dnlwlsn` (that's v1).

Never deploy the repo root.
