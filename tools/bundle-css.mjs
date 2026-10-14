// Joins the stylesheets into one file, so the page makes one render-blocking
// CSS request instead of seventeen. Edit the files in site/css/, then run
// `npm run css` (tests and deploy run it for you). Order matters: it's the cascade.
import { readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('../site/css/', import.meta.url);
export const ORDER = ['fonts', 'tokens', 'base', 'sheets', 'terrain', 'route', 'lenis', 'opening', 'bugs',
  'testing', 'studio', 'running', 'likes', 'contact', 'reward', 'nav', 'print'];
const out = ORDER.map((n) => `/* ${n}.css */\n${readFileSync(new URL(`${n}.css`, dir), 'utf8').trim()}\n`).join('\n');
writeFileSync(new URL('site-v1.css', dir), `/* Built by tools/bundle-css.mjs - edit the source files, not this one. */\n${out}`);
console.log(`wrote site/css/site-v1.css (${out.length} bytes)`);
