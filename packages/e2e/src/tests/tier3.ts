import React from 'react';
import { renderToString } from 'react-dom/server';
import { generateVoicings, parseNoteToMidi, VoicingRequest } from '@guitar-paradigm/core';
import { FretboardApp } from '@guitar-paradigm/web';

const makeDefaultRequest = (): VoicingRequest => ({
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

export const tier3Tests = [
  {
    name: 'T3_1: Custom Tuning (Drop D) & Tendon Muting active penalty check',
    fn: () => {
      const req = makeDefaultRequest();
      req.guitarConfig.tuning = ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'];
      const baseline = new Map(
        generateVoicings(req).map(voicing => [JSON.stringify(voicing.frets), voicing.ergonomicScore])
      );
      req.fingerConstraints.tendonMuting = true;
      const result = generateVoicings(req);
      for (const voicing of result) {
        const fretted = voicing.frets.filter((f): f is number => f !== null && f > 0);
        const unique = Array.from(new Set(fretted)).sort((a, b) => a - b);
        if (unique.length >= 4) {
          const diff = unique[3] - unique[2];
          if (diff > 1) {
            const baseScore = baseline.get(JSON.stringify(voicing.frets));
            if (baseScore !== undefined && Math.abs(voicing.ergonomicScore - baseScore - 15) > 1e-9) {
              throw new Error(`Expected ergonomicScore to include 15 penalty on Drop D, got ${voicing.ergonomicScore}`);
            }
          }
        }
      }
    }
  },
  {
    name: 'T3_2: Bb5 on a 4-string Bass with Mathrock style preset',
    fn: () => {
      const req = makeDefaultRequest();
      req.chord = 'Bb5';
      req.rootNote = 'Bb';
      req.guitarConfig.numStrings = 4;
      req.guitarConfig.tuning = ['E1', 'A1', 'D2', 'G2'];
      req.stylePreset = 'mathrock';
      const result = generateVoicings(req);
      for (const voicing of result) {
        if (voicing.frets.length !== 4) {
          throw new Error('Expected 4 frets in voicing');
        }
        if (voicing.styleScore < 0 || voicing.styleScore > 10) {
          throw new Error('Mathrock style preset score does not match expectations');
        }
      }
    }
  },
  {
    name: 'T3_3: Fretboard UI rendering with maxSpan of 2 on a 7-string guitar',
    fn: () => {
      const req = makeDefaultRequest();
      req.guitarConfig.numStrings = 7;
      req.guitarConfig.tuning = ['B1', 'E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
      req.fingerConstraints.maxSpan = 2;
      const result = generateVoicings(req);
      if (result.length === 0) {
        return;
      }
      const html = renderToString(React.createElement(FretboardApp, {
        guitarConfig: req.guitarConfig,
        selectedVoicing: result[0]
      }));
      const stringLines = html.match(/class="string-line"/g);
      if (!stringLines || stringLines.length !== 7) {
        throw new Error(`Expected 7 string lines, found ${stringLines ? stringLines.length : 0}`);
      }
      const fretted = result[0].frets.filter((f): f is number => f !== null && f > 0);
      if (fretted.length > 0) {
        const span = Math.max(...fretted) - Math.min(...fretted);
        if (span > 2) {
          throw new Error(`Expected rendered voicing span to be <= 2, got ${span}`);
        }
      }
    }
  },
  {
    name: 'T3_4: G6 chord on Standard Tuning with Worship preset',
    fn: () => {
      const req = makeDefaultRequest();
      req.chord = 'G6';
      req.rootNote = 'G';
      req.stylePreset = 'worship';
      const result = generateVoicings(req);
      if (result.length === 0) {
        throw new Error('Expected G6 voicings');
      }
      const topVoicing = result[0];
      if (topVoicing.styleScore < 0 || topVoicing.styleScore > 10) {
        throw new Error('Expected styleScore to match Worship criteria');
      }
    }
  },
  {
    name: 'T3_5: UI rendering header checks across Metalcore vs Worship style presets',
    fn: () => {
      const req = makeDefaultRequest();
      const worshipHtml = renderToString(React.createElement(FretboardApp, {
        guitarConfig: req.guitarConfig,
        selectedChord: 'Cmaj7',
        stylePreset: 'worship'
      }));
      if (!worshipHtml.includes('Fretboard for') || !worshipHtml.includes('Cmaj7') || !worshipHtml.includes('worship')) {
        throw new Error('Expected Worship header in HTML');
      }
      const metalcoreHtml = renderToString(React.createElement(FretboardApp, {
        guitarConfig: req.guitarConfig,
        selectedChord: 'Bb5',
        stylePreset: 'metalcore'
      }));
      if (!metalcoreHtml.includes('Fretboard for') || !metalcoreHtml.includes('Bb5') || !metalcoreHtml.includes('metalcore')) {
        throw new Error('Expected Metalcore header in HTML');
      }
    }
  }
];
