import type { AcousticProfile } from './acoustics.js';
import type { PreferenceWeights, VoicingPolicy, VoicingRequest } from './contracts.js';
import type { ChordTensionPolicy, EnsembleContext } from './music.js';
import { inferAcousticProfile } from './style.js';
import { effectiveRankingWeights } from './ranking.js';

export interface ResolvedVoicingPolicy {
  allowExtensions: boolean;
  allowRootlessWithBass: boolean;
  acousticProfile: AcousticProfile;
  minimumClarity: number;
}

export function resolveRequestContext(request: VoicingRequest): EnsembleContext {
  const mode = request.mode ?? 'style';
  if (request.ensemble && !Array.isArray(request.ensemble)) {
    return { mode: request.ensemble.mode, instruments: [...request.ensemble.instruments] };
  }
  return { mode, instruments: Array.isArray(request.ensemble) ? [...request.ensemble] : [] };
}

export function resolveVoicingPolicy(request: VoicingRequest): ResolvedVoicingPolicy {
  const selectedProfile: VoicingPolicy['acousticProfile'] = request.policy?.acousticProfile ?? 'auto';
  const acousticProfile = selectedProfile === 'auto'
    ? inferAcousticProfile(request.stylePreset)
    : selectedProfile;
  const profileMinimum = acousticProfile === 'highGain' ? 58 : acousticProfile === 'crunch' ? 52 : 48;
  return {
    allowExtensions: request.policy?.allowExtensions ?? false,
    allowRootlessWithBass: request.policy?.allowRootlessWithBass ?? true,
    acousticProfile,
    minimumClarity: request.policy?.minimumClarity ?? profileMinimum
  };
}

export function resolveHarmonicContext(
  context: EnsembleContext,
  policy: ResolvedVoicingPolicy
): EnsembleContext {
  if (policy.allowRootlessWithBass) return context;
  return {
    mode: context.mode,
    instruments: context.instruments.filter(instrument => instrument !== 'bass')
  };
}

export function resolveTensionPolicy(request: VoicingRequest, policy: ResolvedVoicingPolicy): ChordTensionPolicy | undefined {
  if (!policy.allowExtensions || (request.mode ?? 'style') === 'traditional') return undefined;
  if (request.stylePreset === 'worship') return { allowedIntervals: [2, 5, 9] };
  if (request.stylePreset === 'mathrock') return { allowedIntervals: [1, 2, 5, 6, 9, 11] };
  if (request.stylePreset === 'jrock') return { allowedIntervals: [2, 5, 9] };
  return undefined;
}

export function resolveEffectiveRankingWeights(request: VoicingRequest, context: EnsembleContext): PreferenceWeights {
  const overrides = request.preferenceProfile?.enabled ? request.preferenceProfile.weights : undefined;
  return effectiveRankingWeights(context.mode, Boolean(request.contextVoicings?.length), overrides);
}
