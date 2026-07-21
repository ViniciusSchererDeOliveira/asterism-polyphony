import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHORD_DEFINITIONS,
  parseChord,
  recognizeChordSymbol,
  validateChordPitchClasses,
  type ChordSuffix
} from './music.js';

describe('chord definitions', () => {
  it('supports every suffix exposed by the chord selector', () => {
    const suffixes: readonly ChordSuffix[] = [
      '',
      'm',
      '5',
      'sus4',
      'sus2',
      '7',
      'maj7',
      'm7',
      'm9',
      'maj9',
      '9',
      'dim',
      'dim7',
      'm7b5',
      'aug',
      '11',
      'm11',
      '13',
      'm13'
    ];

    for (const suffix of suffixes) {
      assert.equal(parseChord(`C${suffix}`).suffix, suffix);
    }
  });

  it('requires the identity tones of extended and altered chords', () => {
    assert.deepEqual(CHORD_DEFINITIONS['9'].requiredIntervals, [0, 4, 10, 2]);
    assert.deepEqual(CHORD_DEFINITIONS.dim7.requiredIntervals, [0, 3, 6, 9]);
    assert.deepEqual(CHORD_DEFINITIONS.m7b5.requiredIntervals, [0, 3, 6, 10]);
    assert.deepEqual(CHORD_DEFINITIONS.aug.requiredIntervals, [0, 4, 8]);
    assert.deepEqual(CHORD_DEFINITIONS['11'].requiredIntervals, [0, 10, 2, 5]);
    assert.deepEqual(CHORD_DEFINITIONS.m11.requiredIntervals, [0, 3, 10, 5]);
    assert.deepEqual(CHORD_DEFINITIONS['13'].requiredIntervals, [0, 4, 10, 9]);
    assert.deepEqual(CHORD_DEFINITIONS.m13.requiredIntervals, [0, 3, 10, 9]);
  });
});

describe('pitch-class validation', () => {
  it('accepts only chord tones by default', () => {
    const validation = validateChordPitchClasses([0, 4, 7], 'C');

    assert.equal(validation.valid, true);
    assert.equal(validation.exact, true);
    assert.deepEqual(validation.foreignPitchClasses, []);
  });

  it('rejects an unrequested diatonic drone', () => {
    const validation = validateChordPitchClasses([0, 4, 5, 7], 'C');

    assert.equal(validation.valid, false);
    assert.equal(validation.exact, false);
    assert.deepEqual(validation.foreignPitchClasses, [5]);
  });

  it('accepts a tension only through an explicit policy', () => {
    const validation = validateChordPitchClasses([0, 2, 4, 7], 'C', {
      tensionPolicy: { allowedIntervals: [2] }
    });

    assert.equal(validation.valid, true);
    assert.equal(validation.exact, false);
    assert.deepEqual(validation.tensionPitchClasses, [2]);
  });

  it('can require a tension declared by policy', () => {
    const withoutNinth = validateChordPitchClasses([0, 4, 7], 'C', {
      tensionPolicy: { allowedIntervals: [2], requiredIntervals: [2] }
    });
    const withNinth = validateChordPitchClasses([0, 2, 4, 7], 'C', {
      tensionPolicy: { allowedIntervals: [2], requiredIntervals: [2] }
    });

    assert.equal(withoutNinth.valid, false);
    assert.deepEqual(withoutNinth.missingRequiredPitchClasses, [2]);
    assert.equal(withNinth.valid, true);
  });

  it('requires complete traditional triads but permits explicit ensemble shells', () => {
    const traditional = validateChordPitchClasses([0, 4], 'C');
    const rootlessBandShell = validateChordPitchClasses([4, 7, 11], 'Cmaj7', {
      context: { mode: 'style', instruments: ['guitar', 'bass'] }
    });

    assert.equal(traditional.valid, false);
    assert.deepEqual(traditional.missingRequiredPitchClasses, [7]);
    assert.equal(rootlessBandShell.valid, true);
    assert.equal(rootlessBandShell.exact, true);
  });

  it('normalizes duplicated and negative pitch classes', () => {
    const validation = validateChordPitchClasses([12, 4, -5, 0], 'C');

    assert.equal(validation.valid, true);
    assert.deepEqual(validation.pitchClasses, [0, 4, 7]);
  });
});

describe('chord recognition', () => {
  it('labels complete major and extended chords', () => {
    assert.equal(recognizeChordSymbol([0, 4, 7], 'C')?.symbol, 'C');
    assert.equal(recognizeChordSymbol([0, 2, 4, 7], 'C')?.symbol, 'Cadd9');
    assert.equal(recognizeChordSymbol([0, 4, 8], 'C')?.symbol, 'Caug');
    assert.equal(recognizeChordSymbol([0, 3, 6, 9], 'C')?.symbol, 'Cdim7');
    assert.equal(recognizeChordSymbol([0, 4, 10, 2, 7], 'C')?.symbol, 'C9');
  });

  it('preserves a preferred flat root spelling', () => {
    const recognized = recognizeChordSymbol([1, 5, 8], 'Db');

    assert.equal(recognized?.symbol, 'Db');
    assert.equal(recognized?.rootPitchClass, 1);
  });

  it('reports omitted optional tones without changing chord identity', () => {
    const recognized = recognizeChordSymbol([0, 4], 'C');

    assert.equal(recognized?.symbol, 'C');
    assert.equal(recognized?.complete, false);
    assert.deepEqual(recognized?.omittedOptionalIntervals, [7]);
  });

  it('returns null for an ambiguous pitch-class set without a preferred root', () => {
    assert.equal(recognizeChordSymbol([0, 4, 7, 9]), null);
    assert.equal(recognizeChordSymbol([0, 4, 7, 9], 'C')?.symbol, 'C6');
  });

  it('does not force a label when the preferred root cannot explain the set', () => {
    assert.equal(recognizeChordSymbol([0, 6, 7], 'C'), null);
  });
});
