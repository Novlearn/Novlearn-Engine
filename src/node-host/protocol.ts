import type { JsonObject } from '../contracts/types.js';

export const PROTOCOL_VERSION = 1 as const;
export const operations = [
  'validateDefinition',
  'validateSubmission',
  'parseMathInput',
  'generateVariables',
  'instantiateExercise',
  'projectPublicInstance',
  'gradeAnswer',
  'adaptLegacyExercise',
] as const;
export type EngineOperation = (typeof operations)[number];
/** Private backend channel only. An official instance is never supplied by a browser. */
export interface EngineRequest {
  protocolVersion: 1;
  requestId: string;
  operation: EngineOperation;
  payload: JsonObject;
}
export function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function request(value: unknown): value is EngineRequest {
  if (
    !object(value) ||
    Object.keys(value).sort().join(',') !==
      'operation,payload,protocolVersion,requestId'
  )
    return false;
  return (
    value.protocolVersion === PROTOCOL_VERSION &&
    typeof value.requestId === 'string' &&
    /^[A-Za-z0-9_-]{1,64}$/.test(value.requestId) &&
    operations.includes(value.operation as EngineOperation) &&
    object(value.payload)
  );
}
/** Parsed JSON only; no getters. Complexity is checked before mathematical work. */
export function boundedJson(value: unknown): boolean {
  const pending: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  let nodes = 0;
  while (pending.length) {
    const item = pending.pop()!;
    if (++nodes > 32768 || item.depth > 64) return false;
    if (typeof item.value === 'number' && !Number.isFinite(item.value))
      return false;
    if (item.value !== null && typeof item.value === 'object') {
      for (const child of Object.values(item.value))
        pending.push({ value: child, depth: item.depth + 1 });
    }
  }
  return true;
}
