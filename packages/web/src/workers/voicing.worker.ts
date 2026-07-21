import { generateVoicingsDetailed } from '@guitar-paradigm/core';
import type { VoicingWorkerRequest, VoicingWorkerResponse } from './voicingWorkerProtocol';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The solver failed with an unknown error.';
}

self.onmessage = (event: MessageEvent<VoicingWorkerRequest>) => {
  const { requestId, request } = event.data;
  let response: VoicingWorkerResponse;

  try {
    response = {
      requestId,
      ok: true,
      result: generateVoicingsDetailed(request)
    };
  } catch (error) {
    response = {
      requestId,
      ok: false,
      error: errorMessage(error)
    };
  }

  self.postMessage(response);
};
