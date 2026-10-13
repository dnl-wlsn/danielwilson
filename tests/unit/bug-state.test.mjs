import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, parseSaved, serialize, nextUnfound, announceText } from '../../site/js/lib/bug-state.js';

const ids = ['letters', 'date', 'unit'];

test('the storage key is versioned', () => {
  assert.match(STORAGE_KEY, /-v\d+$/);
});

test('saved progress round-trips', () => {
  assert.deepEqual(parseSaved(serialize(new Set(['date', 'letters'])), ids), ['date', 'letters']);
});

test('nothing saved, or blocked storage, means nothing found', () => {
  assert.deepEqual(parseSaved(null, ids), []);
  assert.deepEqual(parseSaved('', ids), []);
});

test('corrupt or foreign values are ignored', () => {
  assert.deepEqual(parseSaved('{not json', ids), []);
  assert.deepEqual(parseSaved('{"date":true}', ids), []);
  assert.deepEqual(parseSaved('["date","gone-bug",4,"date"]', ids), ['date']);
});

test('the hint picks the first unfound bug in page order', () => {
  assert.equal(nextUnfound(['letters', 'date', 'unit'], new Set(['letters'])), 'date');
  assert.equal(nextUnfound(['letters', 'date', 'unit'], new Set(ids)), null);
});

test('announcements say the count, then the note', () => {
  assert.equal(announceText(3, 7, 'Caught.'), 'Bug fixed, 3 of 7. Caught.');
  assert.equal(announceText(7, 7, 'Caught.'), 'Bug fixed. That is all 7. Your prize is at the bottom of the page. Caught.');
});
