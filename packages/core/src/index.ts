import {
  CHORD_DEFINITIONS,
  getIntervalRoleLabel,
  noteNameToPitchClass,
  parseChord,
  validateChordPitchClasses,
} from './music.js';
import {
  GRG121SP_GEOMETRY,
  canonicalShapeId,
  solveFingering,
  type FretboardGeometry
} from './geometry.js';
import {
  analyzeMidiSpectralClarity,
  type SpectralClarityAnalysis
} from './acoustics.js';
import { assessStyleFit } from './style.js';
import type {
  ChordVoicing,
  GateDiagnostics,
  GuitarConfig,
  NoteRoleDetail,
  VoicingAnalysis,
  VoicingRequest,
  VoicingSearchResult
} from './contracts.js';
import { validateVoicingRequest } from './validation.js';
import { rankVoicings } from './ranking.js';
import {
  resolveEffectiveRankingWeights,
  resolveHarmonicContext,
  resolveRequestContext,
  resolveTensionPolicy,
  resolveVoicingPolicy
} from './policy.js';
import { createSolverProvenance } from './provenance.js';
import { evaluateCandidate, type EvaluatedCandidate } from './evaluation.js';

export * from './music.js';
export * from './geometry.js';
export * from './acoustics.js';
export * from './style.js';
export * from './movement.js';
export * from './contracts.js';
export * from './ranking.js';
export * from './validation.js';
export * from './policy.js';
export * from './provenance.js';
export * from './evaluation.js';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizePitchClass(value: number): number {
  return ((value % 12) + 12) % 12;
}

export function parseNoteToMidi(note: string): number {
  if (!note) throw new Error('Note cannot be empty');
  const match = note.match(/^([A-G])([#b]?)(-?\d+)$/i);
  if (!match) throw new Error(`Invalid note format: ${note}`);
  const pitchClass = noteNameToPitchClass(`${match[1]}${match[2]}`);
  const octave = Number.parseInt(match[3], 10);
  return 12 * (octave + 1) + pitchClass;
}

export const noteToMidi = parseNoteToMidi;
export const getPitchClass = noteNameToPitchClass;

export function getDiatonicPcs(globalKey?: string): Set<number> | null {
  if (!globalKey) return null;
  const key = globalKey.trim();
  const rootMatch = key.match(/^([A-G][#b]?)/i);
  if (!rootMatch) throw new Error(`Invalid global key: ${globalKey}`);
  const normalized = key.toLowerCase();
  const minor = /\bminor\b|\bmin\b/.test(normalized) || /^[a-g][#b]?m$/i.test(key);
  const offsets = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const root = getPitchClass(rootMatch[1]);
  return new Set(offsets.map(offset => normalizePitchClass(root + offset)));
}

function guitarGeometry(config: GuitarConfig): FretboardGeometry {
  return {
    numStrings: config.numStrings,
    numFrets: config.numFrets,
    scaleLengthMm: config.scaleLengthMm ?? GRG121SP_GEOMETRY.scaleLengthMm,
    nutWidthMm: config.nutWidthMm ?? GRG121SP_GEOMETRY.nutWidthMm,
    widthAtLastFretMm: config.widthAtLastFretMm ?? GRG121SP_GEOMETRY.widthAtLastFretMm,
    fretboardRadiusMm: config.fretboardRadiusMm ?? GRG121SP_GEOMETRY.fretboardRadiusMm,
    stringSpacingMm: config.stringSpacingMm ?? GRG121SP_GEOMETRY.stringSpacingMm
  };
}

export function computeFrequencyScore(
  soundingMidis: number[],
  _rootPc: number,
  _targetPcs: readonly number[],
  isBandContext = true
): number {
  const analysis = analyzeMidiSpectralClarity(soundingMidis, 'clean');
  const bandPenalty = isBandContext ? soundingMidis.filter(midi => midi < 52).length * 4 : 0;
  return clamp(analysis.score - bandPenalty);
}

export function generateVoicingsDetailed(request: VoicingRequest): VoicingSearchResult {
  validateVoicingRequest(request);
  const parsed = parseChord(request.chord ?? '');
  const context = resolveRequestContext(request);
  const policy = resolveVoicingPolicy(request);
  const validationContext = resolveHarmonicContext(context, policy);
  const effectiveWeights = resolveEffectiveRankingWeights(request, context);
  const geometry = guitarGeometry(request.guitarConfig);
  const tuningMidi = request.guitarConfig.tuning.map(parseNoteToMidi);
  const chordPitchClasses = new Set(parsed.chordPitchClasses);
  const diatonicPitchClasses = getDiatonicPcs(request.globalKey);
  const activeTensionPolicy = resolveTensionPolicy(request, policy);
  const tensionPitchClasses = new Set((activeTensionPolicy?.allowedIntervals ?? []).map(interval =>
    normalizePitchClass(parsed.rootPitchClass + interval)
  ));
  const allowDrones = context.mode === 'style' &&
    policy.allowExtensions &&
    (request.stylePreset === 'worship' || request.stylePreset === 'mathrock') &&
    diatonicPitchClasses !== null;
  const searchCenter = clamp(request.gravityCenter ?? 7, 0, request.guitarConfig.numFrets);
  const searchRadius = request.searchRadiusFrets ?? Math.max(6, request.fingerConstraints.maxSpan + 2);
  const searchBudget = request.searchBudget ?? 50_000;
  const maximumResults = request.maxResults ?? 120;
  const searchMinimum = Math.max(1, Math.floor(searchCenter - searchRadius));
  const searchMaximum = Math.min(request.guitarConfig.numFrets, Math.ceil(searchCenter + searchRadius));

  const candidates = tuningMidi.map(openMidi => {
    const frets: (number | null)[] = [];
    for (let fret = 0; fret <= request.guitarConfig.numFrets; fret++) {
      if (fret > 0 && (fret < searchMinimum || fret > searchMaximum)) continue;
      const pitchClass = normalizePitchClass(openMidi + fret);
      const chordTone = chordPitchClasses.has(pitchClass);
      const diatonicDrone = fret === 0 &&
        allowDrones &&
        tensionPitchClasses.has(pitchClass) &&
        diatonicPitchClasses?.has(pitchClass);
      if (chordTone || diatonicDrone) frets.push(fret);
    }
    frets.push(null);
    return frets.sort((first, second) => {
      if (first === null) return 1;
      if (second === null) return -1;
      if (first === 0) return -1;
      if (second === 0) return 1;
      return Math.abs(first - searchCenter) - Math.abs(second - searchCenter);
    });
  });

  const results: ChordVoicing[] = [];
  const current = new Array<number | null>(request.guitarConfig.numStrings).fill(null);
  const selectedAcousticProfile = policy.acousticProfile;
  const spectralCache = new Map<string, SpectralClarityAnalysis>();
  const gateDiagnostics: GateDiagnostics = {
    rejected: {
      insufficientNotes: 0,
      insufficientPitchClasses: 0,
      harmonic: 0,
      physical: 0,
      stringContinuity: 0,
      acoustic: 0,
      style: 0
    },
    accepted: 0
  };
  let evaluatedLeaves = 0;
  let truncated = false;

  const backtrack = (stringIndex: number, minimumFret: number | null, maximumFret: number | null): void => {
    if (evaluatedLeaves >= searchBudget) {
      truncated = true;
      return;
    }
    if (stringIndex === current.length) {
      evaluatedLeaves++;
      const sounding = current.flatMap((fret, index) => fret === null ? [] : [tuningMidi[index] + fret]);
      if (sounding.length < 2) {
        gateDiagnostics.rejected.insufficientNotes++;
        return;
      }
      const playedPitchClasses = new Set(sounding.map(normalizePitchClass));
      if (playedPitchClasses.size < 2) {
        gateDiagnostics.rejected.insufficientPitchClasses++;
        return;
      }
      const harmonicValidation = validateChordPitchClasses([...playedPitchClasses], parsed, {
        context: validationContext,
        tensionPolicy: activeTensionPolicy
      });
      if (!harmonicValidation.valid) {
        gateDiagnostics.rejected.harmonic++;
        return;
      }
      const fingering = solveFingering(current, {
        geometry,
        hand: {
          fingerLengthsMm: [
            request.fingerConstraints.indexLength * 10,
            request.fingerConstraints.middleLength * 10,
            request.fingerConstraints.ringLength * 10,
            request.fingerConstraints.pinkyLength * 10
          ],
          maxReachMm: request.fingerConstraints.maxReachMm
        }
      });
      if (!fingering.valid) {
        gateDiagnostics.rejected.physical++;
        return;
      }
      if (fingering.stringSkipCount > 1) {
        gateDiagnostics.rejected.stringContinuity++;
        return;
      }
      const droneIntervals = harmonicValidation.tensionPitchClasses
        .map(pc => normalizePitchClass(pc - parsed.rootPitchClass));
      const spectralKey = `${selectedAcousticProfile}:${[...sounding].sort((a, b) => a - b).join('.')}`;
      let spectralClarity = spectralCache.get(spectralKey);
      if (!spectralClarity) {
        spectralClarity = analyzeMidiSpectralClarity(sounding, selectedAcousticProfile);
        spectralCache.set(spectralKey, spectralClarity);
      }
      let ensembleClarityPenalty = 0;
      if (context.instruments.includes('bass')) {
        ensembleClarityPenalty += sounding.filter(midi => midi < 52).length * 5;
      }
      if (context.instruments.includes('keyboard') || context.instruments.includes('secondGuitar')) {
        ensembleClarityPenalty += Math.max(0, sounding.length - 4) * 5;
      }
      const clarityMinimum = request.stylePreset === 'metalcore' && parsed.suffix === '5'
        ? Math.max(0, policy.minimumClarity - 8)
        : policy.minimumClarity;
      if (spectralClarity.score - ensembleClarityPenalty < clarityMinimum) {
        gateDiagnostics.rejected.acoustic++;
        return;
      }
      const style = assessStyleFit({
        preset: request.stylePreset,
        mode: context.mode,
        chordSuffix: parsed.suffix,
        frets: current,
        soundingMidis: sounding,
        droneCount: droneIntervals.length,
        instruments: context.instruments
      });
      if (!style.suitable) {
        gateDiagnostics.rejected.style++;
        return;
      }
      const candidate: EvaluatedCandidate = {
        frets: [...current],
        soundingMidis: sounding,
        playedPitchClasses,
        droneIntervals,
        fingering,
        harmonicValidation,
        spectralClarity,
        ensembleClarityPenalty,
        style
      };
      results.push(evaluateCandidate(
        candidate,
        request,
        parsed,
        geometry,
        context,
        policy,
        effectiveWeights
      ));
      gateDiagnostics.accepted++;
      return;
    }

    for (const fret of candidates[stringIndex]) {
      let nextMinimum = minimumFret;
      let nextMaximum = maximumFret;
      if (fret !== null && fret > 0) {
        nextMinimum = minimumFret === null ? fret : Math.min(minimumFret, fret);
        nextMaximum = maximumFret === null ? fret : Math.max(maximumFret, fret);
        if (nextMaximum - nextMinimum > request.fingerConstraints.maxSpan) continue;
      }
      current[stringIndex] = fret;
      backtrack(stringIndex + 1, nextMinimum, nextMaximum);
    }
  };

  backtrack(0, null, null);
  rankVoicings(results);

  const shapeCounts = new Map<string, number>();
  const diversified: ChordVoicing[] = [];
  for (const result of results) {
    const shapeId = result.shapeId ?? canonicalShapeId(result.frets);
    const count = shapeCounts.get(shapeId) ?? 0;
    if (count >= 3) continue;
    shapeCounts.set(shapeId, count + 1);
    diversified.push(result);
    if (diversified.length >= maximumResults) break;
  }
  return {
    voicings: diversified,
    candidateCount: results.length,
    evaluatedLeaves,
    searchBudget,
    searchExhausted: !truncated,
    budgetReached: truncated,
    searchStrategy: 'bounded-dfs',
    truncated,
    gateDiagnostics,
    provenance: createSolverProvenance(request, context, policy, effectiveWeights, {
      budget: searchBudget,
      radiusFrets: searchRadius,
      maximumResults
    })
  };
}

export function generateVoicings(request: VoicingRequest): ChordVoicing[] {
  return generateVoicingsDetailed(request).voicings;
}

export function analyzeVoicing(voicing: ChordVoicing, request: VoicingRequest): VoicingAnalysis {
  const parsed = parseChord(request.chord);
  const sounding = voicing.frets.flatMap((fret, stringIdx) => {
    if (fret === null) return [];
    const midi = parseNoteToMidi(request.guitarConfig.tuning[stringIdx]) + fret;
    return [{ fret, stringIdx, midi, pitchClass: normalizePitchClass(midi) }];
  });
  const anchor = sounding.find(note => note.pitchClass === parsed.rootPitchClass) ?? sounding[0];
  const shapeId = voicing.shapeId ?? canonicalShapeId(voicing.frets);
  const pivotCount = voicing.pivotCount ?? 0;
  const noteRoles: NoteRoleDetail[] = sounding.map(note => {
    const interval = normalizePitchClass(note.pitchClass - parsed.rootPitchClass);
    return {
      note: NOTE_NAMES[note.pitchClass],
      role: getIntervalRoleLabel(interval),
      stringIdx: note.stringIdx,
      fret: note.fret,
      midi: note.midi,
      interval,
      deltaString: anchor ? note.stringIdx - anchor.stringIdx : 0,
      deltaFret: anchor ? note.fret - anchor.fret : 0
    };
  });
  const playedPitchClasses = new Set(sounding.map(note => note.pitchClass));
  const hasRoot = playedPitchClasses.has(parsed.rootPitchClass);
  const hasFifth = playedPitchClasses.has(normalizePitchClass(parsed.rootPitchClass + 7));
  const hasSeventh = [10, 11].some(interval => playedPitchClasses.has(normalizePitchClass(parsed.rootPitchClass + interval)));
  let chordType = 'Compact Voicing';
  if (!hasRoot) chordType = 'Rootless Voicing';
  else if (hasSeventh && !hasFifth) chordType = 'Shell Voicing';
  else if (playedPitchClasses.size === 2 && hasFifth) chordType = 'Power Chord';
  else if (parsed.chordPitchClasses.every(pc => playedPitchClasses.has(pc))) chordType = 'Full Voicing';
  else if (playedPitchClasses.size === 3) chordType = 'Triad';

  const flags: VoicingAnalysis['flags'] = [];
  flags.push({ label: `Shape ${shapeId.replace('shape:', '')}`, type: 'neutral' });
  flags.push({
    label: voicing.exactChord === false
      ? `Extended as ${voicing.actualChordSymbol ?? parsed.symbol}`
      : `Exact ${parsed.symbol}`,
    type: voicing.exactChord === false ? 'neutral' : 'positive'
  });
  if (voicing.playabilityScore >= 85) flags.push({ label: 'High playability', type: 'positive' });
  if ((voicing.frequencyScore ?? 100) >= 70) {
    flags.push({
      label: `Spectral clarity ${Math.round(voicing.frequencyScore ?? 100)} (${voicing.acousticProfile ?? 'clean'})`,
      type: 'positive'
    });
  }
  if (!hasRoot && resolveRequestContext(request).instruments.includes('bass')) {
    flags.push({ label: 'Root delegated to bass', type: 'positive' });
  }
  if (pivotCount > 0) flags.push({ label: `${pivotCount} pivot finger(s)`, type: 'positive' });
  if ((voicing.droneIntervals?.length ?? 0) > 0) flags.push({ label: 'Explicit stylistic tension', type: 'neutral' });
  if ((voicing.stringSkipCount ?? 0) > 0) flags.push({ label: 'Internal string skip', type: 'warning' });
  if ((voicing.omittedIntervals?.length ?? 0) > 0) {
    flags.push({
      label: `Optional tones omitted: ${voicing.omittedIntervals!.map(getIntervalRoleLabel).join(', ')}`,
      type: 'neutral'
    });
  }
  return {
    chordType,
    actualChordSymbol: voicing.actualChordSymbol ?? parsed.symbol,
    noteRoles,
    flags,
    shapeId,
    pivotCount
  };
}

export { CHORD_DEFINITIONS };
