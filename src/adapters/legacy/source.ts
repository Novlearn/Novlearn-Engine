import { ComputeEngine } from '@cortex-js/compute-engine';
import type { MathSyntax } from '../../math/input.js';
import { parseMathInput, parseLegacyInput } from '../../math/input.js';
import { admitSource } from '../../math/substitution.js';

/** Lexical placeholder admission only; Cortex performs all mathematical parsing. */
function references(source: string, names: ReadonlyMap<string, string>): void {
  if (!source.trim() || source.length > 4096)
    throw new Error('legacy source: empty or oversized');
  for (const match of source.matchAll(/@([A-Za-z0-9_]+)/g))
    if (!names.has(match[1]!))
      throw new Error(`legacy source: unknown placeholder ${match[0]}`);
  if (source.includes('@@'))
    throw new Error(
      'legacy math: escaped text marker is not a mathematical reference',
    );
}
export function convertLegacyMath(
  source: string,
  names: ReadonlyMap<string, string>,
  variables: readonly string[],
): string {
  references(source, names);
  admitSource(
    source,
    '/legacy/source',
    [...source.matchAll(/@[A-Za-z0-9_]+/g)].map(
      (m) => [m.index, m.index + m[0].length] as const,
    ),
  );
  const original = parseLegacyInput(
    source,
    { parameters: [...names.values()], variables },
    names,
  );
  if (!original.ok)
    throw new Error(
      `legacy math: original admission failed ${JSON.stringify(original.diagnostics)}`,
    );
  const ce = new ComputeEngine();
  ce.latexOptions.multiply = '\\cdot';
  ce.latexOptions.decimalSeparator = '{,}';
  ce.latexSyntax?.addEntries?.([
    { kind: 'expression', latexTrigger: 'e', parse: 'ExponentialE' },
    ...[...names].map(([old, name]) => ({
      kind: 'expression' as const,
      latexTrigger: `@${old}`,
      name,
      parse: name,
      serialize: `\\mathrm{${name}}`,
      standaloneSymbol: true,
    })),
  ]);
  const parsed = ce.box(original.syntax, { form: 'raw' });
  let nodes = 0;
  const allowed = new Set([
    'Add',
    'Subtract',
    'Negate',
    'Multiply',
    'InvisibleOperator',
    'Divide',
    'Power',
    'Square',
    'Rational',
    'Delimiter',
    'Sqrt',
    'Root',
    'Ln',
    'Log',
    'Exp',
    'Sin',
    'Cos',
    'Tan',
  ]);
  const inspect = (node: MathSyntax, depth = 0): void => {
    if (++nodes > 128 || depth > 16)
      throw new Error('legacy math: syntax budget exceeded');
    if (Array.isArray(node)) {
      if (!allowed.has(String(node[0])))
        throw new Error(`legacy math: unsupported operator ${String(node[0])}`);
      (node as MathSyntax[]).slice(1).forEach((n) => inspect(n, depth + 1));
    } else if (typeof node === 'string') {
      if (
        ![
          ...names.values(),
          ...variables,
          'ExponentialE',
          'Pi',
          'PositiveInfinity',
          'NegativeInfinity',
        ].includes(node)
      )
        throw new Error(`legacy math: unknown symbol ${node}`);
    } else if (typeof node === 'number') {
      if (!Number.isFinite(node))
        throw new Error('legacy math: nonfinite number');
    } else if (!node || typeof node !== 'object' || !('num' in node))
      throw new Error('legacy math: unsupported atom');
  };
  inspect(parsed.json);
  const latex = parsed.latex;
  const admitted = parseMathInput(
    latex,
    { parameters: [...names.values()], variables },
    'school-latex-v1',
  );
  if (!admitted.ok)
    throw new Error(
      `legacy math: native admission failed ${JSON.stringify(admitted.diagnostics)}`,
    );
  return latex;
}

/** Text template aliases are lexical metadata, never algebraic rewriting. */
export function convertLegacyText(
  source: string,
  names: ReadonlyMap<string, string>,
): string {
  return source.replace(
    /@@|@([A-Za-z0-9_]+)/g,
    (token: string, name: string | undefined) => {
      if (token === '@@') return token;
      const replacement = names.get(name!);
      if (!replacement)
        throw new Error(`legacy text: unknown placeholder ${token}`);
      return `@${replacement}`;
    },
  );
}
