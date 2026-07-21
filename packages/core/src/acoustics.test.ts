import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeMidiSpectralClarity,
  analyzeSpectralClarity,
  getAcousticProfile,
  midiToFrequencyHz,
  type AcousticProfile
} from './acoustics.js';

const PROFILES: readonly AcousticProfile[] = ['clean', 'crunch', 'highGain'];

describe('spectral clarity analysis', () => {
  it('converts MIDI pitches to frequencies using a configurable reference', () => {
    assert.equal(midiToFrequencyHz(69), 440);
    assert.equal(midiToFrequencyHz(69, 442), 442);
    assert.ok(Math.abs(midiToFrequencyHz(60) - 261.625565) < 0.000001);
    assert.throws(() => midiToFrequencyHz(Number.NaN), /finite/);
    assert.throws(() => midiToFrequencyHz(69, 0), /positive/);
  });

  it('returns a neutral analysis for silence and isolated pitches', () => {
    for (const profile of PROFILES) {
      const silence = analyzeSpectralClarity([], profile);
      const isolated = analyzeMidiSpectralClarity([60], profile);
      assert.equal(silence.score, 100);
      assert.equal(isolated.score, 100);
      assert.equal(silence.components.roughness.evaluatedPartialPairs, 0);
      assert.equal(isolated.components.registerDensity.evaluatedPitchPairs, 0);
    }
  });

  it('scores open upper-register voicings above dense low-register voicings', () => {
    const openVoicing = [55, 64, 72, 79];
    const denseLowVoicing = [40, 41, 44, 47];
    for (const profile of PROFILES) {
      const open = analyzeMidiSpectralClarity(openVoicing, profile);
      const dense = analyzeMidiSpectralClarity(denseLowVoicing, profile);
      assert.ok(open.score > dense.score, `${profile}: ${open.score} <= ${dense.score}`);
      assert.ok(open.components.registerDensity.score > dense.components.registerDensity.score);
      assert.ok(open.components.roughness.score > dense.components.roughness.score);
    }
  });

  it('penalizes the same interval structure more strongly in a low register', () => {
    const low = analyzeMidiSpectralClarity([40, 44, 47], 'clean');
    const high = analyzeMidiSpectralClarity([64, 68, 71], 'clean');
    assert.ok(high.score > low.score);
    assert.ok(high.components.registerDensity.score > low.components.registerDensity.score);
  });

  it('makes compressed gain profiles stricter for dense voicings', () => {
    const pitches = [40, 44, 47, 52];
    const clean = analyzeMidiSpectralClarity(pitches, 'clean');
    const crunch = analyzeMidiSpectralClarity(pitches, 'crunch');
    const highGain = analyzeMidiSpectralClarity(pitches, 'highGain');
    assert.ok(clean.score > crunch.score);
    assert.ok(crunch.score > highGain.score);
    assert.ok(clean.components.registerDensity.score > highGain.components.registerDensity.score);
  });

  it('reports exact and pitch-class duplication independently', () => {
    const analysis = analyzeMidiSpectralClarity([48, 60, 60, 64, 67], 'clean');
    assert.equal(analysis.components.duplication.exactPitchDuplicates, 1);
    assert.equal(analysis.components.duplication.pitchClassDuplicates, 2);
    assert.equal(analysis.components.duplication.score, 82);
  });

  it('is deterministic regardless of input pitch order', () => {
    const ascending = analyzeMidiSpectralClarity([48, 55, 64, 71], 'crunch');
    const shuffled = analyzeMidiSpectralClarity([71, 48, 64, 55], 'crunch');
    assert.deepEqual(shuffled, ascending);
  });

  it('exposes bounded components and dominant roughness contributors', () => {
    const analysis = analyzeMidiSpectralClarity([40, 44, 47, 52], 'highGain');
    assert.ok(analysis.score >= 0 && analysis.score <= 100);
    assert.ok(analysis.components.roughness.score >= 0 && analysis.components.roughness.score <= 100);
    assert.ok(analysis.components.registerDensity.score >= 0 && analysis.components.registerDensity.score <= 100);
    assert.ok(analysis.components.duplication.score >= 0 && analysis.components.duplication.score <= 100);
    assert.ok(analysis.components.roughness.dominantPairs.length > 0);
    assert.ok(analysis.components.roughness.dominantPairs.length <= 5);
    assert.ok(analysis.components.roughness.dominantPairs.every(pair => pair.contribution > 0));
  });

  it('rejects invalid acoustic inputs and exposes immutable profile values', () => {
    assert.throws(() => analyzeSpectralClarity([440, 0]), /positive/);
    assert.throws(() => analyzeSpectralClarity([Number.POSITIVE_INFINITY]), /finite/);
    const clean = getAcousticProfile('clean');
    assert.equal(clean.harmonicCount, 8);
    assert.ok(Object.isFrozen(clean));
  });
});
