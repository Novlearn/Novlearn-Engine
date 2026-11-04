import { ComputeEngine } from '@cortex-js/compute-engine';
import type { MathSyntax } from './input.js';

/** Presentation only. Cortex substitutes parameter ASTs before serializing;
 * no evaluation, canonicalization, simplification or grading admission occurs.
 * Unsupported authored notation keeps its literal template presentation. */
export function formatTextMath(
  source: string,
  parameters: Readonly<Record<string, number | string>>,
  literal: (part: string) => string,
): string {
  let ce: ComputeEngine | undefined;
  let prefix = 'NovlearnTextParameter';
  while (source.includes(prefix)) prefix += 'X';
  const names = Object.keys(parameters);
  const replacements: Record<string, MathSyntax> = Object.create(null);
  const escaped = (index: number): boolean => {
    let slashes = 0;
    while (index > 0 && source[--index] === '\\') slashes++;
    return slashes % 2 === 1;
  };
  const bounded = (
    node: MathSyntax,
    depth = 0,
    budget = { nodes: 0 },
  ): boolean => {
    if (++budget.nodes > 128 || depth > 16) return false;
    if (
      Array.isArray(node) &&
      [
        'Error',
        'Tuple',
        'Sequence',
        'Set',
        'Interval',
        'Range',
        'Assign',
        'Declare',
      ].includes(String(node[0]))
    )
      return false;
    if (Array.isArray(node) && node[0] === 'List' && node.length !== 2)
      return false;
    return (
      !Array.isArray(node) ||
      (node as MathSyntax[])
        .slice(1)
        .every((child) => bounded(child, depth + 1, budget))
    );
  };
  const math = (part: string): string => {
    // Authored line breaks separate expressions; preserve the layout command.
    const lines = part.split('\\newline');
    if (lines.length > 1 && lines.length <= 64)
      return lines.map(math).join('\\newline');
    // A leading implication belongs to the surrounding prose, rather than to
    // the following expression's AST. Keep that authored relation visible.
    const trimmed = part.trimStart();
    for (const relation of [
      '\\Leftrightarrow',
      '\\Rightarrow',
      '\\iff',
      '\\implies',
    ]) {
      if (
        trimmed.startsWith(relation) &&
        /\s/.test(trimmed[relation.length] ?? '')
      )
        return relation + ' ' + math(trimmed.slice(relation.length));
    }
    const unchanged = literal(part);
    if (!part.includes('@') || part.includes('@@')) return unchanged;
    try {
      if (!ce) {
        ce = new ComputeEngine();
        ce.iterationLimit = 1024;
        ce.recursionLimit = 64;
        ce.latexOptions.decimalSeparator = '{,}';
        ce.latexSyntax?.addEntries?.([
          { kind: 'function', latexTrigger: 'ln', parse: 'Ln' },
          { kind: 'function', latexTrigger: 'log', parse: 'Log' },
          { kind: 'function', latexTrigger: 'exp', parse: 'Exp' },
          { kind: 'function', latexTrigger: 'sin', parse: 'Sin' },
          { kind: 'function', latexTrigger: 'cos', parse: 'Cos' },
          { kind: 'function', latexTrigger: 'tan', parse: 'Tan' },
        ]);
        ce.latexSyntax?.addEntries?.(
          names.map((_, index) => ({
            kind: 'expression',
            latexTrigger: String.raw`\mathrm{${prefix + index}}`,
            parse: prefix + index,
          })),
        );
        for (const [index, name] of names.entries()) {
          const value = ce.parse(String(parameters[name]), { form: 'raw' });
          if (!value.isValid || value.symbols.length || !bounded(value.json))
            return unchanged;
          replacements[prefix + index] = value.json;
        }
      }
      // Lexical parameter binding, not an algebra rewrite. Explicit grouping
      // makes an unbraced ^@n or _@n consume the complete parameter atom.
      let bound = '';
      for (let i = 0; i < part.length;) {
        if (part[i] !== '@') {
          bound += part[i++];
          continue;
        }
        let end = i + 1;
        while (end < part.length && /[A-Za-z0-9_]/.test(part[end]!)) end++;
        const index = names.indexOf(part.slice(i + 1, end));
        if (index < 0) return unchanged;
        bound += String.raw`{\mathrm{${prefix + index}}}`;
        i = end;
      }
      const parsed = ce.parse(bound, { form: 'raw' });
      if (!parsed.isValid || !bounded(parsed.json)) return unchanged;
      // Cortex folds a simple subscript into a symbol name. Rebind only names
      // carrying our reserved parameter token, through its Subscript AST.
      for (const symbol of parsed.symbols) {
        for (const [index] of names.entries()) {
          const suffix = '_' + prefix + index;
          if (symbol.endsWith(suffix) && symbol.length > suffix.length)
            replacements[symbol] = [
              'Subscript',
              symbol.slice(0, -suffix.length),
              replacements[prefix + index]!,
            ];
        }
      }
      const substituted = parsed.subs(replacements, { canonical: false });
      if (!substituted.isValid || !bounded(substituted.json)) return unchanged;
      const rendered = substituted.toLatex({ digitGroup: 0 });
      // Literal text commands do not interpret dictionary references as symbols.
      if (!rendered || rendered.includes('@') || rendered.includes(prefix))
        return unchanged;
      return rendered;
    } catch {
      return unchanged;
    }
  };
  let result = '',
    start = 0,
    index = 0,
    fragments = 0;
  while (index < source.length) {
    if (source[index] !== '$' || escaped(index)) {
      index++;
      continue;
    }
    const delimiter = source[index + 1] === '$' ? '$$' : '$';
    const from = index + delimiter.length;
    let end = from;
    while (
      end < source.length &&
      (source.slice(end, end + delimiter.length) !== delimiter || escaped(end))
    )
      end++;
    if (end === source.length || ++fragments > 64) break;
    result +=
      literal(source.slice(start, index)) +
      delimiter +
      math(source.slice(from, end)) +
      delimiter;
    start = end + delimiter.length;
    index = start;
  }
  return result + literal(source.slice(start));
}
