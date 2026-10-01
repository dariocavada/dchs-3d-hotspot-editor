import { test } from 'node:test'; import assert from 'node:assert/strict';
import { TapTracker } from '../.test-build/domain/gesture.js';
const p = (id, x, y, button = 0) => ({ pointerId: id, clientX: x, clientY: y, button });
test('stationary pointer is a tap', () => { const g = new TapTracker(); g.down(p(1, 100, 50)); assert.equal(g.up(p(1, 101, 51)), true); });
test('drag returning to its origin is not a tap', () => { const g = new TapTracker(); g.down(p(1, 1, 1)); g.move(p(1, 80, 80)); assert.equal(g.up(p(1, 1, 1)), false); });
test('a pinch never creates a point', () => { const g = new TapTracker(); g.down(p(1, 0, 0)); g.down(p(2, 0, 0)); assert.equal(g.up(p(2, 0, 0)), false); assert.equal(g.up(p(1, 0, 0)), false); });
test('right-click never creates a point', () => { const g = new TapTracker(); g.down(p(1, 0, 0, 2)); assert.equal(g.up(p(1, 0, 0)), false); });
test('cancelled pointer cannot create a point', () => { const g = new TapTracker(); g.down(p(1, 0, 0)); g.cancel(); assert.equal(g.up(p(1, 0, 0)), false); });
test('real DOM-style prototype getters survive pointer capture', () => {
  const proto = { get pointerId() { return 7; }, get clientX() { return 50; }, get clientY() { return 80; }, get button() { return 0; } };
  const event = Object.create(proto); const g = new TapTracker();
  g.down(event); assert.equal(g.up(event), true);
});
