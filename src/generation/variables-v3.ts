import {
  resolvedNames,
  validateGenerationV3,
} from '../contracts/generation-v3.js';
import type {
  ComputedParameterV3,
  ComputedBindingV3,
  RationalValueV1,
} from '../contracts/types.js';
import {
  instantiateMath,
  prepareScalarExpression,
} from '../math/substitution.js';
import type { InstantiationMathDiagnostic } from '../math/substitution.js';
import { numericOrder } from '../math/comparison.js';
import { generateCandidates, ResolutionFailure } from './variables-v2.js';
import { definitionDiagnostic } from './variables.js';
import type {
  GenerateVariablesResult,
  GeneratedValueV3,
  GenerationDiagnostic,
} from './variables.js';

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

/** Resolve one common candidate context, independent of exercise elements. */
export function generateV3(
  input: unknown,
  seed: string,
): GenerateVariablesResult {
  const replay = {
    engineVersion: '0.0.0' as const,
    generationVersion: 'variables-v3' as const,
    seed,
    draws: 0,
    attempts: 0,
  };
  const checked = validateGenerationV3(input);
  if (!checked.ok)
    return {
      ok: false,
      diagnostics: checked.diagnostics.map(definitionDiagnostic),
      replay,
    };
  const d = checked.value;
  const names = resolvedNames(d);
  const plans: {
    definition: ComputedParameterV3;
    path: string;
    binding: ComputedBindingV3;
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
    values: Record<string, GeneratedValueV3>,
    path: string,
  ): RationalValueV1 => {
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
  const paths = d.definitions.flatMap((p, i) =>
    p.kind === 'computed' ? [] : [i],
  );
  const definitions = d.definitions.filter((p) => p.kind !== 'computed');
  return generateCandidates({ ...d, schemaVersion: 2, definitions }, seed, {
    paths,
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
        const path = p.path.replace(/\/latex$/, '/restrictions');
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
