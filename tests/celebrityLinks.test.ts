import { test } from 'node:test';
import assert from 'node:assert/strict';
import { celebrityInfoLink } from '../celebrityLinks';
import { getCatalog, catalogImages } from '../catalog';

test('reviewed info links use exact catalog identities and https person pages', () => {
  const linked = getCatalog().rows.filter(row => celebrityInfoLink(row.celebrity_name));
  assert.equal(new Set(linked.map(row => row.celebrity_name)).size, 4);
  assert.equal(linked.length, 5); // Max Mutzke has two catalog participations.
  for (const row of linked) {
    assert.match(celebrityInfoLink(row.celebrity_name)!, /^https:\/\/de\.wikipedia\.org\/wiki\//);
    assert.equal(catalogImages(row).celebrity, null);
  }
  assert.equal(celebrityInfoLink('Bülent Ceylan'), 'https://de.wikipedia.org/wiki/B%C3%BClent_Ceylan');
  for (const name of [null, 'Unbekannt', 'Tom', '__proto__', 'constructor', 'javascript:alert(1)']) assert.equal(celebrityInfoLink(name), null);
});
