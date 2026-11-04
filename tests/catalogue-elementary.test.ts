import { describe, it, expect } from 'vitest';
import {
  instantiateExercise,
  gradeAnswer,
  projectPublicInstance,
} from '../src/index.js';
import type { ExerciseDefinition, ExerciseInstance } from '../src/index.js';

function fixture(
  source: string,
  kind:
    | 'geometric-expression'
    | 'expression'
    | 'elementary-positive'
    | 'real'
    | 'set'
    | 'intervals' = 'elementary-positive',
): ExerciseDefinition {
  const algebra =
    kind === 'geometric-expression' ||
    kind === 'elementary-positive' ||
    kind === 'expression';
  return {
    schemaVersion: 5,
    kind: 'composed',
    id: 'synthetic-catalogue',
    revision: '1',
    title: 'Synthetic mathematical verification',
    generation: {
      schemaVersion: 5,
      definitions: [],
      constraints: [],
      maxAttempts: 8,
      maxDraws: 64,
    },
    variables: algebra ? [{ name: 'x', domain: 'real' }] : [],
    elements: [
      {
        id: 'q',
        type: 'question',
        text: 'Donner la réponse exacte.',
        points: 1,
        response: {
          format: 'latex',
          kind,
          ...(algebra ? { variable: 'x' } : {}),
        },
        policy: {
          domain: kind === 'expression' ? 'polynomial' : kind,
          form: 'value-only',
        },
        expectedLatex: source,
      },
    ],
  };
}
function instance(
  source: string,
  kind: Parameters<typeof fixture>[1] = 'elementary-positive',
): ExerciseInstance {
  const result = instantiateExercise(fixture(source, kind), {
    seed: 42,
    instanceId: 'synthetic-instance',
  });
  expect(result.ok, result.ok ? '' : JSON.stringify(result.diagnostics)).toBe(
    true,
  );
  if (!result.ok) throw new Error('Instantiation failed');
  return result.value;
}
const grade = (i: ExerciseInstance, source: string) =>
  gradeAnswer(i, {
    schemaVersion: 5,
    instanceId: i.instanceId,
    questionId: 'q',
    answer: { format: 'latex', source },
  });
describe('catalogue extension: exact identity and domain proofs', () => {
  it.each([
    String.raw`3\cdot2^x`,
    String.raw`2^x\cdot3`,
    String.raw`3\cdot2^{x+0}`,
  ])('accepts a geometric identity: %s', (answer) => {
    expect(
      grade(instance(String.raw`3\cdot2^x`, 'geometric-expression'), answer)
        .state,
    ).toBe('correct');
  });
  it('rejects an incorrect geometric coefficient with an exact integer counterexample', () => {
    const verdict = grade(
      instance(String.raw`3\cdot2^x`, 'geometric-expression'),
      String.raw`4\cdot2^x`,
    );
    expect(verdict.state).toBe('incorrect');
    expect(verdict.proof).toBe('exact-counterexample');
  });
  it('never turns matching sample points into an identity', () => {
    const verdict = grade(
      instance(String.raw`3\cdot2^x`, 'geometric-expression'),
      String.raw`3\cdot2^x+x(x-1)(x-2)(x-3)`,
    );
    expect(verdict.state).toBe('indeterminate');
  });
  it('rejects a displaced fractional-base geometric sequence exactly', () => {
    const verdict = grade(
      instance(String.raw`8(1/4)^x`, 'geometric-expression'),
      String.raw`8(1/4)^x+1`,
    );
    expect(verdict.state).toBe('incorrect');
    expect(verdict.proof).toBe('exact-counterexample');
  });
  it.each([
    String.raw`3\cdot2^x+\frac{x-1}{x-1}-1`,
    String.raw`3\cdot2^x+\frac{0}{x}`,
  ])('refuses cancellation of a real-domain hole: %s', (source) => {
    expect(
      grade(instance(String.raw`3\cdot2^x`, 'geometric-expression'), source)
        .state,
    ).not.toBe('correct');
  });
  it.each([String.raw`x^{-1/2}`, String.raw`\frac1{\sqrt{x}}`])(
    'accepts positive-variable radicals: %s',
    (source) => {
      expect(grade(instance(String.raw`\frac1{\sqrt{x}}`), source).state).toBe(
        'correct',
      );
    },
  );
  it('rejects a different inverse power exactly', () => {
    expect(
      grade(instance(String.raw`\frac1{\sqrt{x}}`), String.raw`\frac1x`).state,
    ).toBe('incorrect');
  });
  it('roundtrips a polynomial with an ungrouped large coefficient', () => {
    const i = instance('2600+23x', 'expression');
    const q = i.elements.find((e) => e.type === 'question')!;
    if (q.type !== 'question' || q.expected.kind === 'text')
      throw Error('Expected mathematical question');
    expect(q.expected.math.displayLatex).not.toContain('\\,');
    expect(grade(i, q.expected.math.displayLatex).state).toBe('correct');
  });
  it('accepts a distributed polynomial-logarithm identity', () => {
    expect(
      grade(instance(String.raw`x^2(2\ln(x)+1)`), String.raw`2x^2\ln(x)+x^2`)
        .state,
    ).toBe('correct');
  });
  it('rejects an incorrect polynomial-logarithm identity', () => {
    expect(
      grade(instance(String.raw`x^2(2\ln(x)+1)`), String.raw`2x^2\ln(x)-x^2`)
        .state,
    ).toBe('incorrect');
  });
  it.each([
    String.raw`\ln(-x)`,
    String.raw`\frac{x-1}{x-1}`,
    String.raw`\sqrt{x-1}`,
  ])('refuses a source outside the whole positive domain: %s', (source) => {
    expect(grade(instance('1'), source).state).not.toBe('correct');
  });
  it('keeps empty inputs invalid and private expected data out of projections', () => {
    const i = instance(String.raw`\frac1{\sqrt{x}}`);
    expect(grade(i, '').state).toBe('invalid');
    expect(JSON.stringify(projectPublicInstance(i))).not.toMatch(
      /expected|policy|generation|elementary-identity/,
    );
  });
  it.each([
    String.raw`\sqrt{2+\sqrt2}`,
    String.raw`e^{20}`,
    String.raw`e^{-1/4}`,
    String.raw`e^{-1/5}`,
    String.raw`\frac{-3+\sqrt{9+4e^8}}{2}`,
  ])('prepares and self-grades a closed exact expression: %s', (source) => {
    const i = instance(source, 'real');
    expect(grade(i, source).state).toBe('correct');
    const q = i.elements.find((e) => e.type === 'question')!;
    if (q.type !== 'question' || q.expected.kind === 'text')
      throw Error('Expected mathematics');
    expect(grade(i, q.expected.math.displayLatex).state).toBe('correct');
  });
  it.each([
    String.raw`]\frac{\ln3-\ln2}{-2};+\infty[`,
    String.raw`[\sqrt{5/28};+\infty[`,
    String.raw`]\frac{\ln(11/4-1)-\ln7}{-5};+\infty[`,
    String.raw`\left\{\ln2;\exp(3/2)\right\}`,
  ])('supports elementary collection members: %s', (source) => {
    const kind = source.startsWith(String.raw`\left\{`) ? 'set' : 'intervals';
    expect(grade(instance(source, kind), source).state).toBe('correct');
  });
  it.each([String.raw`\left\{\ln(-2)\right\}`, String.raw`]\ln0;+\infty[`])(
    'rejects an invalid closed logarithm domain: %s',
    (source) => {
      expect(
        instantiateExercise(
          fixture(source, source.startsWith(']') ? 'intervals' : 'set'),
          { seed: 42, instanceId: 'bad' },
        ).ok,
      ).toBe(false);
    },
  );
});
