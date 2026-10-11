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
): void {
  const response = v.object(e.response, `${path}/response`, ['format', 'kind']);
  const kind = response.kind;
  const domain = kind === 'expression' ? 'polynomial' : kind;
  if (
    !['rational', 'real', 'extended-real', 'expression', 'text'].some(
      (k) => k === kind,
    )
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
  ]);
  v.literal(p.domain, `${path}/policy/domain`, String(domain));
  v.literal(p.form, `${path}/policy/form`, 'value-only');
  if (p.comparison !== undefined) {
    if (kind === 'expression' || kind === 'text')
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
