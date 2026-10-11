import { createExecutor } from './executor.js';
import type { HostLimits, NodeHost } from './executor.js';
export type {
  HostLimits,
  HostError,
  HostMetrics,
  HostResult,
  NodeHost,
} from './executor.js';
export type { EngineRequest, EngineOperation } from './protocol.js';
/** Windows 10+/x64 OS quota adapter. Other platforms fail closed, never run unbounded. */
export function createNodeHost(limits: Partial<HostLimits> = {}): NodeHost {
  return createExecutor(new URL('./worker.js', import.meta.url), limits);
}
