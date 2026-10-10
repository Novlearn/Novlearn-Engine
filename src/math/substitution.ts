import { CancellationError, ComputeEngine } from '@cortex-js/compute-engine';
import type {
  InstantiatedMathV1,
  RationalValueV1,
} from '../contracts/types.js';
import type { GeneratedValueV1 } from '../generation/variables.js';
import { parseMathInput } from './input.js';
import type {
  MathInputContext,
  MathInputDiagnostic,
  MathSyntax,
} from './input.js';

export interface InstantiationMathDiagnostic {
  code:
    | MathInputDiagnostic['code']
    | 'missing-variable'
    | 'undefined-expression'
    | 'non-finite'
    | 'not-calculable'
    | 'substitution-failed';
  path: string;
  message: string;
  symbol?: string;
}

class MathFailure extends Error {
  constructor(readonly diagnostic: InstantiationMathDiagnostic) {
    super(diagnostic.message);
  }
}

/** Numeric encoding only: finite decimal spelling -> integer ratio, without rounding. */
function exactLiteral(value: string, path: string): MathSyntax {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(value);
  if (!match || match[0] !== value || value.length > 40)
    fail(
      'limit',
      path,
      'Numeric literal is outside the exact encoding budget.',
    );
  const fraction = match[3] ?? '';
  const shift = Number(match[4] ?? 0) - fraction.length;
  if (Math.abs(shift) > 6)
    fail('limit', path, 'Exact literals require at most six decimal places.');
  const digits = BigInt((match[1] ?? '') + match[2]! + fraction);
  const numerator = digits * (shift > 0 ? 10n ** BigInt(shift) : 1n);
  const denominator = shift < 0 ? 10n ** BigInt(-shift) : 1n;
  if (numerator < -1_000_000_000n || numerator > 1_000_000_000n)
    fail('limit', path, 'Exact literal numerator exceeds 1000000000.');
  return denominator === 1n
    ? Number(numerator)
    : ['Rational', Number(numerator), Number(denominator)];
}

function fail(
  code: InstantiationMathDiagnostic['code'],
  path: string,
  message: string,
): never {
  throw new MathFailure({ code, path, message });
}

/** Convert numeric encodings, without rewriting algebra or substituting symbols. */
function encode(
  node: MathSyntax,
  path: string,
  depth = 0,
  budget = { nodes: 0 },
): MathSyntax {
  budget.nodes += 1;
  if (depth > 16 || budget.nodes > 128)
    fail('limit', path, 'Instantiation permits 128 nodes and depth 16.');
  if (typeof node === 'number') return exactLiteral(String(node), path);
  if (Array.isArray(node)) {
    const items = node as MathSyntax[];
    const head = items[0];
    if (typeof head !== 'string')
      fail('unsupported', path, 'Invalid MathJSON operator.');
    return [
      head,
      ...items
        .slice(1)
        .map((n, i) => encode(n, `${path}/${i + 1}`, depth + 1, budget)),
    ];
  }
  if (typeof node === 'object' && node !== null && 'num' in node)
    return exactLiteral(String(node.num), path);
  return node;
}

/** Private math boundary: the native definition currently supplies integer values only.
 * Decimal/choice encodings are exercised internally, not new definition contracts.
 */
export function instantiateMath(
  source: string,
  context: MathInputContext,
  values: Readonly<Record<string, GeneratedValueV1>>,
  path: string,
  scalar: boolean,
):
  | { ok: true; value: InstantiatedMathV1; exact?: RationalValueV1 }
  | { ok: false; diagnostics: InstantiationMathDiagnostic[] } {
  const parsed = parseMathInput(source, context);
  if (!parsed.ok)
    return {
      ok: false,
      diagnostics: parsed.diagnostics.map((d) => ({
        code: d.code,
        message: d.message,
        path,
        ...(d.symbol === undefined ? {} : { symbol: d.symbol }),
      })),
    };
  try {
    // Lexical numeric admission before any reduction. The parser may round a long
    // decimal into a machine literal; such sources must never acquire an exact claim.
    // This guard neither rewrites the source nor interprets algebra.
    if (/\d(?:\s|\\[,;:! ]|\\(?:quad|qquad)\s*)+\d/.test(source))
      fail(
        'unsupported',
        path,
        'Grouped numeric digits require an ungrouped literal in this profile.',
      );
    for (const match of source.matchAll(
      /(\d+(?:\.(\d+)|\{,\}(\d+))?|\.(\d+))(?:[eE]([+-]?\d+))?/g,
    )) {
      const fraction = match[2] ?? match[3] ?? match[4] ?? '';
      if (fraction.length > 6)
        fail('limit', path, 'Source decimal precision exceeds six places.');
      const whole = match[1]!.split('.')[0]!.split('{')[0]! || '0';
      exactLiteral(
        `${whole}${fraction ? `.${fraction}` : ''}${match[5] === undefined ? '' : `e${match[5]}`}`,
        path,
      );
    }
    const encoded = encode(parsed.syntax, path);
    const ce = new ComputeEngine();
    ce.iterationLimit = 1024;
    ce.recursionLimit = 64;
    const replacements: Record<string, MathSyntax> = {};
    for (const name of parsed.symbols.parameters) {
      const value = values[name];
      if (!value)
        fail('missing-variable', path, `Missing generated parameter ${name}.`);
      replacements[name] =
        value.kind === 'decimal'
          ? ['Rational', value.coefficient, 10 ** value.precision]
          : exactLiteral(String(value.value), path);
    }
    // Only CortexJS performs mathematical substitution. No assignments or global engine.
    // Resolve symbolic juxtaposition BEFORE inserting numbers: CortexJS otherwise
    // interprets integer + rational juxtaposition as a mixed number. Numeric-only
    // juxtaposition is ambiguous in this native profile and requires explicit cdot.
    const explicit = ce.box(encoded, { form: 'raw' }).map(
      (expression) => {
        if (expression.operator !== 'InvisibleOperator') return expression;
        if (expression.symbols.length === 0)
          fail(
            'unsupported',
            path,
            'Numeric juxtaposition is ambiguous; use explicit multiplication.',
          );
        const syntax = expression.json as readonly MathSyntax[];
        return ce.function('Multiply', syntax.slice(1), { form: 'raw' });
      },
      { canonical: false, recursive: true },
    );
    const substituted = explicit.subs(replacements, { canonical: false });
    const raw = substituted.json;
    const rational = (node: MathSyntax, nodePath: string): RationalValueV1 => {
      const evaluated = ce.box(node, { form: 'raw' }).canonical.evaluate();
      if (evaluated.isFinite === false)
        fail('non-finite', nodePath, 'The result is not finite.');
      const ratio = evaluated.toRational();
      // toRational() excludes approximate machine floats in the pinned API.
      if (!ratio)
        fail(
          'not-calculable',
          nodePath,
          'An exact rational result is required.',
        );
      const [numerator, denominator] = ratio;
      if (
        !Number.isSafeInteger(numerator) ||
        !Number.isSafeInteger(denominator) ||
        Math.abs(numerator) > 1_000_000_000 ||
        denominator <= 0 ||
        denominator > 1_000_000_000
      )
        fail(
          'limit',
          nodePath,
          'Exact numerator/denominator exceed the 1000000000 budget.',
        );
      return { kind: 'rational', numerator, denominator };
    };
    // Admission/domain checks bottom-up, BEFORE reducing each parent.
    // Degree is only a resource/admissibility bound; no polynomial algebra is implemented.
    const inspect = (
      node: MathSyntax,
      nodePath: string,
    ): { degree: number; exact?: RationalValueV1 } => {
      if (typeof node === 'string') {
        if (!(context.variables ?? []).includes(node))
          fail(
            'unsupported',
            nodePath,
            'Only declared free variables and rational arithmetic are supported.',
          );
        return { degree: 1 };
      }
      if (typeof node === 'number')
        return { degree: 0, exact: rational(node, nodePath) };
      if (!Array.isArray(node))
        fail(
          'substitution-failed',
          nodePath,
          'Unexpected substitution representation.',
        );
      const head = node[0];
      const operands = node.slice(1);
      if (
        ![
          'Rational',
          'Add',
          'Subtract',
          'Negate',
          'Multiply',
          'InvisibleOperator',
          'Divide',
          'Power',
          'Square',
          'Delimiter',
        ].includes(String(head))
      )
        fail(
          'unsupported',
          nodePath,
          'Operator outside the rational/polynomial instantiation profile.',
        );
      const arity = operands.length;
      if (
        (['Negate', 'Square', 'Delimiter'].includes(String(head)) &&
          arity !== 1) ||
        (['Divide', 'Rational', 'Power', 'Subtract'].includes(String(head)) &&
          arity !== 2) ||
        (['Add', 'Multiply', 'InvisibleOperator'].includes(String(head)) &&
          arity < 2)
      )
        fail(
          'unsupported',
          nodePath,
          'Operator arity outside the supported profile.',
        );
      const parts = operands.map((n, i) => inspect(n, `${nodePath}/${i + 1}`));
      let degree = Math.max(0, ...parts.map((p) => p.degree));
      if (head === 'Divide' || head === 'Rational') {
        const denominator = parts[1]!.exact;
        if (!denominator)
          fail(
            'unsupported',
            nodePath,
            'Free variables in denominators require a domain contract.',
          );
        if (denominator.numerator === 0)
          fail(
            'undefined-expression',
            nodePath,
            'Division by zero before reduction.',
          );
      }
      if (head === 'Multiply' || head === 'InvisibleOperator')
        degree = parts.reduce((sum, p) => sum + p.degree, 0);
      if (head === 'Power' || head === 'Square') {
        const exponent =
          head === 'Square'
            ? { numerator: 2, denominator: 1 }
            : parts[1]!.exact;
        if (
          !exponent ||
          exponent.denominator !== 1 ||
          exponent.numerator < 0 ||
          exponent.numerator > 16
        )
          fail(
            'unsupported',
            nodePath,
            'Powers require an integer exponent from 0 to 16.',
          );
        if (
          exponent.numerator === 0 &&
          (!parts[0]!.exact || parts[0]!.exact.numerator === 0)
        )
          fail(
            'undefined-expression',
            nodePath,
            'Zero or possibly zero to the power zero is outside this profile.',
          );
        degree = parts[0]!.degree * exponent.numerator;
      }
      if (degree > 16)
        fail('limit', nodePath, 'Statement degree budget exceeds 16.');
      // All domain checks on descendants have passed; closed subtrees may now be evaluated.
      return parts.every((p) => p.exact !== undefined)
        ? { degree: 0, exact: rational(node, nodePath) }
        : { degree };
    };
    const admitted = inspect(raw, path);
    if (scalar && !admitted.exact)
      fail(
        'not-calculable',
        path,
        'Expected answer must be a closed rational value.',
      );
    const display = substituted.canonical.evaluate();
    if (!display.isValid)
      fail('substitution-failed', path, 'Unable to produce a valid display.');
    const displayLatex = display.latex;
    if (!displayLatex || displayLatex.length > 4096)
      fail('limit', path, 'Display exceeds the text budget.');
    return {
      ok: true,
      value: { source, syntax: parsed.syntax, substituted: raw, displayLatex },
      ...(admitted.exact === undefined ? {} : { exact: admitted.exact }),
    };
  } catch (error) {
    if (error instanceof MathFailure)
      return { ok: false, diagnostics: [error.diagnostic] };
    if (error instanceof CancellationError)
      return {
        ok: false,
        diagnostics: [
          {
            code: 'limit',
            path,
            message:
              'The math library reported an execution budget exhaustion.',
          },
        ],
      };
    return {
      ok: false,
      diagnostics: [
        {
          code: 'substitution-failed',
          path,
          message: 'The math library could not instantiate this expression.',
        },
      ],
    };
  }
}
