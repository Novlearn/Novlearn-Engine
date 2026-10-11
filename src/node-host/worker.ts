import { Buffer } from 'node:buffer';
import process from 'node:process';
import { TextDecoder } from 'node:util';
import * as engine from '../index.js';
import type { ExerciseInstance } from '../contracts/types.js';
import { boundedJson, object, request } from './protocol.js';

// One request, one process, one fresh mathematical context per engine call.
let id: string | null = null;
let value: unknown;
let error: string | undefined;
try {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    const data = Buffer.from(chunk);
    bytes += data.length;
    if (bytes > 1048576) throw new Error('input-limit');
    chunks.push(data);
  }
  const input: unknown = JSON.parse(
    new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)),
  );
  if (!boundedJson(input) || !request(input))
    throw new Error('invalid-request');
  id = input.requestId;
  const p = input.payload;
  const keys = Object.keys(p).sort().join(',');
  const need = (expected: string) => {
    if (keys !== expected) throw new Error('invalid-request');
  };
  switch (input.operation) {
    case 'validateDefinition':
      need('definition');
      value = engine.validateDefinition(p.definition);
      break;
    case 'validateSubmission':
      need('submission');
      value = engine.validateSubmission(p.submission);
      break;
    case 'parseMathInput': {
      need('context,profile,source');
      if (
        typeof p.source !== 'string' ||
        !object(p.context) ||
        (p.profile !== 'scalar-latex-v1' && p.profile !== 'school-latex-v1')
      )
        throw new Error('invalid-request');
      const contextKeys = Object.keys(p.context);
      if (contextKeys.some((key) => !['variables', 'parameters'].includes(key)))
        throw new Error('invalid-request');
      const context: { parameters?: string[]; variables?: string[] } = {};
      for (const name of ['parameters', 'variables'] as const) {
        const list = p.context[name];
        if (list === undefined) continue;
        if (
          !Array.isArray(list) ||
          !list.every((item) => typeof item === 'string')
        )
          throw new Error('invalid-request');
        context[name] = list;
      }
      value = engine.parseMathInput(p.source, context, p.profile);
      break;
    }
    case 'generateVariables': {
      need('definition,seed');
      if (
        typeof p.seed !== 'number' ||
        !Number.isSafeInteger(p.seed) ||
        p.seed < 0 ||
        p.seed > 0xffffffff
      )
        throw new Error('invalid-request');
      value = engine.generateVariables(p.definition, { seed: p.seed });
      break;
    }
    case 'instantiateExercise': {
      need('definition,instanceId,seed');
      if (
        typeof p.instanceId !== 'string' ||
        typeof p.seed !== 'number' ||
        !Number.isSafeInteger(p.seed) ||
        p.seed < 0 ||
        p.seed > 0xffffffff
      )
        throw new Error('invalid-request');
      value = engine.instantiateExercise(p.definition, {
        seed: p.seed,
        instanceId: p.instanceId,
      });
      break;
    }
    case 'projectPublicInstance':
      need('official');
      // Shape is not provenance: this channel MUST be private backend input.
      if (!object(p.official) || p.official.schemaVersion !== 5)
        throw new Error('invalid-request');
      value = engine.projectPublicInstance(
        p.official as unknown as ExerciseInstance,
      );
      break;
    case 'gradeAnswer':
      need('official,submission');
      if (!object(p.official) || p.official.schemaVersion !== 5)
        throw new Error('invalid-request');
      value = engine.gradeAnswer(
        p.official as unknown as ExerciseInstance,
        p.submission,
      );
      break;
  }
} catch (caught) {
  error =
    caught instanceof Error &&
    ['invalid-request', 'input-limit'].includes(caught.message)
      ? caught.message
      : 'worker-error';
}
const response = error
  ? { protocolVersion: 1, requestId: id, ok: false, error }
  : { protocolVersion: 1, requestId: id, ok: true, value };
process.stdout.write(JSON.stringify(response) + '\n');
