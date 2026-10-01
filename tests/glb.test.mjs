import { test } from 'node:test'; import assert from 'node:assert/strict';
import { inspectGlb } from '../.test-build/domain/glb.js'; import { glb } from './fixtures.mjs';
test('valid GLB produces repeatable SHA-256 and size', async () => { const b = glb(); const a = await inspectGlb(b, 'vase.glb'); assert.match(a.id, /^[a-f0-9]{64}$/); assert.equal(a.id, (await inspectGlb(b, 'different.glb')).id); assert.equal(a.byteLength, b.size); });
test('rejects renamed non-GLB', async () => assert.rejects(inspectGlb(new Blob(['not a real model']), 'bad.glb'), /GLB/i));
test('rejects mismatched declared length', async () => { const buffer = await glb().arrayBuffer(); new DataView(buffer).setUint32(8, 32, true); await assert.rejects(inspectGlb(new Blob([buffer]), 'x.glb'), /lunghezza/i); });
test('rejects external dependencies in GLB', async () => assert.rejects(inspectGlb(glb({ asset: { version: '2.0' }, images: [{ uri: 'https://example.org/a.png' }] }), 'x.glb'), /estern/i));
test('accepts embedded data URI', async () => { await inspectGlb(glb({ asset: { version: '2.0' }, images: [{ uri: 'data:image/png;base64,AA==' }] }), 'x.glb'); });
