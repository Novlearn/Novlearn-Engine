import type { ExerciseInstance, TextNormalization } from './contracts/types.js';
import { validateSubmission } from './contracts/validation.js';
import { compareNumeric, prepareNumeric } from './math/numeric.js';
import { toleranceSyntax } from './contracts/answer-validation.js';

export type CorrectionState =
  'correct' | 'incorrect' | 'invalid' | 'indeterminate' | 'error';
export interface CorrectionResult {
  schemaVersion: 5;
  instanceId: string;
  questionId: string;
  state: CorrectionState;
  value:
    | 'equal'
    | 'different'
    | 'within-tolerance'
    | 'outside-tolerance'
    | 'unknown';
  comparison: 'exact' | 'approximate' | 'discrete' | 'none';
  form: 'not-required' | 'unknown';
  proof:
    | 'exact-number'
    | 'closed-identity'
    | 'certified-bounds'
    | 'explicit-infinity'
    | 'selection'
    | 'text'
    | 'none';
  code: string;
}
function normalizeText(source: string, policy: TextNormalization = {}): string {
  let value = policy.unicodeNFC ? source.normalize('NFC') : source;
  if (policy.collapseWhitespace) value = value.replace(/\s+/gu, ' ');
  if (policy.trim) value = value.trim();
  if (policy.ignoreCase) value = value.toLowerCase();
  return value;
}
/** Pure per-question correction from an OFFICIAL trusted server snapshot. No authentication or deadline is implied. */
export function gradeAnswer(
  instance: ExerciseInstance,
  submission: unknown,
): CorrectionResult {
  let questionId = '';
  let comparison: CorrectionResult['comparison'] = 'none';
  const result = (
    state: CorrectionState,
    code: string,
    proof: CorrectionResult['proof'] = 'none',
  ): CorrectionResult => ({
    schemaVersion: 5,
    instanceId: instance.instanceId,
    questionId,
    state,
    value:
      state === 'correct'
        ? comparison === 'approximate'
          ? 'within-tolerance'
          : 'equal'
        : state === 'incorrect'
          ? comparison === 'approximate'
            ? 'outside-tolerance'
            : 'different'
          : 'unknown',
    comparison,
    form:
      state === 'correct' || state === 'incorrect' ? 'not-required' : 'unknown',
    proof,
    code,
  });
  try {
    const checked = validateSubmission(submission);
    if (!checked.ok) return result('invalid', 'submission-contract');
    const s = checked.value;
    questionId = s.questionId;
    if (s.instanceId !== instance.instanceId)
      return result('invalid', 'instance-mismatch');
    const matches = instance.elements.filter((e) => e.id === s.questionId);
    if (!matches.length) return result('invalid', 'unknown-question');
    if (matches.length !== 1)
      return result('error', 'official-question-collision');
    const q = matches[0]!;
    if (q.type === 'mcq') {
      if (s.answer.format !== 'selection')
        return result('invalid', 'answer-format');
      const ids = new Set(q.options.map((o) => o.id));
      const expected = q.expected.optionIds;
      if (
        q.expected.kind !== 'selection' ||
        ids.size !== q.options.length ||
        expected.length === 0 ||
        new Set(expected).size !== expected.length ||
        expected.some((id) => !ids.has(id)) ||
        (q.mode === 'single' && expected.length !== 1)
      )
        return result('error', 'official-selection');
      const selected = s.answer.optionIds;
      if (selected.some((id) => !ids.has(id)))
        return result('invalid', 'unknown-option');
      if (!selected.length) return result('invalid', 'empty-answer');
      if (q.mode === 'single' && selected.length !== 1)
        return result('invalid', 'selection-cardinality');
      const equal =
        selected.length === expected.length &&
        expected.every((id) => selected.includes(id));
      comparison = 'discrete';
      return result(
        equal ? 'correct' : 'incorrect',
        equal ? 'selection-equal' : 'selection-different',
        'selection',
      );
    }
    if (q.type !== 'question') return result('invalid', 'not-a-question');
    if (
      s.answer.format === 'selection' ||
      s.answer.format !== q.response.format
    )
      return result('invalid', 'answer-format');
    if (!s.answer.source.trim()) return result('invalid', 'empty-answer');
    if (q.policy.form !== 'value-only')
      return result('error', 'official-policy');
    if (q.expected.kind === 'text') {
      if (
        q.response.kind !== 'text' ||
        q.policy.domain !== 'text' ||
        q.policy.comparison !== undefined ||
        !q.expected.variants.length
      )
        return result('error', 'official-text');
      const student = normalizeText(s.answer.source, q.policy.normalization);
      const equal = q.expected.variants.some(
        (v) => normalizeText(v, q.policy.normalization) === student,
      );
      comparison = 'discrete';
      return result(
        equal ? 'correct' : 'incorrect',
        equal ? 'text-equal' : 'text-different',
        'text',
      );
    }
    if (q.expected.kind === 'expression')
      return result('indeterminate', 'polynomial-comparison-pending');
    if (
      q.response.kind !== 'rational' &&
      q.response.kind !== 'real' &&
      q.response.kind !== 'extended-real'
    )
      return result('error', 'official-response');
    if (
      q.policy.domain !== q.response.kind ||
      q.policy.normalization !== undefined
    )
      return result('error', 'official-policy');
    if (
      q.policy.comparison !== undefined &&
      q.policy.comparison.mode !== 'exact' &&
      q.policy.comparison.mode !== 'approximate'
    )
      return result('error', 'official-policy');
    if ((q.response.kind === 'rational') !== (q.expected.kind === 'rational'))
      return result('error', 'official-expected-kind');
    if (
      q.policy.comparison?.mode === 'approximate' &&
      (!toleranceSyntax(q.policy.comparison.absolute, false) ||
        !toleranceSyntax(q.policy.comparison.relative, true))
    )
      return result('error', 'official-tolerance');
    const expected = prepareNumeric(
      q.expected.math.source,
      {
        parameters: Object.keys(instance.generation.values),
        variables: instance.definition.variables.map((v) => v.name),
      },
      instance.generation.values,
      '/expected',
      q.response.kind === 'extended-real',
    );
    if (!expected.ok) return result('error', 'official-expected');
    if (q.expected.kind === 'rational') {
      const expectedRatio = expected.value.expression.evaluate().toRational();
      if (
        !expectedRatio ||
        expectedRatio[0] !== q.expected.value.numerator ||
        expectedRatio[1] !== q.expected.value.denominator
      )
        return result('error', 'official-rational');
    }
    const student = prepareNumeric(
      s.answer.source,
      {},
      {},
      '/answer/source',
      q.response.kind === 'extended-real',
    );
    if (!student.ok) {
      const codes = student.diagnostics.map((d) => d.code);
      if (
        codes.some(
          (c) => c === 'substitution-failed' || c === 'technical-error',
        )
      )
        return result('error', 'numeric-library');
      if (
        codes.some(
          (c) =>
            c === 'unsupported' ||
            c === 'not-calculable' ||
            c === 'unknown-symbol' ||
            c === 'limit',
        )
      )
        return result('indeterminate', 'numeric-profile');
      return result('invalid', codes[0] ?? 'invalid-math');
    }
    comparison = q.policy.comparison?.mode ?? 'exact';
    const verdict = compareNumeric(
      student.value,
      expected.value,
      q.policy.comparison,
    );
    if (verdict.proof === 'explicit-infinity') comparison = 'exact';
    if (verdict.equal === undefined)
      return result('indeterminate', 'numeric-proof');
    return result(
      verdict.equal ? 'correct' : 'incorrect',
      verdict.equal ? 'numeric-equal' : 'numeric-different',
      verdict.proof,
    );
  } catch {
    return result('error', 'technical-error');
  }
}
