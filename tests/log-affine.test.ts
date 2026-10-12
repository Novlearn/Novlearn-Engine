import { describe, expect, it, vi } from 'vitest';
import { ComputeEngine, isNumber } from '@cortex-js/compute-engine';
import { prepareLogAffine, compareLogAffine } from '../dist/math/log-affine.js';
import { prepareNumeric, compareNumeric } from '../dist/math/numeric.js';
import {
  instantiateExercise,
  gradeAnswer,
  validateDefinition,
} from 'novlearn-exercise-engine';
import type { ExerciseDefinition } from 'novlearn-exercise-engine';

function definition(expectedLatex = '2\\ln(x)+5'): ExerciseDefinition {
  return {
    schemaVersion: 5,
    kind: 'composed',
    id: 'log-affine-proof',
    revision: '1',
    title: 'Known derivative',
    generation: {
      schemaVersion: 5,
      definitions: [],
      constraints: [],
      maxAttempts: 1,
      maxDraws: 1,
    },
    variables: [{ name: 'x', domain: 'real' }],
    elements: [
      {
        id: 'q',
        type: 'question',
        text: 'x>0',
        points: 1,
        response: {
          format: 'latex',
          kind: 'log-affine-positive',
          variable: 'x',
        },
        policy: { domain: 'log-affine-positive', form: 'value-only' },
        expectedLatex,
      },
    ],
  };
}
function grade(source: string, expectedLatex = '2\\ln(x)+5') {
  const official = instantiateExercise(definition(expectedLatex), {
    seed: 0,
    instanceId: 'log-test',
  });
  if (!official.ok) throw new Error(JSON.stringify(official.diagnostics));
  return gradeAnswer(official.value, {
    schemaVersion: 5,
    instanceId: official.value.instanceId,
    questionId: 'q',
    answer: { format: 'latex', source },
  });
}
describe('exact bounded logarithmic affine proof on the intrinsic x>0 domain', () => {
  it('does not turn an indeterminate coefficient comparison into inequality', () => {
    const prepared = prepareLogAffine(
      '\\frac{1}{3}\\ln(x)+\\frac{1}{5}',
      { variables: ['x'] },
      {},
      '/probe',
      'x',
    );
    if (!prepared.ok) throw new Error(JSON.stringify(prepared.diagnostics));
    const ce = new ComputeEngine();
    const expression = ce.box(['Rational', 1, 3]).evaluate();
    if (!isNumber(expression)) throw new Error('Expected boxed exact number');
    const sample = expression.numericValue;
    if (!sample || typeof sample !== 'object')
      throw new Error('Expected exact NumericValue');
    const proto = Object.getPrototypeOf(sample);
    const eq = vi.spyOn(proto, 'eq').mockReturnValue(false),
      lt = vi.spyOn(proto, 'lt').mockReturnValue(undefined),
      gt = vi.spyOn(proto, 'gt').mockReturnValue(undefined);
    try {
      expect(compareLogAffine(prepared.value, prepared.value)).toBeUndefined();
    } finally {
      eq.mockRestore();
      lt.mockRestore();
      gt.mockRestore();
    }
  });
  for (const source of [
    '2\\ln(x)+5',
    '2(\\ln(x)+1)+3',
    '\\ln(x)+\\ln(x)+5',
    '(4\\ln(x)+10)/2',
    '5+2\\ln((x))',
    '2\\ln(x)+10/2',
  ])
    it(`proves ${source}`, () =>
      expect(grade(source)).toMatchObject({
        state: 'correct',
        proof: 'exact-log-affine',
        domain: 'restricted',
      }));
  for (const source of ['3\\ln(x)+5', '2\\ln(x)+4', '5', '0'])
    it(`proves difference ${source}`, () =>
      expect(grade(source)).toMatchObject({
        state: 'incorrect',
        proof: 'exact-log-affine',
      }));
  for (const source of [
    '\\ln(-x)',
    '\\ln(x^2)',
    '\\ln(x)/x',
    'x+2\\ln(x)+5',
    '1/\\ln(x)',
    '\\ln(x)^2',
    '\\sin(x)',
    '0\\ln(-x)+2\\ln(x)+5',
    '\\ln(x)-\\ln(x)+x',
    '0^-1+2\\ln(x)+5',
  ])
    it(`keeps unsupported ${source} indeterminate`, () =>
      expect(grade(source).state).toBe('indeterminate'));
  for (const source of [
    '2\\ln(x)+5+0/0',
    '(2\\ln(x)+5)/(1-1)',
    '0^0+2\\ln(x)+5',
    '0^{-1}+2\\ln(x)+5',
  ])
    it(`checks raw domain before reduction ${source}`, () =>
      expect(grade(source).state).toBe('invalid'));
  it('supports constant coefficient zero without demanding a visible logarithm', () =>
    expect(grade('5', '0\\ln(x)+5').state).toBe('correct'));
  it('reprepares the original expected source rather than grouped display digits', () => {
    const source = '\\frac{999999999}{1000000000}\\ln(x)+5';
    expect(grade(source, source).state).toBe('correct');
  });
  it('rejects an official raw domain error even if a stale display is valid', () => {
    const instance = instantiateExercise(definition(), {
      seed: 0,
      instanceId: 'bad-official',
    });
    if (!instance.ok) throw new Error();
    const q = instance.value.elements[0]!;
    if (q.type !== 'question' || q.expected.kind !== 'log-affine-positive')
      throw new Error();
    q.expected.math.source = '0/0+2\\ln(x)+5';
    expect(
      gradeAnswer(instance.value, {
        schemaVersion: 5,
        instanceId: 'bad-official',
        questionId: 'q',
        answer: { format: 'latex', source: '2\\ln(x)+5' },
      }),
    ).toMatchObject({ state: 'error', code: 'official-log-affine' });
    q.expected.math.source = '2\\ln(x)+5';
    delete q.response.variable;
    expect(
      gradeAnswer(instance.value, {
        schemaVersion: 5,
        instanceId: 'bad-official',
        questionId: 'q',
        answer: { format: 'latex', source: '2\\ln(x)+5' },
      }),
    ).toMatchObject({ state: 'error', code: 'official-log-affine' });
  });
  it('requires explicit positive logarithmic profile and real variable', () => {
    const d = definition();
    const q = d.elements[0]!;
    if (q.type !== 'question') throw new Error();
    delete q.response.variable;
    expect(validateDefinition(d).ok).toBe(false);
    q.response.variable = 'x';
    q.policy.comparisonDomain = { variable: 'x', excludedLatex: ['0'] };
    expect(validateDefinition(d).ok).toBe(false);
  });
});
describe('power-of-e form preserves value and original presentation separately', () => {
  it('preserves an indeterminate exponent comparison without an incorrect verdict', () => {
    const a = prepareNumeric('e^{-1/2}', {}, {}, '/a', false),
      b = prepareNumeric('e^{-3/2}', {}, {}, '/b', false);
    if (!a.ok || !b.ok) throw new Error('Expected admitted exponentials');
    const ce = new ComputeEngine(),
      expression = ce.box(['Rational', 1, 3]).evaluate();
    if (
      !isNumber(expression) ||
      !expression.numericValue ||
      typeof expression.numericValue !== 'object'
    )
      throw new Error('Expected NumericValue');
    const proto = Object.getPrototypeOf(expression.numericValue);
    const eq = vi.spyOn(proto, 'eq').mockReturnValue(false),
      lt = vi.spyOn(proto, 'lt').mockReturnValue(undefined),
      gt = vi.spyOn(proto, 'gt').mockReturnValue(undefined);
    try {
      expect(compareNumeric(a.value, b.value)).toEqual({
        equal: undefined,
        proof: 'none',
      });
    } finally {
      eq.mockRestore();
      lt.mockRestore();
      gt.mockRestore();
    }
  });
  function numeric(expectedLatex = 'e^{-5/2}') {
    const d = definition();
    d.variables = [];
    const q = d.elements[0]!;
    if (q.type !== 'question') throw new Error();
    q.expectedLatex = expectedLatex;
    q.response = { format: 'latex', kind: 'real' };
    q.policy = { domain: 'real', form: 'power-of-e' };
    return instantiateExercise(d, { seed: 0, instanceId: 'exp-test' });
  }
  for (const source of ['0', '-1', '-3/2'])
    it(`proves positivity against ${source}`, () => {
      const r = numeric();
      if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
      expect(
        gradeAnswer(r.value, {
          schemaVersion: 5,
          instanceId: 'exp-test',
          questionId: 'q',
          answer: { format: 'latex', source },
        }),
      ).toMatchObject({
        state: 'incorrect',
        value: 'different',
        proof: 'positive-exponential',
      });
    }, 20000);
  for (const source of ['e^{-1}', 'e^{-3}', 'e^0', 'e^{1/2}'])
    it(`proves a different rational exponent for ${source}`, () => {
      const r = numeric();
      if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
      expect(
        gradeAnswer(r.value, {
          schemaVersion: 5,
          instanceId: 'exp-test',
          questionId: 'q',
          answer: { format: 'latex', source },
        }),
      ).toMatchObject({
        state: 'incorrect',
        value: 'different',
        form: 'conforming',
        proof: 'exponential-injectivity',
      });
    }, 20000);
  for (const source of ['e^{-5/2}', 'e^{-(2+3)/2}', '(e^{-10/4})', 'e^{-2.5}'])
    it(`accepts rational exponent ${source}`, () => {
      const result = numeric();
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(
        gradeAnswer(result.value, {
          schemaVersion: 5,
          instanceId: 'exp-test',
          questionId: 'q',
          answer: { format: 'latex', source },
        }),
      ).toMatchObject({ state: 'correct', form: 'conforming' });
    }, 20000);
  it('exp has equal value but fails the original power form', () => {
    const r = numeric();
    if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
    expect(
      gradeAnswer(r.value, {
        schemaVersion: 5,
        instanceId: 'exp-test',
        questionId: 'q',
        answer: { format: 'latex', source: '\\exp(-5/2)' },
      }),
    ).toMatchObject({
      state: 'incorrect',
      value: 'equal',
      form: 'nonconforming',
    });
  }, 20000);
  for (const source of ['e^{17/2}', 'e^{-16}', 'e^{16}'])
    it(
      `admits bounded exponent ${source}`,
      () => expect(numeric(source).ok).toBe(true),
      20000,
    );
  for (const source of [
    'e^{17}',
    'e^{-17}',
    'e^{\\pi}',
    '2^{1/2}',
    'e^{0/0}',
    'e^{\\sqrt{2}}',
  ])
    it(
      `refuses unsupported expected exponent ${source}`,
      () => expect(numeric(source).ok).toBe(false),
      20000,
    );
});
