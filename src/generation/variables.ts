import type { ContractDiagnostic } from '../contracts/types.js';
import { validateParameters } from '../contracts/parameters.js';
import { validate } from '../contracts/validation.js';
import { wordStream } from './random.js';
import { sampleScalar } from './scalar.js';
import { generateV2 } from './variables-v2.js';
import { generateV3 } from './variables-v3.js';
import type { RationalValueV1, ComputedBindingV3 } from '../contracts/types.js';
import type { GeneratedGroupV2 } from '../contracts/types.js';

export interface GenerateVariablesOptions {
  /** uint32, or its canonical base-10 spelling; no hashing or implicit coercion. */
  seed: number | string;
  generationVersion?: 'parameters-v1' | 'variables-v2' | 'variables-v3';
}

export type GeneratedValueV1 =
  | { kind: 'integer'; value: number }
  | { kind: 'decimal'; coefficient: number; precision: number }
  | { kind: 'choice'; value: number };

export type GeneratedValueV3 = GeneratedValueV1 | RationalValueV1;

export interface GenerationDiagnostic {
  path: string;
  code:
    | 'invalid-definition'
    | 'unsupported-type'
    | 'invalid-bounds'
    | 'empty-domain'
    | 'invalid-options'
    | 'unsupported-version'
    | 'limit'
    | 'attempts-exhausted'
    | 'indeterminate-constraint'
    | 'comparison-failed'
    | 'invalid-expression'
    | 'dependency-cycle'
    | 'undefined-expression'
    | 'unsupported-expression'
    | 'indeterminate-expression'
    | 'evaluation-failed';
  message: string;
}

export interface GenerationReplayV2 {
  engineVersion: '0.0.0';
  generationVersion: 'variables-v2';
  seed: string;
  draws: number;
  attempts: number;
}

export type GenerateVariablesResult =
  | {
      ok: true;
      values: Record<string, GeneratedValueV1>;
      replay: {
        engineVersion: '0.0.0';
        generationVersion: 'parameters-v1';
        seed: string;
        draws: number;
      };
    }
  | {
      ok: true;
      values: Record<string, GeneratedValueV1>;
      groups: GeneratedGroupV2[];
      replay: GenerationReplayV2;
    }
  | {
      ok: false;
      diagnostics: GenerationDiagnostic[];
      replay?: GenerationReplayV2 | GenerationReplayV3;
    }
  | {
      ok: true;
      values: Record<string, GeneratedValueV3>;
      groups: GeneratedGroupV2[];
      computed: ComputedBindingV3[];
      replay: GenerationReplayV3;
    };

export interface GenerationReplayV3 extends Omit<
  GenerationReplayV2,
  'generationVersion'
> {
  generationVersion: 'variables-v3';
}

export type GenerateVariablesResultV1 =
  | Extract<
      GenerateVariablesResult,
      { ok: true; replay: { generationVersion: 'parameters-v1' } }
    >
  | Extract<GenerateVariablesResult, { ok: false }>;
export type GenerateVariablesResultV2 =
  | Extract<
      GenerateVariablesResult,
      { ok: true; replay: { generationVersion: 'variables-v2' } }
    >
  | Extract<GenerateVariablesResult, { ok: false }>;

export type GenerateVariablesResultV3 =
  | Extract<
      GenerateVariablesResult,
      { ok: true; computed: ComputedBindingV3[] }
    >
  | Extract<GenerateVariablesResult, { ok: false }>;

export function definitionDiagnostic(
  d: ContractDiagnostic,
): GenerationDiagnostic {
  const code =
    d.code === 'limit'
      ? 'limit'
      : d.code === 'unknown-version'
        ? 'unsupported-version'
        : d.code === 'invalid-json'
          ? 'invalid-definition'
          : d.path.endsWith('/kind')
            ? 'unsupported-type'
            : d.code === 'impossible-constraints'
              ? 'empty-domain'
              : d.path.endsWith('/min') || d.path.endsWith('/max')
                ? 'invalid-bounds'
                : 'invalid-definition';
  return { ...d, code };
}

/** Generate parameters only. No expressions, instances, network or global random state.
 * Unknown inputs are runtime-validated, with no partial values on failure.
 */
export function generateVariables(
  definitions: unknown,
  options: GenerateVariablesOptions & { generationVersion?: 'parameters-v1' },
): GenerateVariablesResultV1;
export function generateVariables(
  definitions: unknown,
  options: GenerateVariablesOptions & { generationVersion: 'variables-v2' },
): GenerateVariablesResultV2;
export function generateVariables(
  definitions: unknown,
  options: GenerateVariablesOptions & { generationVersion: 'variables-v3' },
): GenerateVariablesResultV3;
export function generateVariables(
  definitions: unknown,
  options: GenerateVariablesOptions,
): GenerateVariablesResult;
export function generateVariables(
  definitions: unknown,
  options: GenerateVariablesOptions,
): GenerateVariablesResult {
  const checkedOptions = validate<GenerateVariablesOptions>(
    options,
    (v, data) => {
      const o = v.object(data, '', ['seed', 'generationVersion']);
      const seed = o.seed;
      if (
        !(
          typeof seed === 'number' &&
          Number.isInteger(seed) &&
          seed >= 0 &&
          seed <= 0xffff_ffff &&
          !Object.is(seed, -0)
        ) &&
        !(
          typeof seed === 'string' &&
          /^(0|[1-9][0-9]{0,9})$/.test(seed) &&
          seed === String(Number(seed)) &&
          Number(seed) <= 0xffff_ffff
        )
      )
        v.issue(
          '/seed',
          'value',
          'Seed must be a uint32 or its canonical decimal string.',
        );
      if (
        o.generationVersion !== undefined &&
        o.generationVersion !== 'parameters-v1' &&
        o.generationVersion !== 'variables-v2' &&
        o.generationVersion !== 'variables-v3'
      )
        v.issue(
          '/generationVersion',
          'unknown-version',
          'Supported versions: parameters-v1, variables-v2 and variables-v3.',
        );
    },
  );
  if (!checkedOptions.ok)
    return {
      ok: false,
      diagnostics: checkedOptions.diagnostics.map((d) => ({
        ...d,
        code:
          d.code === 'limit'
            ? 'limit'
            : d.code === 'unknown-version'
              ? 'unsupported-version'
              : 'invalid-options',
      })),
    };
  if (checkedOptions.value.generationVersion === 'variables-v2')
    return generateV2(definitions, String(checkedOptions.value.seed));
  if (checkedOptions.value.generationVersion === 'variables-v3')
    return generateV3(definitions, String(checkedOptions.value.seed));
  const checked = validateParameters(definitions);
  if (!checked.ok)
    return {
      ok: false,
      diagnostics: checked.diagnostics.map(definitionDiagnostic),
    };

  const stream = wordStream(Number(checkedOptions.value.seed));
  let draws = 0;
  const nextWord = (): number => {
    draws += 1;
    return stream();
  };
  const entries: [string, GeneratedValueV1][] = [];
  // Caller-supplied array order is part of the replay contract; object key order is irrelevant.
  for (const [index, parameter] of checked.value.entries()) {
    const value = sampleScalar(parameter, nextWord);
    if (value === undefined) return exhausted(index);
    entries.push([parameter.name, value]);
  }
  return {
    ok: true,
    values: Object.fromEntries(entries),
    replay: {
      engineVersion: '0.0.0',
      generationVersion: 'parameters-v1',
      seed: String(checkedOptions.value.seed),
      draws,
    },
  };
}

function exhausted(index: number): GenerateVariablesResult {
  return {
    ok: false,
    diagnostics: [
      {
        path: `/${index}`,
        code: 'limit',
        message:
          'Random rank rejection exceeded 128 words; no impossibility is inferred.',
      },
    ],
  };
}
