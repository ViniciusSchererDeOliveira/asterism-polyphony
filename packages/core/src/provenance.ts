import type {
  PreferenceWeights,
  SolverProvenance,
  VoicingRequest
} from './contracts.js';
import type { EnsembleContext } from './music.js';
import { GRG121SP_GEOMETRY } from './geometry.js';
import {
  resolveEffectiveRankingWeights,
  resolveRequestContext,
  resolveVoicingPolicy,
  type ResolvedVoicingPolicy
} from './policy.js';
import { RANKING_POLICY_VERSION } from './ranking.js';
import { STYLE_POLICY_VERSION } from './style.js';

export const SOLVER_VERSION = 'polyphony-solver/1';

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalValue(entry)]));
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

function effectiveRequestForHash(request: VoicingRequest): unknown {
  const context = resolveRequestContext(request);
  const policy = resolveVoicingPolicy(request);
  const weights = resolveEffectiveRankingWeights(request, context);
  const searchRadius = request.searchRadiusFrets ?? Math.max(6, request.fingerConstraints.maxSpan + 2);
  const gravityCenter = Math.max(0, Math.min(request.guitarConfig.numFrets, request.gravityCenter ?? 7));
  return {
    chord: request.chord,
    rootNote: request.rootNote,
    globalKey: request.globalKey ?? null,
    gravityCenter,
    stylePreset: request.stylePreset,
    context,
    policy,
    weights,
    preferredShapeIds: request.preferenceProfile?.enabled
      ? [...(request.preferenceProfile.preferredShapeIds ?? [])].sort()
      : [],
    instrument: {
      ...request.guitarConfig,
      scaleLengthMm: request.guitarConfig.scaleLengthMm ?? GRG121SP_GEOMETRY.scaleLengthMm,
      nutWidthMm: request.guitarConfig.nutWidthMm ?? GRG121SP_GEOMETRY.nutWidthMm,
      widthAtLastFretMm: request.guitarConfig.widthAtLastFretMm ?? GRG121SP_GEOMETRY.widthAtLastFretMm,
      fretboardRadiusMm: request.guitarConfig.fretboardRadiusMm ?? GRG121SP_GEOMETRY.fretboardRadiusMm,
      stringSpacingMm: request.guitarConfig.stringSpacingMm ?? GRG121SP_GEOMETRY.stringSpacingMm,
      tuning: [...request.guitarConfig.tuning]
    },
    hand: { ...request.fingerConstraints },
    contextVoicings: (request.contextVoicings ?? []).map(voicing => ({ frets: [...voicing.frets] })),
    search: {
      strategy: 'bounded-dfs',
      budget: request.searchBudget ?? 50_000,
      radiusFrets: searchRadius,
      maximumResults: request.maxResults ?? 120
    }
  };
}

export function stableRequestHash(request: VoicingRequest): string {
  const bytes = new TextEncoder().encode(canonicalJson(effectiveRequestForHash(request)));
  let hash = 0xcbf29ce484222325n;
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}

interface ProvenanceSearchInput {
  budget: number;
  radiusFrets: number;
  maximumResults: number;
}

export function createSolverProvenance(
  request: VoicingRequest,
  context: EnsembleContext,
  policy: ResolvedVoicingPolicy,
  effectiveWeights: PreferenceWeights,
  search: ProvenanceSearchInput
): SolverProvenance {
  return {
    solverVersion: SOLVER_VERSION,
    requestHash: stableRequestHash(request),
    requestHashAlgorithm: 'fnv1a64-canonical-json',
    generatedFor: {
      chord: request.chord,
      rootNote: request.rootNote,
      globalKey: request.globalKey ?? null
    },
    policies: {
      rankingVersion: RANKING_POLICY_VERSION,
      styleVersion: STYLE_POLICY_VERSION,
      stylePreset: request.stylePreset,
      mode: context.mode,
      acousticProfile: policy.acousticProfile,
      minimumClarity: policy.minimumClarity,
      allowExtensions: policy.allowExtensions,
      allowRootlessWithBass: policy.allowRootlessWithBass,
      effectiveWeights: { ...effectiveWeights }
    },
    instrument: {
      ...request.guitarConfig,
      scaleLengthMm: request.guitarConfig.scaleLengthMm ?? GRG121SP_GEOMETRY.scaleLengthMm,
      nutWidthMm: request.guitarConfig.nutWidthMm ?? GRG121SP_GEOMETRY.nutWidthMm,
      widthAtLastFretMm: request.guitarConfig.widthAtLastFretMm ?? GRG121SP_GEOMETRY.widthAtLastFretMm,
      fretboardRadiusMm: request.guitarConfig.fretboardRadiusMm ?? GRG121SP_GEOMETRY.fretboardRadiusMm,
      stringSpacingMm: request.guitarConfig.stringSpacingMm ?? GRG121SP_GEOMETRY.stringSpacingMm,
      tuning: [...request.guitarConfig.tuning]
    },
    hand: { ...request.fingerConstraints },
    ensemble: [...context.instruments],
    search: {
      strategy: 'bounded-dfs',
      budget: search.budget,
      radiusFrets: search.radiusFrets,
      maximumResults: search.maximumResults
    }
  };
}
