import type { VoicingRequest, VoicingSearchResult } from '@guitar-paradigm/core';

export interface VoicingWorkerRequest {
  requestId: number;
  request: VoicingRequest;
}

export type VoicingWorkerResponse = {
  requestId: number;
  ok: true;
  result: VoicingSearchResult;
} | {
  requestId: number;
  ok: false;
  error: string;
};
