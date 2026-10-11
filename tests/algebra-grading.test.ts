import { describe, expect, it, vi } from 'vitest';
import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  gradeAnswer,
  instantiateExercise,
  projectPublicInstance,
  validateDefinition,
} from 'novlearn-exercise-engine';
import type {
  ExerciseDefinition,
  ExerciseInstance,
  GradingPolicy,
  QuestionResponse,
} from 'novlearn-exercise-engine';
import { prepareAlgebra } from '../src/math/algebra.js';
import {
  compareCollections,
  prepareCollection,
} from '../src/math/collections.js';

type Kind = 'expression' | 'rational-expression' | 'equation' | 'inequality';
function definition(
  expectedLatex: string,
  kind: Kind = 'expression',
  domain?: GradingPolicy['comparisonDomain'],
): ExerciseDefinition {
  return {
    schemaVersion: 5,
    kind: 'composed',
    id: 'synthetic-m4',
    revision: '1',
    title: 'M4',
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
        text: 'M4',
        points: 1,
        response: { format: 'latex', kind },
        expectedLatex,
        policy: {
          domain:
            kind === 'expression'
              ? 'polynomial'
              : kind === 'rational-expression'
                ? 'rational-function'
                : kind,
          form: 'value-only',
          ...(domain === undefined ? {} : { comparisonDomain: domain }),
        },
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
  kind: Kind = 'expression',
  domain?: GradingPolicy['comparisonDomain'],
) {
  return answer(official(definition(expected, kind, domain)), source);
}

describe('M4 exact univariate polynomial proofs', () => {
  it.each([
    ['(x+1)^2', 'x^2+2x+1'],
    ['(x-2)(x+3)', 'x^2+x-6'],
    ['x+x+2', '2(x+1)'],
    ['x^2-x^2', '0'],
    ['(x+1)/2', 'x/2+0.5'],
    ['2x+1', 'x/0.5+1'],
    ['x^{16}', '(x^8)^2'],
    ['\\sqrt{4}x', '2x'],
    ['(2x+3)^2-(2x-3)^2', '24x'],
    ['1', 'x-x+1'],
  ])('proves %s = %s', (a, b) => {
    expect(grade(a, b)).toMatchObject({
      state: 'correct',
      value: 'equal',
      domain: 'same',
      proof: 'exact-polynomial',
    });
  });
  it.each([
    ['x+1', 'x-1'],
    ['x^2', 'x'],
    ['x^{16}', 'x^{15}'],
    ['x^2+1', 'x^2-1'],
    ['1/3', '0.333333'],
  ])('proves %s differs from %s', (a, b) => {
    expect(grade(a, b)).toMatchObject({
      state: 'incorrect',
      proof: 'exact-polynomial',
      value: 'different',
    });
  });
  it.each([
    [2n, 3n, -4n],
    [-3n, 2n, 5n],
    [1n, -7n, 3n],
    [5n, 0n, -2n],
  ])(
    'uses an independent BigInt expansion oracle for (%s,%s,%s)',
    (a, b, c) => {
      const product = `(${a}x+${b})(x+${c})`;
      const middle = b + a * c,
        constant = b * c;
      const expanded = `${a}x^2+(${middle})x+(${constant})`;
      expect(grade(product, expanded).state).toBe('correct');
      for (const wrong of [
        `${a + 1n}x^2+(${middle})x+(${constant})`,
        `${a}x^2+(${middle + 1n})x+(${constant})`,
        `${a}x^2+(${middle})x+(${constant + 1n})`,
      ])
        expect(grade(product, wrong).state).toBe('incorrect');
    },
  );
  it.each([
    '\\sqrt{x^2}',
    '\\sqrt{x}^2',
    '\\ln(x)',
    '\\sin(x)',
    'x^{1/2}',
    'y+1',
    'x^{17}',
    '(x^{16})^2',
    '0.1234567x',
    '1000000001x',
    'x/x',
    'x^0',
    'x^{-1}',
    '1\\frac{1}{2}x',
  ])('keeps unproved/profile-exceeding %s indeterminate', (source) => {
    expect(grade('x', source)).toMatchObject({
      state: 'indeterminate',
      value: 'unknown',
      proof: 'none',
    });
  });
  it.each(['0*(1/0)', 'x+0^0', 'x+\\sqrt{-1}^2', 'x/0', 'x/(1-1)'])(
    'rejects undefined raw %s before cancellation',
    (source) => {
      expect(grade('x', source).state).toBe('invalid');
    },
  );
});

describe('M4 rational functions preserve the original domain', () => {
  it.each([
    ['x/x', '1'],
    ['(x^2-1)/(x-1)', 'x+1'],
    ['0/x', '0'],
    ['x^0', '1'],
    ['(x^2-2)/(x^2-2)', '1'],
    ['0/(x/(x-1))', '0/x'],
  ])(
    'separates same values on a common domain from different full domains: %s, %s',
    (a, b) => {
      expect(grade(a, b, 'rational-expression')).toMatchObject({
        state: 'incorrect',
        domain: 'different',
        value: 'equal-on-common-domain',
        proof: 'domain',
      });
      expect(grade(b, a, 'rational-expression').state).toBe('incorrect');
    },
  );
  it.each([
    ['(x^2-1)/(x-1)', '(x+1)(x-1)/(x-1)'],
    ['x/x', '2x/(2x)'],
    ['x^{-1}', '1/x'],
    ['1/(x(x-1))', '1/(x^2-x)'],
    ['1/x+1/(x-1)', '(2x-1)/(x(x-1))'],
    ['0/(x^2+1)', '0'],
    ['1/((x-1)^4)', '(x-1)^{-4}'],
    ['0/(x^2-2)', '0/((x-\\sqrt{2})(x+\\sqrt{2}))'],
  ])('proves rational %s and %s with preserved domain', (a, b) => {
    // Irrational polynomial coefficients deliberately remain outside this profile.
    const r = grade(a, b, 'rational-expression');
    expect(r.state).toBe(b.includes('sqrt') ? 'indeterminate' : 'correct');
  });
  it.each([
    ['1/x', '2/x'],
    ['(x+1)/(x-1)', 'x/(x-1)'],
    ['x/(x^2+1)', '1/(x^2+1)'],
  ])('proves unequal fractions %s, %s', (a, b) => {
    expect(grade(a, b, 'rational-expression')).toMatchObject({
      state: 'incorrect',
      domain: 'same',
      value: 'different',
      proof: 'rational-cross-products',
    });
  });
  it('accepts x/x against 1 only on an explicit official nonzero domain', () => {
    const domain = { variable: 'x', excludedLatex: ['0'] };
    expect(grade('x/x', '1', 'rational-expression', domain)).toMatchObject({
      state: 'correct',
      domain: 'restricted',
    });
    expect(grade('1', 'x/x', 'rational-expression', domain).state).toBe(
      'correct',
    );
    expect(grade('1', '1/(x-1)', 'rational-expression', domain)).toMatchObject({
      state: 'incorrect',
      domain: 'different',
    });
  });
  it('fails an expected function undefined on its imposed domain atomically', () => {
    const d = definition('x/x', 'rational-expression', {
      variable: 'x',
      excludedLatex: ['1'],
    });
    const r = instantiateExercise(d, { seed: 0, instanceId: 'official' });
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.diagnostics).toContainEqual(
        expect.objectContaining({
          stage: 'expected',
          code: 'undefined-expression',
          questionId: 'q',
        }),
      );
  });
  it('proves quadratic exclusions covered by exact radical points', () => {
    expect(
      grade('(x^2-2)/(x^2-2)', '1', 'rational-expression', {
        variable: 'x',
        excludedLatex: ['-\\sqrt{2}', '\\sqrt{2}'],
      }),
    ).toMatchObject({ state: 'correct', domain: 'restricted' });
  });
  it.each([
    '1/(x^3-x-1)',
    '1/(x^4+1)',
    'x^{-17}',
    '1/(x-\\pi)',
    '1/(x-\\sqrt{2})',
  ])(
    'does not infer the domain of %s from cancellation or sampling',
    (source) => {
      expect(grade('1', source, 'rational-expression')).toMatchObject({
        state: 'indeterminate',
        value: 'unknown',
      });
    },
  );
  it.each(['0/(x-x)', '(x-x)^0', '1/(0x)', '1/(x/0)', '0/(x^3-x^3)'])(
    'rejects an everywhere undefined expression %s',
    (source) => {
      expect(grade('1', source, 'rational-expression').state).toBe('invalid');
    },
  );
});

describe('M4 equations and inequalities compare solution sets', () => {
  it.each([
    ['x^2=0', 'x=0'],
    ['x^2-x^2=1', '0=1'],
    ['x=x', '1=1'],
    ['x^3-x^3+x=0', 'x=0'],
    ['x^2+x-6=0', '(x-2)(x+3)=0'],
    ['x^2+1=0', 'x^2+2=0'],
    ['2x+3=7', 'x=2'],
    ['x^2-x-1=0', '2x^2-2x=2'],
  ])(
    'recognizes equivalent equations %s, %s without residual-proportionality heuristics',
    (a, b) => {
      expect(grade(a, b, 'equation')).toMatchObject({
        state: 'correct',
        proof: 'solution-set',
        domain: 'same',
      });
    },
  );
  it.each([
    ['x^2=1', 'x=1'],
    ['x^2=0', 'x=1'],
    ['x=x', 'x=0'],
    ['x^2-x-1=0', 'x^2-x-2=0'],
    ['x^2+1=0', 'x^2-1=0'],
  ])('rejects missing/extra/different solutions %s, %s', (a, b) => {
    expect(grade(a, b, 'equation').state).toBe('incorrect');
  });
  it.each([
    ['x>0', '2x>0'],
    ['x>=0', '-x<=0'],
    ['x^2>0', 'x^2+1>1'],
    ['x^2>=0', 'x^2+1>0'],
    ['x^2+1<0', 'x^2<0'],
    ['x^2-1<=0', '1-x^2>=0'],
    ['x^2-1>0', '(x-1)(x+1)>0'],
    ['x\\ne 0', 'x^2>0'],
  ])('recognizes equivalent inequalities %s, %s', (a, b) => {
    expect(grade(a, b, 'inequality').state).toBe('correct');
  });
  it.each([
    ['x>0', 'x>=0'],
    ['x^2>0', 'x^2>=0'],
    ['x^2-1<0', 'x^2-1>0'],
    ['x^2<=0', 'x^2<0'],
  ])('distinguishes closures/signs %s, %s', (a, b) => {
    expect(grade(a, b, 'inequality').state).toBe('incorrect');
  });
  it.each([
    ['2x+3=7', 'equation', '\\{2\\}'],
    ['x^2+x-6=0', 'equation', '\\{-3;2\\}'],
    ['x^2+1=0', 'equation', '\\emptyset'],
    ['x=x', 'equation', ']-\\infty;+\\infty['],
    [
      'x^2-2>=0',
      'inequality',
      ']-\\infty;-\\sqrt{2}]\\cup[\\sqrt{2};+\\infty[',
    ],
    ['x^2-x-1<0', 'inequality', '](1-\\sqrt{5})/2;(1+\\sqrt{5})/2['],
    ['(x-2)^2>0', 'inequality', ']-\\infty;2[\\cup]2;+\\infty['],
    ['(x-2)^2<=0', 'inequality', '\\{2\\}'],
    ['x/(-2)<1', 'inequality', ']-2;+\\infty['],
  ] as const)(
    'checks independently specified complete solution data for %s',
    (source, kind, expected) => {
      const a = prepareAlgebra(
        source,
        { variables: ['x'] },
        {},
        '/test',
        'x',
        kind,
      );
      const b = prepareCollection(expected, {}, {}, '/oracle', 'intervals');
      expect(a.ok).toBe(true);
      expect(b.ok).toBe(true);
      if (a.ok && b.ok) {
        expect(a.value.solutions).toBeDefined();
        expect(compareCollections(a.value.solutions!, b.value)).toBe(true);
      }
    },
  );
  it('uses an independent BigInt sign oracle against solution interval data', () => {
    for (const [a, b, c] of [
      [1n, 1n, -6n],
      [-2n, 4n, 6n],
      [1n, -4n, 4n],
    ] as const) {
      const source = `${a}x^2+(${b})x+(${c})<=0`;
      const r = prepareAlgebra(
        source,
        { variables: ['x'] },
        {},
        '/oracle',
        'x',
        'inequality',
      );
      if (!r.ok || !r.value.solutions) throw new Error(JSON.stringify(r));
      for (let point = -5n; point <= 5n; point++) {
        const inside = r.value.solutions.intervals.some((i) => {
          const l = i.left.expression.evaluate().toRational(),
            rr = i.right.expression.evaluate().toRational();
          const leftOrder =
            i.left.infinity === -1
              ? 1n
              : l
                ? point * BigInt(l[1]) - BigInt(l[0])
                : undefined;
          const rightOrder =
            i.right.infinity === 1
              ? -1n
              : rr
                ? point * BigInt(rr[1]) - BigInt(rr[0])
                : undefined;
          if (leftOrder === undefined || rightOrder === undefined)
            throw new Error('Oracle only uses rational endpoints.');
          return (
            (leftOrder > 0n || (leftOrder === 0n && i.leftClosed)) &&
            (rightOrder < 0n || (rightOrder === 0n && i.rightClosed))
          );
        });
        expect(inside).toBe(a * point * point + b * point + c <= 0n);
      }
    }
  });
  it.each(['x^3=1', '1/x=1', '\\sqrt{x}=1'])(
    'keeps relation profile %s indeterminate',
    (source) => {
      expect(grade('x=1', source, 'equation').state).toBe('indeterminate');
    },
  );
  it.each(['x+1', 'x>0', 'x=1=2'])(
    'rejects a non-binary-equation response %s',
    (source) => {
      expect(grade('x=1', source, 'equation').state).toBe('invalid');
    },
  );
  it('restricts all-real and singleton solutions to the imposed domain', () => {
    const domain = { variable: 'x', excludedLatex: ['0'] };
    expect(grade('x^2=0', '1=0', 'equation', domain).state).toBe('correct');
    expect(grade('x^2>0', 'x^2>=0', 'inequality', domain).state).toBe(
      'correct',
    );
  });
  it('does not reinterpret a solution set as an equation response', () => {
    expect(grade('x=1', '\\{1\\}', 'equation')).toMatchObject({
      state: 'indeterminate',
      value: 'unknown',
      proof: 'none',
    });
  });
});

describe('M4 contracts, official authority, confidentiality and recovery', () => {
  it('requires an explicit declared real univariate scope when ambiguous', () => {
    const d = definition('x+1');
    d.variables.push({ name: 'y', domain: 'real' });
    expect(validateDefinition(d).ok).toBe(false);
    const q = d.elements[0];
    if (q?.type !== 'question') throw new Error('Fixture');
    q.response.variable = 'x';
    expect(validateDefinition(d).ok).toBe(true);
    expect(answer(official(d), 'y+1').state).toBe('indeterminate');
    for (const variable of ['y0', '__proto__', 'constructor']) {
      q.response.variable = variable;
      expect(validateDefinition(d).ok).toBe(false);
    }
  });
  it.each(['comparison', 'normalization', 'comparisonDomain'] as const)(
    'rejects incoherent official policy %s',
    (key) => {
      const d = definition('x');
      const q = d.elements[0];
      if (q?.type !== 'question') throw new Error('Fixture');
      const malformed =
        key === 'comparison'
          ? { mode: 'exact' }
          : key === 'normalization'
            ? { trim: true }
            : { variable: 'y', excludedLatex: ['0'] };
      expect(
        validateDefinition({
          ...d,
          elements: [{ ...q, policy: { ...q.policy, [key]: malformed } }],
        }).ok,
      ).toBe(false);
    },
  );
  it('substitutes official parameters independently in function and imposed domain', () => {
    const d = definition('(x-a)/(x-a)', 'rational-expression', {
      variable: 'x',
      excludedLatex: ['a'],
    });
    d.generation.definitions = [
      { name: 'a', kind: 'integer', min: 2, max: 2, exclusions: [] },
    ];
    const i = official(d);
    expect(answer(i, '1').state).toBe('correct');
    const q = i.elements[0];
    if (q?.type !== 'question' || !('math' in q.expected))
      throw new Error('Fixture');
    expect(q.expected.math.source).toBe('(x-a)/(x-a)');
    expect(JSON.stringify(q.expected.math.substituted)).not.toContain('"a"');
    expect(answer(i, '(x-a)/(x-a)').state).toBe('indeterminate');
  });
  it('keeps sources, exclusions and policies private and projects only response fields', () => {
    const d = definition('x/x', 'rational-expression', {
      variable: 'x',
      excludedLatex: ['0'],
    });
    const qd = d.elements[0];
    if (qd?.type !== 'question') throw new Error('Fixture');
    qd.response.variable = 'x';
    const i = official(d);
    const q = i.elements[0];
    if (q?.type !== 'question') throw new Error('Fixture');
    Object.assign(q.response, { policy: 'canary', expected: 'canary' });
    const p = projectPublicInstance(i);
    expect(p.elements[0]).toMatchObject({
      response: { format: 'latex', kind: 'rational-expression', variable: 'x' },
    });
    for (const key of [
      'comparisonDomain',
      'excludedLatex',
      'source',
      'substituted',
      'expected',
      'policy',
      'canary',
    ])
      expect(JSON.stringify(p)).not.toContain(key);
    const publicQ = p.elements[0];
    if (publicQ?.type !== 'question') throw new Error('Fixture');
    publicQ.response.variable = 'z';
    expect(q.response.variable).toBe('x');
    expect(
      answer(JSON.parse(JSON.stringify(i)) as ExerciseInstance, '1').state,
    ).toBe('correct');
  });
  it('returns error for a corrupted official expected profile', () => {
    const i = official(definition('x'));
    const q = i.elements[0];
    if (q?.type !== 'question') throw new Error('Fixture');
    q.response.kind = 'equation';
    expect(answer(i, 'x=0').state).toBe('error');
  });
  it('classifies a parser exception as technical error and recovers after restore', () => {
    const i = official(definition('x+1'));
    const spy = vi
      .spyOn(ComputeEngine.prototype, 'parse')
      .mockImplementation(() => {
        throw new Error('library failure');
      });
    try {
      expect(answer(i, 'x+1')).toMatchObject({
        state: 'error',
        value: 'unknown',
      });
    } finally {
      spy.mockRestore();
    }
    expect(answer(i, 'x+1').state).toBe('correct');
  });
  it('retains exact contracts for constant-only expressions without inventing variables', () => {
    const d = definition('2+3');
    d.variables = [];
    expect(answer(official(d), '5').state).toBe('correct');
    expect(answer(official(d), 'z-z+5').state).toBe('indeterminate');
  });
  it.each([
    'rational',
    'real',
    'extended-real',
    'set',
    'intervals',
    'text',
  ] satisfies QuestionResponse['kind'][])(
    'forbids algebra variable metadata for %s',
    (kind) => {
      const d = definition('1');
      const q = d.elements[0];
      if (q?.type !== 'question') throw new Error('Fixture');
      expect(
        validateDefinition({
          ...d,
          elements: [
            { ...q, response: { format: 'latex', kind, variable: 'x' } },
          ],
        }).ok,
      ).toBe(false);
    },
  );
});
