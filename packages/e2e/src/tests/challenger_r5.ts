import React from 'react';
import { renderToString } from 'react-dom/server';
import { compareVoicings, generateVoicings, generateVoicingsDetailed, parseNoteToMidi, VoicingRequest } from '@guitar-paradigm/core';
import { FretboardVisualizer } from '@guitar-paradigm/web';

export const challengerR5Tests = [
  {
    name: 'CHALLENGE_R5_1: Extreme Hand Span Performance and Memory Stress',
    fn: () => {
      // Extremely large maxSpan shouldn't cause infinite loops or process hangs.
      // However, it will not prune the backtracking search space, which could lead to high execution times.
      // We will measure time and check if it completes within a reasonable limit (e.g. 5 seconds)
      // or check the number of generated voicings.
      const startTime = Date.now();
      const result = generateVoicings({
        chord: 'Cmaj7',
        rootNote: 'C',
        stylePreset: 'worship',
        fingerConstraints: {
          indexLength: 7.5,
          middleLength: 8.0,
          ringLength: 7.8,
          pinkyLength: 6.2,
          maxSpan: 100, // extremely large hand span
          tendonMuting: false
        },
        guitarConfig: {
          numStrings: 6,
          numFrets: 12, // Keep frets moderate to prevent absolute timeout, but span wide
          tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
        }
      });
      const duration = Date.now() - startTime;
      console.log(`[CHALLENGE_R5_1] Large span generated ${result.length} voicings in ${duration}ms`);
      if (duration > 5000) {
        throw new Error(`Performance cliff: generateVoicings took too long (${duration}ms) with large maxSpan`);
      }
    }
  },
  {
    name: 'CHALLENGE_R5_2: Extreme Tuning Notes and Invalid Formats',
    fn: () => {
      // Test extreme octave numbers in tuning notes
      const notesToTest = ['C-10', 'G15', 'A999999'];
      for (const note of notesToTest) {
        const midi = parseNoteToMidi(note);
        if (isNaN(midi) || !isFinite(midi)) {
          throw new Error(`Extreme note ${note} parsed to non-finite MIDI value: ${midi}`);
        }
      }

      // Check if extremely large octave throws or handles safely without infinite loop
      try {
        parseNoteToMidi('C999999999999999999999999999999');
      } catch (e: any) {
        // Safe if throws error
      }
    }
  },
  {
    name: 'CHALLENGE_R5_3: 0-Fret Guitars',
    fn: () => {
      // Guitars with 0 frets should run without error, producing only open/muted combinations
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
          numFrets: 0,
          tuning: ['C2', 'E2', 'G2', 'C3', 'E3', 'G3']
        }
      });

      for (const v of voicings) {
        for (const fret of v.frets) {
          if (fret !== null && fret !== 0) {
            throw new Error(`0-fret guitar voicing contains non-zero fret: ${fret}`);
          }
        }
      }
    }
  },
  {
    name: 'CHALLENGE_R5_4: Stress Test Sorting Engine under Large Number of Generated Chords',
    fn: () => {
      // Generate a huge list of chord voicings to stress-test sorting
      const result = generateVoicingsDetailed({
        chord: 'Cmaj7',
        rootNote: 'C',
        stylePreset: 'mathrock', // Mathrock has complex scoring
        fingerConstraints: {
          indexLength: 7.5,
          middleLength: 8.0,
          ringLength: 7.8,
          pinkyLength: 6.2,
          maxSpan: 8, // wide span allows more combinations
          tendonMuting: false
        },
        guitarConfig: {
          numStrings: 6,
          numFrets: 15,
          tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
        },
        searchBudget: 5_000,
        maxResults: 120
      });

      console.log(`[CHALLENGE_R5_4] Stress-test evaluated ${result.evaluatedLeaves} leaves and ranked ${result.voicings.length} voicings`);
      for (let i = 0; i < result.voicings.length - 1; i++) {
        if (compareVoicings(result.voicings[i], result.voicings[i + 1]) > 0) {
          throw new Error(`Overall-fit sorting failure at index ${i}`);
        }
      }
    }
  },
  {
    name: 'CHALLENGE_R5_5: Tie-breaker Logic for Clamped Playability Scores',
    fn: () => {
      // Verify the requirement: "Verify that it sorts by ergonomicScore ascending, then styleScore descending."
      // Let's inspect the actual sort results for playability scores clamped to 0.
      // To get clamped playability scores (0), we need ergonomicScore >= 100.
      // We will generate voicings with large fret values to trigger high ergonomicScore.
      const result = generateVoicings({
        chord: 'Cmaj7',
        rootNote: 'C',
        stylePreset: 'mathrock', // Use mathrock to generate different styleScores at playability=0
        fingerConstraints: {
          indexLength: 7.5,
          middleLength: 8.0,
          ringLength: 7.8,
          pinkyLength: 6.2,
          maxSpan: 6,
          tendonMuting: false
        },
        guitarConfig: {
          numStrings: 6,
          numFrets: 24,
          tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
        }
      });

      // Filter voicings with playabilityScore === 0
      const clampedVoicings = result.filter(v => v.playabilityScore === 0);
      console.log(`[CHALLENGE_R5_5] Found ${clampedVoicings.length} voicings with playabilityScore clamped to 0`);

      if (clampedVoicings.length < 2) {
        console.log('[CHALLENGE_R5_5] Warning: Not enough clamped voicings to verify sorting. Skipping.');
        return;
      }

      // Check sorting order of the clamped voicings
      for (let i = 0; i < clampedVoicings.length - 1; i++) {
        const current = clampedVoicings[i];
        const next = clampedVoicings[i + 1];

        // According to the requirement: "sorts by ergonomicScore ascending, then styleScore descending."
        // That means if current.ergonomicScore !== next.ergonomicScore, then current.ergonomicScore must be < next.ergonomicScore.
        // Let's verify if this holds true.
        if (current.ergonomicScore > next.ergonomicScore) {
          throw new Error(
            `Bug: Clamped voicing sorting order violated. Voicing at index ${i} has ergonomicScore ${current.ergonomicScore} > next ergonomicScore ${next.ergonomicScore}. Code is sorting by styleScore first!`
          );
        } else if (current.ergonomicScore === next.ergonomicScore) {
          if (current.styleScore < next.styleScore) {
            throw new Error(
              `Bug: Clamped voicing sorting order violated. Equal ergonomicScore, but styleScore not descending. Current style: ${current.styleScore}, next: ${next.styleScore}`
            );
          }
        }
      }
    }
  },
  {
    name: 'CHALLENGE_R5_6: Division by Zero or NaN Errors in UI Rendering',
    fn: () => {
      // Test rendering FretboardVisualizer with extreme configs that might lead to NaN or division by zero.
      // Case A: numFrets = 0, with a voicing containing a note marker at fret > 0 (to trigger getNoteX on non-zero fret)
      try {
        renderToString(React.createElement(FretboardVisualizer, {
          config: {
            numStrings: 6,
            numFrets: 0,
            tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
          },
          voicing: {
            frets: [1, null, null, null, null, null],
            fingers: [1, null, null, null, null, null],
            ergonomicScore: 1,
            styleScore: 0,
            playabilityScore: 99
          },
          preset: 'worship'
        }));
      } catch (e: any) {
        throw new Error(`Bug: Rendering crashed when numFrets is 0 and voicing contains fret > 0: ${e.message}`);
      }

      // Verify that the generated HTML does not contain "NaN" or "Infinity"
      const htmlWithFretZero = renderToString(React.createElement(FretboardVisualizer, {
        config: {
          numStrings: 6,
          numFrets: 0,
          tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
        },
        voicing: {
          frets: [1, null, null, null, null, null],
          fingers: [1, null, null, null, null, null],
          ergonomicScore: 1,
          styleScore: 0,
          playabilityScore: 99
        },
        preset: 'worship'
      }));

      if (htmlWithFretZero.includes('NaN')) {
        throw new Error('Bug: FretboardVisualizer HTML contains NaN attributes when numFrets is 0 and voicing has fret > 0');
      }

      if (htmlWithFretZero.includes('Infinity')) {
        throw new Error('Bug: FretboardVisualizer HTML contains Infinity attributes when numFrets is 0 and voicing has fret > 0');
      }
    }
  }
];
