import { chromium } from '@playwright/test';
const [,, out, w, h, sel, off] = process.argv;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto('http://127.0.0.1:4173/'); await p.waitForFunction(() => document.documentElement.dataset.start === 'done', null, { timeout: 15000 });
const y = await p.$eval(sel, (el, off) => el.getBoundingClientRect().top + scrollY + +off, off);
for (let yy = 0; yy <= y; yy += 300) { await p.evaluate((v) => window.scrollTo(0, v), yy); await p.waitForTimeout(40); }
await p.evaluate((v) => window.scrollTo(0, v), y); await p.waitForTimeout(1200); await p.screenshot({ path: out }); await b.close();
