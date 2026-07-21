import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeVoicing,
  analyzePhysicalSpan,
  canonicalShapeId,
  computeFrequencyScore,
  computeTransitionMetrics,
  fretDistanceFromNutMm,
  generateVoicings,
  generateVoicingsDetailed,
  GRG121SP_GEOMETRY,
  getDiatonicPcs,
  getPitchClass,
  parseNoteToMidi,
  RANKING_POLICY_VERSION,
  SOLVER_VERSION,
  stableRequestHash,
  STYLE_POLICY_VERSION,
  validateVoicingRequest,
  type VoicingRequest
} from './index.js';

const makeRequest = (overrides: Partial<VoicingRequest> = {}): VoicingRequest => ({
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
  },
  ...overrides
});

describe('core computational engine', () => {
  it('parses notes and pitch classes', () => {
    assert.equal(parseNoteToMidi('C4'), 60);
    assert.equal(parseNoteToMidi('A4'), 69);
    assert.equal(getPitchClass('Bb'), 10);
    assert.throws(() => parseNoteToMidi('H4'), /Invalid note format/);
  });

  it('derives major and minor diatonic pitch classes', () => {
    assert.deepEqual([...getDiatonicPcs('C major')!], [0, 2, 4, 5, 7, 9, 11]);
    assert.deepEqual([...getDiatonicPcs('A minor')!], [9, 11, 0, 2, 4, 5, 7]);
    assert.equal(getDiatonicPcs(), null);
  });

  it('generates ordered voicings within the configured physical limits', () => {
    const result = generateVoicings(makeRequest());
    assert.ok(result.length > 0);

    for (let index = 0; index < result.length; index++) {
      const voicing = result[index];
      assert.equal(voicing.frets.length, 6);
      assert.equal(voicing.playabilityScore, Math.max(0, Math.min(100, 100 - voicing.ergonomicScore)));
      assert.ok(voicing.frets.every(fret => fret === null || fret <= 12));
      assert.ok(voicing.frequencyScore !== undefined);
      assert.ok(voicing.barrePenalty !== undefined);

      if (index > 0) {
        assert.ok((result[index - 1].overallScore ?? 0) >= (voicing.overallScore ?? 0));
      }
    }
  });

  it('rejects invalid requests', () => {
    assert.throws(
      () => generateVoicings(makeRequest({ guitarConfig: { numStrings: 0, numFrets: 12, tuning: [] } })),
      /Number of strings/
    );
    assert.throws(() => generateVoicings(makeRequest({ chord: 'Cfoobar' })), /Unsupported chord suffix/);
  });

  it('validates request boundaries with field-specific errors', () => {
    const cases: Array<{
      label: string;
      request: VoicingRequest;
      error: RegExp;
    }> = [
      {
        label: 'fret count',
        request: makeRequest({
          guitarConfig: { ...makeRequest().guitarConfig, numFrets: -1 }
        }),
        error: /guitarConfig\.numFrets/
      },
      {
        label: 'tuning cardinality',
        request: makeRequest({
          guitarConfig: { ...makeRequest().guitarConfig, tuning: ['E2'] }
        }),
        error: /one note per string/
      },
      {
        label: 'tuning syntax',
        request: makeRequest({
          guitarConfig: {
            ...makeRequest().guitarConfig,
            tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'H4']
          }
        }),
        error: /tuning\[5\].*invalid note/
      },
      {
        label: 'search budget',
        request: makeRequest({ searchBudget: 0 }),
        error: /searchBudget.*positive integer/
      },
      {
        label: 'result limit',
        request: makeRequest({ maxResults: 1.5 }),
        error: /maxResults.*positive integer/
      },
      {
        label: 'search radius',
        request: makeRequest({ searchRadiusFrets: -1 }),
        error: /searchRadiusFrets.*non-negative/
      },
      {
        label: 'gravity center',
        request: makeRequest({ gravityCenter: 13 }),
        error: /gravityCenter.*fretboard/
      },
      {
        label: 'finger length',
        request: makeRequest({
          fingerConstraints: { ...makeRequest().fingerConstraints, pinkyLength: Number.NaN }
        }),
        error: /fingerConstraints\.pinkyLength.*finite/
      },
      {
        label: 'span',
        request: makeRequest({
          fingerConstraints: { ...makeRequest().fingerConstraints, maxSpan: -1 }
        }),
        error: /fingerConstraints\.maxSpan.*non-negative integer/
      },
      {
        label: 'physical geometry',
        request: makeRequest({
          guitarConfig: { ...makeRequest().guitarConfig, scaleLengthMm: 0 }
        }),
        error: /guitarConfig\.scaleLengthMm.*greater than 0/
      },
      {
        label: 'clarity',
        request: makeRequest({ policy: { minimumClarity: 101 } }),
        error: /minimumClarity.*between 0 and 100/
      },
      {
        label: 'preference weight',
        request: makeRequest({
          preferenceProfile: { enabled: true, weights: { transition: -1 } }
        }),
        error: /weights\.transition.*non-negative/
      }
    ];

    for (const testCase of cases) {
      assert.throws(
        () => validateVoicingRequest(testCase.request),
        testCase.error,
        testCase.label
      );
    }
    assert.doesNotThrow(() => validateVoicingRequest(makeRequest()));
  });

  it('reports bounded-search diagnostics without changing the legacy API', () => {
    const request = makeRequest({ searchBudget: 25, maxResults: 10 });
    const detailed = generateVoicingsDetailed(request);

    assert.equal(detailed.searchBudget, 25);
    assert.equal(detailed.evaluatedLeaves, 25);
    assert.equal(detailed.searchStrategy, 'bounded-dfs');
    assert.equal(detailed.searchExhausted, false);
    assert.equal(detailed.budgetReached, true);
    assert.ok(detailed.candidateCount >= detailed.voicings.length);
    assert.equal(detailed.truncated, true);
    assert.equal(detailed.provenance.solverVersion, SOLVER_VERSION);
    assert.equal(detailed.provenance.policies.rankingVersion, RANKING_POLICY_VERSION);
    assert.equal(detailed.provenance.policies.styleVersion, STYLE_POLICY_VERSION);
    assert.equal(detailed.provenance.requestHash, stableRequestHash(request));
    assert.equal(detailed.provenance.search.budget, 25);
    assert.equal(detailed.provenance.search.maximumResults, 10);
    const rejectedByGates = Object.values(detailed.gateDiagnostics.rejected)
      .reduce((sum, count) => sum + count, 0);
    assert.equal(rejectedByGates + detailed.gateDiagnostics.accepted, detailed.evaluatedLeaves);
    assert.equal(detailed.gateDiagnostics.accepted, detailed.candidateCount);
    assert.deepEqual(detailed.voicings, generateVoicings(request));
  });

  it('hashes equivalent requests canonically and explains the current score exactly', () => {
    const request = makeRequest({
      preferenceProfile: { enabled: true },
      searchBudget: 2_000,
      maxResults: 5
    });
    const reordered: VoicingRequest = {
      rootNote: request.rootNote,
      chord: request.chord,
      fingerConstraints: { ...request.fingerConstraints },
      guitarConfig: {
        tuning: [...request.guitarConfig.tuning],
        numFrets: request.guitarConfig.numFrets,
        numStrings: request.guitarConfig.numStrings
      },
      stylePreset: request.stylePreset,
      preferenceProfile: { enabled: true },
      maxResults: 5,
      searchBudget: 2_000
    };

    assert.equal(stableRequestHash(request), stableRequestHash(reordered));
    const result = generateVoicingsDetailed(request);
    const voicing = result.voicings[0];
    assert.ok(voicing?.scoreBreakdown);
    const breakdown = voicing.scoreBreakdown;
    const contributionTotal = Object.values(breakdown.components)
      .reduce((sum, component) => sum + component.contribution, 0);
    assert.ok(Math.abs(contributionTotal - breakdown.baseScore) < 1e-10);
    assert.equal(breakdown.totalScore, voicing.overallScore);
    assert.equal(breakdown.policyVersion, RANKING_POLICY_VERSION);
  });

  it('distinguishes an exhausted search from a truncated search', () => {
    const request = makeRequest({
      chord: 'C',
      rootNote: 'C',
      mode: 'traditional',
      searchBudget: 100,
      guitarConfig: {
        numStrings: 2,
        numFrets: 1,
        tuning: ['C4', 'E4']
      }
    });
    const detailed = generateVoicingsDetailed(request);

    assert.ok(detailed.evaluatedLeaves < detailed.searchBudget);
    assert.equal(detailed.searchExhausted, true);
    assert.equal(detailed.budgetReached, false);
    assert.equal(detailed.truncated, false);
  });

  it('enforces the maximum fret span', () => {
    const request = makeRequest({
      fingerConstraints: {
        ...makeRequest().fingerConstraints,
        maxSpan: 2
      }
    });

    for (const voicing of generateVoicings(request)) {
      const fretted = voicing.frets.filter((fret): fret is number => fret !== null && fret > 0);
      if (fretted.length > 0) {
        assert.ok(Math.max(...fretted) - Math.min(...fretted) <= 2);
      }
    }
  });

  it('exposes barre cost as a diagnostic metric', () => {
    const request = makeRequest({
      chord: 'C6',
      guitarConfig: {
        numStrings: 6,
        numFrets: 12,
        tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
      }
    });
    const result = generateVoicings(request);
    const barre = result.find(voicing => voicing.frets.filter(fret => fret === 5).length >= 3);

    assert.ok(barre);
    assert.ok(barre.barrePenalty !== undefined);
    assert.ok(barre.barrePenalty >= 0);
  });

  it('analyzes voicings using the contract consumed by the web app', () => {
    const request = makeRequest();
    const analysis = analyzeVoicing({
      frets: [null, 3, 2, 0, 0, 0],
      fingers: [null, 2, 1, null, null, null],
      ergonomicScore: 10,
      styleScore: 10,
      playabilityScore: 90
    }, request);

    assert.equal(analysis.chordType, 'Full Voicing');
    const root = analysis.noteRoles.find(note => note.stringIdx === 1);
    assert.ok(root);
    assert.equal(root.note, 'C');
    assert.equal(root.role, 'Root');
    assert.equal(root.fret, 3);
    assert.ok(analysis.flags.some(flag => flag.label === 'High playability'));
  });

  it('keeps frequency scoring bounded', () => {
    assert.equal(computeFrequencyScore([], 0, [0, 4, 7]), 100);
    const score = computeFrequencyScore([40, 44, 47, 52], 0, [0, 4, 7], false);
    assert.ok(score >= 0 && score <= 100);
  });

  it('requires the defining tones of extended chords', () => {
    const request = makeRequest({
      guitarConfig: {
        numStrings: 6,
        numFrets: 12,
        tuning: ['E2', 'A2', 'D3', 'G3', 'C4', 'F4']
      }
    });
    const required = new Set([0, 4, 11]);
    for (const voicing of generateVoicings(request)) {
      const pitchClasses = new Set(voicing.frets.flatMap((fret, stringIndex) =>
        fret === null ? [] : [(parseNoteToMidi(request.guitarConfig.tuning[stringIndex]) + fret) % 12]
      ));
      for (const pitchClass of required) assert.ok(pitchClasses.has(pitchClass));
    }
  });

  it('allows rootless defining-tone voicings when bass covers the root', () => {
    const request = makeRequest({
      ensemble: ['bass'],
      guitarConfig: {
        numStrings: 6,
        numFrets: 12,
        tuning: ['E2', 'A2', 'D3', 'G3', 'C4', 'F4']
      }
    });
    const result = generateVoicings(request);
    assert.ok(result.some(voicing => analyzeVoicing(voicing, request).chordType === 'Rootless Voicing'));
  });

  it('requires complete traditional triads in general mode', () => {
    const request = makeRequest({ chord: 'C', mode: 'traditional' });
    for (const voicing of generateVoicings(request)) {
      const pitchClasses = new Set(voicing.frets.flatMap((fret, stringIndex) =>
        fret === null ? [] : [(parseNoteToMidi(request.guitarConfig.tuning[stringIndex]) + fret) % 12]
      ));
      assert.deepEqual([...pitchClasses].sort((a, b) => a - b), [0, 4, 7]);
    }
  });

  it('keeps style voicings exact by default in all-fourths tuning', () => {
    const request = makeRequest({
      chord: 'C',
      rootNote: 'C',
      globalKey: 'C Major',
      guitarConfig: {
        numStrings: 6,
        numFrets: 24,
        tuning: ['E2', 'A2', 'D3', 'G3', 'C4', 'F4']
      },
      policy: {
        allowExtensions: false,
        allowRootlessWithBass: false,
        acousticProfile: 'clean',
        minimumClarity: 55
      },
      maxResults: 40
    });
    const results = generateVoicings(request);
    assert.ok(results.length > 0);
    for (const voicing of results) {
      const pitchClasses = new Set(voicing.frets.flatMap((fret, stringIndex) =>
        fret === null ? [] : [(parseNoteToMidi(request.guitarConfig.tuning[stringIndex]) + fret) % 12]
      ));
      assert.ok([...pitchClasses].every(pitchClass => [0, 4, 7].includes(pitchClass)));
      assert.equal(voicing.exactChord, true);
      assert.equal(voicing.actualChordSymbol, 'C');
      assert.ok((voicing.frequencyScore ?? 0) >= 55);
      assert.ok((voicing.reachUtilization ?? 2) <= 1);
      assert.ok((voicing.stringSkipCount ?? 2) <= 1);
      for (const barre of voicing.barres ?? []) {
        for (let stringIndex = barre.fromString; stringIndex <= barre.toString; stringIndex++) {
          assert.notEqual(voicing.frets[stringIndex], null);
        }
      }
    }
  });

  it('only emits and labels tensions when explicitly enabled', () => {
    const request = makeRequest({
      chord: 'C',
      rootNote: 'C',
      globalKey: 'C Major',
      guitarConfig: {
        numStrings: 6,
        numFrets: 24,
        tuning: ['E2', 'A2', 'D3', 'G3', 'C4', 'F4']
      },
      policy: {
        allowExtensions: true,
        allowRootlessWithBass: false,
        acousticProfile: 'clean',
        minimumClarity: 35
      },
      maxResults: 120
    });
    const extended = generateVoicings(request).find(voicing => voicing.exactChord === false);
    assert.ok(extended);
    assert.notEqual(extended.actualChordSymbol, 'C');
    assert.ok((extended.droneIntervals?.length ?? 0) > 0);
  });

  it('requires the guitar root when rootless band shapes are disabled', () => {
    const request = makeRequest({
      ensemble: ['bass'],
      policy: { allowRootlessWithBass: false },
      guitarConfig: {
        numStrings: 6,
        numFrets: 12,
        tuning: ['E2', 'A2', 'D3', 'G3', 'C4', 'F4']
      }
    });
    for (const voicing of generateVoicings(request)) {
      const pitchClasses = new Set(voicing.frets.flatMap((fret, stringIndex) =>
        fret === null ? [] : [(parseNoteToMidi(request.guitarConfig.tuning[stringIndex]) + fret) % 12]
      ));
      assert.ok(pitchClasses.has(0));
    }
  });

  it('models the GRG121SP fret geometry', () => {
    assert.equal(fretDistanceFromNutMm(12), 324);
    const low = analyzePhysicalSpan([1, 5, null, null, null, null]);
    const high = analyzePhysicalSpan([12, 16, null, null, null, null]);
    assert.ok(high.longitudinalMm < low.longitudinalMm);
    assert.equal(canonicalShapeId([null, 5, 7, 7, null, null]), canonicalShapeId([null, 10, 12, 12, null, null]));
    assert.equal(GRG121SP_GEOMETRY.scaleLengthMm, 648);
  });

  it('recognizes pivot fingers and hand-center movement', () => {
    const metrics = computeTransitionMetrics(
      [null, 3, 2, 0, 0, 0],
      [null, 3, 3, 2, 1, 0]
    );
    assert.equal(metrics.pivotCount, 1);
    assert.deepEqual(metrics.pivotStrings, [1]);
    assert.ok(metrics.centerShiftMm >= 0);
  });

  it('applies optional shape calibration only when enabled', () => {
    const request = makeRequest({ maxResults: 20 });
    const baseline = generateVoicings(request);
    const target = baseline.at(-1)!;
    const calibrated = generateVoicings({
      ...request,
      preferenceProfile: {
        enabled: true,
        preferredShapeIds: [target.shapeId!]
      }
    });
    const preferred = calibrated.find(voicing => voicing.shapeId === target.shapeId);
    assert.ok(preferred);
    assert.ok((preferred.overallScore ?? 0) >= (target.overallScore ?? 0));
  });

  it('uses measured finger lengths to scale physical reach', () => {
    const base = makeRequest({ maxResults: 30 });
    const normal = generateVoicings(base);
    const target = normal.find(voicing => voicing.physicalSpanMm && voicing.physicalSpanMm > 0)!;
    const smallHand = generateVoicings({
      ...base,
      fingerConstraints: {
        ...base.fingerConstraints,
        indexLength: 5.5,
        middleLength: 6,
        ringLength: 5.5,
        pinkyLength: 4.5
      }
    }).find(voicing => voicing.frets.join(',') === target.frets.join(','));
    assert.ok(smallHand);
    assert.ok(smallHand.playabilityScore <= target.playabilityScore);
  });
});
