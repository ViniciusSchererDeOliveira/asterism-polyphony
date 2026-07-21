import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assessStyleFit, inferAcousticProfile, STYLE_POLICY_VERSION } from './style.js';

describe('style policy', () => {
  it('exposes a stable policy version for provenance', () => {
    assert.match(STYLE_POLICY_VERSION, /^style-policy\/\d+$/);
  });

  it('maps styles to their expected tone profiles', () => {
    assert.equal(inferAcousticProfile('worship'), 'clean');
    assert.equal(inferAcousticProfile('mathrock'), 'clean');
    assert.equal(inferAcousticProfile('jrock'), 'crunch');
    assert.equal(inferAcousticProfile('metalcore'), 'highGain');
  });

  it('prefers low compact power shapes for metalcore', () => {
    const compact = assessStyleFit({
      preset: 'metalcore',
      mode: 'style',
      chordSuffix: '5',
      frets: [3, 3, null, null, null, null],
      soundingMidis: [43, 50],
      droneCount: 0,
      instruments: []
    });
    const sparseHigh = assessStyleFit({
      preset: 'metalcore',
      mode: 'style',
      chordSuffix: '5',
      frets: [null, null, null, 12, null, 12],
      soundingMidis: [67, 77],
      droneCount: 0,
      instruments: []
    });
    assert.ok(compact.score > sparseHigh.score);
    assert.equal(compact.suitable, true);
  });

  it('penalizes internal string skips in every style', () => {
    const contiguous = assessStyleFit({
      preset: 'mathrock',
      mode: 'style',
      chordSuffix: 'maj7',
      frets: [null, null, 7, 8, 9, null],
      soundingMidis: [57, 63, 68],
      droneCount: 0,
      instruments: []
    });
    const skipped = assessStyleFit({
      preset: 'mathrock',
      mode: 'style',
      chordSuffix: 'maj7',
      frets: [null, 7, null, 8, null, 9],
      soundingMidis: [52, 63, 74],
      droneCount: 0,
      instruments: []
    });
    assert.ok(contiguous.score > skipped.score);
    assert.ok(skipped.reasons.includes('internal-string-skip'));
  });

  it('keeps traditional mode independent from style idioms', () => {
    const assessment = assessStyleFit({
      preset: 'metalcore',
      mode: 'traditional',
      chordSuffix: 'maj9',
      frets: [null, 7, 9, 7, 7, 9],
      soundingMidis: [52, 59, 62, 66, 77],
      droneCount: 0,
      instruments: ['bass']
    });
    assert.equal(assessment.score, 100);
    assert.equal(assessment.suitable, true);
  });
});
