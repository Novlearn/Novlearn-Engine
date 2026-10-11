import type { JsonObject } from './types.js';
import { Validation } from './validation.js';

/** Transport grammar for nonnegative exact decimal tolerances, never math rewriting. */
export function toleranceSyntax(value: unknown, relative: boolean): boolean {
  if (typeof value !== 'string' || value.length > 15) return false;
  const match = /^(0|[1-9]\d{0,6})(?:\.(\d{1,6}))?$/.exec(value);
  if (!match || match[0] !== value) return false;
  const denominator = 10n ** BigInt((match[2] ?? '').length);
  const numerator = BigInt(match[1]! + (match[2] ?? ''));
  return numerator <= denominator * (relative ? 1n : 1_000_000n);
}

export function inspectQuestionAnswer(
  v: Validation,
  e: JsonObject,
  path: string,
  variables: ReadonlyMap<string, string> = new Map(),
): void {
  const response = v.object(e.response, `${path}/response`, [
    'format',
    'kind',
    'variable',
  ]);
  const kind = response.kind;
  const algebra = [
    'expression',
    'rational-expression',
    'equation',
    'inequality',
  ].some((k) => k === kind);
  const domain =
    kind === 'expression'
      ? 'polynomial'
      : kind === 'rational-expression'
        ? 'rational-function'
        : kind;
  if (response.variable !== undefined) {
    if (
      !algebra ||
      typeof response.variable !== 'string' ||
      variables.get(response.variable) !== 'real'
    )
      v.issue(
        `${path}/response/variable`,
        'value',
        'Expected a declared real variable for univariate algebra.',
      );
  } else if (
    algebra &&
    (variables.size > 1 || [...variables.values()].some((d) => d !== 'real'))
  )
    v.issue(
      `${path}/response/variable`,
      'value',
      'An explicit declared real variable is required.',
    );
  if (
    ![
      'rational',
      'real',
      'extended-real',
      'expression',
      'text',
      'rational-expression',
      'equation',
      'inequality',
      'set',
      'intervals',
    ].some((k) => k === kind)
  )
    v.issue(`${path}/response/kind`, 'value', 'Unsupported question response.');
  v.literal(
    response.format,
    `${path}/response/format`,
    kind === 'text' ? 'text' : 'latex',
  );
  if (kind === 'text') {
    const variants = v.list(e.expectedTexts, `${path}/expectedTexts`, 64);
    if (!variants.length)
      v.issue(
        `${path}/expectedTexts`,
        'value',
        'At least one authorized text variant is required.',
      );
    variants.forEach((s, i) => v.text(s, `${path}/expectedTexts/${i}`));
    if (e.expectedLatex !== undefined)
      v.issue(
        `${path}/expectedLatex`,
        'unknown-field',
        'Text questions cannot carry expected LaTeX.',
      );
  } else {
    v.text(e.expectedLatex, `${path}/expectedLatex`);
    if (e.expectedTexts !== undefined)
      v.issue(
        `${path}/expectedTexts`,
        'unknown-field',
        'Math questions cannot carry text variants.',
      );
  }
  const p = v.object(e.policy, `${path}/policy`, [
    'domain',
    'form',
    'comparison',
    'normalization',
    'comparisonDomain',
  ]);
  v.literal(p.domain, `${path}/policy/domain`, String(domain));
  v.literal(p.form, `${path}/policy/form`, 'value-only');
  if (p.comparison !== undefined) {
    if (!['rational', 'real', 'extended-real'].some((k) => k === kind))
      v.issue(
        `${path}/policy/comparison`,
        'value',
        'Numeric comparison requires a numeric question.',
      );
    const c = v.object(p.comparison, `${path}/policy/comparison`, [
      'mode',
      'absolute',
      'relative',
    ]);
    if (c.mode === 'approximate') {
      for (const key of ['absolute', 'relative'])
        if (!toleranceSyntax(c[key], key === 'relative'))
          v.issue(
            `${path}/policy/comparison/${key}`,
            'value',
            'Expected a bounded nonnegative exact decimal tolerance.',
          );
    } else if (c.mode === 'exact') {
      for (const key of ['absolute', 'relative'])
        if (c[key] !== undefined)
          v.issue(
            `${path}/policy/comparison/${key}`,
            'unknown-field',
            'Exact comparison has no tolerance.',
          );
    } else
      v.issue(
        `${path}/policy/comparison/mode`,
        'value',
        'Expected exact or approximate.',
      );
  }
  if (p.comparisonDomain !== undefined) {
    const d = v.object(p.comparisonDomain, `${path}/policy/comparisonDomain`, [
      'variable',
      'excludedLatex',
    ]);
    const variable = response.variable ?? [...variables.keys()][0];
    if (
      !algebra ||
      d.variable !== variable ||
      typeof d.variable !== 'string' ||
      variables.get(d.variable) !== 'real'
    )
      v.issue(
        `${path}/policy/comparisonDomain/variable`,
        'value',
        'An imposed real domain must refer to the official algebra variable.',
      );
    v.list(
      d.excludedLatex,
      `${path}/policy/comparisonDomain/excludedLatex`,
      64,
    ).forEach((s, i) =>
      v.text(s, `${path}/policy/comparisonDomain/excludedLatex/${i}`),
    );
  }
  if (p.normalization !== undefined) {
    if (kind !== 'text')
      v.issue(
        `${path}/policy/normalization`,
        'value',
        'Normalization requires a text question.',
      );
    const n = v.object(p.normalization, `${path}/policy/normalization`, [
      'trim',
      'collapseWhitespace',
      'ignoreCase',
      'unicodeNFC',
    ]);
    for (const key of Object.keys(n))
      if (typeof n[key] !== 'boolean')
        v.issue(
          `${path}/policy/normalization/${key}`,
          'type',
          'Expected a boolean.',
        );
  }
}
