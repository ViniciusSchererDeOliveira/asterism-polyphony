export type AcousticProfile = 'clean' | 'crunch' | 'highGain';

export interface PartialProfile {
  harmonicCount: number;
  rolloffExponent: number;
  overtoneGain: number;
  roughnessMultiplier: number;
  densityMultiplier: number;
  roughnessWeight: number;
  densityWeight: number;
  duplicationWeight: number;
}

export interface RoughnessPair {
  firstPitchIndex: number;
  secondPitchIndex: number;
  firstPartial: number;
  secondPartial: number;
  firstFrequencyHz: number;
  secondFrequencyHz: number;
  contribution: number;
}

export interface RoughnessComponent {
  normalizedRoughness: number;
  score: number;
  evaluatedPartialPairs: number;
  dominantPairs: RoughnessPair[];
}

export interface RegisterDensityComponent {
  pressure: number;
  score: number;
  densePairCount: number;
  evaluatedPitchPairs: number;
}

export interface DuplicationComponent {
  exactPitchDuplicates: number;
  pitchClassDuplicates: number;
  score: number;
}

export interface SpectralClarityComponents {
  roughness: RoughnessComponent;
  registerDensity: RegisterDensityComponent;
  duplication: DuplicationComponent;
}

export interface SpectralClarityAnalysis {
  profile: AcousticProfile;
  score: number;
  frequenciesHz: number[];
  components: SpectralClarityComponents;
}

interface Partial {
  harmonic: number;
  frequencyHz: number;
  amplitude: number;
}

const PROFILE_CONFIGS: Readonly<Record<AcousticProfile, Readonly<PartialProfile>>> = Object.freeze({
  clean: Object.freeze({
    harmonicCount: 8,
    rolloffExponent: 1.4,
    overtoneGain: 0.55,
    roughnessMultiplier: 1,
    densityMultiplier: 1,
    roughnessWeight: 0.62,
    densityWeight: 0.28,
    duplicationWeight: 0.1
  }),
  crunch: Object.freeze({
    harmonicCount: 12,
    rolloffExponent: 1,
    overtoneGain: 0.8,
    roughnessMultiplier: 2.4,
    densityMultiplier: 1.18,
    roughnessWeight: 0.68,
    densityWeight: 0.22,
    duplicationWeight: 0.1
  }),
  highGain: Object.freeze({
    harmonicCount: 16,
    rolloffExponent: 0.72,
    overtoneGain: 1,
    roughnessMultiplier: 4.5,
    densityMultiplier: 1.45,
    roughnessWeight: 0.74,
    densityWeight: 0.18,
    duplicationWeight: 0.08
  })
});

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function round(value: number, digits = 6): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function assertFrequency(frequencyHz: number): void {
  if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) {
    throw new Error('frequencies must be finite positive numbers');
  }
}

function assertMidiPitch(midiPitch: number): void {
  if (!Number.isFinite(midiPitch)) {
    throw new Error('MIDI pitches must be finite numbers');
  }
}

function partialAmplitude(harmonic: number, profile: Readonly<PartialProfile>): number {
  if (harmonic === 1) return 1;
  return profile.overtoneGain / harmonic ** profile.rolloffExponent;
}

function buildPartials(frequencyHz: number, profile: Readonly<PartialProfile>): Partial[] {
  return Array.from({ length: profile.harmonicCount }, (_, index) => {
    const harmonic = index + 1;
    return {
      harmonic,
      frequencyHz: frequencyHz * harmonic,
      amplitude: partialAmplitude(harmonic, profile)
    };
  });
}

function criticalBandRoughness(first: Partial, second: Partial): number {
  const lowFrequency = Math.min(first.frequencyHz, second.frequencyHz);
  const frequencyDistance = Math.abs(first.frequencyHz - second.frequencyHz);
  const criticalBandwidthScale = 0.24 / (0.0207 * lowFrequency + 18.96);
  const scaledDistance = criticalBandwidthScale * frequencyDistance;
  const dissonance = Math.exp(-3.5 * scaledDistance) - Math.exp(-5.75 * scaledDistance);
  return first.amplitude * second.amplitude * Math.max(0, dissonance);
}

function analyzeRoughness(
  frequenciesHz: readonly number[],
  profile: Readonly<PartialProfile>
): RoughnessComponent {
  if (frequenciesHz.length < 2) {
    return {
      normalizedRoughness: 0,
      score: 100,
      evaluatedPartialPairs: 0,
      dominantPairs: []
    };
  }
  const partialSets = frequenciesHz.map(frequencyHz => buildPartials(frequencyHz, profile));
  const contributions: RoughnessPair[] = [];
  let weightedRoughness = 0;
  let totalPairWeight = 0;
  let evaluatedPartialPairs = 0;

  for (let firstPitchIndex = 0; firstPitchIndex < partialSets.length; firstPitchIndex++) {
    for (let secondPitchIndex = firstPitchIndex + 1; secondPitchIndex < partialSets.length; secondPitchIndex++) {
      for (const first of partialSets[firstPitchIndex]) {
        for (const second of partialSets[secondPitchIndex]) {
          const contribution = criticalBandRoughness(first, second);
          const weight = first.amplitude * second.amplitude;
          weightedRoughness += contribution;
          totalPairWeight += weight;
          evaluatedPartialPairs++;
          if (contribution > 0) {
            contributions.push({
              firstPitchIndex,
              secondPitchIndex,
              firstPartial: first.harmonic,
              secondPartial: second.harmonic,
              firstFrequencyHz: round(first.frequencyHz),
              secondFrequencyHz: round(second.frequencyHz),
              contribution: round(contribution)
            });
          }
        }
      }
    }
  }

  const normalizedRoughness = totalPairWeight === 0
    ? 0
    : weightedRoughness / totalPairWeight * profile.roughnessMultiplier;
  const score = 100 * Math.exp(-12 * normalizedRoughness);
  contributions.sort((first, second) =>
    second.contribution - first.contribution ||
    first.firstPitchIndex - second.firstPitchIndex ||
    first.secondPitchIndex - second.secondPitchIndex ||
    first.firstPartial - second.firstPartial ||
    first.secondPartial - second.secondPartial
  );

  return {
    normalizedRoughness: round(normalizedRoughness),
    score: round(clamp(score, 0, 100)),
    evaluatedPartialPairs,
    dominantPairs: contributions.slice(0, 5)
  };
}

function equivalentRectangularBandwidth(frequencyHz: number): number {
  return 24.7 * (1 + 4.37 * frequencyHz / 1000);
}

function analyzeRegisterDensity(
  frequenciesHz: readonly number[],
  profile: Readonly<PartialProfile>
): RegisterDensityComponent {
  if (frequenciesHz.length < 2) {
    return { pressure: 0, score: 100, densePairCount: 0, evaluatedPitchPairs: 0 };
  }
  let accumulatedPressure = 0;
  let densePairCount = 0;
  let evaluatedPitchPairs = 0;

  for (let first = 0; first < frequenciesHz.length; first++) {
    for (let second = first + 1; second < frequenciesHz.length; second++) {
      const lower = Math.min(frequenciesHz[first], frequenciesHz[second]);
      const higher = Math.max(frequenciesHz[first], frequenciesHz[second]);
      const center = Math.sqrt(lower * higher);
      const bandwidth = equivalentRectangularBandwidth(center);
      const distanceInBands = (higher - lower) / bandwidth;
      const lowRegisterEmphasis = 1 + 0.85 / (1 + (center / 220) ** 2);
      const pairPressure = Math.exp(-distanceInBands / 1.35) * lowRegisterEmphasis;
      accumulatedPressure += pairPressure;
      if (distanceInBands < 1.5) densePairCount++;
      evaluatedPitchPairs++;
    }
  }

  const pressure = accumulatedPressure / evaluatedPitchPairs * profile.densityMultiplier;
  const score = 100 * Math.exp(-1.8 * pressure);
  return {
    pressure: round(pressure),
    score: round(clamp(score, 0, 100)),
    densePairCount,
    evaluatedPitchPairs
  };
}

function frequencyToNearestMidi(frequencyHz: number): number {
  return Math.round(69 + 12 * Math.log2(frequencyHz / 440));
}

function countDuplicateExtras(values: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.values()].reduce((total, count) => total + Math.max(0, count - 1), 0);
}

function analyzeDuplication(frequenciesHz: readonly number[]): DuplicationComponent {
  const nearestMidi = frequenciesHz.map(frequencyToNearestMidi);
  const exactPitchDuplicates = countDuplicateExtras(nearestMidi);
  const pitchClassDuplicates = countDuplicateExtras(nearestMidi.map(midiPitch => ((midiPitch % 12) + 12) % 12));
  const score = 100 - exactPitchDuplicates * 12 - pitchClassDuplicates * 3;
  return {
    exactPitchDuplicates,
    pitchClassDuplicates,
    score: round(clamp(score, 0, 100))
  };
}

export function getAcousticProfile(profile: AcousticProfile): Readonly<PartialProfile> {
  return PROFILE_CONFIGS[profile];
}

export function midiToFrequencyHz(midiPitch: number, referencePitchHz = 440): number {
  assertMidiPitch(midiPitch);
  assertFrequency(referencePitchHz);
  return referencePitchHz * 2 ** ((midiPitch - 69) / 12);
}

export function analyzeSpectralClarity(
  frequenciesHz: readonly number[],
  profile: AcousticProfile = 'clean'
): SpectralClarityAnalysis {
  frequenciesHz.forEach(assertFrequency);
  const sortedFrequencies = [...frequenciesHz].sort((first, second) => first - second);
  const config = PROFILE_CONFIGS[profile];
  const roughness = analyzeRoughness(sortedFrequencies, config);
  const registerDensity = analyzeRegisterDensity(sortedFrequencies, config);
  const duplication = analyzeDuplication(sortedFrequencies);
  const score =
    roughness.score * config.roughnessWeight +
    registerDensity.score * config.densityWeight +
    duplication.score * config.duplicationWeight;

  return {
    profile,
    score: round(clamp(score, 0, 100)),
    frequenciesHz: sortedFrequencies.map(frequencyHz => round(frequencyHz)),
    components: { roughness, registerDensity, duplication }
  };
}

export function analyzeMidiSpectralClarity(
  midiPitches: readonly number[],
  profile: AcousticProfile = 'clean',
  referencePitchHz = 440
): SpectralClarityAnalysis {
  return analyzeSpectralClarity(
    midiPitches.map(midiPitch => midiToFrequencyHz(midiPitch, referencePitchHz)),
    profile
  );
}
