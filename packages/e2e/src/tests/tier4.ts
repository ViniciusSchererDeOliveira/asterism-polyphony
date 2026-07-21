import React from 'react';
import { renderToString } from 'react-dom/server';
import { analyzeVoicing, generateVoicings, parseNoteToMidi, VoicingRequest } from '@guitar-paradigm/core';
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

export const tier4Tests = [
  {
    name: 'T4_1: Worship Style Chord Progression - Cmaj7 -> Fadd9 -> Am7 -> G6',
    fn: () => {
      const chords = [
        { name: 'Cmaj7', root: 'C' },
        { name: 'Fadd9', root: 'F' },
        { name: 'Am7', root: 'A' },
        { name: 'G6', root: 'G' }
      ];
      const req = makeDefaultRequest();
      req.stylePreset = 'worship';
      for (const c of chords) {
        req.chord = c.name;
        req.rootNote = c.root;
        const result = generateVoicings(req);
        if (result.length === 0) {
          throw new Error(`Failed to generate Worship voicings for ${c.name}`);
        }
        const topVoicing = result[0];
        if (topVoicing.styleScore < 0 || topVoicing.styleScore > 10) {
          throw new Error(`Worship top voicing for ${c.name} has an invalid styleScore`);
        }
      }
    }
  },
  {
    name: 'T4_2: Small Hand Metalcore Voicing - Bb5 Drop C tuning maxSpan 3',
    fn: () => {
      const req = makeDefaultRequest();
      req.chord = 'Bb5';
      req.rootNote = 'Bb';
      req.stylePreset = 'metalcore';
      req.guitarConfig.tuning = ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'];
      req.fingerConstraints.maxSpan = 3;
      const result = generateVoicings(req);
      if (result.length === 0) {
        throw new Error('Expected Metalcore Drop C voicings');
      }
      for (const voicing of result) {
        const fretted = voicing.frets.filter((f): f is number => f !== null && f > 0);
        if (fretted.length > 0) {
          const span = Math.max(...fretted) - Math.min(...fretted);
          if (span > 3) {
            throw new Error(`Expected span <= 3 for small hands metalcore, got ${span}`);
          }
        }
      }
    }
  },
  {
    name: 'T4_3: Custom 8-string Math Rock - Dmaj9 tuning',
    fn: () => {
      const req = makeDefaultRequest();
      req.chord = 'Dmaj9';
      req.rootNote = 'D';
      req.stylePreset = 'mathrock';
      req.guitarConfig.numStrings = 8;
      req.guitarConfig.tuning = ['F#1', 'B1', 'E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
      const result = generateVoicings(req);
      if (result.length === 0) {
        throw new Error('Expected 8-string Math Rock voicings');
      }
      if (!result.some(voicing => voicing.styleScore >= 7)) {
        throw new Error('Expected to find a strongly Math Rock-compatible voicing');
      }
    }
  },
  {
    name: 'T4_4: Extreme Stretch Rejection - Cmaj9 standard tuning maxSpan 2',
    fn: () => {
      const req = makeDefaultRequest();
      req.chord = 'Cmaj9';
      req.rootNote = 'C';
      req.fingerConstraints.maxSpan = 2;
      const result = generateVoicings(req);
      for (const voicing of result) {
        const fretted = voicing.frets.filter((f): f is number => f !== null && f > 0);
        if (fretted.length > 0) {
          const span = Math.max(...fretted) - Math.min(...fretted);
          if (span > 2) {
            throw new Error(`Stretch of ${span} should be rejected for maxSpan 2`);
          }
        }
      }
    }
  },
  {
    name: 'T4_5: Interactive Preset Switch & Redraw - Dmin9 Worship vs JRock',
    fn: () => {
      const req = makeDefaultRequest();
      req.chord = 'Dmin9';
      req.rootNote = 'D';

      req.stylePreset = 'worship';
      const worshipVoicings = generateVoicings(req);
      if (worshipVoicings.length === 0) {
        throw new Error('Expected Worship Dmin9 voicings');
      }
      const worshipTopHtml = renderToString(React.createElement(FretboardApp, {
        guitarConfig: req.guitarConfig,
        selectedChord: 'Dmin9',
        stylePreset: 'worship',
        selectedVoicing: worshipVoicings[0]
      }));

      req.stylePreset = 'jrock';
      const jrockVoicings = generateVoicings(req);
      if (jrockVoicings.length === 0) {
        throw new Error('Expected JRock Dmin9 voicings');
      }
      const jrockTopHtml = renderToString(React.createElement(FretboardApp, {
        guitarConfig: req.guitarConfig,
        selectedChord: 'Dmin9',
        stylePreset: 'jrock',
        selectedVoicing: jrockVoicings[0]
      }));

      if (worshipTopHtml === jrockTopHtml && worshipVoicings[0].frets.join(',') !== jrockVoicings[0].frets.join(',')) {
        throw new Error('Expected different HTML outputs for different preset top voicings');
      }
    }
  },
  {
    name: 'T4_6: All-fourths extended chords retain defining tones',
    fn: () => {
      const req = makeDefaultRequest();
      req.guitarConfig.tuning = ['E2', 'A2', 'D3', 'G3', 'C4', 'F4'];
      const required = new Set([0, 4, 11]);
      for (const voicing of generateVoicings(req)) {
        const pitchClasses = new Set(voicing.frets.flatMap((fret, stringIndex) =>
          fret === null ? [] : [(parseNoteToMidi(req.guitarConfig.tuning[stringIndex]) + fret) % 12]
        ));
        for (const pitchClass of required) {
          if (!pitchClasses.has(pitchClass)) throw new Error('Cmaj7 is missing a defining tone');
        }
      }
    }
  },
  {
    name: 'T4_7: Bass context enables rootless guitar voicings',
    fn: () => {
      const req = makeDefaultRequest();
      req.guitarConfig.tuning = ['E2', 'A2', 'D3', 'G3', 'C4', 'F4'];
      req.ensemble = ['bass'];
      const result = generateVoicings(req);
      if (!result.some(voicing => analyzeVoicing(voicing, req).chordType === 'Rootless Voicing')) {
        throw new Error('Expected a rootless Cmaj7 when bass covers C');
      }
    }
  },
  {
    name: 'T4_8: Traditional mode returns complete triads',
    fn: () => {
      const req = makeDefaultRequest();
      req.chord = 'C';
      req.mode = 'traditional';
      for (const voicing of generateVoicings(req)) {
        const pitchClasses = new Set(voicing.frets.flatMap((fret, stringIndex) =>
          fret === null ? [] : [(parseNoteToMidi(req.guitarConfig.tuning[stringIndex]) + fret) % 12]
        ));
        if (![0, 4, 7].every(pitchClass => pitchClasses.has(pitchClass))) {
          throw new Error('Traditional C major must contain root, third and fifth');
        }
      }
    }
  },
  {
    name: 'T4_9: Progression context exposes movement and pivot metrics',
    fn: () => {
      const req = makeDefaultRequest();
      const first = generateVoicings(req)[0];
      req.chord = 'Fadd9';
      req.rootNote = 'F';
      req.contextVoicings = [first];
      const result = generateVoicings(req);
      if (result.length === 0 || result.some(voicing => voicing.transitionScore === undefined)) {
        throw new Error('Expected progression-aware transition metrics');
      }
    }
  }
];
