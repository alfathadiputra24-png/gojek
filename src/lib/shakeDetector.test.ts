import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDeltaMagnitude,
  computeVectorMagnitude,
  createShakeDetector,
  shouldAttachMotionListener,
} from './shakeDetector';

test('computeVectorMagnitude computes Euclidean acceleration correctly', () => {
  assert.equal(computeVectorMagnitude({ x: 3, y: 4, z: 0 }), 5);
  assert.equal(computeVectorMagnitude(null), 0);
});

test('computeDeltaMagnitude ignores constant gravity when orientation is stationary', () => {
  const delta = computeDeltaMagnitude(
    { x: 0, y: 0, z: 9.81 },
    { x: 0.1, y: -0.05, z: 9.82 }
  );
  assert.ok(delta < 0.2);
});

test('resting device and single isolated bump do not trigger shake', () => {
  const detector = createShakeDetector({ threshold: 16, minShakes: 2, windowMs: 900 });

  for (let i = 0; i < 10; i++) {
    assert.equal(
      detector.push({
        accelerationIncludingGravity: { x: 0, y: 0, z: 9.81 },
        timestampMs: i * 50,
      }),
      false
    );
  }

  // Single bump only
  assert.equal(
    detector.push({
      acceleration: { x: 20, y: 0, z: 0 },
      timestampMs: 600,
    }),
    false
  );
});

test('rapid back-and-forth shake triggers once and enforces cooldown', () => {
  const detector = createShakeDetector({
    threshold: 16,
    minShakes: 2,
    windowMs: 900,
    minPeakIntervalMs: 140,
    cooldownMs: 3500,
  });

  // First impulse
  assert.equal(
    detector.push({
      acceleration: { x: 18, y: 4, z: 0 },
      timestampMs: 1000,
    }),
    false
  );

  // Within minPeakIntervalMs (<140ms) -> ignored as same bounce
  assert.equal(
    detector.push({
      acceleration: { x: 19, y: 3, z: 0 },
      timestampMs: 1050,
    }),
    false
  );

  // Second distinct peak -> triggers!
  assert.equal(
    detector.push({
      acceleration: { x: -20, y: 5, z: 2 },
      timestampMs: 1220,
    }),
    true
  );

  // Subsequent shakes during cooldown -> suppressed
  assert.equal(
    detector.push({
      acceleration: { x: 25, y: 0, z: 0 },
      timestampMs: 1500,
    }),
    false
  );
  assert.equal(
    detector.push({
      acceleration: { x: -25, y: 0, z: 0 },
      timestampMs: 1700,
    }),
    false
  );

  // After cooldown passes, another 2 shakes trigger again
  assert.equal(
    detector.push({
      acceleration: { x: 20, y: 0, z: 0 },
      timestampMs: 5000,
    }),
    false
  );
  assert.equal(
    detector.push({
      acceleration: { x: -20, y: 0, z: 0 },
      timestampMs: 5250,
    }),
    true
  );
});

test('shouldAttachMotionListener attaches in granted and prompt states unless disabled, paused, denied, or unsupported', () => {
  assert.equal(shouldAttachMotionListener(true, false, 'granted'), true);
  assert.equal(shouldAttachMotionListener(true, false, 'prompt'), true);
  assert.equal(shouldAttachMotionListener(true, false, 'denied'), false);
  assert.equal(shouldAttachMotionListener(true, false, 'unsupported'), false);
  assert.equal(shouldAttachMotionListener(false, false, 'granted'), false);
  assert.equal(shouldAttachMotionListener(true, true, 'granted'), false);
});
