import type { AcousticProfile } from './acoustics.js';
import type { ChordSuffix, EnsembleInstrument, VoicingMode } from './music.js';

export type StylePreset = 'worship' | 'jrock' | 'mathrock' | 'metalcore';

export const STYLE_POLICY_VERSION = 'style-policy/1';

export const STYLE_POLICY_MANIFEST = {
  version: STYLE_POLICY_VERSION,
  suitabilityThreshold: 42,
  ensemble: {
    bassRegisterLimitMidi: 52,
    bassOverlapPenalty: 15,
    denseVoicingMinimumNotes: 4,
    denseVoicingPenalty: 12
  },
  presets: {
    worship: {
      acousticProfile: 'clean',
      baseScore: 45,
      openResonanceBonus: 18,
      upperRegisterMinimumMidi: 60,
      upperRegisterBonus: 12,
      minimumNotes: 3,
      maximumNotes: 5,
      noteCountBonus: 15,
      droneBonusPerNote: 5,
      maximumDroneBonus: 10,
      stringSkipPenalty: 18
    },
    jrock: {
      acousticProfile: 'crunch',
      baseScore: 45,
      minimumAverageFret: 4,
      maximumAverageFret: 12,
      positionBonus: 22,
      minimumNotes: 3,
      maximumNotes: 5,
      noteCountBonus: 15,
      closedShapeBonus: 8,
      maximumSpan: 3,
      compactShapeBonus: 10,
      stringSkipPenalty: 18
    },
    mathrock: {
      acousticProfile: 'clean',
      baseScore: 45,
      minimumAverageFret: 5,
      upperRegisterBonus: 15,
      openStringBonus: 15,
      minimumNotes: 2,
      maximumNotes: 4,
      noteCountBonus: 15,
      minimumSpan: 1,
      maximumSpan: 3,
      shapeBonus: 8,
      stringSkipPenalty: 10
    },
    metalcore: {
      acousticProfile: 'highGain',
      powerChordBaseScore: 40,
      otherChordBaseScore: 35,
      lowStringPowerBonus: 28,
      lowStringOtherBonus: 20,
      maximumSpan: 2,
      compactShapeBonus: 18,
      minimumNotes: 2,
      powerChordMaximumNotes: 3,
      otherChordMaximumNotes: 4,
      noteCountBonus: 14,
      lowRegisterLimitMidi: 62,
      lowRegisterBonus: 8,
      stringSkipPenalty: 18
    }
  }
} as const;

export interface StyleAssessmentInput {
  preset: StylePreset;
  mode: VoicingMode;
  chordSuffix: ChordSuffix;
  frets: readonly (number | null)[];
  soundingMidis: readonly number[];
  droneCount: number;
  instruments: readonly EnsembleInstrument[];
}

export interface StyleAssessment {
  score: number;
  suitable: boolean;
  acousticProfile: AcousticProfile;
  reasons: readonly string[];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function stringSkipCount(frets: readonly (number | null)[]): number {
  const played = frets.flatMap((fret, stringIndex) => fret === null ? [] : [stringIndex]);
  if (played.length < 2) return 0;
  let skipped = 0;
  for (let stringIndex = played[0]; stringIndex <= played[played.length - 1]; stringIndex++) {
    if (frets[stringIndex] === null) skipped++;
  }
  return skipped;
}

export function inferAcousticProfile(preset: StylePreset): AcousticProfile {
  return STYLE_POLICY_MANIFEST.presets[preset].acousticProfile;
}

export function assessStyleFit(input: StyleAssessmentInput): StyleAssessment {
  if (input.mode === 'traditional') {
    return {
      score: 100,
      suitable: true,
      acousticProfile: inferAcousticProfile(input.preset),
      reasons: ['traditional-mode']
    };
  }
  const playedCount = input.frets.filter(fret => fret !== null).length;
  const openCount = input.frets.filter(fret => fret === 0).length;
  const fretted = input.frets.filter((fret): fret is number => fret !== null && fret > 0);
  const averageFret = fretted.length === 0
    ? 0
    : fretted.reduce((sum, fret) => sum + fret, 0) / fretted.length;
  const fretSpan = fretted.length < 2 ? 0 : Math.max(...fretted) - Math.min(...fretted);
  const lowStringsPlayed = input.frets.slice(0, Math.min(3, input.frets.length))
    .filter(fret => fret !== null).length;
  const averageMidi = input.soundingMidis.reduce((sum, midi) => sum + midi, 0) /
    Math.max(1, input.soundingMidis.length);
  const skips = stringSkipCount(input.frets);
  const reasons: string[] = [];
  let score = 45;

  if (input.preset === 'worship') {
    const policy = STYLE_POLICY_MANIFEST.presets.worship;
    score = policy.baseScore;
    if (openCount > 0) {
      score += policy.openResonanceBonus;
      reasons.push('open-resonance');
    }
    if (averageMidi >= policy.upperRegisterMinimumMidi) score += policy.upperRegisterBonus;
    if (playedCount >= policy.minimumNotes && playedCount <= policy.maximumNotes) score += policy.noteCountBonus;
    if (input.droneCount > 0) {
      score += Math.min(policy.maximumDroneBonus, input.droneCount * policy.droneBonusPerNote);
    }
  } else if (input.preset === 'jrock') {
    const policy = STYLE_POLICY_MANIFEST.presets.jrock;
    score = policy.baseScore;
    if (averageFret >= policy.minimumAverageFret && averageFret <= policy.maximumAverageFret) {
      score += policy.positionBonus;
      reasons.push('mid-neck-position');
    }
    if (playedCount >= policy.minimumNotes && playedCount <= policy.maximumNotes) score += policy.noteCountBonus;
    if (openCount === 0) score += policy.closedShapeBonus;
    if (fretSpan <= policy.maximumSpan) score += policy.compactShapeBonus;
  } else if (input.preset === 'mathrock') {
    const policy = STYLE_POLICY_MANIFEST.presets.mathrock;
    score = policy.baseScore;
    if (averageFret >= policy.minimumAverageFret) {
      score += policy.upperRegisterBonus;
      reasons.push('upper-register-shape');
    }
    if (openCount > 0) score += policy.openStringBonus;
    if (playedCount >= policy.minimumNotes && playedCount <= policy.maximumNotes) score += policy.noteCountBonus;
    if (fretSpan >= policy.minimumSpan && fretSpan <= policy.maximumSpan) score += policy.shapeBonus;
  } else {
    const policy = STYLE_POLICY_MANIFEST.presets.metalcore;
    const powerChord = input.chordSuffix === '5';
    score = powerChord ? policy.powerChordBaseScore : policy.otherChordBaseScore;
    if (powerChord) reasons.push('power-chord-request');
    if (lowStringsPlayed >= 2) {
      score += powerChord ? policy.lowStringPowerBonus : policy.lowStringOtherBonus;
      reasons.push('low-string-focus');
    }
    if (fretSpan <= policy.maximumSpan) score += policy.compactShapeBonus;
    const maximumNotes = powerChord ? policy.powerChordMaximumNotes : policy.otherChordMaximumNotes;
    if (playedCount >= policy.minimumNotes && playedCount <= maximumNotes) score += policy.noteCountBonus;
    if (averageMidi < policy.lowRegisterLimitMidi) score += policy.lowRegisterBonus;
  }

  if (skips > 0) {
    score -= skips * STYLE_POLICY_MANIFEST.presets[input.preset].stringSkipPenalty;
    reasons.push('internal-string-skip');
  }
  if (
    input.instruments.includes('bass')
    && input.soundingMidis.some(midi => midi < STYLE_POLICY_MANIFEST.ensemble.bassRegisterLimitMidi)
  ) {
    score -= STYLE_POLICY_MANIFEST.ensemble.bassOverlapPenalty;
    reasons.push('bass-register-overlap');
  }
  if (
    (input.instruments.includes('keyboard') || input.instruments.includes('secondGuitar'))
    && playedCount > STYLE_POLICY_MANIFEST.ensemble.denseVoicingMinimumNotes
  ) {
    score -= STYLE_POLICY_MANIFEST.ensemble.denseVoicingPenalty;
    reasons.push('ensemble-density');
  }

  const normalizedScore = clamp(score);
  const powerChordLowStringGate = input.preset !== 'metalcore'
    || input.chordSuffix !== '5'
    || lowStringsPlayed >= 2;
  return {
    score: normalizedScore,
    suitable: normalizedScore >= STYLE_POLICY_MANIFEST.suitabilityThreshold && powerChordLowStringGate,
    acousticProfile: inferAcousticProfile(input.preset),
    reasons
  };
}
