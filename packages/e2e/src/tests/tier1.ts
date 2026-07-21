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

export const tier1Tests = [
  {
    name: 'T1_P1: Physical Guitar Params - 6 Strings default',
    fn: () => {
      const req = makeDefaultRequest();
      const result = generateVoicings(req);
      if (result.length === 0) {
        throw new Error('Expected at least one voicing');
      }
      for (const voicing of result) {
        if (voicing.frets.length !== 6) {
          throw new Error(`Expected 6 frets in voicing, got ${voicing.frets.length}`);
        }
      }
    }
  },
  {
    name: 'T1_P2: Physical Guitar Params - 4 Strings (ukulele/bass)',
    fn: () => {
      const req = makeDefaultRequest();
      req.guitarConfig.numStrings = 4;
      req.guitarConfig.tuning = ['G4', 'C4', 'E4', 'A4'];
      const result = generateVoicings(req);
      if (result.length === 0) {
        throw new Error('Expected at least one voicing');
      }
      for (const voicing of result) {
        if (voicing.frets.length !== 4) {
          throw new Error(`Expected 4 frets in voicing, got ${voicing.frets.length}`);
        }
      }
    }
  },
  {
    name: 'T1_P3: Physical Guitar Params - 12 Frets limit',
    fn: () => {
      const req = makeDefaultRequest();
      req.guitarConfig.numFrets = 12;
      const result = generateVoicings(req);
      for (const voicing of result) {
        for (const f of voicing.frets) {
          if (f !== null && f > 12) {
            throw new Error(`Found fret ${f} which exceeds maximum 12 frets`);
          }
        }
      }
    }
  },
  {
    name: 'T1_P4: Physical Guitar Params - 24 Frets limit',
    fn: () => {
      const req = makeDefaultRequest();
      req.guitarConfig.numFrets = 24;
      req.gravityCenter = 18;
      const result = generateVoicings(req);
      let foundHighFret = false;
      for (const voicing of result) {
        for (const f of voicing.frets) {
          if (f !== null && f > 12) {
            foundHighFret = true;
          }
        }
      }
      if (!foundHighFret) {
        throw new Error('Expected to find some frets above 12 with 24 frets config');
      }
    }
  },
  {
    name: 'T1_P5: Physical Guitar Params - Custom tuning (Drop D)',
    fn: () => {
      const req = makeDefaultRequest();
      req.guitarConfig.tuning = ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'];
      const result = generateVoicings(req);
      if (result.length === 0) {
        throw new Error('Expected at least one voicing');
      }
    }
  },
  {
    name: 'T1_E1: Ergonomic Constraints - maxSpan 2',
    fn: () => {
      const req = makeDefaultRequest();
      req.fingerConstraints.maxSpan = 2;
      const result = generateVoicings(req);
      for (const voicing of result) {
        const fretted = voicing.frets.filter((f): f is number => f !== null && f > 0);
        if (fretted.length > 0) {
          const span = Math.max(...fretted) - Math.min(...fretted);
          if (span > 2) {
            throw new Error(`Expected span <= 2, got ${span}`);
          }
        }
      }
    }
  },
  {
    name: 'T1_E2: Ergonomic Constraints - maxSpan 4',
    fn: () => {
      const req = makeDefaultRequest();
      req.fingerConstraints.maxSpan = 4;
      const result = generateVoicings(req);
      for (const voicing of result) {
        const fretted = voicing.frets.filter((f): f is number => f !== null && f > 0);
        if (fretted.length > 0) {
          const span = Math.max(...fretted) - Math.min(...fretted);
          if (span > 4) {
            throw new Error(`Expected span <= 4, got ${span}`);
          }
        }
      }
    }
  },
  {
    name: 'T1_E3: Ergonomic Constraints - Tendon muting inactive',
    fn: () => {
      const req = makeDefaultRequest();
      req.fingerConstraints.tendonMuting = false;
      const result = generateVoicings(req);
      if (result.length === 0) {
        throw new Error('Expected at least one voicing');
      }
    }
  },
  {
    name: 'T1_E4: Ergonomic Constraints - Tendon muting active penalty check',
    fn: () => {
      const req = makeDefaultRequest();
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
              throw new Error(`Expected ergonomicScore to include 15 penalty, got ${voicing.ergonomicScore}`);
            }
          }
        }
      }
    }
  },
  {
    name: 'T1_E5: Ergonomic Constraints - Finger assignment increasing order',
    fn: () => {
      const req = makeDefaultRequest();
      const result = generateVoicings(req);
      for (const voicing of result) {
        voicing.frets.forEach((f, idx) => {
          if (f !== null && f > 0) {
            const finger = voicing.fingers[idx];
            if (finger === null || finger < 1 || finger > 4) {
              throw new Error(`Expected a valid finger for fret ${f}, got ${finger}`);
            }
          } else {
            if (voicing.fingers[idx] !== null) {
              throw new Error(`Expected null finger for open/muted fret, got ${voicing.fingers[idx]}`);
            }
          }
        });
      }
    }
  },
  {
    name: 'T1_V1: Voicing Gen - Invalid chord format throws',
    fn: () => {
      const req = makeDefaultRequest();
      req.chord = 'invalid';
      let threw = false;
      try {
        generateVoicings(req);
      } catch (e) {
        threw = true;
      }
      if (!threw) {
        throw new Error('Expected invalid chord to throw an error');
      }
    }
  },
  {
    name: 'T1_V2: Voicing Gen - Empty chord throws',
    fn: () => {
      const req = makeDefaultRequest();
      req.chord = '';
      let threw = false;
      try {
        generateVoicings(req);
      } catch (e) {
        threw = true;
      }
      if (!threw) {
        throw new Error('Expected empty chord name to throw an error');
      }
    }
  },
  {
    name: 'T1_V3: Voicing Gen - Root note pitch class inclusion',
    fn: () => {
      const req = makeDefaultRequest();
      req.chord = 'Cmaj7';
      req.rootNote = 'C';
      const result = generateVoicings(req);
      for (const voicing of result) {
        let hasRoot = false;
        voicing.frets.forEach((f, idx) => {
          if (f !== null) {
            const pc = (parseNoteToMidi(req.guitarConfig.tuning[idx]) + f) % 12;
            if (pc === 0) {
              hasRoot = true;
            }
          }
        });
        if (!hasRoot) {
          throw new Error('Chord voicing must play root note C');
        }
      }
    }
  },
  {
    name: 'T1_V4: Voicing Gen - Minimum 2 distinct pitch classes',
    fn: () => {
      const req = makeDefaultRequest();
      const result = generateVoicings(req);
      for (const voicing of result) {
        const pcs = new Set<number>();
        voicing.frets.forEach((f, idx) => {
          if (f !== null) {
            pcs.add((parseNoteToMidi(req.guitarConfig.tuning[idx]) + f) % 12);
          }
        });
        if (pcs.size < 2) {
          throw new Error('Expected at least 2 distinct pitch classes played');
        }
      }
    }
  },
  {
    name: 'T1_V5: Voicing Gen - parseNoteToMidi helper checks',
    fn: () => {
      if (parseNoteToMidi('E2') !== 40) throw new Error('Expected E2 to be 40');
      if (parseNoteToMidi('A2') !== 45) throw new Error('Expected A2 to be 45');
      if (parseNoteToMidi('C#3') !== 49) throw new Error('Expected C#3 to be 49');
      if (parseNoteToMidi('Bb1') !== 34) throw new Error('Expected Bb1 to be 34');
    }
  },
  {
    name: 'T1_S1: Style Preset - Worship low frets preference',
    fn: () => {
      const req = makeDefaultRequest();
      req.stylePreset = 'worship';
      const result = generateVoicings(req);
      for (const voicing of result) {
        if (voicing.styleScore < 0 || voicing.styleScore > 10) {
          throw new Error(`Expected bounded Worship styleScore, got ${voicing.styleScore}`);
        }
      }
    }
  },
  {
    name: 'T1_S2: Style Preset - JRock mid frets preference',
    fn: () => {
      const req = makeDefaultRequest();
      req.stylePreset = 'jrock';
      const result = generateVoicings(req);
      for (const voicing of result) {
        if (voicing.styleScore < 0 || voicing.styleScore > 10) {
          throw new Error(`Expected bounded JRock styleScore, got ${voicing.styleScore}`);
        }
      }
    }
  },
  {
    name: 'T1_S3: Style Preset - Mathrock open & high frets preference',
    fn: () => {
      const req = makeDefaultRequest();
      req.stylePreset = 'mathrock';
      const result = generateVoicings(req);
      for (const voicing of result) {
        if (voicing.styleScore < 0 || voicing.styleScore > 10) {
          throw new Error(`Expected bounded Mathrock styleScore, got ${voicing.styleScore}`);
        }
      }
    }
  },
  {
    name: 'T1_S4: Style Preset - Metalcore power chord preference',
    fn: () => {
      const req = makeDefaultRequest();
      req.stylePreset = 'metalcore';
      const result = generateVoicings(req);
      for (const voicing of result) {
        if (voicing.styleScore < 0 || voicing.styleScore > 10) {
          throw new Error(`Expected bounded Metalcore styleScore, got ${voicing.styleScore}`);
        }
      }
    }
  },
  {
    name: 'T1_S5: Style Preset - Sorting order verification',
    fn: () => {
      const req = makeDefaultRequest();
      const result = generateVoicings(req);
      for (let i = 0; i < result.length - 1; i++) {
        const current = result[i];
        const next = result[i + 1];
        const currentOverall = current.overallScore ?? current.playabilityScore;
        const nextOverall = next.overallScore ?? next.playabilityScore;
        if (currentOverall < nextOverall) {
          throw new Error('Voicings not sorted by overallScore descending');
        }
      }
    }
  },
  {
    name: 'T1_U1: Fretboard UI - Render to string without error',
    fn: () => {
      const req = makeDefaultRequest();
      const result = generateVoicings(req);
      const html = renderToString(React.createElement(FretboardApp, {
        guitarConfig: req.guitarConfig,
        selectedChord: req.chord,
        stylePreset: req.stylePreset,
        selectedVoicing: result[0]
      }));
      if (!html || typeof html !== 'string') {
        throw new Error('Failed to render FretboardApp to HTML string');
      }
    }
  },
  {
    name: 'T1_U2: Fretboard UI - Number of string lines rendered',
    fn: () => {
      const req = makeDefaultRequest();
      const html = renderToString(React.createElement(FretboardApp, {
        guitarConfig: req.guitarConfig
      }));
      const stringLineMatches = html.match(/class="string-line"/g);
      if (!stringLineMatches || stringLineMatches.length !== 6) {
        throw new Error(`Expected 6 string lines, found ${stringLineMatches ? stringLineMatches.length : 0}`);
      }
    }
  },
  {
    name: 'T1_U3: Fretboard UI - Number of fret lines rendered',
    fn: () => {
      const req = makeDefaultRequest();
      req.guitarConfig.numFrets = 15;
      const html = renderToString(React.createElement(FretboardApp, {
        guitarConfig: req.guitarConfig
      }));
      const fretLineMatches = html.match(/class="fret-line"/g);
      if (!fretLineMatches || fretLineMatches.length !== 16) {
        throw new Error(`Expected 16 fret lines (fret 0 to 15), found ${fretLineMatches ? fretLineMatches.length : 0}`);
      }
    }
  },
  {
    name: 'T1_U4: Fretboard UI - Visual markers for muted/open notes',
    fn: () => {
      const req = makeDefaultRequest();
      const voicing = {
        frets: [null, 0, 3, 2, 1, 0],
        fingers: [null, null, 3, 2, 1, null],
        ergonomicScore: 10,
        styleScore: 8,
        playabilityScore: 100
      };
      const html = renderToString(React.createElement(FretboardApp, {
        guitarConfig: req.guitarConfig,
        selectedVoicing: voicing
      }));
      if (!html.includes('class="note-marker-muted"') || !html.includes('X')) {
        throw new Error('Expected HTML to contain muted note marker X');
      }
      if (!html.includes('class="note-marker-open"')) {
        throw new Error('Expected HTML to contain open note marker circle');
      }
    }
  },
  {
    name: 'T1_U5: Fretboard UI - Finger numbers displayed',
    fn: () => {
      const req = makeDefaultRequest();
      const voicing = {
        frets: [null, 0, 3, 2, 1, 0],
        fingers: [null, null, 3, 2, 1, null],
        ergonomicScore: 10,
        styleScore: 8,
        playabilityScore: 100
      };
      const html = renderToString(React.createElement(FretboardApp, {
        guitarConfig: req.guitarConfig,
        selectedVoicing: voicing
      }));
      if (!html.includes('>3</text>') || !html.includes('>2</text>') || !html.includes('>1</text>')) {
        throw new Error('Expected HTML to render fingers 1, 2, 3 inside SVG text');
      }
    }
  }
];
