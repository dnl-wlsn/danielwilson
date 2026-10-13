// Renders cv/cv.html to site/cv/daniel-wilson-cv-2026.pdf with headless Chromium.
//   npm run cv
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = pathToFileURL(path.join(root, 'cv', 'cv.html')).href;
const out = path.join(root, 'site', 'cv', 'daniel-wilson-cv-2026.pdf');

await mkdir(path.dirname(out), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(src);
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log('wrote', path.relative(root, out));
