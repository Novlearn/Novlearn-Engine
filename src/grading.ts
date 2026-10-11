import type { ExerciseInstance, TextNormalization } from './contracts/types.js';
import { validateSubmission } from './contracts/validation.js';
import { compareNumeric, prepareNumeric } from './math/numeric.js';
import { toleranceSyntax } from './contracts/answer-validation.js';
import {
  algebraKind,
  prepareAlgebra,
  compareAlgebraValues,
  compareAlgebraDomains,
  prepareComparisonDomain,
  exclusionsCovered,
  restrictSolutions,
} from './math/algebra.js';
import { prepareCollection, compareCollections } from './math/collections.js';
import { MathFailure } from './math/substitution.js';
import type { InstantiationMathDiagnostic } from './math/substitution.js';

function mathFailureState(
  diagnostics: readonly InstantiationMathDiagnostic[],
): CorrectionState {
  if (
    diagnostics.some(
      (d) => d.code === 'substitution-failed' || d.code === 'technical-error',
    )
  )
    return 'error';
  if (
    diagnostics.some((d) =>
      ['unsupported', 'not-calculable', 'unknown-symbol', 'limit'].includes(
        d.code,
      ),
    )
  )
    return 'indeterminate';
  return 'invalid';
}

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
    | 'equal-on-common-domain'
    | 'within-tolerance'
    | 'outside-tolerance'
    | 'unknown';
  comparison: 'exact' | 'approximate' | 'discrete' | 'none';
  form: 'not-required' | 'unknown';
  domain: 'same' | 'different' | 'restricted' | 'unknown' | 'not-applicable';
  proof:
    | 'exact-number'
    | 'quadratic-number'
    | 'closed-identity'
    | 'certified-bounds'
    | 'explicit-infinity'
    | 'selection'
    | 'text'
    | 'exact-polynomial'
    | 'rational-cross-products'
    | 'domain'
    | 'solution-set'
    | 'exact-collection'
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
  let domain: CorrectionResult['domain'] = 'not-applicable';
  let valueOverride: CorrectionResult['value'] | undefined;
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
      valueOverride ??
      (state === 'correct'
        ? comparison === 'approximate'
          ? 'within-tolerance'
          : 'equal'
        : state === 'incorrect'
          ? comparison === 'approximate'
            ? 'outside-tolerance'
            : 'different'
          : 'unknown'),
    comparison,
    domain,
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
    const profile = algebraKind(q.response.kind);
    if (profile !== undefined) {
      domain = 'unknown';
      if (
        q.policy.domain !== profile ||
        q.policy.comparison !== undefined ||
        q.policy.normalization !== undefined ||
        (q.response.kind === 'expression'
          ? q.expected.kind !== 'expression'
          : q.expected.kind !== 'algebra')
      )
        return result('error', 'official-algebra');
      if (q.expected.kind !== 'expression' && q.expected.kind !== 'algebra')
        return result('error', 'official-expected-kind');
      const variable =
        q.response.variable ?? instance.definition.variables[0]?.name ?? 'z';
      const declaration = instance.definition.variables.find(
        (v) => v.name === variable,
      );
      if (
        (q.response.variable !== undefined && declaration === undefined) ||
        (declaration !== undefined && declaration.domain !== 'real') ||
        (q.response.variable === undefined &&
          instance.definition.variables.length > 1)
      )
        return result('error', 'official-variable');
      const variables = declaration === undefined ? [] : [variable];
      const parameters = Object.keys(instance.generation.values);
      const expected = prepareAlgebra(
        q.expected.math.source,
        { parameters, variables },
        instance.generation.values,
        '/expected',
        variable,
        profile,
      );
      if (!expected.ok) return result('error', 'official-expected');
      const student = prepareAlgebra(
        s.answer.source,
        { variables },
        {},
        '/answer/source',
        variable,
        profile,
      );
      if (!student.ok)
        return result(
          mathFailureState(student.diagnostics),
          student.diagnostics[0]?.code ?? 'algebra-profile',
        );
      let imposed;
      if (q.policy.comparisonDomain !== undefined) {
        if (
          q.policy.comparisonDomain.variable !== variable ||
          declaration === undefined
        )
          return result('error', 'official-domain');
        const prepared = prepareComparisonDomain(
          q.policy.comparisonDomain.excludedLatex,
          parameters,
          instance.generation.values,
          '/domain',
        );
        if (
          !prepared.ok ||
          exclusionsCovered(
            expected.value.exclusions,
            prepared.ok ? prepared.value : [],
          ) !== true
        )
          return result('error', 'official-domain');
        imposed = prepared.value;
      }
      const domainEqual =
        imposed === undefined
          ? compareAlgebraDomains(student.value, expected.value)
          : exclusionsCovered(student.value.exclusions, imposed);
      comparison = 'exact';
      if (domainEqual === undefined)
        return result('indeterminate', 'algebra-domain-proof');
      domain = domainEqual
        ? imposed === undefined
          ? 'same'
          : 'restricted'
        : 'different';
      if (profile === 'equation' || profile === 'inequality') {
        if (!student.value.solutions || !expected.value.solutions)
          return result('error', 'official-solutions');
        const equal = compareCollections(
          imposed === undefined
            ? student.value.solutions
            : restrictSolutions(student.value.solutions, imposed),
          imposed === undefined
            ? expected.value.solutions
            : restrictSolutions(expected.value.solutions, imposed),
        );
        if (equal === undefined)
          return result('indeterminate', 'solution-proof');
        return result(
          equal ? 'correct' : 'incorrect',
          equal ? 'solutions-equal' : 'solutions-different',
          'solution-set',
        );
      }
      const equal = compareAlgebraValues(student.value, expected.value);
      if (!domainEqual) {
        valueOverride =
          equal === true
            ? 'equal-on-common-domain'
            : equal === false
              ? 'different'
              : 'unknown';
        return result('incorrect', 'algebra-domain', 'domain');
      }
      if (equal === undefined) return result('indeterminate', 'algebra-proof');
      return result(
        equal ? 'correct' : 'incorrect',
        equal ? 'algebra-equal' : 'algebra-different',
        profile === 'polynomial'
          ? 'exact-polynomial'
          : 'rational-cross-products',
      );
    }
    if (q.response.kind === 'set' || q.response.kind === 'intervals') {
      if (
        q.expected.kind !== 'collection' ||
        q.policy.domain !== q.response.kind ||
        q.policy.comparison !== undefined ||
        q.policy.comparisonDomain !== undefined ||
        q.policy.normalization !== undefined
      )
        return result('error', 'official-collection');
      const expected = prepareCollection(
        q.expected.math.source,
        { parameters: Object.keys(instance.generation.values) },
        instance.generation.values,
        '/expected',
        q.response.kind,
      );
      if (!expected.ok) return result('error', 'official-expected');
      const student = prepareCollection(
        s.answer.source,
        {},
        {},
        '/answer/source',
        q.response.kind,
      );
      if (!student.ok)
        return result(
          mathFailureState(student.diagnostics),
          student.diagnostics[0]?.code ?? 'collection-profile',
        );
      comparison = 'exact';
      const equal = compareCollections(student.value, expected.value);
      if (equal === undefined)
        return result('indeterminate', 'collection-proof');
      return result(
        equal ? 'correct' : 'incorrect',
        equal ? 'collection-equal' : 'collection-different',
        'exact-collection',
      );
    }
    if (
      q.response.kind !== 'rational' &&
      q.response.kind !== 'real' &&
      q.response.kind !== 'extended-real'
    )
      return result('error', 'official-response');
    if (
      q.policy.domain !== q.response.kind ||
      q.policy.normalization !== undefined ||
      q.policy.comparisonDomain !== undefined
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
  } catch (error) {
    if (error instanceof MathFailure)
      return result(
        mathFailureState([error.diagnostic]),
        error.diagnostic.code,
      );
    return result('error', 'technical-error');
  }
}
