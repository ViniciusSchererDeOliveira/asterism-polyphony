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

export const tier2Tests = [
  {
    name: 'T2_P1: Physical Guitar Params - 0 Frets boundary',
    fn: () => {
      const req = makeDefaultRequest();
      req.guitarConfig.numFrets = 0;
      const result = generateVoicings(req);
      for (const voicing of result) {
        for (const f of voicing.frets) {
          if (f !== null && f !== 0) {
            throw new Error(`Expected frets to be null or 0, got ${f}`);
          }
        }
      }
    }
  },
  {
    name: 'T2_P2: Physical Guitar Params - 1 String boundary',
    fn: () => {
      const req = makeDefaultRequest();
      req.guitarConfig.numStrings = 1;
      req.guitarConfig.tuning = ['E2'];
      const result = generateVoicings(req);
      for (const voicing of result) {
        if (voicing.frets.length !== 1) {
          throw new Error(`Expected 1 fret value, got ${voicing.frets.length}`);
        }
      }
    }
  },
  {
    name: 'T2_P3: Physical Guitar Params - 10 Strings boundary',
    fn: () => {
      const req = makeDefaultRequest();
      req.guitarConfig.numStrings = 10;
      req.guitarConfig.tuning = ['C1', 'G1', 'D2', 'A2', 'E3', 'B3', 'F#4', 'C#5', 'G#5', 'D#6'];
      const result = generateVoicings(req);
      for (const voicing of result) {
        if (voicing.frets.length !== 10) {
          throw new Error(`Expected 10 fret values, got ${voicing.frets.length}`);
        }
      }
    }
  },
  {
    name: 'T2_P4: Physical Guitar Params - 36 Frets boundary',
    fn: () => {
      const req = makeDefaultRequest();
      req.guitarConfig.numFrets = 36;
      req.gravityCenter = 30;
      const result = generateVoicings(req);
      let foundHighFret = false;
      for (const voicing of result) {
        for (const f of voicing.frets) {
          if (f !== null && f > 24) {
            foundHighFret = true;
          }
        }
      }
      if (!foundHighFret) {
        throw new Error('Expected to find frets above 24 with 36 frets config');
      }
    }
  },
  {
    name: 'T2_P5: Physical Guitar Params - Extremely high/low octave parsing',
    fn: () => {
      if (parseNoteToMidi('C0') !== 12) throw new Error('Expected C0 to be 12');
      if (parseNoteToMidi('B8') !== 119) throw new Error('Expected B8 to be 119');
    }
  },
  {
    name: 'T2_E1: Ergonomic Constraints - span of 0 (same fret)',
    fn: () => {
      const req = makeDefaultRequest();
      req.fingerConstraints.maxSpan = 0;
      const result = generateVoicings(req);
      for (const voicing of result) {
        const fretted = voicing.frets.filter((f): f is number => f !== null && f > 0);
        if (fretted.length > 1) {
          const span = Math.max(...fretted) - Math.min(...fretted);
          if (span !== 0) {
            throw new Error(`Expected span to be 0 for maxSpan 0, got ${span}`);
          }
        }
      }
    }
  },
  {
    name: 'T2_E2: Ergonomic Constraints - maxSpan extremely large',
    fn: () => {
      const req = makeDefaultRequest();
      req.fingerConstraints.maxSpan = 20;
      const result = generateVoicings(req);
      let foundLargeSpan = false;
      for (const voicing of result) {
        const fretted = voicing.frets.filter((f): f is number => f !== null && f > 0);
        if (fretted.length > 0) {
          const span = Math.max(...fretted) - Math.min(...fretted);
          if (span > 4) {
            foundLargeSpan = true;
            break;
          }
        }
      }
      if (!foundLargeSpan) {
        throw new Error('Expected to find voicings with span > 4 when maxSpan is 20');
      }
    }
  },
  {
    name: 'T2_E3: Ergonomic Constraints - Tendon muting: no penalty with only 2 fingers used',
    fn: () => {
      const req = makeDefaultRequest();
      const baseline = new Map(
        generateVoicings(req).map(voicing => [JSON.stringify(voicing.frets), voicing.ergonomicScore])
      );
      req.fingerConstraints.tendonMuting = true;
      req.fingerConstraints.maxSpan = 4;
      const result = generateVoicings(req);
      for (const voicing of result) {
        const fretted = voicing.frets.filter((f): f is number => f !== null && f > 0);
        const unique = Array.from(new Set(fretted));
        if (unique.length === 2) {
          const baseScore = baseline.get(JSON.stringify(voicing.frets));
          if (baseScore !== undefined && voicing.ergonomicScore !== baseScore) {
            throw new Error('Should not add tendon muting penalty with only 2 fingers');
          }
        }
      }
    }
  },
  {
    name: 'T2_E4: Ergonomic Constraints - Tendon muting: no penalty when difference is exactly 1',
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
        if (unique.length === 4) {
          const diff = unique[3] - unique[2];
          if (diff === 1) {
            const baseScore = baseline.get(JSON.stringify(voicing.frets));
            if (baseScore !== undefined && voicing.ergonomicScore !== baseScore) {
              throw new Error('Should not add tendon muting penalty when finger 3 and 4 fret difference is exactly 1');
            }
          }
        }
      }
    }
  },
  {
    name: 'T2_E5: Ergonomic Constraints - Fretboard with all open/muted notes has 0 span and 0 ergonomic score',
    fn: () => {
      const req = makeDefaultRequest();
      const result = generateVoicings(req);
      for (const voicing of result) {
        const fretted = voicing.frets.filter((f): f is number => f !== null && f > 0);
        if (fretted.length === 0) {
          if (voicing.ergonomicScore !== 0) {
            throw new Error(`Expected ergonomicScore 0 for all-open/muted voicing, got ${voicing.ergonomicScore}`);
          }
        }
      }
    }
  },
  {
    name: 'T2_V1: Voicing Gen - Bb5 power chord has exactly 2 pitch classes',
    fn: () => {
      const req = makeDefaultRequest();
      req.chord = 'Bb5';
      req.rootNote = 'Bb';
      const result = generateVoicings(req);
      for (const voicing of result) {
        const pcs = new Set<number>();
        voicing.frets.forEach((f, idx) => {
          if (f !== null) {
            pcs.add((parseNoteToMidi(req.guitarConfig.tuning[idx]) + f) % 12);
          }
        });
        if (pcs.size > 2) {
          throw new Error('Expected at most 2 distinct pitch classes for power chord');
        }
      }
    }
  },
  {
    name: 'T2_V2: Voicing Gen - Strict parameters return empty list',
    fn: () => {
      const req = makeDefaultRequest();
      req.chord = 'Cmaj7';
      req.guitarConfig.numFrets = 0;
      req.guitarConfig.tuning = ['F#2', 'F#2', 'F#2', 'F#2', 'F#2', 'F#2'];
      const result = generateVoicings(req);
      if (result.length !== 0) {
        throw new Error(`Expected 0 voicings under extremely strict conditions, got ${result.length}`);
      }
    }
  },
  {
    name: 'T2_V3: Voicing Gen - parseNoteToMidi with negative octave',
    fn: () => {
      const midi = parseNoteToMidi('E-1');
      if (midi !== 4) {
        throw new Error(`Expected E-1 to be MIDI 4, got ${midi}`);
      }
    }
  },
  {
    name: 'T2_V4: Voicing Gen - Throwing on undefined chord',
    fn: () => {
      const req = makeDefaultRequest();
      (req as any).chord = undefined;
      let threw = false;
      try {
        generateVoicings(req);
      } catch (e) {
        threw = true;
      }
      if (!threw) {
        throw new Error('Expected undefined chord to throw error');
      }
    }
  },
  {
    name: 'T2_V5: Voicing Gen - Case-insensitivity in chord parsing',
    fn: () => {
      const req = makeDefaultRequest();
      req.chord = 'cMAj7';
      const result = generateVoicings(req);
      if (result.length === 0) {
        throw new Error('Expected to match case-insensitive maj7 suffix');
      }
    }
  },
  {
    name: 'T2_S1: Style Preset - Worship score with no fretted notes (only open strings)',
    fn: () => {
      const req = makeDefaultRequest();
      req.stylePreset = 'worship';
      const result = generateVoicings(req);
      for (const voicing of result) {
        const fretted = voicing.frets.filter((f): f is number => f !== null && f > 0);
        if (fretted.length === 0) {
          if (voicing.styleScore !== 10) {
            throw new Error(`Expected Worship styleScore 10 for all open/muted strings, got ${voicing.styleScore}`);
          }
        }
      }
    }
  },
  {
    name: 'T2_S2: Style Preset - JRock score with no fretted notes',
    fn: () => {
      const req = makeDefaultRequest();
      req.stylePreset = 'jrock';
      const result = generateVoicings(req);
      for (const voicing of result) {
        const fretted = voicing.frets.filter((f): f is number => f !== null && f > 0);
        if (fretted.length === 0) {
          if (voicing.styleScore !== 0) {
            throw new Error(`Expected JRock styleScore 0 for all open/muted strings, got ${voicing.styleScore}`);
          }
        }
      }
    }
  },
  {
    name: 'T2_S3: Style Preset - Mathrock score with no open strings and no high frets',
    fn: () => {
      const req = makeDefaultRequest();
      req.stylePreset = 'mathrock';
      const result = generateVoicings(req);
      for (const voicing of result) {
        const hasOpen = voicing.frets.some(f => f === 0);
        const hasHigh = voicing.frets.some(f => f !== null && f >= 7);
        if (!hasOpen && !hasHigh) {
          if (voicing.styleScore < 0 || voicing.styleScore > 10) {
            throw new Error(`Expected bounded Mathrock styleScore, got ${voicing.styleScore}`);
          }
        }
      }
    }
  },
  {
    name: 'T2_S4: Style Preset - Metalcore score with empty lowest strings',
    fn: () => {
      const req = makeDefaultRequest();
      req.stylePreset = 'metalcore';
      const result = generateVoicings(req);
      for (const voicing of result) {
        const f0 = voicing.frets[0];
        if (f0 === null) {
          if (voicing.styleScore < 0 || voicing.styleScore > 10) {
            throw new Error(`Expected bounded Metalcore styleScore, got ${voicing.styleScore}`);
          }
        }
      }
    }
  },
  {
    name: 'T2_S5: Style Preset - Scores must always be in [0, 10]',
    fn: () => {
      const presets = ['worship', 'jrock', 'mathrock', 'metalcore'] as const;
      for (const preset of presets) {
        const req = makeDefaultRequest();
        req.stylePreset = preset;
        const result = generateVoicings(req);
        for (const voicing of result) {
          if (voicing.styleScore < 0 || voicing.styleScore > 10) {
            throw new Error(`Expected styleScore in [0, 10] for ${preset}, got ${voicing.styleScore}`);
          }
        }
      }
    }
  },
  {
    name: 'T2_U1: Fretboard UI - Render with selectedVoicing null',
    fn: () => {
      const req = makeDefaultRequest();
      const html = renderToString(React.createElement(FretboardApp, {
        guitarConfig: req.guitarConfig,
        selectedVoicing: null
      }));
      if (html.includes('class="note-marker-muted"') || html.includes('class="note-marker-open"') || html.includes('class="note-marker-fretted"')) {
        throw new Error('Fretboard with null voicing should not render note markers');
      }
    }
  },
  {
    name: 'T2_U2: Fretboard UI - Render with 1 String and 1 Fret',
    fn: () => {
      const config = {
        numStrings: 1,
        numFrets: 1,
        tuning: ['E2']
      };
      const html = renderToString(React.createElement(FretboardApp, {
        guitarConfig: config
      }));
      const stringLines = html.match(/class="string-line"/g);
      const fretLines = html.match(/class="fret-line"/g);
      if (!stringLines || stringLines.length !== 1) {
        throw new Error(`Expected 1 string line, got ${stringLines ? stringLines.length : 0}`);
      }
      if (!fretLines || fretLines.length !== 2) {
        throw new Error(`Expected 2 fret lines (fret 0 and fret 1), got ${fretLines ? fretLines.length : 0}`);
      }
    }
  },
  {
    name: 'T2_U3: Fretboard UI - Render with voicing having all muted strings',
    fn: () => {
      const req = makeDefaultRequest();
      const voicing = {
        frets: [null, null, null, null, null, null],
        fingers: [null, null, null, null, null, null],
        ergonomicScore: 0,
        styleScore: 5,
        playabilityScore: 100
      };
      const html = renderToString(React.createElement(FretboardApp, {
        guitarConfig: req.guitarConfig,
        selectedVoicing: voicing
      }));
      const mutedMatches = html.match(/class="note-marker-muted"/g);
      if (!mutedMatches || mutedMatches.length !== 6) {
        throw new Error(`Expected 6 muted markers, got ${mutedMatches ? mutedMatches.length : 0}`);
      }
    }
  },
  {
    name: 'T2_U4: Fretboard UI - Render with voicing having all open strings',
    fn: () => {
      const req = makeDefaultRequest();
      const voicing = {
        frets: [0, 0, 0, 0, 0, 0],
        fingers: [null, null, null, null, null, null],
        ergonomicScore: 0,
        styleScore: 5,
        playabilityScore: 100
      };
      const html = renderToString(React.createElement(FretboardApp, {
        guitarConfig: req.guitarConfig,
        selectedVoicing: voicing
      }));
      const openMatches = html.match(/class="note-marker-open"/g);
      if (!openMatches || openMatches.length !== 6) {
        throw new Error(`Expected 6 open markers, got ${openMatches ? openMatches.length : 0}`);
      }
    }
  },
  {
    name: 'T2_U5: Fretboard UI - Render with voicing having all fretted notes',
    fn: () => {
      const req = makeDefaultRequest();
      const voicing = {
        frets: [1, 2, 3, 4, 3, 2],
        fingers: [1, 2, 3, 4, 3, 2],
        ergonomicScore: 15,
        styleScore: 5,
        playabilityScore: 100
      };
      const html = renderToString(React.createElement(FretboardApp, {
        guitarConfig: req.guitarConfig,
        selectedVoicing: voicing
      }));
      const frettedMatches = html.match(/class="note-marker-fretted"/g);
      if (!frettedMatches || frettedMatches.length !== 6) {
        throw new Error(`Expected 6 fretted markers, got ${frettedMatches ? frettedMatches.length : 0}`);
      }
    }
  }
];
