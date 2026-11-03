import {
  ComputeEngine,
  isNumber,
  isSymbol,
  isFunction,
} from '@cortex-js/compute-engine';
import type { Expression } from '@cortex-js/compute-engine';
import type { GeneratedValue, InstantiatedMath } from '../contracts/types.js';
import type { MathInputContext, MathSyntax } from './input.js';
import { parseMathInput } from './input.js';
import {
  admitSource,
  MathFailure,
  substituteParameters,
} from './substitution.js';
import type { InstantiationMathDiagnostic } from './substitution.js';
import {
  exactNumber,
  exactOrder,
  prepareNumeric,
  compareNumeric,
} from './numeric.js';

export type ElementaryKind = 'geometric-expression' | 'elementary-positive';
interface PreparedElementary {
  math: InstantiatedMath;
  normal: Expression;
  variable: string;
  kind: ElementaryKind;
}
type Result =
  | { ok: true; value: PreparedElementary }
  | { ok: false; diagnostics: InstantiationMathDiagnostic[] };
function exactTree(e: Expression): boolean {
  if (isNumber(e)) return exactNumber(e) !== undefined;
  if (isSymbol(e)) return true;
  return isFunction(e) && e.ops.every(exactTree);
}
/** Positive-variable elementary identities or all-real positive-base exponentials.
 * Cortex owns parsing, substitution, canonicalization and expansion. Domain
 * guards run on every raw descendant BEFORE any cancellation or simplification.
 */
export function prepareElementary(
  source: string,
  context: MathInputContext,
  values: Readonly<Record<string, GeneratedValue>>,
  path: string,
  variable: string,
  kind: ElementaryKind,
): Result {
  const parsed = parseMathInput(source, context, 'school-latex-v1');
  if (!parsed.ok)
    return {
      ok: false,
      diagnostics: parsed.diagnostics.map((d) => ({ ...d, path })),
    };
  const fail = (
    code: InstantiationMathDiagnostic['code'],
    message: string,
  ): never => {
    throw new MathFailure({ code, path, message });
  };
  try {
    admitSource(source, path);
    const ce = new ComputeEngine();
    ce.iterationLimit = 1024;
    ce.recursionLimit = 64;
    ce.declare(variable, 'real');
    if (kind === 'elementary-positive')
      ce.assume(ce.box(['Greater', variable, 0]));
    const raw = substituteParameters(
      ce,
      parsed.syntax,
      context.parameters ?? [],
      values,
      path,
      true,
    );
    const integer = (n: MathSyntax): number | undefined => {
      const e = ce.box(n, { form: 'raw' }).canonical.evaluate();
      const value = exactNumber(e, true);
      if (typeof value === 'number' && Number.isSafeInteger(value))
        return value;
      const ratio = e.toRational();
      return ratio?.[1] === 1 ? Number(ratio[0]) : undefined;
    };
    const sign = (n: MathSyntax): -1 | 0 | 1 | undefined => {
      if (n === variable) return kind === 'elementary-positive' ? 1 : undefined;
      if (n === 'ExponentialE' || n === 'Pi') return 1;
      if (Array.isArray(n)) {
        const head = n[0],
          a = n.slice(1) as MathSyntax[];
        if (head === 'Delimiter') return sign(a[0]!);
        if (head === 'Exp') return 1;
        if (head === 'Negate') {
          const s = sign(a[0]!);
          return s === undefined ? undefined : s === 0 ? 0 : s === 1 ? -1 : 1;
        }
        if (head === 'Power' && sign(a[0]!) === 1) return 1;
        if (head === 'Sqrt' && sign(a[0]!) === 1) return 1;
        if (head === 'Multiply' || head === 'Divide' || head === 'Rational') {
          let product = 1;
          for (const node of a) {
            const s = sign(node);
            if (s === undefined) return undefined;
            product *= s;
          }
          return product === 0 ? 0 : product > 0 ? 1 : -1;
        }
        if (head === 'Add') {
          const ss = a.map(sign);
          if (ss.every((s) => s === 0 || s === 1) && ss.includes(1)) return 1;
          if (ss.every((s) => s === 0 || s === -1) && ss.includes(-1))
            return -1;
          if (ss.every((s) => s === 0)) return 0;
          if (a.every(nonnegative) && a.some((x) => sign(x) === 1)) return 1;
        }
      }
      if (ce.box(n, { form: 'raw' }).symbols.some((s) => s === variable))
        return undefined;
      const value = exactNumber(
        ce.box(n, { form: 'raw' }).canonical.evaluate(),
        true,
      );
      return value === undefined ? undefined : exactOrder(value, 0);
    };
    const nonnegative = (n: MathSyntax): boolean => {
      const s = sign(n);
      if (s === 0 || s === 1) return true;
      if (Array.isArray(n) && n[0] === 'Square') return true;
      if (Array.isArray(n) && n[0] === 'Power') {
        const e = integer(n[2]!);
        return e !== undefined && e > 0 && e % 2 === 0;
      }
      return false;
    };
    let nodes = 0;
    const inspect = (n: MathSyntax, depth = 0): void => {
      if (++nodes > 128 || depth > 16)
        fail('limit', 'Elementary expression budget exceeded.');
      if (typeof n === 'number') return;
      if (n === variable || n === 'ExponentialE' || n === 'Pi') return;
      if (!Array.isArray(n))
        fail(
          'unsupported',
          'Only the official real variable and exact constants are admitted.',
        );
      const items = n as readonly MathSyntax[];
      const head = String(items[0]),
        args = items.slice(1);
      const unary = ['Negate', 'Square', 'Sqrt', 'Ln', 'Exp', 'Delimiter'];
      const binary = ['Subtract', 'Divide', 'Rational', 'Power'];
      if (
        (unary.includes(head) && args.length !== 1) ||
        (binary.includes(head) && args.length !== 2) ||
        (!unary.includes(head) &&
          !binary.includes(head) &&
          !['Add', 'Multiply'].includes(head)) ||
        (['Add', 'Multiply'].includes(head) && args.length < 2)
      )
        fail(
          'unsupported',
          'Operator or arity outside the elementary profile.',
        );
      for (const a of args) inspect(a, depth + 1);
      if (
        ['Divide', 'Rational'].includes(head) &&
        ![1, -1].includes(sign(args[1]!) ?? 0)
      )
        fail(
          'unsupported',
          'The denominator must be nonzero on the whole official domain.',
        );
      if (head === 'Ln' && sign(args[0]!) !== 1)
        fail(
          'unsupported',
          'The logarithm argument must be positive on the whole official domain.',
        );
      if (head === 'Sqrt' && !nonnegative(args[0]!))
        fail(
          'unsupported',
          'The radicand must be nonnegative on the whole official domain.',
        );
      if (head === 'Power') {
        const e = integer(args[1]!);
        if (e !== undefined) {
          if (Math.abs(e) > 16)
            fail('limit', 'Integer exponent exceeds sixteen.');
          if (e <= 0 && ![1, -1].includes(sign(args[0]!) ?? 0))
            fail(
              'unsupported',
              'A nonpositive power requires a nonzero base everywhere.',
            );
        } else if (sign(args[0]!) !== 1)
          fail(
            'unsupported',
            'A noninteger or variable exponent requires a positive base everywhere.',
          );
      }
    };
    inspect(raw.json);
    const normal = ce.box(['Expand', raw.canonical.json]).evaluate().simplify();
    if (!normal.isValid || !exactTree(normal))
      fail('not-calculable', 'No exact symbolic normal form was obtained.');
    nodes = 0;
    inspect(normal.json);
    const displayLatex = normal.toLatex({ digitGroup: 0 });
    if (!displayLatex || displayLatex.length > 4096)
      fail('limit', 'Elementary display exceeds its budget.');
    return {
      ok: true,
      value: {
        math: {
          source,
          syntax: parsed.syntax,
          substituted: raw.json,
          displayLatex,
        },
        normal,
        variable,
        kind,
      },
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        error instanceof MathFailure
          ? error.diagnostic
          : {
              code: 'substitution-failed',
              path,
              message: 'Elementary preparation failed.',
            },
      ],
    };
  }
}

/** Acceptance requires an exact symbolic identity. Exact integer counterexamples
 * may disprove a proposed identity; matching sample points NEVER prove one.
 */
export function compareElementary(
  a: PreparedElementary,
  b: PreparedElementary,
): {
  equal: boolean | undefined;
  proof: 'elementary-identity' | 'exact-counterexample' | 'none';
} {
  if (a.variable !== b.variable || a.kind !== b.kind)
    return { equal: undefined, proof: 'none' };
  // Rebox detached exact forms in ONE fresh scope: boxed symbol definitions
  // from separate preparations must never be compared by object identity.
  const ce = new ComputeEngine();
  ce.iterationLimit = 1024;
  ce.recursionLimit = 64;
  ce.declare(a.variable, 'real');
  if (a.kind === 'elementary-positive')
    ce.assume(ce.box(['Greater', a.variable, 0]));
  if (ce.box(a.normal.json).isSame(ce.box(b.normal.json)))
    return { equal: true, proof: 'elementary-identity' };
  for (const point of a.kind === 'geometric-expression'
    ? [0, 1, 2, 3]
    : [1, 2, 3, 5]) {
    const prepare = (e: Expression) =>
      prepareNumeric(
        e.subs({ [a.variable]: point }, { canonical: false }).toLatex({
          digitGroup: 0,
          invisibleMultiply: '\\cdot',
          multiply: '\\cdot',
        }),
        {},
        {},
        '/counterexample',
        false,
      );
    const aa = prepare(a.normal),
      bb = prepare(b.normal);
    if (aa.ok && bb.ok && compareNumeric(aa.value, bb.value).equal === false)
      return { equal: false, proof: 'exact-counterexample' };
  }
  return { equal: undefined, proof: 'none' };
}
