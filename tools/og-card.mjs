// Renders the link-preview card (1200x630) from tools/og-card.html.
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
const html = new URL('./og-card.html', import.meta.url);
const out = fileURLToPath(new URL('../site/img/og-v1.png', import.meta.url));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto(html.href);
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: out });
await b.close();
console.log('wrote', out);
