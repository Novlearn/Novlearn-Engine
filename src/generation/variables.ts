import type {
  ContractDiagnostic,
  ComputedVariableDefinition,
  ComputedBinding,
  RationalValue,
  GeneratedValue,
} from '../contracts/types.js';
import {
  generationNames,
  validateGeneration,
} from '../contracts/generation.js';
import { validate } from '../contracts/validation.js';
import {
  instantiateMath,
  prepareScalarExpression,
} from '../math/substitution.js';
import type { InstantiationMathDiagnostic } from '../math/substitution.js';
import { numericOrder } from '../math/comparison.js';
import { generateCandidates, ResolutionFailure } from './candidates.js';
export interface GenerateVariablesOptions {
  seed: number | string;
  generationVersion?: 'mulberry32-rejection-v1';
}
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

export interface GenerationReplay {
  engineVersion: '0.1.0';
  generationVersion: 'mulberry32-rejection-v1';
  seed: string;
  draws: number;
  attempts: number;
}
export type GenerateVariablesResult =
  | {
      ok: true;
      values: Record<string, GeneratedValue>;
      groups: import('../contracts/types.js').GeneratedGroup[];
      computed: ComputedBinding[];
      replay: GenerationReplay;
    }
  | {
      ok: false;
      diagnostics: GenerationDiagnostic[];
      replay?: GenerationReplay;
    };
function definitionDiagnostic(d: ContractDiagnostic): GenerationDiagnostic {
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

function diagnostic(d: InstantiationMathDiagnostic): GenerationDiagnostic {
  const code: GenerationDiagnostic['code'] =
    d.code === 'limit'
      ? 'limit'
      : d.code === 'undefined-expression' || d.code === 'non-finite'
        ? 'undefined-expression'
        : d.code === 'unsupported'
          ? 'unsupported-expression'
          : d.code === 'not-calculable'
            ? 'indeterminate-expression'
            : d.code === 'substitution-failed'
              ? 'evaluation-failed'
              : 'invalid-expression';
  return {
    path: d.path,
    code,
    message: d.message + (d.symbol ? ` (${d.symbol})` : ''),
  };
}

/** Resolve one canonical definition: validate, prepare, draw, calculate, constrain. */
export function generateVariables(
  input: unknown,
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
        o.generationVersion !== 'mulberry32-rejection-v1'
      )
        v.issue(
          '/generationVersion',
          'unknown-version',
          'Expected mulberry32-rejection-v1.',
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
  const seed = String(checkedOptions.value.seed);
  const replay = {
    engineVersion: '0.1.0' as const,
    generationVersion: 'mulberry32-rejection-v1' as const,
    seed,
    draws: 0,
    attempts: 0,
  };
  const checked = validateGeneration(input);
  if (!checked.ok)
    return {
      ok: false,
      diagnostics: checked.diagnostics.map(definitionDiagnostic),
      replay,
    };
  const d = checked.value;
  const names = generationNames(d);
  const plans: {
    definition: ComputedVariableDefinition;
    path: string;
    binding: ComputedBinding;
  }[] = [];
  const failures: GenerationDiagnostic[] = [];
  for (const [i, p] of d.definitions.entries())
    if (p.kind === 'computed') {
      const path = `/definitions/${i}/latex`;
      const prepared = prepareScalarExpression(p.latex, names, path);
      if (!prepared.ok)
        failures.push(
          ...prepared.diagnostics.map((issue) => ({
            ...diagnostic(issue),
            message: `Computed ${p.name}: ${diagnostic(issue).message}`,
          })),
        );
      else
        plans.push({
          definition: p,
          path,
          binding: { name: p.name, dependencies: prepared.dependencies },
        });
    }
  for (const [i, c] of d.constraints.entries())
    for (const key of ['left', 'right'] as const) {
      const op = c[key];
      if ('latex' in op) {
        const prepared = prepareScalarExpression(
          op.latex,
          names,
          `/constraints/${i}/${key}/latex`,
        );
        if (!prepared.ok)
          failures.push(...prepared.diagnostics.map(diagnostic));
      }
    }
  if (failures.length)
    return { ok: false, diagnostics: failures.slice(0, 128), replay };
  // Kahn's algorithm; declaration order breaks ties among ready computed nodes.
  const ready = new Set(
    names.filter((name) => !plans.some((p) => p.binding.name === name)),
  );
  const pending = [...plans];
  const ordered: typeof plans = [];
  while (pending.length) {
    const i = pending.findIndex((p) =>
      p.binding.dependencies.every((n) => ready.has(n)),
    );
    if (i < 0)
      return {
        ok: false,
        replay,
        diagnostics: pending.map((p) => ({
          code: 'dependency-cycle',
          path: p.path,
          message: `Computed ${p.binding.name} is blocked by a dependency cycle among: ${pending.map((n) => n.binding.name).join(', ')}.`,
        })),
      };
    const p = pending.splice(i, 1)[0]!;
    ordered.push(p);
    ready.add(p.binding.name);
  }
  const expression = (
    source: string,
    values: Record<string, GeneratedValue>,
    path: string,
  ): RationalValue => {
    let result: ReturnType<typeof instantiateMath>;
    try {
      result = instantiateMath(
        source,
        { parameters: names },
        values,
        path,
        true,
      );
    } catch {
      throw new ResolutionFailure({
        path,
        code: 'evaluation-failed',
        message: 'The math boundary failed to evaluate this expression.',
      });
    }
    if (!result.ok)
      throw new ResolutionFailure(diagnostic(result.diagnostics[0]!));
    if (!result.exact)
      throw new ResolutionFailure({
        path,
        code: 'indeterminate-expression',
        message: 'No exact rational value was established.',
      });
    return result.exact;
  };
  return generateCandidates(d, seed, {
    computed: ordered.map((p) => p.binding),
    expression,
    resolve(values) {
      let accepted = true;
      // Each formula is evaluated once per complete candidate, never per question.
      const compare = ordered.some((p) => p.definition.restrictions)
        ? numericOrder()
        : undefined;
      for (const p of ordered) {
        const value = expression(p.definition.latex, values, p.path);
        values[p.definition.name] = value;
        const r = p.definition.restrictions;
        if (!r) continue;
        const path = p.path.slice(0, -'/latex'.length) + '/restrictions';
        const order = (n: number): -1 | 0 | 1 => {
          let result: -1 | 0 | 1 | undefined;
          try {
            result = compare!(value, { kind: 'choice', value: n });
          } catch {
            throw new ResolutionFailure({
              path,
              code: 'evaluation-failed',
              message: 'Result restriction evaluation failed.',
            });
          }
          if (result === undefined)
            throw new ResolutionFailure({
              path,
              code: 'indeterminate-constraint',
              message: 'Result restriction is indeterminate.',
            });
          return result;
        };
        if (r.domain === 'integer' && value.denominator !== 1) accepted = false;
        if (r.min !== undefined && order(r.min) < 0) accepted = false;
        if (r.max !== undefined && order(r.max) > 0) accepted = false;
        for (const n of r.exclusions ?? [])
          if (order(n) === 0) accepted = false;
      }
      return accepted;
    },
  });
}
