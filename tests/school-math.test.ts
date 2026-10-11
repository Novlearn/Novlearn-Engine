import { describe, expect, it } from 'vitest';
import {
  gradeAnswer,
  instantiateExercise,
  parseMathInput,
  projectPublicInstance,
  validateDefinition,
} from 'novlearn-exercise-engine';
import type {
  ExerciseDefinition,
  ExerciseInstance,
} from 'novlearn-exercise-engine';
import fixture from './fixtures/contracts/school-known-answers.definition.json' with { type: 'json' };
import { element } from './elements.js';

const context = { parameters: ['a'], variables: ['x'] };
function official(definition: unknown = fixture): ExerciseInstance {
  const result = instantiateExercise(definition, {
    seed: 17,
    instanceId: 'm6-official',
  });
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.value;
}
function grade(
  instance: ExerciseInstance,
  source: string,
  questionId = 'numeric',
) {
  return gradeAnswer(instance, {
    schemaVersion: 5,
    instanceId: instance.instanceId,
    questionId,
    answer: { format: 'latex', source },
  });
}
function numeric(expectedLatex: string): ExerciseInstance {
  const definition: ExerciseDefinition = {
    schemaVersion: 5,
    kind: 'composed',
    id: 'm6-numeric',
    revision: '1',
    title: 'M6',
    generation: {
      schemaVersion: 5,
      definitions: [],
      constraints: [],
      maxAttempts: 1,
      maxDraws: 1,
    },
    variables: [],
    elements: [
      {
        id: 'numeric',
        type: 'question',
        text: 'Calculer.',
        points: 1,
        response: { format: 'latex', kind: 'real' },
        expectedLatex,
        policy: { domain: 'real', form: 'value-only' },
      },
    ],
  };
  return official(definition);
}

describe('M6 parsing is distinct from proof', () => {
  it.each([
    '\\ln(x-a)',
    'e^x',
    '\\exp(x)',
    '\\sin(x)',
    '\\cos(x)',
    '\\tan(x)',
    '\\lim_{x\\to a^+}\\frac{\\ln(x-a)}{x-a}',
    '\\lim_{x\\rightarrow a^-}x',
    '\\lim_{x\\to +\\infty}x',
    '\\lim_{x\\to a^{2}}x',
    '\\ln(0)',
  ])('reads %s without a domain claim', (source) => {
    expect(parseMathInput(source, context, 'school-latex-v1')).toMatchObject({
      ok: true,
      source,
      profile: 'school-latex-v1',
    });
  });
  it.each(['\\sin x', '\\lim_{x\\to a}x', 'e^x'])(
    'keeps the default scalar profile bounded: %s',
    (source) => {
      expect(parseMathInput(source, context).ok).toBe(false);
    },
  );
  it.each([
    '\\lim_{a\\to 2}a',
    '\\lim_{y\\to 2}y',
    '\\lim_{x\\to x}x',
    '\\int x dx',
    "f'(x)",
  ])('refuses unsupported binding or syntax: %s', (source) => {
    expect(parseMathInput(source, context, 'school-latex-v1').ok).toBe(false);
  });
  it('classifies a missing limit target as incomplete', () => {
    expect(
      parseMathInput('\\lim_{x\\to}\\ln(x)', context, 'school-latex-v1'),
    ).toMatchObject({
      ok: false,
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ code: 'incomplete' }),
      ]),
    });
  });
  it('keeps parameters and free variables distinct', () => {
    expect(
      parseMathInput(
        '\\lim_{x\\to a^+}x',
        { parameters: ['x', 'a'], variables: ['x'] },
        'school-latex-v1',
      ),
    ).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'invalid-context', message: expect.any(String) }],
    });
  });
});

describe('M6 closed exact functions and domains', () => {
  // Independent school identities: exact unit-circle coordinates and inverse exp/ln.
  it.each([
    ['0', '\\ln(1)'],
    ['1', '\\ln(e)'],
    ['2', '\\ln(e^2)'],
    ['2', '\\ln(\\exp(2))'],
    ['1', '\\exp(0)'],
    ['e', '\\exp(1)'],
    ['2', '\\log(100)'],
    ['3', '\\log_2(8)'],
    ['0', '\\sin(0)'],
    ['1', '\\cos(0)'],
    ['0', '\\tan(0)'],
    ['1/2', '\\sin(\\pi/6)'],
    ['1/2', '\\cos(\\pi/3)'],
    ['1', '\\tan(\\pi/4)'],
    ['\\sqrt{3}/2', '\\sin(\\pi/3)'],
    ['\\sqrt{2}/2', '\\cos(\\pi/4)'],
    ['\\sqrt{3}/3', '\\tan(\\pi/6)'],
    ['-1/2', '\\sin(-\\pi/6)'],
    ['1/2', '\\sin(13\\pi/6)'],
    ['-1', '\\cos(\\pi)'],
  ])('proves %s = %s', (expected, source) => {
    expect(grade(numeric(expected), source)).toMatchObject({
      state: 'correct',
      value: 'equal',
      comparison: 'exact',
    });
  });
  it.each([
    '\\ln(0)',
    '\\ln(-1)',
    '0\\ln(-1)',
    '\\exp(\\ln(0))',
    '\\ln(1/0)',
    '\\log_1(8)',
    '\\log_0(8)',
    '\\log_2(-1)',
    '\\tan(\\pi/2)',
    '0\\tan(\\pi/2)',
    '\\tan(3\\pi/2)',
  ])('refuses undefined descendants before reduction: %s', (source) => {
    expect(grade(numeric('0'), source)).toMatchObject({
      state: 'invalid',
      code: 'undefined-expression',
    });
  });
  it.each(['\\sin(1)', '\\cos(1)', '\\tan(1)', '\\ln(2)', '\\sin(\\pi/7)'])(
    'does not manufacture an unequal verdict for %s',
    (source) => {
      expect(grade(numeric('1'), source)).toMatchObject({
        state: 'indeterminate',
        value: 'unknown',
      });
    },
  );
  it.each(['\\ln(2)', '\\sin(1)', '\\exp(1/2)'])(
    'proves a defined closed identity: %s',
    (source) => {
      expect(grade(numeric(source), source)).toMatchObject({
        state: 'correct',
        value: 'equal',
        proof: 'closed-identity',
      });
    },
  );
  it.each([
    ['1/2', '\\sin(-\\pi/6)'],
    ['1', '\\cos(\\pi)'],
    ['\\sqrt{2}/2', '0.707107'],
  ])('proves distinct exact values %s and %s', (expected, source) => {
    expect(grade(numeric(expected), source)).toMatchObject({
      state: 'incorrect',
      value: 'different',
    });
  });
  it('refuses an undefined official expected expression', () => {
    expect(() => numeric('0\\ln(-1)')).toThrow(/undefined-expression/);
  });
  it.each(['1\\frac{1}{2}', '0 2\\ln(1)', '1\\frac{1}{2}\\sin(0)'])(
    'keeps mixed numeric juxtaposition ambiguous: %s',
    (source) => {
      expect(grade(numeric('0'), source)).toMatchObject({
        state: 'indeterminate',
        code: 'numeric-profile',
      });
    },
  );
  it('substitutes official parameters before checking a logarithm domain', () => {
    const definition = {
      ...fixture,
      elements: [
        {
          id: 'numeric',
          type: 'question',
          text: 'Calculer.',
          points: 1,
          response: { format: 'latex', kind: 'real' },
          expectedLatex: '\\ln(\\exp(a))',
          policy: { domain: 'real', form: 'value-only' },
        },
      ],
    };
    expect(grade(official(definition), '\\ln(\\exp(2))')).toMatchObject({
      state: 'correct',
      value: 'equal',
    });
    expect(grade(official(definition), '\\ln(-2)')).toMatchObject({
      state: 'invalid',
      code: 'undefined-expression',
    });
  });
});

describe('M6 native known-answer exercise, without limit or derivative solving', () => {
  it('validates, substitutes, serializes and replays deterministically', () => {
    expect(validateDefinition(fixture).ok).toBe(true);
    const instance = official();
    expect(instance).toEqual(official());
    const fn = element(instance, 'expression');
    expect(fn.math.source).toBe('\\frac{\\ln(x-a)}{x-a}');
    expect(fn.math.substituted).toEqual([
      'Divide',
      ['Ln', ['Subtract', 'x', 2]],
      ['Subtract', 'x', 2],
    ]);
    const limit = instance.elements.find((item) => item.id === 'limit');
    expect(limit?.type).toBe('expression');
    if (limit?.type !== 'expression') throw new Error('Missing limit');
    expect(limit.math.substituted).toEqual([
      'Limit',
      [
        'Function',
        ['Divide', ['Ln', ['Subtract', 'x', 2]], ['Subtract', 'x', 2]],
        'x',
      ],
      2,
      1,
    ]);
    expect(JSON.parse(JSON.stringify(instance))).toEqual(instance);
    expect(grade(instance, '-\\infty', 'q-limit')).toMatchObject({
      state: 'correct',
      proof: 'explicit-infinity',
    });
    expect(grade(instance, '+\\infty', 'q-limit')).toMatchObject({
      state: 'incorrect',
    });
    expect(grade(instance, '0', 'q-limit')).toMatchObject({
      state: 'incorrect',
    });
    expect(grade(instance, '1/0', 'q-limit')).toMatchObject({
      state: 'invalid',
    });
    expect(grade(instance, '2x+2x+3', 'q-derivative')).toMatchObject({
      state: 'correct',
      proof: 'exact-polynomial',
    });
    expect(grade(instance, '4x-3', 'q-derivative')).toMatchObject({
      state: 'incorrect',
    });
    expect(grade(instance, '\\sin(x)', 'q-derivative')).toMatchObject({
      state: 'indeterminate',
    });
    expect(grade(instance, '1/2', 'q-value')).toMatchObject({
      state: 'correct',
    });
  }, 20000);
  it('projects only render fields, with no answer or math proof', () => {
    const projected = projectPublicInstance(official());
    expect(element(projected, 'expression')).toMatchObject({
      formulaDomain: 'unverified',
    });
    const serialized = JSON.stringify(projected);
    for (const secret of [
      'expected',
      'PRIVATE-M6',
      'substituted',
      'policy',
      'mathFields',
      'seed',
    ])
      expect(serialized).not.toContain(secret);
  });
  it('validates the expression display mode explicitly', () => {
    const bad = {
      ...fixture,
      elements: fixture.elements.map((item, index) =>
        index === 1 ? { ...item, mode: 'evaluate' } : item,
      ),
    };
    expect(validateDefinition(bad).ok).toBe(false);
  });
  it.each([-3, 0, 2])('preserves the limit binding with a=%s', (a) => {
    const definition = {
      ...fixture,
      generation: {
        ...fixture.generation,
        definitions: [
          { name: 'a', kind: 'integer', min: a, max: a, exclusions: [] },
        ],
      },
    };
    const instance = official(definition);
    const limit = instance.elements.find((item) => item.id === 'limit');
    if (limit?.type !== 'expression') throw new Error('Missing limit');
    expect(limit.math.source).toBe('\\lim_{x\\to a^+}\\frac{\\ln(x-a)}{x-a}');
    expect(limit.math.substituted).toEqual([
      'Limit',
      [
        'Function',
        ['Divide', ['Ln', ['Subtract', 'x', a]], ['Subtract', 'x', a]],
        'x',
      ],
      a,
      1,
    ]);
    expect(grade(instance, '-\\infty', 'q-limit')).toMatchObject({
      state: 'correct',
    });
    const reparsed = parseMathInput(
      limit.latex,
      { variables: ['x'] },
      'school-latex-v1',
    );
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) throw new Error(JSON.stringify(reparsed.diagnostics));
    expect(reparsed.syntax).toEqual([
      'Limit',
      ['Function', expect.anything(), 'x'],
      ['Delimiter', a < 0 ? ['Negate', -a] : a],
      1,
    ]);
  });
  it('substitutes an exact decimal target without evaluating the limit', () => {
    const definition = {
      ...fixture,
      generation: {
        ...fixture.generation,
        definitions: [
          {
            name: 'a',
            kind: 'decimal',
            min: 0.5,
            max: 0.5,
            precision: 1,
            exclusions: [],
          },
        ],
      },
    };
    const limit = official(definition).elements.find(
      (item) => item.id === 'limit',
    );
    if (limit?.type !== 'expression') throw new Error('Missing limit');
    expect(limit.math.substituted).toEqual([
      'Limit',
      [
        'Function',
        [
          'Divide',
          ['Ln', ['Subtract', 'x', ['Rational', 5, 10]]],
          ['Subtract', 'x', ['Rational', 5, 10]],
        ],
        'x',
      ],
      ['Rational', 5, 10],
      1,
    ]);
  });
  it.each(['(-2)^+', '(-2)^-', '(-1/3)^+', '(-1/3)^-', '(1/2)^+', '(1/2)^-'])(
    'preserves a rendered directed target %s',
    (target) => {
      const definition = {
        ...fixture,
        elements: fixture.elements.map((item) =>
          item.id === 'limit'
            ? { ...item, latex: `\\lim_{x\\to ${target}}x` }
            : item,
        ),
      };
      const limit = official(definition).elements.find(
        (item) => item.id === 'limit',
      );
      if (limit?.type !== 'expression') throw new Error('Missing limit');
      const reparsed = parseMathInput(
        limit.latex,
        { variables: ['x'] },
        'school-latex-v1',
      );
      expect(reparsed.ok).toBe(true);
      if (!reparsed.ok) throw new Error(JSON.stringify(reparsed.diagnostics));
      expect(reparsed.syntax).toEqual([
        'Limit',
        ['Function', 'x', 'x'],
        expect.anything(),
        target.endsWith('+') ? 1 : -1,
      ]);
      expect(limit.formulaDomain).toBe('unverified');
    },
  );
});
