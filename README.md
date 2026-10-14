# Daniel Wilson

Daniel Wilson's personal site, v3: "the test run", a mix of v1 and v2. A pink route line
draws down the page through a checkpoint per section and role (v1), over cream and black
sheets that feed in like paper (v2). Seven deliberate bugs sit along the route (v2, plus a
glitch in the route itself); the finish tape stays up until they're all fixed, then the
Matter.js letter playground falls in as the prize.
Hand-coded, animated with GSAP + ScrollTrigger + Lenis, deployed to Cloudflare Pages from `site/` only.

Design spec: `docs/superpowers/specs/2026-10-14-v3-test-run-design.md` (v2's spec still
covers the bug engine and the prize).
v1 ("the route") is tag `v1`, live on Pages project `dnlwlsn`. v2 ("the bug hunt") is branch
`v2`; its Pages project `danielwilson` now serves v3.

## Run it

```sh
npm install && npx playwright install chromium
python3 tools/serve.py 4173   # http.server with a deep backlog; the stock one stalls the tests
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
| Contour tiles | `python3 tools/contours.py` (skips files that exist; bump the `-v3` suffix to change them) |
| Images | add a new versioned file (`-v2`); never overwrite, `/img/*` is cached for a year |

Content still waiting on Dan is marked `data-placeholder="..."`; `npm run test:e2e` prints the list.

## Deploy

```sh
export CLOUDFLARE_ACCOUNT_ID=REDACTED_ACCOUNT_ID   # personal account; wrangler also sees a client's
npm run deploy      # runs all tests, then: wrangler pages deploy site --project-name danielwilson --branch main
```

v3 is the live site: Pages project `danielwilson` (danielwilson.pages.dev, the URL on the CV). `danielwilson-v3` was its preview. Never deploy to `dnlwlsn` (v1).

Never deploy the repo root.
