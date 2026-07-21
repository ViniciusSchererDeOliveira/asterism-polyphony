import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { generateVoicings, type VoicingRequest } from '@guitar-paradigm/core';
import { FretboardVisualizer } from '@guitar-paradigm/web';

const createDefaultRequest = (): VoicingRequest => ({
  chord: 'Cmaj7',
  rootNote: 'C',
  stylePreset: 'worship',
  fingerConstraints: {
    indexLength: 7.5,
    middleLength: 8,
    ringLength: 7.8,
    pinkyLength: 6.2,
    maxSpan: 4,
    tendonMuting: false
  },
  guitarConfig: {
    numStrings: 6,
    numFrets: 12,
    tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
  }
});

export const challengerR7Tests = [
  {
    name: 'REGRESSION_R7_1: extreme span remains bounded by the search budget',
    fn: () => {
      const request = createDefaultRequest();
      request.fingerConstraints.maxSpan = 100;
      request.searchBudget = 2_000;
      request.maxResults = 40;
      const result = generateVoicings(request);
      assert.ok(result.length <= 40);
      assert.ok(result.every((voicing) => voicing.frets.length === request.guitarConfig.numStrings));
    }
  },
  {
    name: 'REGRESSION_R7_2: zero-span results never cross frets',
    fn: () => {
      const request = createDefaultRequest();
      request.fingerConstraints.maxSpan = 0;
      for (const voicing of generateVoicings(request)) {
        const fretted = voicing.frets.filter((fret): fret is number => fret !== null && fret > 0);
        if (fretted.length > 1) assert.equal(Math.max(...fretted) - Math.min(...fretted), 0);
      }
    }
  },
  {
    name: 'REGRESSION_R7_3: extended-string SSR emits finite geometry',
    fn: () => {
      const config = {
        numStrings: 10,
        numFrets: 24,
        tuning: ['C1', 'G1', 'D2', 'A2', 'E3', 'B3', 'F#4', 'C#5', 'G#5', 'D#6']
      };
      const html = renderToString(React.createElement(FretboardVisualizer, {
        config,
        voicing: null,
        preset: 'worship'
      }));
      assert.match(html, /<svg/);
      assert.doesNotMatch(html, /NaN|Infinity/);
    }
  }
];
