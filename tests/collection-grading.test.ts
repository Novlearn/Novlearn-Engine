import { describe, expect, it, vi } from 'vitest';
import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  gradeAnswer,
  instantiateExercise,
  projectPublicInstance,
} from 'novlearn-exercise-engine';
import type {
  ExerciseDefinition,
  ExerciseInstance,
} from 'novlearn-exercise-engine';
import {
  normalizeIntervals,
  prepareCollection,
  compareCollections,
} from '../src/math/collections.js';
import { numericOrder, prepareNumeric } from '../src/math/numeric.js';

function definition(
  expectedLatex: string,
  kind: 'set' | 'intervals' = 'set',
): ExerciseDefinition {
  return {
    schemaVersion: 5,
    kind: 'composed',
    id: 'synthetic-m4-collection',
    revision: '1',
    title: 'M4',
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
        id: 'q',
        type: 'question',
        text: 'Solutions',
        points: 1,
        response: { format: 'latex', kind },
        expectedLatex,
        policy: { domain: kind, form: 'value-only' },
      },
    ],
  };
}
function official(d: ExerciseDefinition): ExerciseInstance {
  const r = instantiateExercise(d, { seed: 0, instanceId: 'official' });
  if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
  return r.value;
}
function answer(i: ExerciseInstance, source: string) {
  return gradeAnswer(i, {
    schemaVersion: 5,
    instanceId: 'official',
    questionId: 'q',
    answer: { format: 'latex', source },
  });
}
function grade(
  expected: string,
  source: string,
  kind: 'set' | 'intervals' = 'set',
) {
  return answer(official(definition(expected, kind)), source);
}

describe('M4 finite sets of known solutions', () => {
  it.each([
    ['\\{-2,3\\}', '\\{3,-2\\}'],
    ['\\{-2;3\\}', '\\{3;-2;3;-2\\}'],
    ['\\emptyset', '\\varnothing'],
    ['\\{1/2;2\\}', '\\{0{,}5;1+1\\}'],
    ['\\{\\sqrt{2};-\\sqrt{2}\\}', '\\{-\\sqrt{8}/2;\\sqrt{8}/2\\}'],
    ['\\{(1+2)\\}', '\\{3\\}'],
    ['\\{2*(3+4)\\}', '\\{14\\}'],
    ['\\{(2+3)*(3+4)\\}', '\\{35\\}'],
    ['(\\{1,2\\})', '\\{2;1\\}'],
    ['\\{(1+\\sqrt{5})/2\\}', '\\{0.5+\\sqrt{5}/2\\}'],
    ['\\{\\pi;e\\}', '\\{e;\\pi\\}'],
  ])('proves %s = %s including order and repetitions', (a, b) => {
    expect(grade(a, b)).toMatchObject({
      state: 'correct',
      comparison: 'exact',
      proof: 'exact-collection',
      value: 'equal',
    });
  });
  it.each([
    ['\\{-2;3\\}', '\\{-2\\}'],
    ['\\{-2;3\\}', '\\{-2;3;4\\}'],
    ['\\emptyset', '\\{0\\}'],
    ['\\{0\\}', '\\emptyset'],
    ['\\{0.5\\}', '\\{1;2\\}'],
    ['\\{1+\\sqrt{2}\\}', '\\{2\\}'],
    ['\\{\\pi\\}', '\\{3.14\\}'],
  ])('proves different sets %s, %s', (a, b) =>
    expect(grade(a, b).state).toBe('incorrect'),
  );
  it('does not turn an unknown member comparison or cardinality into inequality', () => {
    expect(grade('\\{\\sqrt{2}+\\sqrt{3}\\}', '\\{\\sqrt{5}\\}')).toMatchObject(
      { state: 'indeterminate', value: 'unknown' },
    );
    expect(
      grade('\\{\\sqrt{2}+\\sqrt{3};\\sqrt{5}\\}', '\\{\\sqrt{5}\\}'),
    ).toMatchObject({ state: 'indeterminate', value: 'unknown' });
  });
  it.each([
    '\\{(1,2)\\}',
    '\\{(1,2),3\\}',
    '\\{[1;2]\\}',
    '[1;2]',
    '\\{\\infty\\}',
    '\\{0*(1/0)\\}',
    '\\{\\sqrt{-1}^2\\}',
  ])('rejects non-scalar/undefined set source %s', (source) => {
    expect(grade('\\{1\\}', source).state).toBe('invalid');
  });
  it.each(['\\{x\\}', '\\{\\sin(1)\\}', '\\{0.1234567\\}'])(
    'retains %s as indeterminate outside the proof profile',
    (source) => expect(grade('\\{1\\}', source).state).toBe('indeterminate'),
  );
});

describe('M4 French intervals, unions and infinite bounds', () => {
  it.each([
    ['[-2;3]', '[-2;3]'],
    [']-2;3[', ']-2;3['],
    ['[-2;3[', '[-2;3['],
    [']-2;3]', ']-2;3]'],
    [']-\\infty;2]', ']-\\infty;2]'],
    ['[2;+\\infty[', '[2;\\infty['],
    ['[0;1]\\cup]1;2[', '[0;2['],
    ['[0;1[\\cup[1;2]', '[0;2]'],
    ['[0;2]\\cup[1;3]', '[0;3]'],
    ['[2;3]\\cup[0;1]', '[0;1]\\cup[2;3]'],
    ['[0;0]', '\\{0\\}'],
    ['[1;1[', '\\emptyset'],
    [']1;1]', '\\emptyset'],
    [']0;1[\\cup\\{1\\}\\cup]1;2[', ']0;2['],
    ['[0;1]\\cup[0;1]', '[0;1]'],
    ['[0;1]\\cup\\emptyset', '[0;1]'],
    ['([0;1]\\cup[2;3])', '[0;1]\\cup([2;3])'],
    ['[0;2*(3+4)]', '[0;14]'],
    ['[0{,}5;2{,}5]', '[1/2;5/2]'],
    ['[1+\\sqrt{2};3]', '[1+\\sqrt{8}/2;3]'],
    ['\\left]-\\infty;2\\right]', ' ]-\\infty;2]'],
  ])('normalizes %s to the same set as %s', (a, b) =>
    expect(grade(a, b, 'intervals').state).toBe('correct'),
  );
  it.each([
    ['[-2;3]', ']-2;3]'],
    ['[-2;3]', '[-2;3['],
    ['[0;1]', '[0;2]'],
    [']0;1[\\cup]1;2[', ']0;2['],
    [']-\\infty;2]', ']-\\infty;2['],
    ['[0;1]\\cup[2;3]', '[0;3]'],
    ['[0;0]', '\\emptyset'],
    ['[1;1]', '[2;2]'],
  ])('distinguishes %s from %s by endpoints, gaps or closure', (a, b) =>
    expect(grade(a, b, 'intervals').state).toBe('incorrect'),
  );
  it.each([
    '[-\\infty;2]',
    '[0;+\\infty]',
    '[\\infty;2]',
    '[0;-\\infty[',
    '[2;1]',
    '[0;1;2]',
    '[0;1,2]',
    '[0;1/0]',
    '[0;\\sqrt{-1}]',
  ])('rejects invalid interval %s', (source) =>
    expect(grade('[0;1]', source, 'intervals').state).toBe('invalid'),
  );
  it.each(['[\\sqrt{2}+\\sqrt{3};4]', '[0;x]', '[0;\\sin(1)]'])(
    'does not guess the endpoint order/profile for %s',
    (source) =>
      expect(grade('[0;1]', source, 'intervals').state).toBe('indeterminate'),
  );
  it('validates every endpoint before eliminating an empty or overlapped component', () => {
    expect(grade('[0;2]', '[0;2]\\cup[1/0;1/0[', 'intervals').state).toBe(
      'invalid',
    );
    expect(
      grade('\\emptyset', '[\\sqrt{-1};\\sqrt{-1}[', 'intervals').state,
    ).toBe('invalid');
  });
  it('checks all contact closure combinations with an independent rational set oracle', () => {
    for (const leftClosed of [false, true])
      for (const rightClosed of [false, true]) {
        const r = prepareCollection(
          `[0;1${leftClosed ? ']' : '['}\\cup${rightClosed ? '[' : ']'}1;2]`,
          {},
          {},
          '/test',
          'intervals',
        );
        if (!r.ok) throw new Error(JSON.stringify(r));
        expect(r.value.intervals.length).toBe(
          leftClosed || rightClosed ? 1 : 2,
        );
        const coversOne = r.value.intervals.some((i) => {
          const l = i.left.expression.evaluate().toRational(),
            rr = i.right.expression.evaluate().toRational();
          if (!l || !rr) throw new Error('Rational contact oracle');
          const p = BigInt(l[1]) - BigInt(l[0]),
            q = BigInt(rr[1]) - BigInt(rr[0]);
          return (
            (p > 0n || (p === 0n && i.leftClosed)) &&
            (q < 0n || (q === 0n && i.rightClosed))
          );
        });
        expect(coversOne).toBe(leftClosed || rightClosed);
      }
  });
  it('does not mutate caller interval data during normalization', () => {
    const r = prepareCollection(
      '[0;1]\\cup[2;3]',
      {},
      {},
      '/test',
      'intervals',
    );
    if (!r.ok) throw new Error('Fixture');
    const copy = r.value.intervals.map((i) => ({ ...i }));
    const first = copy[0]!;
    const last = copy[1]!;
    last.left = first.right;
    const before = copy.map((i) => ({ ...i }));
    expect(normalizeIntervals(copy).length).toBe(1);
    expect(copy).toEqual(before);
  });
});

describe('M4 exact quadratic endpoints extend the numeric proof without floats', () => {
  it.each([
    ['1+\\sqrt{2}', '2', 1],
    ['1-\\sqrt{2}', '0', -1],
    ['(1+\\sqrt{5})/2', '2', -1],
    ['(1-\\sqrt{5})/2', '-1', 1],
    ['1+\\sqrt{8}/2', '1+\\sqrt{2}', 0],
    ['-2-3\\sqrt{2}', '-6', -1],
  ] as const)('proves the exact order of %s and %s', (a, b, order) => {
    const aa = prepareNumeric(a, {}, {}, '/a', false),
      bb = prepareNumeric(b, {}, {}, '/b', false);
    expect(aa.ok).toBe(true);
    expect(bb.ok).toBe(true);
    if (aa.ok && bb.ok) expect(numericOrder(aa.value, bb.value)).toBe(order);
  });
  it('retains unknown order across incompatible radical fields', () => {
    const a = prepareNumeric('\\sqrt{2}+\\sqrt{3}', {}, {}, '/a', false),
      b = prepareNumeric('\\sqrt{5}', {}, {}, '/b', false);
    if (!a.ok || !b.ok) throw new Error('Fixture');
    expect(numericOrder(a.value, b.value)).toBeUndefined();
  });
});

describe('M4 collection instance authority, limits and atomic errors', () => {
  it('substitutes parameter endpoints and retains original source privately', () => {
    const d = definition('\\{-a;a\\}');
    d.generation.definitions = [
      { name: 'a', kind: 'integer', min: 3, max: 3, exclusions: [] },
    ];
    const i = official(d);
    expect(answer(i, '\\{3;-3\\}').state).toBe('correct');
    expect(answer(i, '\\{a;-a\\}').state).toBe('indeterminate');
    const q = i.elements[0];
    if (q?.type !== 'question' || !('math' in q.expected))
      throw new Error('Fixture');
    expect(q.expected.math.source).toBe('\\{-a;a\\}');
    const serialized = JSON.stringify(projectPublicInstance(i));
    for (const secret of [
      'expected',
      'policy',
      'substituted',
      'source',
      'seed',
      'values',
    ])
      expect(serialized).not.toContain(secret);
    expect(
      answer(JSON.parse(JSON.stringify(i)) as ExerciseInstance, '\\{-3;3\\}')
        .state,
    ).toBe('correct');
  });
  it.each(['\\{1/0\\}', '[2;1]', '[-\\infty;2]', '[0;\\sqrt{2}+\\sqrt{3}]'])(
    'fails an inadmissible official expected %s atomically',
    (source) => {
      const d = definition(
        source,
        source.startsWith('\\{') ? 'set' : 'intervals',
      );
      const r = instantiateExercise(d, { seed: 0, instanceId: 'official' });
      expect(r.ok).toBe(false);
      if (!r.ok)
        expect(r.diagnostics[0]).toMatchObject({
          stage: 'expected',
          questionId: 'q',
        });
    },
  );
  it('enforces member and source budgets without producing incorrect', () => {
    const sixtyFive = `\\{${Array.from({ length: 65 }, (_, i) => i).join(',')}\\}`;
    expect(grade('\\{0\\}', sixtyFive).state).toBe('indeterminate');
    expect(grade('[0;1]', '[0;1]' + ' '.repeat(4096), 'intervals').state).toBe(
      'invalid',
    ); // transport source bound
    expect(
      grade(
        '[0;1]',
        Array.from({ length: 20 }, (_, i) => `[${i};${i + 1}]`).join('\\cup'),
        'intervals',
      ).state,
    ).toBe('indeterminate');
  });
  it('separates corrupted official expected and library failures from student mistakes', () => {
    const i = official(definition('\\{1\\}'));
    const q = i.elements[0];
    if (q?.type !== 'question' || !('math' in q.expected))
      throw new Error('Fixture');
    q.expected.math.source = '\\{1/0\\}';
    expect(answer(i, '\\{1\\}').state).toBe('error');
    const clean = official(definition('[0;1]', 'intervals'));
    const spy = vi
      .spyOn(ComputeEngine.prototype, 'parse')
      .mockImplementation(() => {
        throw new Error('parser fault');
      });
    try {
      expect(answer(clean, '[0;1]').state).toBe('error');
    } finally {
      spy.mockRestore();
    }
    expect(answer(clean, '[0;1]').state).toBe('correct');
  });
  it('uses same explicit collection kind for comparison', () => {
    const a = prepareCollection('\\{1\\}', {}, {}, '/a', 'set'),
      b = prepareCollection('[1;1]', {}, {}, '/b', 'intervals');
    if (!a.ok || !b.ok) throw new Error('Fixture');
    expect(compareCollections(a.value, b.value)).toBeUndefined();
  });
});
