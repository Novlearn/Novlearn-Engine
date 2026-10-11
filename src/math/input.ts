import { ComputeEngine } from '@cortex-js/compute-engine';
import type { MathJsonExpression } from '@cortex-js/compute-engine/math-json';
import { isMathName } from '../contracts/names.js';

/** Detached MathJSON, never a boxed CortexJS object. */
export type MathSyntax = MathJsonExpression;

export interface MathInputContext {
  /** Resolved generation names of ExerciseDefinition; no values are substituted. */
  parameters?: readonly string[];
  /** Free variables/unknowns, distinct from parameters. */
  variables?: readonly string[];
}

export interface MathInputDiagnostic {
  code:
    | 'empty'
    | 'incomplete'
    | 'invalid-syntax'
    | 'unknown-symbol'
    | 'unsupported'
    | 'limit'
    | 'technical-error'
    | 'invalid-context';
  message: string;
  /** JSON Pointer into syntax, when available. */
  path?: string;
  symbol?: string;
  /** UTF-16 offset into the unchanged source, when available. */
  offset?: number;
}

type ParsedMathInput<P extends string> = {
  source: string;
  profile: P;
} & (
  | {
      ok: true;
      syntax: MathSyntax;
      symbols: {
        parameters: string[];
        variables: string[];
        constants: string[];
      };
    }
  | { ok: false; diagnostics: MathInputDiagnostic[] }
);
export type MathInputResult = ParsedMathInput<'scalar-latex-v1'>;

const commands = new Set([
  'frac',
  'dfrac',
  'tfrac',
  'sqrt',
  'left',
  'right',
  'cdot',
  'times',
  'div',
  'pi',
  'exponentialE',
  'imaginaryI',
  'infty',
  'quad',
  'qquad',
  'mathrm',
]);
const operators = new Set([
  'Add',
  'Subtract',
  'Multiply',
  'InvisibleOperator',
  'Divide',
  'Negate',
  'Power',
  'Square',
  'Sqrt',
  'Root',
  'Delimiter',
]);
const constants = new Set(['Pi', 'ExponentialE']);
const displayCommands = new Set([
  'sin',
  'cos',
  'tan',
  'ln',
  'log',
  'exp',
  'abs',
  'lvert',
  'rvert',
  'le',
  'leq',
  'ge',
  'geq',
  'ne',
  'neq',
]);
const displayOperators = new Set([
  'Sin',
  'Cos',
  'Tan',
  'Ln',
  'Log',
  'Exp',
  'Abs',
  'Equal',
  'NotEqual',
  'Less',
  'LessEqual',
  'Greater',
  'GreaterEqual',
]);

/** Parsing/admissibility only. Success proves neither a domain nor a value. */
export function parseMathInput(
  source: string,
  context: MathInputContext = {},
): MathInputResult {
  return parseInput(source, context, 'scalar-latex-v1');
}

/** Internal presentation admission only; no public grading capability is implied. */
export function parseDisplayInput(
  source: string,
  context: MathInputContext,
): ParsedMathInput<'display-latex-v1'> {
  return parseInput(source, context, 'display-latex-v1');
}

/** Internal closed numeric response profile; explicit infinities are admitted for later type checks. */
export function parseNumericInput(source: string, context: MathInputContext) {
  return parseInput(source, context, 'numeric-latex-v1');
}
export function parseAlgebraInput(source: string, context: MathInputContext) {
  return parseInput(source, context, 'algebra-latex-v1');
}
export function parseCollectionInput(
  source: string,
  context: MathInputContext,
) {
  return parseInput(source, context, 'collection-latex-v1');
}

function parseInput<
  P extends
    | 'scalar-latex-v1'
    | 'display-latex-v1'
    | 'numeric-latex-v1'
    | 'algebra-latex-v1'
    | 'collection-latex-v1',
>(source: string, context: MathInputContext, profile: P): ParsedMathInput<P> {
  const display = profile === 'display-latex-v1';
  const numeric = profile === 'numeric-latex-v1';
  const collection = profile === 'collection-latex-v1';
  const algebra = profile === 'algebra-latex-v1';
  const base = { source, profile };
  const fail = (
    code: MathInputDiagnostic['code'],
    message: string,
    detail: Omit<MathInputDiagnostic, 'code' | 'message'> = {},
  ): ParsedMathInput<P> => ({
    ...base,
    ok: false,
    diagnostics: [{ code, message, ...detail }],
  });
  if (source.length > 4096)
    return fail('limit', 'La saisie dépasse 4096 caractères.');
  if (!source.trim())
    return fail('empty', 'Saisissez une expression mathématique.');
  const parameters = context.parameters ?? [];
  const variables = context.variables ?? [];
  if (parameters.length > 16 || variables.length > 16)
    return fail(
      'limit',
      'Au plus 16 paramètres et 16 variables sont autorisés.',
    );
  const names = [...parameters, ...variables];
  if (
    names.some((name) => !isMathName(name)) ||
    new Set(names).size !== names.length
  )
    return fail(
      'invalid-context',
      'Les noms doivent être distincts, comporter 1–32 lettres/chiffres, commencer par une minuscule et ne pas être réservés.',
    );

  // Lexical guards only: no rewriting or second mathematical parser.
  const unfinishedDecimal = /\d(?:\{,\}|\.)(?!\d)/.exec(source);
  if (unfinishedDecimal)
    return fail('incomplete', 'Complétez la partie décimale du nombre.', {
      offset: unfinishedDecimal.index + 1,
    });
  for (const match of source.matchAll(/\\([a-zA-Z]+|.)/g)) {
    const command = match[1] ?? '';
    if (command === 'placeholder' || command === 'square' || command === 'Box')
      return fail('incomplete', 'Complétez le champ de saisie vide.', {
        offset: match.index,
      });
    if (
      !commands.has(command) &&
      !(display && displayCommands.has(command)) &&
      !(algebra && ['le', 'leq', 'ge', 'geq', 'ne', 'neq'].includes(command)) &&
      !(
        collection &&
        ['{', '}', 'cup', 'emptyset', 'varnothing'].includes(command)
      ) &&
      ![',', ';', ':', '!', ' '].includes(command)
    )
      return fail(
        'unsupported',
        'Cette commande LaTeX ne fait pas partie du profil scalaire.',
        { offset: match.index },
      );
  }
  let nesting = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '%')
      return fail('unsupported', 'Les commentaires LaTeX sont hors profil.', {
        offset: index,
      });
    if (
      char === ',' &&
      !collection &&
      source[index - 1] !== '\\' &&
      source.slice(index - 1, index + 2) !== '{,}'
    )
      return fail(
        'unsupported',
        'Virgule ambiguë : utilisez un point ou {,} pour un décimal.',
        { offset: index },
      );
    if (char === '{' || char === '(' || char === '[') nesting += 1;
    if (char === '}' || char === ')' || char === ']')
      nesting = Math.max(0, nesting - 1);
    if (nesting > 32)
      return fail('limit', 'La saisie dépasse 32 niveaux de groupement.');
  }
  try {
    // A new context per call, with no assignments, canonicalization or evaluation.
    const ce = new ComputeEngine();
    if (numeric || collection)
      ce.latexSyntax?.addEntries?.([
        { kind: 'expression', latexTrigger: 'e', parse: 'ExponentialE' },
      ]);
    if (collection) {
      const brackets = [
        ['[', ']', false, false],
        ['[', '[', false, true],
        [']', ']', true, false],
        [']', '[', true, true],
      ] as const;
      for (const [open, close, leftOpen, rightOpen] of brackets)
        ce.latexSyntax?.addEntries?.([
          {
            kind: 'matchfix',
            openTrigger: [open],
            closeTrigger: [close],
            parse: (_parser: unknown, body: MathSyntax): MathSyntax | null => {
              const items = Array.isArray(body)
                ? (body as MathSyntax[])
                : undefined;
              const pair = items?.[0] === 'Delimiter' ? items[1] : body;
              if (
                !Array.isArray(pair) ||
                pair[0] !== 'Sequence' ||
                pair.length !== 3
              )
                return ['Error', "'invalid-interval'"];
              return [
                'Interval',
                leftOpen ? ['Open', pair[1]!] : pair[1]!,
                rightOpen ? ['Open', pair[2]!] : pair[2]!,
              ];
            },
          },
        ]);
    }
    // Explicit named references only. CortexJS parses these dictionary entries;
    // bare letters retain their original juxtaposition/multiplication semantics.
    // Expression entries also avoid the library interpreting e.g. kg as a unit.
    ce.latexSyntax?.addEntries?.(
      names.map((name) => ({
        kind: 'expression',
        latexTrigger: `\\mathrm{${name}}`,
        parse: name,
      })),
    );
    ce.latexOptions.decimalSeparator = '{,}';
    const expression = ce.parse(source, { form: 'raw' });
    const syntax = expression.json;
    const diagnostics: MathInputDiagnostic[] = [];
    const found = {
      parameters: new Set<string>(),
      variables: new Set<string>(),
      constants: new Set<string>(),
    };
    let nodes = 0;
    const issue = (
      code: MathInputDiagnostic['code'],
      message: string,
      path: string,
      symbol?: string,
    ): void => {
      if (diagnostics.length < 16)
        diagnostics.push({
          code,
          message,
          path,
          ...(symbol === undefined ? {} : { symbol }),
        });
    };
    const visit = (node: unknown, path: string, depth: number): void => {
      nodes += 1;
      if (nodes > 512 || depth > 64) {
        issue('limit', 'Représentation mathématique trop complexe.', path);
        return;
      }
      if (typeof node === 'number') {
        if (!Number.isFinite(node))
          issue(
            'unsupported',
            'Les nombres non finis ne sont pas pris en charge.',
            path,
          );
        return;
      }
      if (typeof node === 'string') {
        if (parameters.includes(node)) found.parameters.add(node);
        else if (variables.includes(node)) found.variables.add(node);
        else if (
          constants.has(node) ||
          ((numeric || collection) &&
            [
              'PositiveInfinity',
              'NegativeInfinity',
              ...(collection ? ['EmptySet'] : []),
            ].includes(node))
        )
          found.constants.add(node);
        else if (node === 'Nothing')
          issue('incomplete', 'Expression vide ou incomplète.', path);
        else if (
          node.startsWith("'") ||
          [
            'NaN',
            'PositiveInfinity',
            'NegativeInfinity',
            'ComplexInfinity',
            'ImaginaryUnit',
          ].includes(node)
        )
          issue(
            'unsupported',
            'Cet objet ne fait pas partie du profil scalaire réel.',
            path,
          );
        else
          issue(
            'unknown-symbol',
            'Déclarez ce symbole dans le contexte de l’exercice.',
            path,
            node,
          );
        return;
      }
      if (Array.isArray(node)) {
        const head: unknown = node[0];
        if (head === 'Error') {
          const error: unknown = Array.isArray(node[1]) ? node[1][1] : node[1];
          const incomplete =
            error === "'missing'" ||
            error === "'expected-closing-delimiter'" ||
            (error === "'unexpected-operator'" && /[+\-*/^]\s*$/.test(source));
          issue(
            incomplete ? 'incomplete' : 'invalid-syntax',
            incomplete
              ? 'Complétez l’expression mathématique.'
              : 'La syntaxe LaTeX est invalide.',
            path,
          );
          return;
        }
        if (
          typeof head !== 'string' ||
          (!operators.has(head) &&
            !(display && displayOperators.has(head)) &&
            !(
              algebra &&
              [
                'Equal',
                'NotEqual',
                'Less',
                'LessEqual',
                'Greater',
                'GreaterEqual',
              ].includes(head)
            ) &&
            !(
              collection &&
              [
                'Set',
                'Interval',
                'Open',
                'Union',
                'Sequence',
                'Delimiter',
              ].includes(head)
            ))
        ) {
          // Inspect nested parser errors before reporting unsupported containers.
          for (let i = 1; i < node.length; i += 1)
            visit(node[i], `${path}/${i}`, depth + 1);
          if (!diagnostics.length)
            issue(
              'unsupported',
              'Cette expression ne fait pas partie du profil scalaire.',
              path,
            );
          return;
        }
        for (let i = 1; i < node.length; i += 1) {
          if (collection && head === 'Delimiter' && i === 2) continue;
          visit(node[i], `${path}/${i}`, depth + 1);
        }
        return;
      }
      if (
        node !== null &&
        typeof node === 'object' &&
        'num' in node &&
        typeof node.num === 'string'
      ) {
        if (!/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(node.num))
          issue('unsupported', 'Format numérique hors profil.', path);
        return;
      }
      issue('unsupported', 'Représentation MathJSON hors profil.', path);
    };
    visit(syntax, '/syntax', 0);
    if (diagnostics.length) return { ...base, ok: false, diagnostics };
    return {
      ...base,
      ok: true,
      syntax,
      symbols: {
        parameters: [...found.parameters].sort(),
        variables: [...found.variables].sort(),
        constants: [...found.constants].sort(),
      },
    };
  } catch {
    return fail(
      'technical-error',
      'La bibliothèque a échoué pendant le parsing de cette saisie.',
    );
  }
}
