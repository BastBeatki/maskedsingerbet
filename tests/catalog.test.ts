import { test } from 'node:test';
import assert from 'node:assert/strict';
import document from '../data/promi-catalog-2026-09-30.json';
import manifest from '../data/promi-image-manifest.json';
import { extractCatalog, getCatalog, filterCatalog, participationKey, maskKey, catalogImages } from '../catalog';

test('all 134 original rows, all fields and unknown identities survive the adapter', () => {
  const catalog = getCatalog();
  assert.deepEqual(catalog.rows, document.records);
  assert.equal(catalog.asOf, '2026-09-30');
  assert.equal(catalog.rows.filter(row => row.celebrity_name === null).length, 8);
  assert.ok(Object.isFrozen(catalog.rows) && catalog.rows.every(Object.isFrozen));
});
test('participation keys stay unique; shared mask keys preserve duo/special cases', () => {
  const rows = getCatalog().rows;
  assert.equal(new Set(rows.map(participationKey)).size, 134);
  assert.equal(new Set(rows.map(maskKey)).size, 127);
  assert.equal(filterCatalog(rows, 'mysterium', '10').length, 6);
});
test('search supports accent-insensitive names, masks and AND terms', () => {
  const rows = getCatalog().rows;
  assert.ok(filterCatalog(rows, 'bulent').some(row => row.celebrity_name === 'Bülent Ceylan'));
  assert.equal(filterCatalog(rows, 'max astronaut').length, 1);
  assert.equal(filterCatalog(rows, 'nothing-matches').length, 0);
});
test('season filter keeps all known and unknown season-13 rows', () => {
  assert.equal(filterCatalog(getCatalog().rows, '', '13').length, 12);
  assert.ok(filterCatalog(getCatalog().rows, '', '1').every(row => row.season === 1));
});
test('filter and sorting never mutate the source order or content', () => {
  const rows = getCatalog().rows;
  const before = JSON.stringify(rows);
  filterCatalog(rows, '', 'all');
  assert.equal(JSON.stringify(rows), before);
});
test('manifest covers every mask and participation with explicit optional fallbacks', () => {
  assert.equal(Object.keys(manifest.masks).length, 127);
  assert.equal(Object.keys(manifest.celebrities).length, 134);
  for (const row of getCatalog().rows) assert.deepEqual(catalogImages(row), { mask: null, celebrity: null });
});
test('truncated data or inconsistent record-count metadata fails visibly', () => {
  assert.throws(() => extractCatalog({ ...document, records: document.records.slice(1) }));
  assert.throws(() => extractCatalog({ ...document, _record_count: 133 }));
});
test('missing fields and duplicate participation identities are rejected', () => {
  const bad = structuredClone(document);
  delete (bad.records[0] as any).primary_source;
  assert.throws(() => extractCatalog(bad));
  assert.throws(() => extractCatalog({ ...document, records: document.records.map((row, index) => index === 1 ? document.records[0] : row) }));
});
