import { test } from 'node:test'; import assert from 'node:assert/strict';
import { prepareSave, ConflictError } from '../.test-build/domain/revision.js'; import { scene } from './fixtures.mjs';
const now = '2026-09-04T12:00:00.000Z';
test('first commit starts at revision one', () => { const r = prepareSave(scene(), null, now); assert.equal(r.revision, 1); assert.equal(r.updatedAt, now); });
test('successive commit advances exactly once', () => { const old = { ...scene(), revision: 2 }; assert.equal(prepareSave(old, old, now).revision, 3); });
test('stale writer is rejected, not silently overwritten', () => assert.throws(() => prepareSave(scene(), { ...scene(), revision: 2 }, now), ConflictError));
test('deleted remote document is not silently recreated', () => assert.throws(() => prepareSave({ ...scene(), revision: 2 }, null, now), ConflictError));
