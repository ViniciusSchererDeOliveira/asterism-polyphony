import type { AcousticProfile, SpectralClarityAnalysis } from './acoustics.js';
import type { Barre } from './geometry.js';
import type { EnsembleContext, EnsembleInstrument, VoicingMode } from './music.js';
import type { StylePreset } from './style.js';

export interface FingerConstraints {
  indexLength: number;
  middleLength: number;
  ringLength: number;
  pinkyLength: number;
  maxSpan: number;
  tendonMuting: boolean;
  maxReachMm?: number;
}

export interface GuitarConfig {
  numStrings: number;
  numFrets: number;
  tuning: string[];
  scaleLengthMm?: number;
  nutWidthMm?: number;
  widthAtLastFretMm?: number;
  fretboardRadiusMm?: number;
  stringSpacingMm?: number;
}

export interface PreferenceWeights {
  playability: number;
  frequency: number;
  harmonic: number;
  style: number;
  traditional: number;
  transition: number;
  position: number;
}

export interface PreferenceProfile {
  enabled: boolean;
  weights?: Partial<PreferenceWeights>;
  preferredShapeIds?: string[];
}

export type ScoreDimension = keyof PreferenceWeights;

export interface ScoreComponentBreakdown {
  score: number;
  weight: number;
  normalizedWeight: number;
  contribution: number;
}

export interface VoicingScoreBreakdown {
  policyVersion: string;
  components: Record<ScoreDimension, ScoreComponentBreakdown>;
  baseScore: number;
  bonuses: {
    preferredShape: number;
  };
  totalScore: number;
}

export interface VoicingPolicy {
  allowExtensions?: boolean;
  allowRootlessWithBass?: boolean;
  acousticProfile?: AcousticProfile | 'auto';
  minimumClarity?: number;
}

export interface VoicingRequest {
  chord: string;
  rootNote: string;
  globalKey?: string;
  gravityCenter?: number;
  stylePreset: StylePreset;
  fingerConstraints: FingerConstraints;
  guitarConfig: GuitarConfig;
  contextVoicings?: ChordVoicing[];
  mode?: VoicingMode;
  ensemble?: EnsembleInstrument[] | EnsembleContext;
  preferenceProfile?: PreferenceProfile;
  policy?: VoicingPolicy;
  maxResults?: number;
  searchRadiusFrets?: number;
  searchBudget?: number;
}

export interface ChordVoicing {
  frets: (number | null)[];
  fingers: (number | null)[];
  ergonomicScore: number;
  playabilityScore: number;
  harmonicScore?: number;
  frequencyScore?: number;
  styleScore: number;
  traditionalScore?: number;
  transitionScore?: number;
  positionScore?: number;
  overallScore?: number;
  shapeId?: string;
  physicalSpanMm?: number;
  pivotCount?: number;
  barrePenalty?: number;
  barres?: Barre[];
  omittedIntervals?: number[];
  droneIntervals?: number[];
  actualChordSymbol?: string;
  exactChord?: boolean;
  acousticProfile?: AcousticProfile;
  spectralClarity?: SpectralClarityAnalysis;
  ensembleClarityPenalty?: number;
  reachUtilization?: number;
  lateralUtilization?: number;
  stringSkipCount?: number;
  styleReasons?: string[];
  scoreBreakdown?: VoicingScoreBreakdown;
}

export interface NoteRoleDetail {
  note: string;
  role: string;
  stringIdx: number;
  fret: number;
  midi: number;
  interval: number;
  deltaString: number;
  deltaFret: number;
}

export interface VoicingAnalysis {
  chordType: string;
  actualChordSymbol: string;
  noteRoles: NoteRoleDetail[];
  flags: { label: string; type: 'positive' | 'warning' | 'neutral' }[];
  shapeId: string;
  pivotCount: number;
}

export interface VoicingSearchResult {
  voicings: ChordVoicing[];
  candidateCount: number;
  evaluatedLeaves: number;
  searchBudget: number;
  searchExhausted: boolean;
  budgetReached: boolean;
  searchStrategy: 'bounded-dfs';
  truncated: boolean;
  gateDiagnostics: GateDiagnostics;
  provenance: SolverProvenance;
}

export interface GateDiagnostics {
  rejected: {
    insufficientNotes: number;
    insufficientPitchClasses: number;
    harmonic: number;
    physical: number;
    stringContinuity: number;
    acoustic: number;
    style: number;
  };
  accepted: number;
}

export interface SolverProvenance {
  solverVersion: string;
  requestHash: string;
  requestHashAlgorithm: 'fnv1a64-canonical-json';
  generatedFor: {
    chord: string;
    rootNote: string;
    globalKey: string | null;
  };
  policies: {
    rankingVersion: string;
    styleVersion: string;
    stylePreset: StylePreset;
    mode: VoicingMode;
    acousticProfile: AcousticProfile;
    minimumClarity: number;
    allowExtensions: boolean;
    allowRootlessWithBass: boolean;
    effectiveWeights: PreferenceWeights;
  };
  instrument: GuitarConfig;
  hand: FingerConstraints;
  ensemble: EnsembleInstrument[];
  search: {
    strategy: 'bounded-dfs';
    budget: number;
    radiusFrets: number;
    maximumResults: number;
  };
}
