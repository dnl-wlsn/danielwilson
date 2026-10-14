# Daniel Wilson

My personal site: [danielwilson.pages.dev](https://danielwilson.pages.dev). Hand-coded HTML, CSS
and JavaScript, animated with GSAP, ScrollTrigger and Lenis, deployed to Cloudflare Pages from
`site/` only. No framework, no build step beyond joining the stylesheets.

A pink route line draws down the page through a checkpoint for every section and role. There's an
optional bug hunt: press Play and seven deliberate bugs appear along the route, each one a real,
keyboard-accessible button; find them all and the letters of my name fall into a Matter.js playground.

What I care about here, as a tester:

- **Tested end to end.** Around 250 Playwright checks on desktop and a phone, plus unit tests for the
  route maths and bug state, and a performance test that holds 55 fps on a 4x-throttled phone.
- **Readable without JavaScript and with reduced motion.** Every bug slot holds the correct content;
  the motion code only breaks it on purpose, and a watchdog falls back to the static page.
- **Strict security headers.** A content security policy with no inline scripts or styles.
- **Accessible.** Lighthouse 100 for accessibility, best practices and SEO; 95 for performance on mobile.

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
export CLOUDFLARE_ACCOUNT_ID=...   # the account that owns the Pages project
npm run deploy      # runs all tests, then: wrangler pages deploy site --project-name danielwilson --branch main
```

v3 is the live site: Pages project `danielwilson` (danielwilson.pages.dev, the URL on the CV). `danielwilson-v3` was its preview. Never deploy to `dnlwlsn` (v1).

Never deploy the repo root.
