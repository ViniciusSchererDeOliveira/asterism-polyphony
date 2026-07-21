import React from 'react';
import { renderToString } from 'react-dom/server';
import assert from 'node:assert/strict';
import {
  compareVoicings,
  generateVoicingsDetailed,
  rankVoicings,
  type ChordVoicing,
  type VoicingRequest
} from '@guitar-paradigm/core';
import { FretboardVisualizer } from '@guitar-paradigm/web';

const createDefaultRequest = (): VoicingRequest => ({
  chord: 'Cmaj7',
  rootNote: 'C',
  stylePreset: 'worship',
  fingerConstraints: {
    indexLength: 7.5,
    middleLength: 8.0,
    ringLength: 7.8,
    pinkyLength: 6.2,
    maxSpan: 4,
    tendonMuting: false
  },
  guitarConfig: {
    numStrings: 6,
    numFrets: 24,
    tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
  }
});

export const challengerBugfixR52Tests = [
  {
    name: 'CHALLENGE_BUGFIX_R5_2_1: Overall fit governs ranking before secondary scores',
    fn: () => {
      const makeVoicing = (shapeId: string, overallScore: number, playabilityScore: number, frequencyScore: number): ChordVoicing => ({
        frets: [0],
        fingers: [null],
        ergonomicScore: 0,
        playabilityScore,
        frequencyScore,
        styleScore: 0,
        overallScore,
        shapeId
      });
      const ranked = rankVoicings([
        makeVoicing('frequency', 80, 70, 99),
        makeVoicing('overall', 90, 10, 10),
        makeVoicing('playability', 80, 90, 10)
      ]);

      assert.deepEqual(ranked.map(voicing => voicing.shapeId), ['overall', 'playability', 'frequency']);
      assert.ok(compareVoicings(ranked[0], ranked[1]) < 0);
    }
  },
  {
    name: 'CHALLENGE_BUGFIX_R5_2_2: FretboardVisualizer rendering for 0-fret and 1-string guitars',
    fn: () => {
      const renderAndVerify = (numStrings: number, numFrets: number, tuning: string[], frets: (number | null)[]) => {
        const html = renderToString(
          React.createElement(FretboardVisualizer, {
            config: { numStrings, numFrets, tuning },
            voicing: {
              frets,
              fingers: frets.map(f => f === null ? null : (f === 0 ? null : 1)),
              ergonomicScore: 0,
              styleScore: 0,
              playabilityScore: 100
            },
            preset: 'worship'
          })
        );
        if (html.includes('NaN')) {
          throw new Error('FretboardVisualizer SVG contains NaN');
        }
        if (html.includes('Infinity')) {
          throw new Error('FretboardVisualizer SVG contains Infinity');
        }
        if (html.includes('undefined') && html.includes('="undefined"')) {
          throw new Error('FretboardVisualizer SVG contains undefined attributes');
        }
      };

      renderAndVerify(1, 0, ['E2'], [0]);
      renderAndVerify(1, 0, ['E2'], [null]);
      renderAndVerify(1, 0, ['E2'], [1]);

      renderAndVerify(1, 12, ['E2'], [0]);
      renderAndVerify(1, 12, ['E2'], [5]);
      renderAndVerify(1, 12, ['E2'], [null]);

      renderAndVerify(6, 0, ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], [0, 0, 0, 0, 0, 0]);
      renderAndVerify(6, 0, ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], [null, null, null, null, null, null]);
    }
  },
  {
    name: 'CHALLENGE_BUGFIX_R5_2_3: Sorting engine stress test with a large number of voicings',
    fn: () => {
      const request = createDefaultRequest();
      request.guitarConfig.numStrings = 8;
      request.guitarConfig.numFrets = 24;
      request.guitarConfig.tuning = ['F#1', 'B1', 'E2', 'A2', 'D3', 'G3', 'C4', 'F4'];
      request.chord = 'Cmaj7';
      request.rootNote = 'C';
      request.fingerConstraints.maxSpan = 8;

      request.searchBudget = 5_000;
      request.maxResults = 120;
      const result = generateVoicingsDetailed(request);

      assert.ok(result.evaluatedLeaves <= result.searchBudget);
      assert.ok(result.voicings.length <= request.maxResults);
      assert.ok(result.candidateCount >= result.voicings.length);
      for (let i = 0; i < result.voicings.length - 1; i++) {
        assert.ok(compareVoicings(result.voicings[i], result.voicings[i + 1]) <= 0);
      }
    }
  }
];
