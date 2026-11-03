import { ComputeEngine } from '@cortex-js/compute-engine';
import type { Expression } from '@cortex-js/compute-engine';
import type { GeneratedValue, InstantiatedMath } from '../contracts/types.js';
import { parseAlgebraInput } from './input.js';
import type { MathInputContext, MathSyntax } from './input.js';
import {
  admitSource,
  MathFailure,
  substituteParameters,
} from './substitution.js';
import type { InstantiationMathDiagnostic } from './substitution.js';
import {
  exactNumber,
  exactOrder,
  numericOrder,
  prepareNumeric,
} from './numeric.js';
import type { PreparedNumeric } from './numeric.js';
import { compareFiniteSets, normalizeIntervals } from './collections.js';
import type { PreparedCollection, NumericInterval } from './collections.js';

export type AlgebraKind =
  'polynomial' | 'rational-function' | 'equation' | 'inequality';
export function algebraKind(kind: string): AlgebraKind | undefined {
  return kind === 'expression'
    ? 'polynomial'
    : kind === 'rational-expression'
      ? 'rational-function'
      : kind === 'equation' || kind === 'inequality'
        ? kind
        : undefined;
}
export function prepareComparisonDomain(
  sources: readonly string[],
  parameters: readonly string[],
  values: Readonly<Record<string, GeneratedValue>>,
  path: string,
):
  | { ok: true; value: PreparedNumeric[] }
  | { ok: false; diagnostics: InstantiationMathDiagnostic[] } {
  if (sources.length > 64)
    return {
      ok: false,
      diagnostics: [
        { code: 'limit', path, message: 'At most 64 excluded domain points.' },
      ],
    };
  const points: PreparedNumeric[] = [];
  for (const [i, source] of sources.entries()) {
    const point = prepareNumeric(
      source,
      { parameters },
      values,
      `${path}/${i}`,
      false,
    );
    if (!point.ok) return point;
    points.push(point.value);
  }
  return { ok: true, value: points };
}
export interface PreparedAlgebra {
  math: InstantiatedMath;
  variable: string;
  numerator: Expression;
  denominator: Expression;
  exclusions: PreparedNumeric[];
  solutions?: PreparedCollection;
}
type AlgebraResult =
  | { ok: true; value: PreparedAlgebra }
  | { ok: false; diagnostics: InstantiationMathDiagnostic[] };
function fail(
  code: InstantiationMathDiagnostic['code'],
  path: string,
  message: string,
): never {
  throw new MathFailure({ code, path, message });
}
function coefficients(
  expression: Expression,
  variable: string,
  path: string,
  degreeLimit = 16,
  derived = false,
): readonly Expression[] {
  const coefficients = expression.polynomialCoefficients(variable);
  if (!coefficients)
    fail(
      'unsupported',
      path,
      'An exact univariate rational polynomial is required.',
    );
  const result = coefficients.map((c) => c.evaluate());
  if (
    !result.every(
      (c) => !!c.toRational() && exactNumber(c, !derived) !== undefined,
    )
  )
    fail('unsupported', path, 'Coefficients must be bounded exact rationals.');
  // Cortex can retain zero leading coefficients of a cancelled polynomial.
  while (result.length > 1 && sign(result[0]!, path) === 0) result.shift();
  if (result.length > degreeLimit + 1)
    fail('limit', path, 'Polynomial degree exceeds its proof budget.');
  return result;
}
function sign(expression: Expression, path: string): -1 | 0 | 1 {
  const value = exactNumber(expression.evaluate());
  const order = value === undefined ? undefined : exactOrder(value, 0);
  if (order === undefined)
    fail('not-calculable', path, 'The exact rational sign is unproved.');
  return order;
}
function scalar(
  ce: ComputeEngine,
  node: MathSyntax,
  path: string,
  allowInfinity = false,
): PreparedNumeric {
  const result = prepareNumeric(
    ce.box(node, { form: 'raw' }).toLatex({
      invisibleMultiply: '\\cdot',
      multiply: '\\cdot',
      digitGroupSeparator: '',
    }),
    {},
    {},
    path,
    allowInfinity,
  );
  if (!result.ok) throw new MathFailure(result.diagnostics[0]!);
  return result.value;
}
interface Roots {
  all: boolean;
  values: PreparedNumeric[];
  leading: -1 | 0 | 1;
  degree: number;
}
/** Degree 0/1/2 only. Cortex coefficients, arithmetic and square roots; no generic solver. */
function realRoots(
  ce: ComputeEngine,
  expression: Expression,
  variable: string,
  path: string,
): Roots {
  const c = coefficients(expression, variable, path, 2);
  const degree = c.length - 1;
  const leading = sign(c[0]!, path);
  if (degree === 0) return { all: leading === 0, values: [], leading, degree };
  if (leading === 0)
    fail(
      'not-calculable',
      path,
      'The polynomial coefficient representation is not normalized.',
    );
  if (degree === 1)
    return {
      all: false,
      values: [
        scalar(ce, ['Divide', ['Negate', c[1]!.json], c[0]!.json], path),
      ],
      leading,
      degree,
    };
  const [a, b, d] = c as readonly [Expression, Expression, Expression];
  const discriminant = ce
    .box(['Subtract', ['Square', b.json], ['Multiply', 4, a.json, d.json]])
    .evaluate();
  const discriminantSign = sign(discriminant, path);
  if (discriminantSign < 0) return { all: false, values: [], leading, degree };
  const root = (negative: boolean) =>
    scalar(
      ce,
      [
        'Divide',
        [
          negative ? 'Subtract' : 'Add',
          ['Negate', b.json],
          ['Sqrt', discriminant.json],
        ],
        ['Multiply', 2, a.json],
      ],
      path,
    );
  const values =
    discriminantSign === 0 ? [root(false)] : [root(true), root(false)];
  values.sort((x, y) => {
    const order = numericOrder(x, y);
    if (order === undefined)
      fail('not-calculable', path, 'The quadratic root order is unproved.');
    return order;
  });
  return { all: false, values, leading, degree };
}
function relationAccepts(head: string, value: -1 | 0 | 1): boolean {
  return head === 'Equal'
    ? value === 0
    : head === 'NotEqual'
      ? value !== 0
      : head === 'Less'
        ? value < 0
        : head === 'LessEqual'
          ? value <= 0
          : head === 'Greater'
            ? value > 0
            : value >= 0;
}
function relationSolutions(
  ce: ComputeEngine,
  expression: Expression,
  variable: string,
  path: string,
  head: string,
  math: InstantiatedMath,
): PreparedCollection {
  const roots = realRoots(ce, expression, variable, path);
  const negativeInfinity = scalar(ce, 'NegativeInfinity', path, true),
    positiveInfinity = scalar(ce, 'PositiveInfinity', path, true);
  const intervals: NumericInterval[] = [];
  const boundary = [negativeInfinity, ...roots.values, positiveInfinity];
  if (roots.degree === 0) {
    if (relationAccepts(head, roots.leading))
      intervals.push({
        left: negativeInfinity,
        right: positiveInfinity,
        leftClosed: false,
        rightClosed: false,
      });
  } else {
    for (let i = 0; i < boundary.length - 1; i++) {
      // Quadratic signs alternate across simple roots, not a double root.
      const regionSign =
        roots.degree === 1
          ? i === 0
            ? -roots.leading
            : roots.leading
          : roots.values.length === 2 && i === 1
            ? -roots.leading
            : roots.leading;
      if (relationAccepts(head, regionSign as -1 | 1))
        intervals.push({
          left: boundary[i]!,
          right: boundary[i + 1]!,
          leftClosed: false,
          rightClosed: false,
        });
    }
    if (relationAccepts(head, 0))
      for (const value of roots.values)
        intervals.push({
          left: value,
          right: value,
          leftClosed: true,
          rightClosed: true,
        });
  }
  return {
    kind: 'intervals',
    items: roots.values,
    intervals: normalizeIntervals(intervals, path),
    math,
  };
}

/** Each raw denominator/base restriction is saved before Together or polynomial normalization. */
export function prepareAlgebra(
  source: string,
  context: MathInputContext,
  values: Readonly<Record<string, GeneratedValue>>,
  path: string,
  variable: string,
  kind: AlgebraKind,
): AlgebraResult {
  const parsed = parseAlgebraInput(source, context);
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
      parsed.symbols.parameters,
      values,
      path,
      true,
    );
    const raw = substituted.json;
    const exclusions: PreparedNumeric[] = [];
    const zeroRestrictions = (node: MathSyntax, p: string): void => {
      while (
        Array.isArray(node) &&
        node[0] === 'Delimiter' &&
        node.length === 2
      )
        node = node[1]!;
      if (Array.isArray(node) && node[0] === 'Multiply') {
        for (const child of (node as MathSyntax[]).slice(1))
          zeroRestrictions(child, p);
        return;
      }
      if (
        Array.isArray(node) &&
        (node[0] === 'Power' || node[0] === 'Square')
      ) {
        const exponent =
          node[0] === 'Square'
            ? 2
            : ce.box(node[2]!).evaluate().toRational()?.[0];
        if (exponent !== undefined && exponent > 0) {
          zeroRestrictions(node[1]!, p);
          return;
        }
      }
      const expression = ce.box(['Together', node]).evaluate();
      const roots = realRoots(ce, expression.numerator, variable, p);
      if (roots.all)
        fail(
          'undefined-expression',
          p,
          'The raw denominator or nonpositive-power base is identically zero.',
        );
      for (const root of roots.values) {
        if (!exclusions.some((other) => numericOrder(root, other) === 0))
          exclusions.push(root);
        if (exclusions.length > 64)
          fail('limit', p, 'At most 64 distinct domain exclusions.');
      }
    };
    const inspect = (node: MathSyntax, p: string): number => {
      if (typeof node === 'number') return 0;
      if (node === variable && (context.variables ?? []).includes(variable))
        return 1;
      if (!Array.isArray(node))
        fail(
          'unsupported',
          p,
          'Only rational coefficients and the official real variable are supported.',
        );
      const items = node as MathSyntax[];
      const head = String(items[0]);
      const args = items.slice(1);
      if (
        [
          'Equal',
          'NotEqual',
          'Less',
          'LessEqual',
          'Greater',
          'GreaterEqual',
        ].includes(head)
      )
        fail(
          'invalid-syntax',
          p,
          'Nested relations are not a binary response.',
        );
      const unary = ['Negate', 'Delimiter', 'Square', 'Sqrt'];
      const binary = ['Rational', 'Divide', 'Power', 'Root', 'Subtract'];
      if (
        (unary.includes(head) && args.length !== 1) ||
        (binary.includes(head) && args.length !== 2) ||
        (!unary.includes(head) &&
          !binary.includes(head) &&
          head !== 'Add' &&
          head !== 'Multiply')
      )
        fail(
          'unsupported',
          p,
          'Operator or nested relation outside the algebra profile.',
        );
      if ((head === 'Add' || head === 'Multiply') && args.length < 2)
        fail('invalid-syntax', p, 'An arithmetic operation requires operands.');
      const degrees = args.map((n, i) => inspect(n, `${p}/${i + 1}`));
      let degree =
        head === 'Multiply' || head === 'Divide'
          ? degrees.reduce((a, b) => a + b, 0)
          : Math.max(0, ...degrees);
      if (head === 'Divide' || head === 'Rational') {
        if (degrees[1]! > 0 && kind !== 'rational-function')
          fail(
            'unsupported',
            p,
            'Variable denominators require the rational-function response profile.',
          );
        zeroRestrictions(args[1]!, p);
      }
      if (head === 'Power' || head === 'Square') {
        const exponent =
          head === 'Square' ? 2 : ce.box(args[1]!).evaluate().toRational();
        const n =
          typeof exponent === 'number'
            ? exponent
            : exponent?.[1] === 1
              ? exponent[0]
              : undefined;
        if (n === undefined || !Number.isInteger(n) || Math.abs(n) > 16)
          fail(
            'unsupported',
            p,
            'An integer exponent from -16 to 16 is required.',
          );
        if (n <= 0) {
          if (degrees[0]! > 0 && kind !== 'rational-function')
            fail(
              'unsupported',
              p,
              'Nonpositive variable powers require a domain profile.',
            );
          zeroRestrictions(args[0]!, p);
        }
        degree = degrees[0]! * Math.abs(n);
      }
      if (degree > 16)
        fail('limit', p, 'Structural algebra degree budget exceeds 16.');
      if (degrees.every((d) => d === 0)) {
        const number = scalar(ce, node, p);
        if (
          number.infinity !== undefined ||
          !number.expression.evaluate().toRational()
        )
          fail('unsupported', p, 'An exact rational coefficient is required.');
      } else if (head === 'Sqrt' || head === 'Root')
        fail(
          'unsupported',
          p,
          'A variable radical is outside rational algebra.',
        );
      return degree;
    };
    let body = raw;
    let head: string | undefined;
    if (kind === 'equation' || kind === 'inequality') {
      while (
        Array.isArray(body) &&
        body[0] === 'Delimiter' &&
        body.length === 2
      )
        body = body[1]!;
      const allowed =
        kind === 'equation'
          ? ['Equal']
          : ['Less', 'LessEqual', 'Greater', 'GreaterEqual', 'NotEqual'];
      if (
        !Array.isArray(body) ||
        body.length !== 3 ||
        !allowed.includes(String(body[0]))
      )
        fail(
          'invalid-syntax',
          path,
          'An official binary relation of the requested type is required.',
        );
      const relation = body as MathSyntax[];
      head = String(relation[0]);
      inspect(relation[1]!, `${path}/left`);
      inspect(relation[2]!, `${path}/right`);
      body = ['Subtract', relation[1]!, relation[2]!];
    } else inspect(body, path);
    const expression = ce.box(['Together', body]).evaluate();
    const [numerator, denominator] = expression.numeratorDenominator;
    coefficients(numerator, variable, path);
    const denominatorCoefficients = coefficients(denominator, variable, path);
    if (denominatorCoefficients.every((c) => sign(c, path) === 0))
      fail('undefined-expression', path, 'The derived denominator is zero.');
    const displayLatex = (head ? substituted : expression).toLatex({
      digitGroup: 0,
    });
    if (!displayLatex || displayLatex.length > 4096)
      fail('limit', path, 'Algebra display exceeds its budget.');
    const math = {
      source,
      syntax: parsed.syntax,
      substituted: raw,
      displayLatex,
    };
    const solutions =
      head === undefined
        ? undefined
        : relationSolutions(ce, numerator, variable, path, head, math);
    return {
      ok: true,
      value: {
        math,
        variable,
        numerator,
        denominator,
        exclusions,
        ...(solutions === undefined ? {} : { solutions }),
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
              message: 'Algebra preparation failed.',
            },
      ],
    };
  }
}

export function compareAlgebraValues(
  a: PreparedAlgebra,
  b: PreparedAlgebra,
): boolean | undefined {
  if (a.variable !== b.variable) return undefined;
  const ce = new ComputeEngine();
  ce.iterationLimit = 1024;
  ce.recursionLimit = 64;
  const residual = ce.box([
    'Subtract',
    ['Multiply', a.numerator.json, b.denominator.json],
    ['Multiply', b.numerator.json, a.denominator.json],
  ]);
  const c = coefficients(residual, a.variable, '/proof', 32, true);
  return c.every((value) => sign(value, '/proof') === 0);
}
export function compareAlgebraDomains(
  a: PreparedAlgebra,
  b: PreparedAlgebra,
): boolean | undefined {
  return compareFiniteSets(a.exclusions, b.exclusions);
}
export function exclusionsCovered(
  holes: readonly PreparedNumeric[],
  excluded: readonly PreparedNumeric[],
): boolean | undefined {
  let unknown = false;
  for (const hole of holes) {
    const matches = excluded.map((point) => numericOrder(hole, point));
    if (matches.includes(0)) continue;
    if (matches.every((order) => order !== undefined)) return false;
    unknown = true;
  }
  return unknown ? undefined : true;
}
/** Restrict solution DATA to an explicitly imposed cofinite real domain. */
export function restrictSolutions(
  value: PreparedCollection,
  excluded: readonly PreparedNumeric[],
): PreparedCollection {
  let intervals = value.intervals;
  for (const point of excluded) {
    const next: NumericInterval[] = [];
    for (const interval of intervals) {
      const left = numericOrder(point, interval.left),
        right = numericOrder(point, interval.right);
      if (left === undefined || right === undefined)
        fail(
          'not-calculable',
          '/domain',
          'The domain restriction order is unproved.',
        );
      if (left < 0 || right > 0) {
        next.push(interval);
        continue;
      }
      if (left === 0) {
        next.push({ ...interval, leftClosed: false });
        continue;
      }
      if (right === 0) {
        next.push({ ...interval, rightClosed: false });
        continue;
      }
      next.push(
        { ...interval, right: point, rightClosed: false },
        { ...interval, left: point, leftClosed: false },
      );
    }
    intervals = normalizeIntervals(next, '/domain');
  }
  return { ...value, intervals };
}
