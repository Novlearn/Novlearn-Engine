import { ComputeEngine } from '@cortex-js/compute-engine';
import type { FormPolicy, GeneratedValue } from '../contracts/types.js';
import {
  prepareAlgebra,
  compareAlgebraValues,
  compareAlgebraDomains,
} from './algebra.js';
import { prepareNumeric, compareNumeric } from './numeric.js';
import type { MathInputContext, MathSyntax } from './input.js';
import { encode } from './substitution.js';
import type { InstantiationMathDiagnostic } from './substitution.js';

/** All alternatives must prove the SAME exact value and domain as the official answer. */
export function prepareFormReferences(
  policy: FormPolicy,
  expectedSource: string,
  context: MathInputContext,
  values: Readonly<Record<string, GeneratedValue>>,
  variable: string,
  polynomial: boolean,
):
  | { ok: true; value: MathSyntax[] }
  | { ok: false; diagnostics: InstantiationMathDiagnostic[] } {
  if (typeof policy !== 'object' || policy.kind !== 'accepted-latex')
    return { ok: true, value: [] };
  const failure = (): {
    ok: false;
    diagnostics: InstantiationMathDiagnostic[];
  } => ({
    ok: false,
    diagnostics: [
      {
        code: 'not-calculable',
        path: '/policy/form/latex',
        message:
          'Every accepted form must prove the official exact value and domain.',
      },
    ],
  });
  const references: MathSyntax[] = [];
  const ce = new ComputeEngine();
  ce.iterationLimit = 1024;
  ce.recursionLimit = 64;
  const substitutions = Object.create(null) as Record<string, MathSyntax>;
  for (const name of context.parameters ?? []) {
    const v = values[name];
    if (!v) return failure();
    substitutions[name] =
      v.kind === 'rational'
        ? ['Rational', v.numerator, v.denominator]
        : v.kind === 'decimal'
          ? ['Rational', v.coefficient, 10 ** v.precision]
          : encode(v.value, '/policy/form/latex');
  }
  if (polynomial) {
    const base = prepareAlgebra(
      expectedSource,
      context,
      values,
      '/expected',
      variable,
      'polynomial',
    );
    if (!base.ok) return base;
    for (const source of policy.latex) {
      const alternative = prepareAlgebra(
        source,
        context,
        values,
        '/policy/form/latex',
        variable,
        'polynomial',
      );
      if (
        !alternative.ok ||
        compareAlgebraValues(base.value, alternative.value) !== true ||
        compareAlgebraDomains(base.value, alternative.value) !== true
      )
        return failure();
      references.push(
        ce
          .box(alternative.value.math.syntax, { form: 'raw' })
          .subs(substitutions, { canonical: false }).json,
      );
    }
  } else {
    const base = prepareNumeric(
      expectedSource,
      context,
      values,
      '/expected',
      false,
    );
    if (!base.ok) return base;
    for (const source of policy.latex) {
      const alternative = prepareNumeric(
        source,
        context,
        values,
        '/policy/form/latex',
        false,
      );
      if (
        !alternative.ok ||
        compareNumeric(base.value, alternative.value).equal !== true
      )
        return failure();
      references.push(
        ce
          .box(alternative.value.math.syntax, { form: 'raw' })
          .subs(substitutions, { canonical: false }).json,
      );
    }
  }
  return { ok: true, value: references };
}
