import assert from 'node:assert/strict';
import type { ChordVoicing } from '@guitar-paradigm/core';
import { voicingClassification } from '@guitar-paradigm/web';

function voicing(overrides: Partial<ChordVoicing> = {}): ChordVoicing {
  return {
    frets: [0],
    fingers: [null],
    ergonomicScore: 0,
    playabilityScore: 100,
    styleScore: 100,
    exactChord: true,
    ...overrides
  };
}

export const voicingClassificationTests = [
  {
    name: 'VOICING_CLASSIFICATION_1: Exact, shell, ensemble, and extended states remain distinct',
    fn: () => {
      assert.equal(voicingClassification(voicing()), 'Exact guitar voicing');
      assert.equal(voicingClassification(voicing({ exactChord: false, omittedIntervals: [7] })), 'Valid shell · V omitted');
      assert.equal(voicingClassification(voicing({ exactChord: false, omittedIntervals: [0] })), 'Ensemble-complete · bass supplies I');
      assert.equal(voicingClassification(voicing({ droneIntervals: [2] })), 'Extended guitar voicing');
    }
  }
];
