import type { ContractDiagnostic } from '../contracts/types.js';
import { decimalGrid } from '../contracts/decimal-grid.js';
import { validateParameters } from '../contracts/parameters.js';
import { validate } from '../contracts/validation.js';
import { sampleIndex, wordStream } from './random.js';

export interface GenerateVariablesOptions {
  /** uint32, or its canonical base-10 spelling; no hashing or implicit coercion. */
  seed: number | string;
  generationVersion?: 'parameters-v1';
}

export type GeneratedValueV1 =
  | { kind: 'integer'; value: number }
  | { kind: 'decimal'; coefficient: number; precision: number }
  | { kind: 'choice'; value: number };

export interface GenerationDiagnostic {
  path: string;
  code:
    | 'invalid-definition'
    | 'unsupported-type'
    | 'invalid-bounds'
    | 'empty-domain'
    | 'invalid-options'
    | 'unsupported-version'
    | 'limit';
  message: string;
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
  | { ok: false; diagnostics: GenerationDiagnostic[] };

function definitionDiagnostic(d: ContractDiagnostic): GenerationDiagnostic {
  const code =
    d.code === 'limit'
      ? 'limit'
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
        o.generationVersion !== 'parameters-v1'
      )
        v.issue(
          '/generationVersion',
          'unknown-version',
          'Only parameters-v1 is supported.',
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
    let value: GeneratedValueV1;
    if (parameter.kind === 'choice') {
      const rank = sampleIndex(parameter.values.length, nextWord);
      if (rank === undefined) return exhausted(index);
      // The rank is strictly below the validated non-empty array length.
      const chosen = parameter.values[rank]!;
      value = { kind: 'choice', value: chosen === 0 ? 0 : chosen };
    } else {
      const precision = parameter.kind === 'decimal' ? parameter.precision : 0;
      const min =
        parameter.kind === 'decimal'
          ? decimalGrid(parameter.min, precision).ceil
          : parameter.min;
      const max =
        parameter.kind === 'decimal'
          ? decimalGrid(parameter.max, precision).floor
          : parameter.max;
      const exclusions = parameter.exclusions
        .map((n) =>
          parameter.kind === 'decimal' ? decimalGrid(n, precision).floor : n,
        )
        .sort((a, b) => a - b);
      const rank = sampleIndex(max - min + 1 - exclusions.length, nextWord);
      if (rank === undefined) return exhausted(index);
      let coefficient = min + rank;
      // Select directly from the complement of exclusions, without enumerating the domain.
      for (const excluded of exclusions) {
        if (excluded > coefficient) break;
        coefficient += 1;
      }
      value =
        parameter.kind === 'integer'
          ? { kind: 'integer', value: coefficient === 0 ? 0 : coefficient }
          : {
              kind: 'decimal',
              coefficient: coefficient === 0 ? 0 : coefficient,
              precision,
            };
    }
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
