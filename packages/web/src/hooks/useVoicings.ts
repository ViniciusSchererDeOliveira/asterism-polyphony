import { useDeferredValue, useEffect, useRef, useState } from 'react';
import type {
  ChordVoicing,
  GateDiagnostics,
  SolverProvenance,
  VoicingRequest
} from '@guitar-paradigm/core';
import type {
  VoicingWorkerRequest,
  VoicingWorkerResponse
} from '../workers/voicingWorkerProtocol';

export type VoicingSearchStatus = 'idle' | 'running' | 'success' | 'empty' | 'error';

export interface VoicingSearchState {
  status: VoicingSearchStatus;
  data: ChordVoicing[];
  error: string | null;
  provenance: SolverProvenance | null;
  diagnostics: {
    candidateCount: number;
    evaluatedLeaves: number;
    searchBudget: number;
    searchExhausted: boolean;
    budgetReached: boolean;
    searchStrategy: 'bounded-dfs';
    truncated: boolean;
    gateDiagnostics: GateDiagnostics;
  } | null;
}

const INITIAL_STATE: VoicingSearchState = {
  status: 'idle',
  data: [],
  error: null,
  provenance: null,
  diagnostics: null
};

export function useVoicings(request: VoicingRequest): VoicingSearchState {
  const deferredRequest = useDeferredValue(request);
  const latestRequestId = useRef(0);
  const cache = useRef(new Map<string, VoicingSearchState>());
  const [state, setState] = useState<VoicingSearchState>(INITIAL_STATE);

  useEffect(() => {
    const cacheKey = JSON.stringify(deferredRequest);
    const cached = cache.current.get(cacheKey);
    if (cached) {
      setState(cached);
      return;
    }

    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    setState((current) => ({ ...current, status: 'running', error: null }));
    const worker = new Worker(new URL('../workers/voicing.worker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (event: MessageEvent<VoicingWorkerResponse>) => {
      const response = event.data;
      if (response.requestId !== latestRequestId.current) return;

      if (!response.ok) {
        setState((current) => ({
          ...current,
          status: 'error',
          error: response.error,
          provenance: null,
          diagnostics: null
        }));
        return;
      }

      const nextState: VoicingSearchState = {
        status: response.result.voicings.length === 0 ? 'empty' : 'success',
        data: response.result.voicings,
        error: null,
        provenance: response.result.provenance,
        diagnostics: {
          candidateCount: response.result.candidateCount,
          evaluatedLeaves: response.result.evaluatedLeaves,
          searchBudget: response.result.searchBudget,
          searchExhausted: response.result.searchExhausted,
          budgetReached: response.result.budgetReached,
          searchStrategy: response.result.searchStrategy,
          truncated: response.result.truncated,
          gateDiagnostics: response.result.gateDiagnostics
        }
      };
      cache.current.set(cacheKey, nextState);
      if (cache.current.size > 24) cache.current.delete(cache.current.keys().next().value!);
      setState(nextState);
    };

    worker.onerror = (event) => {
      event.preventDefault();
      setState((current) => ({
        ...current,
        status: 'error',
        error: event.message || 'The voicing worker stopped unexpectedly.',
        provenance: null,
        diagnostics: null
      }));
    };

    const message: VoicingWorkerRequest = { requestId, request: deferredRequest };
    worker.postMessage(message);

    return () => worker.terminate();
  }, [deferredRequest]);

  return state;
}
