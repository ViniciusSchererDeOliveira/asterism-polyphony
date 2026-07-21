import React from 'react';
import { renderToString } from 'react-dom/server';
import { generateVoicings } from '@guitar-paradigm/core';
import { FretboardVisualizer } from '@guitar-paradigm/web';

export const testNegativePitchBug = {
  name: 'REGRESSION_ADV_1: negative-octave pitch congruency',
  fn: () => {
    const voicings = generateVoicings({
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
        numFrets: 12,
        tuning: ['E-2', 'A2', 'D3', 'G3', 'B3', 'E4']
      }
    });

    const playsOpenLowE = voicings.some(v => v.frets[0] === 0);
    if (!playsOpenLowE) {
      throw new Error('Bug: Open E-2 (fret 0) was not included in any Cmaj7 voicing');
    }
  }
};

export const testNegativeStringsCrash = {
  name: 'REGRESSION_ADV_2: invalid string count reports a domain error',
  fn: () => {
    try {
      generateVoicings({
        chord: 'Cmaj7',
        rootNote: 'C',
        stylePreset: 'worship',
        fingerConstraints: {
          indexLength: 7.5, middleLength: 8.0, ringLength: 7.8, pinkyLength: 6.2, maxSpan: 4, tendonMuting: false
        },
        guitarConfig: {
          numStrings: -1,
          numFrets: 12,
          tuning: []
        }
      });
      throw new Error('Expected generateVoicings to throw validation error');
    } catch (e: any) {
      if (e instanceof RangeError) {
        throw new Error('Bug: unhandled RangeError crash instead of a clean validation error');
      }
    }
  }
};

export const testSingleStringRenderingNaN = {
  name: 'REGRESSION_ADV_3: single-string SSR emits finite coordinates',
  fn: () => {
    const html = renderToString(React.createElement(FretboardVisualizer, {
      config: {
        numStrings: 1,
        numFrets: 12,
        tuning: ['E2']
      },
      voicing: null,
      preset: 'worship',
      rootNote: 'E'
    }));

    if (html.includes('NaN')) {
      throw new Error('Bug: FretboardVisualizer HTML contains NaN attributes');
    }
  }
};

export const testUIChordSuffixDiscrepancy = {
  name: 'REGRESSION_ADV_4: UI chord vocabulary is accepted by core',
  fn: () => {
    const unsupportedSuffixes = ['', 'm', 'sus4', 'sus2', 'dim'];
    for (const suffix of unsupportedSuffixes) {
      try {
        generateVoicings({
          chord: `C${suffix}`,
          rootNote: 'C',
          stylePreset: 'worship',
          fingerConstraints: {
            indexLength: 7.5, middleLength: 8.0, ringLength: 7.8, pinkyLength: 6.2, maxSpan: 4, tendonMuting: false
          },
          guitarConfig: {
            numStrings: 6,
            numFrets: 12,
            tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
          }
        });
      } catch (e: any) {
        throw new Error(`Bug: Suffix "${suffix}" selected in UI throws error in core: ${e.message}`);
      }
    }
  }
};

export const testPhysicallyImpossibleFingering = {
  name: 'REGRESSION_ADV_5: one finger never owns multiple frets',
  fn: () => {
    const voicings = generateVoicings({
      chord: 'Cmaj7',
      rootNote: 'C',
      stylePreset: 'worship',
      fingerConstraints: {
        indexLength: 7.5,
        middleLength: 8.0,
        ringLength: 7.8,
        pinkyLength: 6.2,
        maxSpan: 8,
        tendonMuting: false
      },
      guitarConfig: {
        numStrings: 6,
        numFrets: 12,
        tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
      }
    });

    for (const voicing of voicings) {
      const fingers = voicing.fingers;
      const frets = voicing.frets;
      const fingerToFret: Record<number, number> = {};
      
      for (let s = 0; s < fingers.length; s++) {
        const finger = fingers[s];
        const fret = frets[s];
        if (finger !== null && fret !== null && fret > 0) {
          if (fingerToFret[finger] !== undefined && fingerToFret[finger] !== fret) {
            throw new Error(`Bug: Finger ${finger} assigned to different frets ${fingerToFret[finger]} and ${fret} simultaneously`);
          }
          fingerToFret[finger] = fret;
        }
      }
    }
  }
};

export const adversarialTests = [
  testNegativePitchBug,
  testNegativeStringsCrash,
  testSingleStringRenderingNaN,
  testUIChordSuffixDiscrepancy,
  testPhysicallyImpossibleFingering
];
