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
    'log-affine-positive',
    'geometric-expression',
    'elementary-positive',
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
      'log-affine-positive',
      'geometric-expression',
      'elementary-positive',
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
  if (
    [
      'log-affine-positive',
      'geometric-expression',
      'elementary-positive',
    ].includes(String(kind))
  ) {
    if (p.form !== 'value-only')
      v.issue(
        `${path}/policy/form`,
        'value',
        'Log-affine-positive accepts value-only forms.',
      );
    if (
      typeof response.variable !== 'string' ||
      variables.get(response.variable) !== 'real'
    )
      v.issue(
        `${path}/response/variable`,
        'value',
        'Log-affine-positive requires an explicit declared real variable.',
      );
  }
  const families = [
    'irreducible-fraction',
    'expanded',
    'reduced',
    'factorized',
    'power-of-e',
  ];
  const inspectForm = (form: unknown, formPath: string): void => {
    if (!families.some((f) => f === form)) {
      v.issue(
        formPath,
        'value',
        'Expected a supported structural form family.',
      );
      return;
    }
    if (
      form === 'power-of-e'
        ? kind !== 'real'
        : form === 'irreducible-fraction'
          ? !['rational', 'real'].some((k) => k === kind)
          : kind !== 'expression'
    )
      v.issue(
        formPath,
        'value',
        'Form family is incompatible with the response profile.',
      );
  };
  if (p.form !== 'value-only') {
    if (typeof p.form === 'string') inspectForm(p.form, `${path}/policy/form`);
    else {
      const form = v.object(p.form, `${path}/policy/form`, [
        'kind',
        'anyOf',
        'latex',
      ]);
      if (form.kind === 'accepted-latex') {
        if (!['rational', 'real', 'expression'].some((k) => k === kind))
          v.issue(
            `${path}/policy/form`,
            'value',
            'Explicit forms require a finite numeric or polynomial response.',
          );
        const sources = v.list(form.latex, `${path}/policy/form/latex`, 16);
        if (!sources.length)
          v.issue(
            `${path}/policy/form/latex`,
            'value',
            'At least one explicit form is required.',
          );
        sources.forEach((s, i) => v.text(s, `${path}/policy/form/latex/${i}`));
        if (form.anyOf !== undefined)
          v.issue(
            `${path}/policy/form/anyOf`,
            'unknown-field',
            'Explicit forms do not carry family choices.',
          );
      } else {
        v.literal(form.kind, `${path}/policy/form/kind`, 'accepted-forms');
        const choices = v.list(form.anyOf, `${path}/policy/form/anyOf`, 4);
        if (!choices.length || new Set(choices).size !== choices.length)
          v.issue(
            `${path}/policy/form/anyOf`,
            'value',
            'Expected one to four distinct form families.',
          );
        choices.forEach((f, i) =>
          inspectForm(f, `${path}/policy/form/anyOf/${i}`),
        );
        if (form.latex !== undefined)
          v.issue(
            `${path}/policy/form/latex`,
            'unknown-field',
            'Family choices do not carry explicit forms.',
          );
      }
    }
  }
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
    if (kind === 'log-affine-positive')
      v.issue(
        `${path}/policy/comparisonDomain`,
        'value',
        'The log-affine-positive profile has the intrinsic comparison domain x>0.',
      );
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
