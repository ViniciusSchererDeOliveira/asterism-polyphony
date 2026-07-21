import type { SpectralClarityAnalysis } from './acoustics.js';
import type {
  ChordVoicing,
  FingerConstraints,
  PreferenceWeights,
  VoicingRequest
} from './contracts.js';
import {
  canonicalShapeId,
  computeTransitionMetrics,
  type FretboardGeometry,
  type ValidFingeringSolution
} from './geometry.js';
import {
  getIntervalRoleLabel,
  recognizeChordSymbol,
  type ChordPitchClassValidation,
  type EnsembleContext,
  type ParsedChord
} from './music.js';
import type { ResolvedVoicingPolicy } from './policy.js';
import { explainRankingScore } from './ranking.js';
import type { StyleAssessment } from './style.js';

export interface EvaluatedCandidate {
  frets: (number | null)[];
  soundingMidis: number[];
  playedPitchClasses: Set<number>;
  droneIntervals: number[];
  fingering: ValidFingeringSolution;
  harmonicValidation: ChordPitchClassValidation;
  spectralClarity: SpectralClarityAnalysis;
  ensembleClarityPenalty: number;
  style: StyleAssessment;
}

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizePitchClass(value: number): number {
  return ((value % 12) + 12) % 12;
}

function countSkippedStrings(frets: readonly (number | null)[]): number {
  const played = frets.flatMap((fret, index) => fret === null ? [] : [index]);
  if (played.length < 2) return 0;
  let skipped = 0;
  for (let index = played[0]; index <= played[played.length - 1]; index++) {
    if (frets[index] === null) skipped++;
  }
  return skipped;
}

function voicingCenterFret(frets: readonly (number | null)[]): number {
  const fretted = frets.filter((fret): fret is number => fret !== null && fret > 0);
  return fretted.length === 0 ? 0 : fretted.reduce((sum, fret) => sum + fret, 0) / fretted.length;
}

function barreCost(solution: ValidFingeringSolution): number {
  return solution.barres.reduce((total, barre) => {
    const width = barre.toString - barre.fromString + 1;
    const fingerMultiplier = barre.finger === 1 ? 1 : 1.35;
    const positionMultiplier = Math.pow(2, -barre.fret / 24);
    return total + width * 4 * fingerMultiplier * positionMultiplier;
  }, 0);
}

function ergonomicMetrics(
  frets: readonly (number | null)[],
  fingering: ValidFingeringSolution,
  constraints: FingerConstraints
): { ergonomicScore: number; playabilityScore: number; physicalSpanMm: number; barrePenalty: number } {
  const barrePenalty = barreCost(fingering);
  let penalty = Math.pow(fingering.reachUtilization, 2) * 42;
  penalty += Math.pow(fingering.lateralUtilization, 2) * 12;
  penalty += Math.max(0, fingering.fingerCount - 1) * 4;
  penalty += barrePenalty;
  penalty += fingering.stringSkipCount * 16;

  const orderedPlacements = [...fingering.placements].sort((a, b) => a.finger - b.finger);
  if (constraints.tendonMuting && orderedPlacements.length >= 4) {
    const ring = orderedPlacements.find(placement => placement.finger === 3);
    const pinky = orderedPlacements.find(placement => placement.finger === 4);
    if (ring && pinky && pinky.fret - ring.fret > 1) penalty += 15;
  }

  const center = voicingCenterFret(frets);
  if (center > 18) penalty += (center - 18) * 1.5;
  if (center > 0 && center < 2) penalty += 4;
  return {
    ergonomicScore: penalty,
    playabilityScore: clamp(100 - penalty),
    physicalSpanMm: fingering.physicalSpan.reachMm,
    barrePenalty
  };
}

function traditionalScore(
  frets: readonly (number | null)[],
  soundingMidis: readonly number[],
  parsed: ParsedChord,
  playedPitchClasses: Set<number>
): number {
  const played = frets.flatMap((fret, index) => fret === null ? [] : [index]);
  const skipped = countSkippedStrings(frets);
  const lowestPc = normalizePitchClass(Math.min(...soundingMidis));
  let score = 45;
  if (parsed.chordPitchClasses.every(pc => playedPitchClasses.has(pc))) score += 20;
  if (lowestPc === parsed.rootPitchClass) score += 15;
  if (skipped === 0) score += 10;
  if (frets.some(fret => fret === 0)) score += 5;
  if (played.length >= 3 && played.length <= 5) score += 5;
  return clamp(score);
}

function transitionScore(
  frets: readonly (number | null)[],
  request: VoicingRequest,
  geometry: FretboardGeometry
): { score: number; pivotCount: number } {
  const previous = request.contextVoicings?.at(-1);
  if (!previous || previous.frets.length !== frets.length) return { score: 100, pivotCount: 0 };
  const metrics = computeTransitionMetrics(previous.frets, frets, geometry);
  const score = clamp(
    100
    - metrics.centerShiftMm * 0.45
    - metrics.fingerTravelMm * 0.35
    - metrics.movedFingerCount * 7
    - metrics.barreChangeCount * 12
    - metrics.mutingChangeCount * 4
    + metrics.fingerPivotCount * 12
  );
  return { score, pivotCount: metrics.fingerPivotCount };
}

function harmonicScore(validation: ChordPitchClassValidation): number {
  if (!validation.valid) return 0;
  return validation.exact ? 100 : clamp(94 - validation.tensionPitchClasses.length * 2);
}

export function evaluateCandidate(
  candidate: EvaluatedCandidate,
  request: VoicingRequest,
  parsed: ParsedChord,
  geometry: FretboardGeometry,
  context: EnsembleContext,
  policy: ResolvedVoicingPolicy,
  effectiveWeights: PreferenceWeights
): ChordVoicing {
  const ergonomic = ergonomicMetrics(candidate.frets, candidate.fingering, request.fingerConstraints);
  const frequency = clamp(candidate.spectralClarity.score - candidate.ensembleClarityPenalty);
  const harmonic = harmonicScore(candidate.harmonicValidation);
  const style = candidate.style.score / 10;
  const traditional = traditionalScore(candidate.frets, candidate.soundingMidis, parsed, candidate.playedPitchClasses);
  const transition = transitionScore(candidate.frets, request, geometry);
  const center = voicingCenterFret(candidate.frets);
  const position = clamp(100 - Math.abs(center - (request.gravityCenter ?? 7)) * 7);
  const shapeId = canonicalShapeId(candidate.frets);
  const scoreBreakdown = explainRankingScore({
    playability: ergonomic.playabilityScore,
    frequency,
    harmonic,
    style: candidate.style.score,
    traditional,
    transition: transition.score,
    position
  }, effectiveWeights, Boolean(
    request.preferenceProfile?.enabled
    && request.preferenceProfile.preferredShapeIds?.includes(shapeId)
  ));
  const omittedIntervals = parsed.chordIntervals.filter(interval =>
    !candidate.playedPitchClasses.has(normalizePitchClass(parsed.rootPitchClass + interval))
  );
  const ensemblePitchClasses = new Set(candidate.playedPitchClasses);
  if (context.instruments.includes('bass') && policy.allowRootlessWithBass) {
    ensemblePitchClasses.add(parsed.rootPitchClass);
  }
  const recognized = recognizeChordSymbol([...ensemblePitchClasses], parsed.root);
  const tensionLabels = candidate.droneIntervals.map(getIntervalRoleLabel);
  const actualChordSymbol = recognized?.symbol ?? (
    tensionLabels.length > 0 ? `${parsed.symbol} + ${tensionLabels.join(', ')}` : parsed.symbol
  );

  return {
    frets: [...candidate.frets],
    fingers: [...candidate.fingering.fingers],
    ergonomicScore: ergonomic.ergonomicScore,
    playabilityScore: ergonomic.playabilityScore,
    harmonicScore: harmonic,
    frequencyScore: frequency,
    styleScore: style,
    traditionalScore: traditional,
    transitionScore: transition.score,
    positionScore: position,
    overallScore: scoreBreakdown.totalScore,
    shapeId,
    physicalSpanMm: ergonomic.physicalSpanMm,
    pivotCount: transition.pivotCount,
    barrePenalty: ergonomic.barrePenalty,
    barres: candidate.fingering.barres.map(barre => ({ ...barre, soundingStrings: [...barre.soundingStrings] })),
    omittedIntervals,
    droneIntervals: [...candidate.droneIntervals],
    actualChordSymbol,
    exactChord: candidate.harmonicValidation.exact,
    acousticProfile: candidate.spectralClarity.profile,
    spectralClarity: candidate.spectralClarity,
    ensembleClarityPenalty: candidate.ensembleClarityPenalty,
    reachUtilization: candidate.fingering.reachUtilization,
    lateralUtilization: candidate.fingering.lateralUtilization,
    stringSkipCount: candidate.fingering.stringSkipCount,
    styleReasons: [...candidate.style.reasons],
    scoreBreakdown
  };
}
