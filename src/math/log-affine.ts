import { ComputeEngine } from '@cortex-js/compute-engine';
import type { GeneratedValue, InstantiatedMath } from '../contracts/types.js';
import type { MathInputContext, MathSyntax } from './input.js';
import { parseMathInput } from './input.js';
import {
  admitSource,
  MathFailure,
  substituteParameters,
} from './substitution.js';
import type { InstantiationMathDiagnostic } from './substitution.js';
import { exactNumber, exactOrder } from './numeric.js';

interface PreparedLogAffine {
  math: InstantiatedMath;
  /** Descending coefficients: coefficient of ln(x), constant. Detached rationals. */
  coefficients: readonly [readonly [number, number], readonly [number, number]];
}
type Result =
  | { ok: true; value: PreparedLogAffine }
  | { ok: false; diagnostics: InstantiationMathDiagnostic[] };
function unwrap(node: MathSyntax): MathSyntax {
  while (Array.isArray(node) && node[0] === 'Delimiter' && node.length === 2)
    node = node[1]!;
  return node;
}
/** Proof profile A ln(x)+B over the intrinsic official comparison domain x>0. */
export function prepareLogAffine(
  source: string,
  context: MathInputContext,
  values: Readonly<Record<string, GeneratedValue>>,
  path: string,
  variable: string,
): Result {
  const fail = (
    code: InstantiationMathDiagnostic['code'],
    message: string,
  ): never => {
    throw new MathFailure({ code, path, message });
  };
  const parsed = parseMathInput(source, context, 'school-latex-v1');
  if (!parsed.ok)
    return {
      ok: false,
      diagnostics: parsed.diagnostics.map((d) => ({ ...d, path })),
    };
  try {
    admitSource(source, path);
    const ce = new ComputeEngine();
    ce.iterationLimit = 1024;
    ce.recursionLimit = 64;
    const substituted = substituteParameters(
      ce,
      parsed.syntax,
      context.parameters ?? [],
      values,
      path,
      true,
    );
    const raw = substituted.json;
    let count = 0;
    const rational = (node: MathSyntax): readonly [number, number] => {
      const expr = ce.box(node, { form: 'raw' }).canonical.evaluate();
      if (exactNumber(expr, true) === undefined)
        fail(
          'unsupported',
          'Closed coefficients must be bounded exact rationals.',
        );
      const ratio = expr.toRational();
      if (!ratio)
        throw new MathFailure({
          code: 'unsupported',
          path,
          message: 'Closed coefficients must be rational.',
        });
      const a = Number(ratio[0]),
        b = Number(ratio[1]);
      if (
        !Number.isSafeInteger(a) ||
        !Number.isSafeInteger(b) ||
        Math.abs(a) > 1e9 ||
        b <= 0 ||
        b > 1e9
      )
        fail('limit', 'Rational coefficient budget exceeded.');
      return [a, b];
    };
    const inspect = (node: MathSyntax, depth = 0): 0 | 1 => {
      if (++count > 128 || depth > 16)
        fail('limit', 'Log-affine syntax budget exceeded.');
      node = unwrap(node);
      if (typeof node === 'string')
        fail(
          'unsupported',
          'Free symbols are admitted only as the argument of ln.',
        );
      if (!Array.isArray(node)) {
        rational(node);
        return 0;
      }
      const head = String(node[0]),
        args = (node as MathSyntax[]).slice(1);
      if (head === 'Ln') {
        if (args.length !== 1 || unwrap(args[0]!) !== variable)
          fail(
            'unsupported',
            'Only ln of the official positive variable is admitted.',
          );
        return 1;
      }
      if (
        ![
          'Add',
          'Subtract',
          'Negate',
          'Multiply',
          'Divide',
          'Rational',
          'Power',
          'Square',
        ].includes(head)
      )
        fail('unsupported', 'Operator outside log-affine profile.');
      const degrees = args.map((n) => inspect(n, depth + 1));
      if (head === 'Divide' || head === 'Rational') {
        if (args.length !== 2 || degrees[1] !== 0)
          fail(
            'unsupported',
            'Denominators must be closed rational constants.',
          );
        const divisor = rational(args[1]!);
        if (divisor[0] === 0)
          fail('undefined-expression', 'Division by zero is not admitted.');
      }
      if (head === 'Multiply' && degrees.filter((d) => d === 1).length > 1)
        fail(
          'unsupported',
          'Products of logarithms are outside the affine profile.',
        );
      if (head === 'Power' || head === 'Square') {
        if (degrees.some((d) => d === 1))
          fail(
            'unsupported',
            'Powers of logarithms are outside the affine profile.',
          );
        const exponent = head === 'Square' ? [2, 1] : rational(args[1]!);
        if (exponent[1] !== 1 || Math.abs(exponent[0]!) > 16)
          fail(
            'unsupported',
            'Closed powers require integer exponents from -16 to 16.',
          );
        if (exponent[0]! <= 0 && rational(args[0]!)[0] === 0)
          fail(
            'undefined-expression',
            'Zero to a nonpositive power is undefined.',
          );
      }
      const degree = degrees.includes(1) ? 1 : 0;
      if (!degree) rational(node);
      return degree;
    };
    inspect(raw);
    // Admission has established domains before canonicalization/replacement.
    const atom = 'LogAtomInternal';
    const canonical = substituted.canonical;
    const replaced =
      canonical.replace([{ match: ['Ln', variable], replace: { sym: atom } }], {
        recursive: true,
      }) ?? canonical;
    const coefficients = replaced.polynomialCoefficients(atom);
    if (!coefficients || coefficients.length > 2)
      throw new MathFailure({
        code: 'unsupported',
        path,
        message: 'An affine logarithmic polynomial is required.',
      });
    const ratios = coefficients.map((c) => rational(c.json));
    const pair: PreparedLogAffine['coefficients'] =
      ratios.length === 2
        ? [ratios[0]!, ratios[1]!]
        : [[0, 1], ratios[0] ?? [0, 1]];
    return {
      ok: true,
      value: {
        math: {
          source,
          syntax: parsed.syntax,
          substituted: raw,
          displayLatex: canonical.latex,
        },
        coefficients: pair,
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
              message: 'Log-affine preparation failed.',
            },
      ],
    };
  }
}
export function compareLogAffine(
  a: PreparedLogAffine,
  b: PreparedLogAffine,
): boolean | undefined {
  // ln maps the comparison domain bijectively to R; rational coefficient equality is exact.
  const results = a.coefficients.map((c, i) => {
    const ce = new ComputeEngine();
    const left = exactNumber(ce.box(['Rational', ...c]).evaluate());
    const right = exactNumber(
      ce.box(['Rational', ...b.coefficients[i]!]).evaluate(),
    );
    if (left === undefined || right === undefined)
      throw new Error('Missing proved coefficient');
    const order = exactOrder(left, right);
    return order === undefined ? undefined : order === 0;
  });
  return results.includes(false)
    ? false
    : results.includes(undefined)
      ? undefined
      : true;
}
