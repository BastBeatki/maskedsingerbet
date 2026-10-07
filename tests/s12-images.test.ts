import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameStateS12Images } from '../gameStateS12Images';
import { getCatalog, maskKey, participationKey } from '../catalog';
import type { Season } from '../types';

const src = 'data:image/png;base64,aGVsbG8=';
const rows = getCatalog().rows.filter(row => row.season === 12);
const fixture = (): Season => ({ id: 's', seasonName: 'Staffel 2025', playerIds: [], shows: [], activeShowId: null, counterBets: [],
  masks: rows.map((row, i) => ({ id: String(i), name: row.mask_name === 'Smiley' ? 'Smile' : row.mask_name, imageUrl: src, celebrityImageUrl: src,
    revealedCelebrity: row.mask_name === 'Dude' ? 'Jared Evil Jared Hasselhoff' : row.celebrity_name!, isRevealed: true, tips: {} })) });
test('all nine S12 costumes and people map read-only, including evidenced Smile/Jared aliases', () => {
  const season = fixture(), before = JSON.stringify(season), mapped = gameStateS12Images([season]);
  assert.equal(mapped.masks.size, 9); assert.equal(mapped.celebrities.size, 9);
  for (const row of rows) { assert.equal(mapped.masks.get(maskKey(row))?.src, src); assert.equal(mapped.celebrities.get(participationKey(row))?.src, src); }
  assert.equal(JSON.stringify(season), before);
});
test('S12 mapping rejects ambiguous seasons, duplicate masks and unrelated/underspecified seasons', () => {
  const s = fixture();
  for (const seasons of [[s, { ...s, id: 'dup' }], [{ ...s, seasonName: 'Staffel 2026' }], [{ ...s, masks: s.masks.slice(0, 6) }]]) assert.equal(gameStateS12Images(seasons).masks.size, 0);
  const duplicate = fixture(); duplicate.masks.push({ ...duplicate.masks[0], id: 'dup' });
  assert.equal(gameStateS12Images([duplicate]).masks.size, 8); assert.equal(gameStateS12Images([duplicate]).celebrities.size, 8);
});
test('S12 portrait must belong to the revealed catalog person; unsafe or absent data stays missing', () => {
  const s = fixture(); s.masks[0].revealedCelebrity = 'Andere Person'; s.masks[1].isRevealed = false;
  s.masks[2].imageUrl = 'https://example.com/image.png'; s.masks[2].celebrityImageUrl = 'data:image/svg+xml;base64,aGVsbG8=';
  const images = gameStateS12Images([s]); assert.equal(images.masks.size, 8); assert.equal(images.celebrities.size, 6);
  assert.equal(gameStateS12Images([]).masks.size, 0); assert.equal(gameStateS12Images([]).celebrities.size, 0);
});
