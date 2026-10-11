import { ComputeEngine } from '@cortex-js/compute-engine';
import type { GeneratedValue, InstantiatedMath } from '../contracts/types.js';
import { parseDisplayInput } from './input.js';
import type { MathInputContext, MathSyntax } from './input.js';
import {
  admitSource,
  encode,
  explicitProducts,
  MathFailure,
} from './substitution.js';
import type { InstantiationMathDiagnostic } from './substitution.js';

const relations = new Set([
  'Equal',
  'NotEqual',
  'Less',
  'LessEqual',
  'Greater',
  'GreaterEqual',
]);
/** No evaluation/canonicalization: a successful display is never a domain/value proof. */
export function instantiateDisplayMath(
  source: string,
  context: MathInputContext,
  values: Readonly<Record<string, GeneratedValue>>,
  path: string,
  relation = false,
):
  | { ok: true; value: InstantiatedMath }
  | { ok: false; diagnostics: InstantiationMathDiagnostic[] } {
  const parsed = parseDisplayInput(source, context);
  const fail = (
    code: InstantiationMathDiagnostic['code'],
    message: string,
  ) => ({ ok: false as const, diagnostics: [{ code, path, message }] });
  if (!parsed.ok)
    return {
      ok: false,
      diagnostics: parsed.diagnostics.map((d) => ({ ...d, path })),
    };
  let root = parsed.syntax;
  while (Array.isArray(root) && root[0] === 'Delimiter' && root.length === 2)
    root = root[1]!;
  if (relation !== (Array.isArray(root) && relations.has(String(root[0]))))
    return fail(
      'unsupported',
      relation
        ? 'A displayed equation/system requires a relation.'
        : 'A formula must be scalar, without a relation.',
    );
  const invalidRelation = (node: MathSyntax, top = true): boolean => {
    if (!Array.isArray(node)) return false;
    const items = node as readonly MathSyntax[];
    if (relations.has(String(items[0])) && (!top || items.length !== 3))
      return true;
    return items.slice(1).some((child) => invalidRelation(child, false));
  };
  if (invalidRelation(root))
    return fail(
      'unsupported',
      'Only a binary top-level relation with scalar operands is admitted.',
    );
  try {
    admitSource(source, path);
    const ce = new ComputeEngine();
    ce.iterationLimit = 1024;
    ce.recursionLimit = 64;
    const replacements = Object.create(null) as Record<string, MathSyntax>;
    for (const name of parsed.symbols.parameters) {
      const value = values[name];
      if (!value)
        return fail('missing-variable', `Missing generated parameter ${name}.`);
      replacements[name] =
        value.kind === 'rational'
          ? ['Rational', value.numerator, value.denominator]
          : value.kind === 'decimal'
            ? ['Rational', value.coefficient, 10 ** value.precision]
            : encode(value.value, path);
    }
    const expression = explicitProducts(ce, encode(parsed.syntax, path), path);
    const substituted = expression.subs(replacements, { canonical: false });
    let count = 0;
    const bounded = (node: MathSyntax, depth: number): boolean => {
      if (++count > 128 || depth > 16) return false;
      if (!Array.isArray(node)) return true;
      const items = node as readonly MathSyntax[];
      return items.slice(1).every((child) => bounded(child, depth + 1));
    };
    if (!bounded(substituted.json, 0))
      return fail('limit', 'Display math exceeds 128 nodes or depth 16.');
    const displayLatex = substituted.toLatex();
    if (displayLatex.length > 4096)
      return fail('limit', 'Display LaTeX exceeds 4096 characters.');
    return {
      ok: true,
      value: {
        source,
        syntax: parsed.syntax,
        substituted: substituted.json,
        displayLatex,
      },
    };
  } catch (error) {
    // Numeric lexical admission uses the same typed diagnostics as exact substitution.
    if (error instanceof MathFailure)
      return { ok: false, diagnostics: [error.diagnostic] };
    return fail(
      'substitution-failed',
      'The display formula could not be substituted safely.',
    );
  }
}
