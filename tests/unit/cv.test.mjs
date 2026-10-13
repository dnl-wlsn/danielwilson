import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const PHONE = /(?:\+?44|0)7\d{9}/;
const squash = (s) => s.replace(/[\s().-]/g, '');

async function pdfText(path) {
  const doc = await getDocument({ data: new Uint8Array(await readFile(path)) }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const c = await (await doc.getPage(i)).getTextContent();
    text += c.items.map((it) => it.str).join(' ') + '\n';
  }
  return text;
}

test('CV source has no phone number and no em dashes', async () => {
  const html = await readFile(new URL('../../cv/cv.html', import.meta.url), 'utf8');
  assert.doesNotMatch(squash(html), PHONE);
  assert.ok(!html.includes('—'));
});

test('CV PDF has no phone number and covers the essentials', async () => {
  const text = await pdfText(new URL('../../site/cv/daniel-wilson-cv-2026.pdf', import.meta.url));
  assert.doesNotMatch(squash(text), PHONE);
  for (const want of ['Daniel Wilson', 'Simply Business', 'NewDay', 'SEGA', 'The Book On Software Testing', 'Little Oceans']) {
    assert.ok(text.includes(want), `missing ${want}`);
  }
});

test('the phone check really catches numbers', () => {
  assert.match(squash('call 07817 421 597'), PHONE);
  assert.match(squash('+44 7817 421597'), PHONE);
});
