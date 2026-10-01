import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseScene, isSafeUrl } from '../.test-build/domain/schema.js';
import { scene } from './fixtures.mjs';
test('valid document is cloned, canonicalized and JSON serializable', () => {
  const input = scene(); input.unknown = 'discard';
  const value = parseScene(input);
  assert.deepEqual(value, scene()); assert.notEqual(value.hotspots, input.hotspots);
  assert.deepEqual(JSON.parse(JSON.stringify(value)), value);
});
test('rejects unknown schema version', () => assert.throws(() => parseScene({ ...scene(), schemaVersion: 2 }), /versione/i));
test('rejects duplicate hotspot IDs', () => { const s = scene(); s.hotspots.push(s.hotspots[0]); assert.throws(() => parseScene(s), /duplicat/i); });
test('rejects invalid numeric vectors', () => { const s = scene(); s.hotspots[0].position.x = NaN; assert.throws(() => parseScene(s), /position/i); });
test('rejects zero normal', () => { const s = scene(); s.hotspots[0].normal = { x: 0, y: 0, z: 0 }; assert.throws(() => parseScene(s), /normal/i); });
test('rejects annotations without model', () => assert.throws(() => parseScene({ ...scene(), model: null }), /modello/i));
test('rejects invalid document IDs', () => assert.throws(() => parseScene({ ...scene(), id: '../other' }), /id/i));
test('rejects wrong asset hash', () => assert.throws(() => parseScene({ ...scene(), model: { ...scene().model, id: 'hash' } }), /hash/i));
test('rejects too many hotspots', () => { const s = scene(); s.hotspots = Array.from({ length: 101 }, (_, i) => ({ ...s.hotspots[0], id: `p${i}` })); assert.throws(() => parseScene(s), /100/); });
test('URL policy rejects scripts, protocol-relative paths and credentials', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,<b>x</b>', '//evil.test/a', '/\\evil', 'https://a:b@test.it', 'https:\\evil.test']) assert.equal(isSafeUrl(url), false, url);
  for (const url of ['', 'https://example.org/file.mp3', 'http://localhost:5173/a', '/images/a.jpg']) assert.equal(isSafeUrl(url), true, url);
});
test('unsafe URL fails scene import', () => { const s = scene(); s.hotspots[0].linkUrl = 'javascript:alert(1)'; assert.throws(() => parseScene(s), /URL/i); });
