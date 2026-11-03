import {
  ComputeEngine,
  isNumber,
  isSymbol,
  isFunction,
} from '@cortex-js/compute-engine';
import type { Expression, NumericValue } from '@cortex-js/compute-engine';
import type {
  GeneratedValue,
  InstantiatedMath,
  NumericComparison,
} from '../contracts/types.js';
import { parseNumericInput } from './input.js';
import type { MathInputContext, MathSyntax } from './input.js';
import {
  admitSource,
  encode,
  explicitProducts,
  MathFailure,
} from './substitution.js';
import type { InstantiationMathDiagnostic } from './substitution.js';

type Exact = number | NumericValue;
export interface PreparedNumeric {
  math: InstantiatedMath;
  infinity?: -1 | 1;
  /** Internal only: no boxed expression leaves the package root. */
  expression: Expression;
  exact?: Exact;
  bounds?: readonly [Expression, Expression];
}
type NumericResult =
  | { ok: true; value: PreparedNumeric }
  | { ok: false; diagnostics: InstantiationMathDiagnostic[] };

function fail(
  code: InstantiationMathDiagnostic['code'],
  path: string,
  message: string,
): never {
  throw new MathFailure({ code, path, message });
}
function boundedInteger(value: unknown): boolean {
  return (
    (typeof value === 'number' &&
      Number.isSafeInteger(value) &&
      Math.abs(value) <= 1_000_000_000) ||
    (typeof value === 'bigint' &&
      value >= -1_000_000_000n &&
      value <= 1_000_000_000n)
  );
}
/** Recognize the exact real q sqrt(d) lane; floats never acquire an exact claim. */
export function exactNumber(
  expression: Expression,
  inputBudget = false,
): Exact | undefined {
  if (!isNumber(expression)) return undefined;
  const n = expression.numericValue;
  if (typeof n === 'number')
    return Number.isSafeInteger(n) && (!inputBudget || boundedInteger(n))
      ? n
      : undefined;
  if (
    !n.isExact ||
    n.isComplex ||
    n.isNaN ||
    n.isPositiveInfinity ||
    n.isNegativeInfinity ||
    n.isComplexInfinity
  )
    return undefined;
  const witness = n.asExact;
  if (!witness || !('rational' in witness) || !('radical' in witness))
    return undefined;
  const rational = witness.rational;
  const radical = witness.radical;
  if (
    !Array.isArray(rational) ||
    rational.length !== 2 ||
    typeof radical !== 'number' ||
    !Number.isSafeInteger(radical) ||
    radical < 1
  )
    return undefined;
  if (
    inputBudget &&
    (!rational.every(boundedInteger) || radical > 1_000_000_000)
  )
    return undefined;
  // Derived proof arithmetic is bounded separately, including exact tolerance products.
  if (
    !rational.every(
      (x) =>
        (typeof x === 'number' && Number.isSafeInteger(x)) ||
        (typeof x === 'bigint' && x.toString(2).length <= 256),
    )
  )
    return undefined;
  return n;
}
export function exactOrder(a: Exact, b: Exact): -1 | 0 | 1 | undefined {
  if (typeof a === 'number' && typeof b === 'number')
    return a === b ? 0 : a < b ? -1 : 1;
  if (typeof a === 'number') {
    const reverse = exactOrder(b, a);
    return reverse === undefined
      ? undefined
      : reverse === 0
        ? 0
        : reverse === 1
          ? -1
          : 1;
  }
  if (a.eq(b)) return 0;
  if (a.lt(b) === true) return -1;
  if (a.gt(b) === true) return 1;
  return undefined;
}
/** Cortex establishes an affine polynomial in ONE radical; exact order proves its sign. */
function affineRadicalSign(expression: Expression): -1 | 0 | 1 | undefined {
  const ce = new ComputeEngine();
  ce.iterationLimit = 1024;
  ce.recursionLimit = 64;
  const radicals = new Set<number>();
  let unsupported = false;
  const transformed = ce.box(expression.json).map(
    (candidate) => {
      const exact = exactNumber(candidate);
      if (typeof exact !== 'object') return candidate;
      const witness = exact.asExact;
      if (
        !witness ||
        !('radical' in witness) ||
        typeof witness.radical !== 'number'
      ) {
        unsupported = true;
        return candidate;
      }
      const radical = witness.radical;
      if (radical === 1) return candidate;
      radicals.add(radical);
      const coefficient = ce
        .box(['Divide', candidate.json, ['Sqrt', radical]])
        .evaluate();
      if (!coefficient.toRational() || exactNumber(coefficient) === undefined) {
        unsupported = true;
        return candidate;
      }
      return ce.function('Multiply', [coefficient, 'z'], { form: 'raw' });
    },
    { canonical: false, recursive: true },
  );
  if (unsupported || radicals.size > 1) return undefined;
  const coefficients = transformed.canonical.polynomialCoefficients('z');
  if (!coefficients || coefficients.length > 2) return undefined;
  if (coefficients.length === 1) {
    const constant = coefficients[0]!.evaluate();
    const exact = constant.toRational() ? exactNumber(constant) : undefined;
    return exact === undefined ? undefined : exactOrder(exact, 0);
  }
  if (radicals.size !== 1) return undefined;
  const [slope, offset] = coefficients.map((c) => c.evaluate());
  if (!slope || !offset || !slope.toRational() || !offset.toRational())
    return undefined;
  const term = exactNumber(
    ce.box(['Multiply', slope.json, ['Sqrt', [...radicals][0]!]]).evaluate(),
  );
  const negativeOffset = exactNumber(
    ce.box(['Negate', offset.json]).evaluate(),
  );
  return term === undefined || negativeOffset === undefined
    ? undefined
    : exactOrder(term, negativeOffset);
}
function expressionOrder(a: Expression, b: Expression): -1 | 0 | 1 | undefined {
  const aa = exactNumber(a.evaluate());
  const bb = exactNumber(b.evaluate());
  if (aa !== undefined && bb !== undefined) return exactOrder(aa, bb);
  const ce = new ComputeEngine();
  ce.iterationLimit = 1024;
  ce.recursionLimit = 64;
  return affineRadicalSign(ce.box(['Subtract', a.json, b.json]));
}
function exactSign(value: Exact): -1 | 0 | 1 | undefined {
  return typeof value === 'number'
    ? value === 0
      ? 0
      : value > 0
        ? 1
        : -1
    : value.sgn();
}
function explicitInfinity(node: MathSyntax): -1 | 1 | undefined {
  if (node === 'PositiveInfinity') return 1;
  if (node === 'NegativeInfinity') return -1;
  if (
    Array.isArray(node) &&
    node.length === 2 &&
    (node[0] === 'Negate' || node[0] === 'Delimiter')
  ) {
    const sign = explicitInfinity(node[1]!);
    return sign === undefined
      ? undefined
      : node[0] === 'Negate'
        ? sign === 1
          ? -1
          : 1
        : sign;
  }
  return undefined;
}
/** Certified coarse bounds; see ADR 010 and independent rational series tests. */
const constants = {
  Pi: [3_141_592, 3_141_593],
  ExponentialE: [2_718_281, 2_718_282],
} as const;
/** Only affine expressions in ONE constant, certified by Cortex polynomialCoefficients. */
function constantBounds(
  expression: Expression,
): readonly [Expression, Expression] | undefined {
  const names = expression.symbols.filter(
    (s) => s === 'Pi' || s === 'ExponentialE',
  );
  if (names.length !== 1) return undefined;
  const name = names[0]! as keyof typeof constants;
  const replacements = Object.create(null) as Record<string, MathSyntax>;
  replacements[name] = 'z';
  const polynomial = expression.subs(replacements).canonical;
  const coefficients = polynomial.polynomialCoefficients('z');
  if (!coefficients || coefficients.length !== 2) return undefined;
  const values = coefficients.map((c) => c.evaluate());
  if (
    !values.every(
      (c) => c.toRational() !== null && exactNumber(c) !== undefined,
    )
  )
    return undefined;
  const slope = exactNumber(values[0]!)!;
  const sign = exactSign(slope);
  if (sign === undefined) return undefined;
  const endpoints = constants[name].map((n) => {
    const r = Object.create(null) as Record<string, MathSyntax>;
    r[name] = ['Rational', n, 1_000_000];
    return expression.subs(r).evaluate();
  });
  if (!endpoints.every((e) => exactNumber(e) !== undefined)) return undefined;
  return sign < 0
    ? [endpoints[1]!, endpoints[0]!]
    : [endpoints[0]!, endpoints[1]!];
}

/** Closed real arithmetic; raw descendants are admitted before any parent evaluation. */
export function prepareNumeric(
  source: string,
  context: MathInputContext,
  values: Readonly<Record<string, GeneratedValue>>,
  path: string,
  allowInfinity: boolean,
): NumericResult {
  const parsed = parseNumericInput(source, context);
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
    const replacements = Object.create(null) as Record<string, MathSyntax>;
    for (const name of parsed.symbols.parameters) {
      const v = values[name];
      if (!v) fail('missing-variable', path, 'Missing generated parameter.');
      replacements[name] =
        v.kind === 'rational'
          ? ['Rational', v.numerator, v.denominator]
          : v.kind === 'decimal'
            ? ['Rational', v.coefficient, 10 ** v.precision]
            : encode(v.value, path);
    }
    const substituted = explicitProducts(
      ce,
      encode(parsed.syntax, path),
      path,
      true,
    ).subs(replacements, { canonical: false });
    const raw = substituted.json;
    const infinity = explicitInfinity(raw);
    if (infinity !== undefined) {
      if (!allowInfinity)
        fail(
          'non-finite',
          path,
          'Infinity requires an extended-real response.',
        );
      return {
        ok: true,
        value: {
          math: {
            source,
            syntax: parsed.syntax,
            substituted: raw,
            displayLatex: infinity === 1 ? '+\\infty' : '-\\infty',
          },
          expression: substituted,
          infinity,
        },
      };
    }
    const signOf = (node: MathSyntax): -1 | 0 | 1 | undefined => {
      // Descendants have already been admitted by inspect(). A real exponential
      // is strictly positive, even when its value stays symbolic.
      if (Array.isArray(node)) {
        if (node[0] === 'Delimiter') return signOf(node[1]!);
        if (node[0] === 'Exp') return 1;
        if (node[0] === 'Power' && signOf(node[1]!) === 1) return 1;
        if (node[0] === 'Sqrt') {
          const s = signOf(node[1]!);
          if (s === 0 || s === 1) return s;
        }
        if (node[0] === 'Negate') {
          const s = signOf(node[1]!);
          if (s !== undefined) return s === 0 ? 0 : s === 1 ? -1 : 1;
        }
        if (
          node[0] === 'Multiply' ||
          node[0] === 'Divide' ||
          node[0] === 'Rational'
        ) {
          const signs = (node as readonly MathSyntax[])
            .slice(1)
            .map((n) => signOf(n));
          if (signs.every((s) => s !== undefined)) {
            const product = signs.reduce<number>((a, s) => a * s!, 1);
            return product === 0 ? 0 : product > 0 ? 1 : -1;
          }
        }
        if (node[0] === 'Add') {
          const signs = (node as readonly MathSyntax[])
            .slice(1)
            .map((n) => signOf(n));
          if (signs.every((s) => s === 0 || s === 1) && signs.includes(1))
            return 1;
          if (signs.every((s) => s === 0 || s === -1) && signs.includes(-1))
            return -1;
          if (signs.every((s) => s === 0)) return 0;
        }
      }
      const expression = ce.box(node, { form: 'raw' }).canonical;
      const exact = exactNumber(expression.evaluate(), true);
      if (exact !== undefined) return exactSign(exact);
      const affineSign = affineRadicalSign(expression);
      if (affineSign !== undefined) return affineSign;
      const b = constantBounds(expression);
      if (!b) return undefined;
      const lo = exactNumber(b[0])!;
      const hi = exactNumber(b[1])!;
      if (exactOrder(lo, 0) === 1) return 1;
      if (exactOrder(hi, 0) === -1) return -1;
      return undefined;
    };
    const inspect = (node: MathSyntax, p: string): void => {
      if (typeof node === 'number') return;
      if (node === 'Pi' || node === 'ExponentialE') return;
      if (!Array.isArray(node))
        fail('unsupported', p, 'A closed finite real value is required.');
      const items = node as MathSyntax[];
      const head = items[0];
      const args = items.slice(1);
      const unary = [
        'Negate',
        'Sqrt',
        'Square',
        'Delimiter',
        'Ln',
        'Lb',
        'Lg',
        'Exp',
        'Sin',
        'Cos',
        'Tan',
      ];
      const binary = ['Divide', 'Rational', 'Power', 'Root', 'Subtract'];
      if (
        (unary.includes(String(head)) && args.length !== 1) ||
        (binary.includes(String(head)) && args.length !== 2) ||
        (!unary.includes(String(head)) &&
          !binary.includes(String(head)) &&
          !(
            head === 'Add' ||
            head === 'Multiply' ||
            (head === 'Log' && (args.length === 1 || args.length === 2))
          ))
      )
        fail(
          'unsupported',
          p,
          'Operator/arity outside closed real arithmetic.',
        );
      if ((head === 'Add' || head === 'Multiply') && args.length < 2)
        fail('unsupported', p, 'An arithmetic operation requires operands.');
      args.forEach((a, i) => inspect(a, `${p}/${i + 1}`));
      if (head === 'Ln' || head === 'Log' || head === 'Lb' || head === 'Lg') {
        const positive = (argument: MathSyntax): void => {
          const sign = signOf(argument);
          if (sign === 0 || sign === -1)
            fail(
              'undefined-expression',
              p,
              'A real logarithm requires a strictly positive argument and base.',
            );
          if (sign === undefined)
            fail('not-calculable', p, 'The logarithm domain is not proved.');
        };
        positive(args[0]!);
        if (head === 'Log' && args.length === 2) {
          positive(args[1]!);
          const base = exactNumber(ce.box(args[1]!).evaluate(), true);
          const order =
            base === undefined
              ? signOf(['Subtract', args[1]!, 1])
              : exactOrder(base, 1);
          if (order === 0)
            fail(
              'undefined-expression',
              p,
              'A logarithm base must differ from one.',
            );
          if (order === undefined)
            fail(
              'not-calculable',
              p,
              'The logarithm base is not proved different from one.',
            );
        }
      }
      if (head === 'Tan') {
        const cosine = exactNumber(ce.box(['Cos', args[0]!]).evaluate(), true);
        const sign = cosine === undefined ? undefined : exactSign(cosine);
        if (sign === 0)
          fail(
            'undefined-expression',
            p,
            'Tangent is undefined at a proved cosine zero.',
          );
        if (sign === undefined)
          fail(
            'not-calculable',
            p,
            'A nonzero cosine is not proved for this tangent argument.',
          );
      }
      if (head === 'Divide' || head === 'Rational') {
        const s = signOf(args[1]!);
        if (s === 0)
          fail('undefined-expression', p, 'Division by zero before reduction.');
        if (s === undefined)
          fail(
            'not-calculable',
            p,
            'The nonzero denominator is not proved in this profile.',
          );
      }
      if (head === 'Sqrt' || head === 'Root') {
        if (head === 'Root') {
          const degree = exactNumber(ce.box(args[1]!).evaluate(), true);
          if (degree === undefined || exactOrder(degree, 2) !== 0)
            fail('unsupported', p, 'Only square roots are admitted.');
        }
        const sign = signOf(args[0]!);
        if (sign === -1)
          fail(
            'undefined-expression',
            p,
            'A real square root requires a nonnegative radicand.',
          );
        if (sign === undefined)
          fail(
            'not-calculable',
            p,
            'The real square-root domain is not proved.',
          );
      }
      if (head === 'Power' || head === 'Square') {
        const base = ce.box(args[0]!, { form: 'raw' }).canonical;
        // e^u and exp(u) share the same admitted closed real argument. Raw
        // descendants have already been checked, including every inner domain.
        const exponentialPower =
          head === 'Power' && base.json === 'ExponentialE';
        const e =
          head === 'Square'
            ? 2
            : exactNumber(ce.box(args[1]!).evaluate(), true);
        const exponent =
          typeof e === 'number' ? e : e === undefined ? undefined : e.toJSON();
        const half =
          head === 'Power'
            ? ce.box(args[1]!).evaluate().toRational()
            : undefined;
        const halfPower = half?.[1] === 2 && Math.abs(half[0]) === 1;
        if (halfPower) {
          const sign = signOf(args[0]!);
          if (sign === -1 || (sign === 0 && half![0] < 0))
            fail(
              'undefined-expression',
              p,
              'The real half-power domain is invalid.',
            );
          if (sign === undefined)
            fail('not-calculable', p, 'The half-power domain is not proved.');
        }
        if (
          !exponentialPower &&
          !halfPower &&
          (typeof exponent !== 'number' ||
            !Number.isInteger(exponent) ||
            Math.abs(exponent) > 16)
        )
          fail(
            'unsupported',
            p,
            'An integer power from -16 to 16 is required.',
          );
        if (
          !exponentialPower &&
          !halfPower &&
          typeof exponent === 'number' &&
          exponent <= 0
        ) {
          const sign = signOf(args[0]!);
          if (sign === 0)
            fail(
              'undefined-expression',
              p,
              'Zero to a nonpositive power is outside the real profile.',
            );
          if (sign === undefined)
            fail('not-calculable', p, 'The power domain is not proved.');
        }
      }
      const value = ce.box(node, { form: 'raw' }).canonical.evaluate();
      if (value.isFinite === false)
        fail('non-finite', p, 'Arithmetic must remain finite.');
      if (isNumber(value) && exactNumber(value, true) === undefined)
        fail(
          'limit',
          p,
          'The exact real result exceeds the rational/radical budget.',
        );
    };
    inspect(raw, path);
    const canonical = substituted.canonical;
    const evaluated = canonical.evaluate();
    const exact = exactNumber(evaluated, true);
    const expression = exactStructure(evaluated) ? evaluated : canonical;
    const display = expression;
    const displayLatex = display.toLatex({
      digitGroup: 0,
      // Cortex may evaluate an admitted e^(p/q) into an nth root of e.
      // Serialize that exact representation as a power, which stays inside
      // the original admission; arbitrary nth-root inputs remain unsupported.
      rootStyle: (node: MathSyntax) =>
        Array.isArray(node) && node[0] === 'Root' && node[1] === 'ExponentialE'
          ? 'quotient'
          : 'radical',
    });
    if (!display.isValid || !displayLatex || displayLatex.length > 4096)
      fail(
        'substitution-failed',
        path,
        'Unable to render the admitted real value.',
      );
    const bounds = constantBounds(expression);
    return {
      ok: true,
      value: {
        math: {
          source,
          syntax: parsed.syntax,
          substituted: raw,
          displayLatex,
        },
        expression,
        ...(exact === undefined ? {} : { exact }),
        ...(bounds === undefined ? {} : { bounds }),
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
              message: 'Numeric preparation failed.',
            },
      ],
    };
  }
}

/** Reject approximate literal leaves before using structural equality as a closed identity. */
function exactStructure(expression: Expression): boolean {
  if (isNumber(expression)) return exactNumber(expression) !== undefined;
  if (isSymbol(expression))
    return expression.symbol === 'Pi' || expression.symbol === 'ExponentialE';
  return (
    isFunction(expression) &&
    !!expression.ops.length &&
    expression.ops.every(exactStructure)
  );
}
export interface NumericVerdict {
  equal: boolean | undefined;
  proof:
    | 'exact-number'
    | 'quadratic-number'
    | 'closed-identity'
    | 'certified-bounds'
    | 'explicit-infinity'
    | 'exponential-injectivity'
    | 'positive-exponential'
    | 'none';
}
/** Only admitted closed exponentials with exact rational exponents; exp is injective on R. */
function rationalExponentialExponent(
  prepared: PreparedNumeric,
): Exact | undefined {
  const expression = prepared.expression;
  if (isSymbol(expression) && expression.symbol === 'ExponentialE') return 1;
  const numeric = exactNumber(expression);
  if (numeric !== undefined && exactOrder(numeric, 1) === 0) return 0;
  let raw = prepared.math.substituted;
  while (Array.isArray(raw) && raw[0] === 'Delimiter' && raw.length === 2)
    raw = raw[1]!;
  if (!Array.isArray(raw)) return undefined;
  const ce = new ComputeEngine();
  ce.iterationLimit = 1024;
  ce.recursionLimit = 64;
  // Raw admission has passed. Evaluation can turn e^-1 into 1/e and e^(1/2)
  // into sqrt(e), so retain the admitted original power for this witness.
  const exponent =
    raw[0] === 'Exp' && raw.length === 2
      ? ce.box(raw[1]!, { form: 'raw' })
      : raw[0] === 'Power' &&
          raw.length === 3 &&
          ce.box(raw[1]!, { form: 'raw' }).canonical.json === 'ExponentialE'
        ? ce.box(raw[2]!, { form: 'raw' })
        : undefined;
  if (!exponent) return undefined;
  const value = exponent.evaluate();
  return value.toRational() ? exactNumber(value, true) : undefined;
}
export function numericOrder(
  a: PreparedNumeric,
  b: PreparedNumeric,
): -1 | 0 | 1 | undefined {
  if (a.infinity !== undefined || b.infinity !== undefined) {
    if (a.infinity === b.infinity) return 0;
    return a.infinity === -1 || b.infinity === 1 ? -1 : 1;
  }
  const exact = expressionOrder(a.expression, b.expression);
  if (exact !== undefined) return exact;
  if (
    exactStructure(a.expression) &&
    exactStructure(b.expression) &&
    a.expression.isSame(b.expression)
  )
    return 0;
  return boundedOrder(a, b);
}
export function compareNumeric(
  student: PreparedNumeric,
  expected: PreparedNumeric,
  policy: NumericComparison = { mode: 'exact' },
): NumericVerdict {
  if (student.infinity !== undefined || expected.infinity !== undefined)
    return {
      equal: student.infinity === expected.infinity,
      proof: 'explicit-infinity',
    };
  if (policy.mode === 'exact') {
    if (student.exact !== undefined && expected.exact !== undefined) {
      const order = exactOrder(student.exact, expected.exact);
      return {
        equal: order === undefined ? undefined : order === 0,
        proof: order === undefined ? 'none' : 'exact-number',
      };
    }
    if (
      exactStructure(student.expression) &&
      exactStructure(expected.expression) &&
      student.expression.isSame(expected.expression)
    )
      return { equal: true, proof: 'closed-identity' };
    const studentExponent = rationalExponentialExponent(student);
    const expectedExponent = rationalExponentialExponent(expected);
    const nonpositive = (value: Exact | undefined): boolean =>
      value !== undefined && [-1, 0].includes(exactOrder(value, 0) ?? 1);
    if (
      (studentExponent !== undefined && nonpositive(expected.exact)) ||
      (expectedExponent !== undefined && nonpositive(student.exact))
    )
      return { equal: false, proof: 'positive-exponential' };
    if (studentExponent !== undefined && expectedExponent !== undefined) {
      const order = exactOrder(studentExponent, expectedExponent);
      return {
        equal: order === undefined ? undefined : order === 0,
        proof: order === undefined ? 'none' : 'exponential-injectivity',
      };
    }
    const quadraticOrder = expressionOrder(
      student.expression,
      expected.expression,
    );
    if (quadraticOrder !== undefined)
      return { equal: quadraticOrder === 0, proof: 'quadratic-number' };
    const order = boundedOrder(student, expected);
    return {
      equal: order === undefined ? undefined : order === 0,
      proof: order === undefined ? 'none' : 'certified-bounds',
    };
  }
  const ce = new ComputeEngine();
  ce.iterationLimit = 1024;
  ce.recursionLimit = 64;
  const tolerance = (s: string): Expression => {
    const [whole, fraction = ''] = s.split('.');
    return ce.box([
      'Rational',
      Number(whole! + fraction),
      10 ** fraction.length,
    ]);
  };
  const absolute = tolerance(policy.absolute);
  const relative = tolerance(policy.relative);
  // An exact identity is within every nonnegative official tolerance.
  if (
    student.exact !== undefined &&
    expected.exact !== undefined &&
    exactOrder(student.exact, expected.exact) === 0
  )
    return { equal: true, proof: 'exact-number' };
  if (
    exactStructure(student.expression) &&
    exactStructure(expected.expression) &&
    student.expression.isSame(expected.expression)
  )
    return { equal: true, proof: 'closed-identity' };
  const sign =
    expected.exact === undefined ? undefined : exactSign(expected.exact);
  if (sign !== undefined && student.exact !== undefined) {
    const difference = ce
      .box(['Subtract', student.expression.json, expected.expression.json])
      .evaluate();
    const delta = exactNumber(difference);
    if (delta !== undefined) {
      const deltaSign = exactSign(delta);
      if (deltaSign !== undefined) {
        const remainder = ce
          .box([
            'Subtract',
            ['Multiply', deltaSign, difference.json],
            ['Multiply', sign, relative.json, expected.expression.json],
          ])
          .evaluate();
        const net = exactNumber(remainder);
        const a = exactNumber(absolute);
        if (net !== undefined && a !== undefined) {
          const order = exactOrder(net, a);
          if (order !== undefined)
            return { equal: order <= 0, proof: 'exact-number' };
        }
      }
    }
  }
  // For exact monomials, compare both inclusive inequalities without introducing floats.
  if (sign !== undefined && student.exact !== undefined) {
    const lower = ce
      .box([
        'Multiply',
        ['Subtract', 1, ['Multiply', sign, relative.json]],
        expected.expression.json,
      ])
      .evaluate();
    const upper = ce
      .box([
        'Multiply',
        ['Add', 1, ['Multiply', sign, relative.json]],
        expected.expression.json,
      ])
      .evaluate();
    const plus = ce
      .box(['Add', student.expression.json, absolute.json])
      .evaluate();
    const minus = ce
      .box(['Subtract', student.expression.json, absolute.json])
      .evaluate();
    const witnesses = [plus, lower, minus, upper].map((e) => exactNumber(e));
    if (witnesses.every((w) => w !== undefined)) {
      const low = exactOrder(witnesses[0]!, witnesses[1]!);
      const high = exactOrder(witnesses[2]!, witnesses[3]!);
      if (low !== undefined && high !== undefined)
        return { equal: low >= 0 && high <= 0, proof: 'exact-number' };
    }
  }
  // Interval proof only for rational/affine-constant bounds. A crossing boundary stays unknown.
  const s = rationalBounds(ce, student);
  const e = rationalBounds(ce, expected);
  if (!s || !e) return { equal: undefined, proof: 'none' };
  const signBound =
    sign ??
    (exactOrder(exactNumber(e[0])!, 0) === 1
      ? 1
      : exactOrder(exactNumber(e[1])!, 0) === -1
        ? -1
        : undefined);
  if (signBound === undefined) return { equal: undefined, proof: 'none' };
  const boundary = (node: Expression, upper: boolean): Exact | undefined =>
    exactNumber(
      ce
        .box([
          upper ? 'Add' : 'Subtract',
          [
            'Multiply',
            [
              upper ? 'Add' : 'Subtract',
              1,
              ['Multiply', signBound, relative.json],
            ],
            node.json,
          ],
          absolute.json,
        ])
        .evaluate(),
    );
  const lows = [boundary(e[0], false), boundary(e[1], false)];
  const highs = [boundary(e[0], true), boundary(e[1], true)];
  const sl = exactNumber(s[0])!;
  const sh = exactNumber(s[1])!;
  if ([...lows, ...highs].some((x) => x === undefined))
    return { equal: undefined, proof: 'none' };
  if (
    lows.every(
      (l) => exactOrder(sl, l!) !== -1 && exactOrder(sl, l!) !== undefined,
    ) &&
    highs.every(
      (h) => exactOrder(sh, h!) !== 1 && exactOrder(sh, h!) !== undefined,
    )
  )
    return { equal: true, proof: 'certified-bounds' };
  if (
    lows.every((l) => exactOrder(sh, l!) === -1) ||
    highs.every((h) => exactOrder(sl, h!) === 1)
  )
    return { equal: false, proof: 'certified-bounds' };
  return { equal: undefined, proof: 'none' };
}
function rationalBounds(
  ce: ComputeEngine,
  value: PreparedNumeric,
): readonly [Expression, Expression] | undefined {
  if (value.exact !== undefined) {
    const e = value.expression.evaluate();
    if (e.toRational()) return [e, e];
  }
  return value.bounds?.map((e) => ce.box(e.json)) as
    readonly [Expression, Expression] | undefined;
}
function boundedOrder(
  a: PreparedNumeric,
  b: PreparedNumeric,
): -1 | 0 | 1 | undefined {
  const ce = new ComputeEngine();
  const aa = rationalBounds(ce, a);
  const bb = rationalBounds(ce, b);
  if (!aa || !bb) return undefined;
  if (exactOrder(exactNumber(aa[1])!, exactNumber(bb[0])!) === -1) return -1;
  if (exactOrder(exactNumber(aa[0])!, exactNumber(bb[1])!) === 1) return 1;
  return undefined;
}
