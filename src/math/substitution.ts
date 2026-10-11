import { CancellationError, ComputeEngine } from '@cortex-js/compute-engine';
import type { InstantiatedMath, RationalValue } from '../contracts/types.js';
import type { GeneratedValue } from '../contracts/types.js';
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

export class MathFailure extends Error {
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
export function encode(
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

/** Shared lexical numeric admission. Guards do not transform mathematical source. */
export function admitSource(source: string, path: string): void {
  // Digits inside explicit identifier spellings are not numeric literals.
  // This is a lexical admission guard only: source is never rewritten.
  const references = [
    ...source.matchAll(
      /\\mathrm\s*\{(?:\s|\\ )*[a-z](?:[A-Za-z0-9\s]|\\ )*\}/g,
    ),
  ].map((match) => [match.index, match.index + match[0].length] as const);
  const insideReference = (offset: number): boolean =>
    references.some(([start, end]) => offset >= start && offset < end);
  for (const match of source.matchAll(
    /\d(?:\s|\\[,;:! ]|\\(?:quad|qquad)\s*)+\d/g,
  ))
    if (!insideReference(match.index))
      fail(
        'unsupported',
        path,
        'Grouped numeric digits require an ungrouped literal in this profile.',
      );
  for (const match of source.matchAll(
    /(\d+(?:\.(\d+)|\{,\}(\d+))?|\.(\d+))(?:[eE]([+-]?\d+))?/g,
  )) {
    if (insideReference(match.index)) continue;
    const fraction = match[2] ?? match[3] ?? match[4] ?? '';
    if (fraction.length > 6)
      fail('limit', path, 'Source decimal precision exceeds six places.');
    const whole = match[1]!.split('.')[0]!.split('{')[0]! || '0';
    exactLiteral(
      `${whole}${fraction ? `.${fraction}` : ''}${match[5] === undefined ? '' : `e${match[5]}`}`,
      path,
    );
  }
}

/** Resolve symbolic juxtaposition before numeric insertion in either admission path. */
export function explicitProducts(
  ce: ComputeEngine,
  syntax: MathSyntax,
  path: string,
  allowRadicalProducts = false,
) {
  return ce.box(syntax, { form: 'raw' }).map(
    (expression) => {
      if (expression.operator !== 'InvisibleOperator') return expression;
      const raw = expression.json;
      const factors = Array.isArray(raw) ? (raw as MathSyntax[]).slice(1) : [];
      const radicalFactor = (node: MathSyntax): boolean =>
        Array.isArray(node) &&
        (node[0] === 'Sqrt' ||
          node[0] === 'Root' ||
          (node[0] === 'Delimiter' &&
            node.length === 2 &&
            radicalFactor(node[1]!)));
      if (
        expression.symbols.length === 0 &&
        !(
          allowRadicalProducts &&
          Array.isArray(raw) &&
          factors.some(radicalFactor)
        )
      )
        fail(
          'unsupported',
          path,
          'Numeric juxtaposition is ambiguous; use explicit multiplication.',
        );
      const syntax = expression.json;
      if (!Array.isArray(syntax))
        fail('substitution-failed', path, 'Unexpected product representation.');
      const items = syntax as readonly MathSyntax[];
      return ce.function('Multiply', items.slice(1), { form: 'raw' });
    },
    { canonical: false, recursive: true },
  );
}

/** One arithmetic profile for preparation and admission after substitution. */
function admitOperator(head: string, arity: number, path: string): void {
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
    ].includes(head)
  )
    fail(
      'unsupported',
      path,
      'Operator outside the rational/polynomial instantiation profile.',
    );
  if (
    (['Negate', 'Square', 'Delimiter'].includes(head) && arity !== 1) ||
    (['Divide', 'Rational', 'Power', 'Subtract'].includes(head) &&
      arity !== 2) ||
    (['Add', 'Multiply', 'InvisibleOperator'].includes(head) && arity < 2)
  )
    fail('unsupported', path, 'Operator arity outside the supported profile.');
}

/** Parse references and admit the closed arithmetic profile before any RNG or evaluation. */
export function prepareScalarExpression(
  source: string,
  names: string[],
  path: string,
):
  | { ok: true; dependencies: string[] }
  | { ok: false; diagnostics: InstantiationMathDiagnostic[] } {
  const parsed = parseMathInput(source, { parameters: names });
  if (!parsed.ok)
    return {
      ok: false,
      diagnostics: parsed.diagnostics.map((d) => ({ ...d, path })),
    };
  try {
    admitSource(source, path);
    const syntax = encode(parsed.syntax, path);
    const inspect = (node: MathSyntax, at: string): void => {
      if (typeof node === 'number') return;
      if (typeof node === 'string' && names.includes(node)) return;
      if (!Array.isArray(node))
        fail(
          'unsupported',
          at,
          'Only declared parameters and rational arithmetic are supported.',
        );
      const head = String(node[0]);
      admitOperator(head, node.length - 1, at);
      (node as readonly MathSyntax[])
        .slice(1)
        .forEach((n, i) => inspect(n, `${at}/${i + 1}`));
      if (
        head === 'Power' &&
        typeof node[2] === 'number' &&
        (!Number.isInteger(node[2]) || node[2] < 0 || node[2] > 16)
      )
        fail(
          'unsupported',
          at,
          'Powers require an integer exponent from 0 to 16.',
        );
    };
    inspect(syntax, path);
    return { ok: true, dependencies: parsed.symbols.parameters };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        error instanceof MathFailure
          ? error.diagnostic
          : {
              code: 'substitution-failed',
              path,
              message: 'Unable to prepare the rational expression.',
            },
      ],
    };
  }
}

/** Private math boundary shared by variable resolution and exercise elements. */
export function instantiateMath(
  source: string,
  context: MathInputContext,
  values: Readonly<Record<string, GeneratedValue>>,
  path: string,
  scalar: boolean,
):
  | { ok: true; value: InstantiatedMath; exact?: RationalValue }
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
    admitSource(source, path);
    const encoded = encode(parsed.syntax, path);
    const ce = new ComputeEngine();
    ce.iterationLimit = 1024;
    ce.recursionLimit = 64;
    const replacements = Object.create(null) as Record<string, MathSyntax>;
    for (const name of parsed.symbols.parameters) {
      const value = values[name];
      if (!value)
        fail('missing-variable', path, `Missing generated parameter ${name}.`);
      replacements[name] =
        value.kind === 'rational'
          ? ['Rational', value.numerator, value.denominator]
          : value.kind === 'decimal'
            ? ['Rational', value.coefficient, 10 ** value.precision]
            : exactLiteral(String(value.value), path);
    }
    // Only CortexJS performs mathematical substitution. No assignments or global engine.
    // Resolve symbolic juxtaposition BEFORE inserting numbers: CortexJS otherwise
    // interprets integer + rational juxtaposition as a mixed number. Numeric-only
    // juxtaposition is ambiguous in this native profile and requires explicit cdot.
    const explicit = explicitProducts(ce, encoded, path);
    const substituted = explicit.subs(replacements, { canonical: false });
    const raw = substituted.json;
    const rational = (node: MathSyntax, nodePath: string): RationalValue => {
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
    ): { degree: number; exact?: RationalValue } => {
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
      admitOperator(String(head), operands.length, nodePath);
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
