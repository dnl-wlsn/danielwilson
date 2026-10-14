// Builds the commit chart in the contact section from the git history of the
// repos on this Mac (personal work only; never the employer's). Weekly totals,
// so it shows steady work without showing which days. Run: npm run commits
import { execFileSync } from 'node:child_process';
import { readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['/Users/Dan/projects', '/Users/Dan/projects/_archive'];
const MINE = new Set([
  '56296081+dnl-wlsn@users.noreply.github.com',
  '51659826+dnlwlsn@users.noreply.github.com',
  'hello@littleoceans.co.uk',
  'dvnielwilson@gmail.com',
]);
const WEEKS = 26; // six months: older work lives on other machines, so a year would look half empty
const DAY = 86400000;

const repos = ROOTS.flatMap((r) => existsSync(r) ? readdirSync(r).map((d) => join(r, d)) : [])
  .filter((d) => existsSync(join(d, '.git')));
const seen = new Map(); // hash -> time, so a commit on several branches counts once
for (const repo of repos) {
  let out = '';
  try { out = execFileSync('git', ['-C', repo, 'log', '--all', '--format=%H %ae %ct'], { encoding: 'utf8', maxBuffer: 64 << 20 }); }
  catch { continue; }
  for (const line of out.split('\n')) {
    const [hash, email, t] = line.split(' ');
    if (hash && MINE.has(email)) seen.set(hash, Number(t) * 1000);
  }
}

// Weeks run Monday to Sunday, ending with this week.
const now = new Date();
const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((now.getUTCDay() + 6) % 7)));
const start = monday.getTime() - (WEEKS - 1) * 7 * DAY;
const weeks = new Array(WEEKS).fill(0);
for (const t of seen.values()) {
  const i = Math.floor((t - start) / (7 * DAY));
  if (i >= 0 && i < WEEKS) weeks[i]++;
}
const total = weeks.reduce((a, b) => a + b, 0);
const max = Math.max(1, ...weeks);

// GitHub-style squares, one per week, shaded by how busy the week was.
const S = 14, G = 4;
const level = (n) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)));
const W = WEEKS * (S + G) - G, H = S;
const cells = weeks.map((n, i) => `<rect class="commits__sq lv${level(n)}" x="${i * (S + G)}" y="0" width="${S}" height="${S}" rx="3"/>`).join('');
const legend = [0, 1, 2, 3, 4].map((l) => `<span class="commits__key lv${l}"></span>`).join('');
const fmt = (n) => n.toLocaleString('en-GB');
const from = new Date(start).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const label = `${fmt(total)} commits in the last six months, since ${from}, counted by week.`;
const html = `<!-- commits:start (built by tools/commit-chart.mjs) -->
  <figure class="commits" data-reveal>
    <svg class="commits__svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">${cells}</svg>
    <p class="commits__legend mono" aria-hidden="true">Less ${legend} More</p>
    <figcaption class="mono">${fmt(total)} commits in the last six months, one square per week, across my own projects. Most are in private repos.</figcaption>
  </figure>
  <!-- commits:end -->`;

const page = new URL('../site/index.html', import.meta.url);
const src = readFileSync(page, 'utf8');
const re = /<!-- commits:start[\s\S]*?<!-- commits:end -->/;
if (!re.test(src)) throw new Error('No commits markers in site/index.html');
writeFileSync(page, src.replace(re, html));
console.log(`${repos.length} repos, ${fmt(total)} commits in the last ${WEEKS} weeks (busiest week ${max})`);
