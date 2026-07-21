import type {
  ChordVoicing,
  PreferenceWeights,
  ScoreDimension,
  VoicingScoreBreakdown
} from './contracts.js';
import type { VoicingMode } from './music.js';

export const RANKING_POLICY_VERSION = 'ranking-policy/1';

const SCORE_DIMENSIONS: ScoreDimension[] = [
  'playability',
  'frequency',
  'harmonic',
  'style',
  'traditional',
  'transition',
  'position'
];

export function defaultRankingWeights(mode: VoicingMode, hasProgression: boolean): PreferenceWeights {
  if (mode === 'traditional') {
    return {
      playability: hasProgression ? 0.38 : 0.48,
      frequency: 0.2,
      harmonic: 0.12,
      style: 0,
      traditional: 0.15,
      transition: hasProgression ? 0.12 : 0.02,
      position: 0.03
    };
  }
  return {
    playability: hasProgression ? 0.34 : 0.4,
    frequency: hasProgression ? 0.18 : 0.2,
    harmonic: hasProgression ? 0.14 : 0.15,
    style: hasProgression ? 0.18 : 0.2,
    traditional: 0,
    transition: hasProgression ? 0.13 : 0.02,
    position: 0.03
  };
}

export function effectiveRankingWeights(
  mode: VoicingMode,
  hasProgression: boolean,
  overrides?: Partial<PreferenceWeights>
): PreferenceWeights {
  return { ...defaultRankingWeights(mode, hasProgression), ...overrides };
}

export function explainRankingScore(
  scores: PreferenceWeights,
  weights: PreferenceWeights,
  preferredShape: boolean
): VoicingScoreBreakdown {
  const totalWeight = SCORE_DIMENSIONS.reduce((sum, dimension) => sum + weights[dimension], 0) || 1;
  const components = Object.fromEntries(SCORE_DIMENSIONS.map((dimension) => {
    const normalizedWeight = weights[dimension] / totalWeight;
    return [dimension, {
      score: scores[dimension],
      weight: weights[dimension],
      normalizedWeight,
      contribution: scores[dimension] * normalizedWeight
    }];
  })) as VoicingScoreBreakdown['components'];
  const baseScore = SCORE_DIMENSIONS.reduce(
    (sum, dimension) => sum + components[dimension].contribution,
    0
  );
  const preferredShapeBonus = preferredShape ? 3 : 0;
  const totalScore = Math.max(0, Math.min(100, baseScore + preferredShapeBonus));
  return {
    policyVersion: RANKING_POLICY_VERSION,
    components,
    baseScore,
    bonuses: { preferredShape: preferredShapeBonus },
    totalScore
  };
}

export function compareVoicings(first: ChordVoicing, second: ChordVoicing): number {
  return (second.overallScore ?? second.playabilityScore) - (first.overallScore ?? first.playabilityScore)
    || second.playabilityScore - first.playabilityScore
    || (second.frequencyScore ?? 100) - (first.frequencyScore ?? 100);
}

export function rankVoicings(voicings: ChordVoicing[]): ChordVoicing[] {
  return voicings.sort(compareVoicings);
}
