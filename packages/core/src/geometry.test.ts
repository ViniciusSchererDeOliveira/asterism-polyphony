import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  analyzeStringLayout,
  computeTransitionMetrics,
  solveFingering
} from './geometry.js';

describe('fingering geometry', () => {
  it('rejects the discontinuous low-position counterexample', () => {
    const result = solveFingering([3, 7, null, null, null, 7]);
    assert.deepEqual(result, { valid: false, reason: 'anatomical-reach' });
  });

  it('rejects four-fret stretches in low positions but accepts them higher up', () => {
    const low = solveFingering([1, 5, null, null, null, null]);
    const high = solveFingering([12, 16, null, null, null, null]);
    assert.deepEqual(low, { valid: false, reason: 'anatomical-reach' });
    assert.equal(high.valid, true);
    if (high.valid) assert.ok(high.reachUtilization < 1);
  });

  it('uses individual finger lengths in hard reach validation', () => {
    const normal = solveFingering([12, 16, null, null, null, null]);
    const shortOuterFingers = solveFingering(
      [12, 16, null, null, null, null],
      { hand: { fingerLengthsMm: [72, 78, 45, 40] } }
    );
    assert.equal(normal.valid, true);
    assert.deepEqual(shortOuterFingers, { valid: false, reason: 'no-valid-finger-assignment' });
  });

  it('rejects wide diagonals while retaining compact diagonal shapes', () => {
    const wide = solveFingering([5, null, null, null, null, 8]);
    const compact = solveFingering([5, 7, null, null, null, null]);
    assert.deepEqual(wide, { valid: false, reason: 'no-valid-finger-assignment' });
    assert.equal(compact.valid, true);
  });

  it('accepts contiguous barres and never bridges internal muted strings', () => {
    const contiguous = solveFingering([5, 5, 5, null, null, null]);
    const separated = solveFingering([7, null, null, null, null, 7]);
    assert.equal(contiguous.valid, true);
    if (contiguous.valid) {
      assert.equal(contiguous.fingerCount, 1);
      assert.deepEqual(contiguous.barres.map(barre => [barre.fromString, barre.toString]), [[0, 2]]);
    }
    assert.equal(separated.valid, true);
    if (separated.valid) {
      assert.equal(separated.fingerCount, 2);
      assert.equal(separated.barres.length, 0);
      assert.deepEqual(separated.internalMutedStrings, [1, 2, 3, 4]);
      assert.equal(separated.stringSkipCount, 4);
    }
  });

  it('exposes skipped strings independently from fingering', () => {
    assert.deepEqual(analyzeStringLayout([null, 5, null, 7, null, null]), {
      playedStringCount: 2,
      firstPlayedString: 1,
      lastPlayedString: 3,
      internalMutedStrings: [2],
      stringSkipCount: 1,
      contiguousPlayedStrings: false
    });
  });
});

describe('physical transitions', () => {
  it('distinguishes a retained fret from a true finger pivot', () => {
    const metrics = computeTransitionMetrics(
      [null, 3, 2, 0, 0, 0],
      [null, 3, 3, 2, 1, 0]
    );
    assert.equal(metrics.retainedFretCount, 1);
    assert.equal(metrics.fingerPivotCount, 0);
    assert.deepEqual(metrics.fingerPivotStrings, []);
    assert.ok(metrics.movedFingerCount > 0);
    assert.ok(metrics.fingerTravelMm > 0);
    assert.equal(metrics.barreChangeCount, 1);
  });

  it('reports a real pivot and muting changes', () => {
    const metrics = computeTransitionMetrics(
      [5, 7, null, null, null, null],
      [5, 8, null, null, 0, null]
    );
    assert.equal(metrics.retainedFretCount, 1);
    assert.equal(metrics.fingerPivotCount, 1);
    assert.deepEqual(metrics.fingerPivotStrings, [0]);
    assert.equal(metrics.mutingChangeCount, 1);
    assert.equal(metrics.toStringSkipCount, 2);
    assert.equal(metrics.stringSkipDelta, 2);
  });
});
