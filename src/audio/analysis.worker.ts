/// <reference lib="webworker" />
/**
 * Runs the offline analysis off the main thread so the interface stays smooth.
 */
import { analyzeSamples } from './analysis';

export interface AnalysisRequest {
  samples: Float32Array;
  sampleRate: number;
}

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = (event: MessageEvent<AnalysisRequest>) => {
  try {
    scope.postMessage({ result: analyzeSamples(event.data.samples, event.data.sampleRate) });
  } catch (error) {
    scope.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
