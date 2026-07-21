import React from 'react';
import { renderToString } from 'react-dom/server';
import assert from 'node:assert/strict';
import { compareVoicings, generateVoicingsDetailed, rankVoicings, type ChordVoicing, type VoicingRequest } from '@guitar-paradigm/core';
import { FretboardVisualizer } from '@guitar-paradigm/web';

export const empiricalChallengeR51Tests = [
  {
    name: 'EMPIRICAL_1: Ranking contract is deterministic without fixture luck',
    fn: () => {
      const makeVoicing = (shapeId: string, overallScore: number, playabilityScore: number, frequencyScore: number): ChordVoicing => ({
        frets: [0], fingers: [null], ergonomicScore: 0, styleScore: 0,
        overallScore, playabilityScore, frequencyScore, shapeId
      });
      const ranked = rankVoicings([
        makeVoicing('third', 75, 80, 70),
        makeVoicing('first', 90, 40, 40),
        makeVoicing('second', 75, 90, 20)
      ]);
      assert.deepEqual(ranked.map(voicing => voicing.shapeId), ['first', 'second', 'third']);
    }
  },
  {
    name: 'EMPIRICAL_2: FretboardVisualizer No NaN or Infinity',
    fn: () => {
      const testCases = [
        { numFrets: 0, numStrings: 1, tuning: ['E2'] },
        { numFrets: 0, numStrings: 6, tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
        { numFrets: 12, numStrings: 1, tuning: ['E2'] }
      ];

      for (const tc of testCases) {
        const html = renderToString(
          React.createElement(FretboardVisualizer, {
            config: {
              numStrings: tc.numStrings,
              numFrets: tc.numFrets,
              tuning: tc.tuning
            },
            voicing: {
              frets: new Array(tc.numStrings).fill(0),
              fingers: new Array(tc.numStrings).fill(null),
              ergonomicScore: 0,
              styleScore: 0,
              playabilityScore: 100
            },
            preset: 'worship'
          })
        );

        if (html.toLowerCase().includes('nan')) {
          throw new Error(`FretboardVisualizer rendered NaN for frets=${tc.numFrets}, strings=${tc.numStrings}`);
        }
        if (html.toLowerCase().includes('infinity')) {
          throw new Error(`FretboardVisualizer rendered Infinity for frets=${tc.numFrets}, strings=${tc.numStrings}`);
        }
      }
    }
  },
  {
    name: 'EMPIRICAL_3: Sorting Engine Stress Test',
    fn: () => {
      const request: VoicingRequest = {
        chord: 'Cmaj9',
        rootNote: 'C',
        stylePreset: 'mathrock',
        fingerConstraints: {
          indexLength: 7.5,
          middleLength: 8.0,
          ringLength: 7.8,
          pinkyLength: 6.2,
          maxSpan: 8,
          tendonMuting: true
        },
        guitarConfig: {
          numStrings: 7,
          numFrets: 16,
          tuning: ['B1', 'E2', 'A2', 'D3', 'G3', 'B3', 'E4']
        }
      };

      const startTime = Date.now();
      request.searchBudget = 5_000;
      request.maxResults = 120;
      const result = generateVoicingsDetailed(request);
      const elapsed = Date.now() - startTime;

      if (elapsed > 5000) {
        throw new Error(`Sorting engine stress test took too long: ${elapsed}ms`);
      }

      assert.ok(result.evaluatedLeaves <= result.searchBudget);
      assert.ok(result.voicings.length <= request.maxResults);
      for (let i = 0; i < result.voicings.length - 1; i++) {
        assert.ok(compareVoicings(result.voicings[i], result.voicings[i + 1]) <= 0);
      }
    }
  }
];
