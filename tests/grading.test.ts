import { describe, expect, it, vi } from 'vitest';
import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  gradeAnswer,
  instantiateExercise,
  projectPublicInstance,
  validateDefinition,
  validateSubmission,
} from 'novlearn-exercise-engine';
import type {
  AnswerSubmission,
  ExerciseDefinition,
  ExerciseElement,
  ExerciseInstance,
  GradingPolicy,
} from 'novlearn-exercise-engine';

function definition(elements: ExerciseElement[]): ExerciseDefinition {
  return {
    schemaVersion: 5,
    kind: 'composed',
    id: 'synthetic-m3',
    revision: '1',
    title: 'M3',
    generation: {
      schemaVersion: 5,
      definitions: [],
      constraints: [],
      maxAttempts: 1,
      maxDraws: 1,
    },
    variables: [],
    elements,
  };
}
function numeric(
  expectedLatex: string,
  kind: 'rational' | 'real' | 'extended-real' = 'real',
  comparison?: GradingPolicy['comparison'],
): ExerciseElement {
  return {
    id: 'numeric',
    type: 'question',
    text: 'Calculer.',
    points: 1,
    response: { format: 'latex', kind },
    expectedLatex,
    policy: {
      domain: kind,
      form: 'value-only',
      ...(comparison === undefined ? {} : { comparison }),
    },
  };
}
function instance(
  elements: ExerciseElement[],
  id = 'official',
): ExerciseInstance {
  const r = instantiateExercise(definition(elements), {
    seed: 0,
    instanceId: id,
  });
  if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
  return r.value;
}
function submission(
  source: string,
  questionId = 'numeric',
  format: 'latex' | 'text' = 'latex',
): AnswerSubmission {
  return {
    schemaVersion: 5,
    instanceId: 'official',
    questionId,
    answer: { format, source },
  };
}
function grade(
  expected: string,
  source: string,
  kind: 'rational' | 'real' | 'extended-real' = 'real',
  comparison?: GradingPolicy['comparison'],
) {
  return gradeAnswer(
    instance([numeric(expected, kind, comparison)]),
    submission(source),
  );
}
const approximate = (
  absolute: string,
  relative = '0',
): GradingPolicy['comparison'] => ({ mode: 'approximate', absolute, relative });

describe('M3 exact finite correction, through the built public package', () => {
  it.each([
    ['0', '-0'],
    ['-3', '-6/2'],
    ['1/2', '0.5'],
    ['1/2', '0{,}5'],
    ['-1/4', '-0.25'],
    ['2/3', '4/6'],
    ['1/10+2/10', '0.3'],
    ['1000000/1000000000', '0.001'],
    ['7', '3+4'],
    ['16', '2^4'],
    ['1/8', '2^{-3}'],
    ['\\sqrt{2}', '\\sqrt{8}/2'],
    ['\\sqrt{1/2}', '\\sqrt{2}/2'],
    ['3\\sqrt{8}/4', '3\\sqrt{2}/2'],
    ['2', '\\sqrt{4}'],
    ['0', '\\sqrt{0}'],
    ['-3', '-\\sqrt{9}'],
    ['2\\sqrt{3}', '\\sqrt{12}'],
  ])('proves %s = %s without numerical sampling', (expected, source) => {
    expect(grade(expected, source)).toMatchObject({
      state: 'correct',
      value: 'equal',
      comparison: 'exact',
      proof: 'exact-number',
      form: 'not-required',
    });
  });
  it.each([
    ['1/3', '0.333333'],
    ['0', '0.000001'],
    ['-2', '2'],
    ['\\sqrt{2}', '1.414213'],
    ['\\sqrt{2}', '1.414214'],
    ['\\sqrt{2}', '\\sqrt{3}'],
  ])('proves distinct values %s and %s', (expected, source) => {
    expect(grade(expected, source)).toMatchObject({
      state: 'incorrect',
      value: 'different',
      proof: 'exact-number',
    });
  });
  it('uses an independent integer oracle for radical equality and signs', () => {
    for (const [d, factor] of [
      [2, 3],
      [3, 4],
      [5, 2],
      [7, 3],
    ] as const) {
      const square = BigInt(factor) ** 2n * BigInt(d);
      expect(grade(`\\sqrt{${square}}`, `${factor}\\sqrt{${d}}`).state).toBe(
        'correct',
      );
      expect(grade(`\\sqrt{${square}}`, `-${factor}\\sqrt{${d}}`).state).toBe(
        'incorrect',
      );
      const lower = BigInt(factor) * BigInt(factor) * BigInt(d) - 1n;
      expect(lower < square).toBe(true);
    }
  }, 30_000);
  it.each([
    ['\\pi', '\\pi'],
    ['2\\pi', '\\pi+\\pi'],
    ['e', '\\exponentialE'],
    ['e/2', '\\exponentialE/2'],
    ['\\sqrt{2}+\\sqrt{3}', '\\sqrt{3}+\\sqrt{2}'],
  ])('proves admitted closed identity %s = %s', (expected, source) => {
    expect(grade(expected, source)).toMatchObject({
      state: 'correct',
      proof: 'closed-identity',
    });
  });
  it.each([
    ['\\pi', '3'],
    ['e', '2.7'],
    ['2\\pi+1', '7'],
    ['-\\pi', '-3'],
    ['\\pi/2', '1.5'],
  ])(
    'uses certified affine constant bounds for %s vs %s',
    (expected, source) => {
      expect(grade(expected, source)).toMatchObject({
        state: 'incorrect',
        proof: 'certified-bounds',
      });
    },
  );
  it.each([
    ['\\sqrt{2}+\\sqrt{3}', '3.146264'],
    ['\\pi+e', '5.859874'],
    ['\\pi^2', '9.869604'],
    ['\\pi', '3.141592'],
  ])(
    'keeps unproved differences indeterminate: %s vs %s',
    (expected, source) => {
      expect(grade(expected, source)).toMatchObject({
        state: 'indeterminate',
        value: 'unknown',
        proof: 'none',
      });
    },
  );
  it('does not rely on isIdenticallyEqual for a grading proof', () => {
    // Spies cover the public methods that formerly looked attractive as universal proofs.
    const ce = new ComputeEngine();
    const proto = Object.getPrototypeOf(ce.parse('x')) as {
      isIdenticallyEqual: () => boolean | undefined;
    };
    const identical = vi
      .spyOn(proto, 'isIdenticallyEqual')
      .mockImplementation(() => {
        throw new Error('Forbidden proof');
      });
    try {
      expect(grade('\\sqrt{2}', '\\sqrt{8}/2').state).toBe('correct');
    } finally {
      identical.mockRestore();
    }
  });
});

describe('M3 domains and five result states', () => {
  it.each([
    '1/0',
    '0/0',
    '0^0',
    '0^{-1}',
    '\\sqrt{-1}',
    '\\sqrt{-1}^2',
    '0\\cdot(1/0)',
    '1/(\\sqrt{2}-\\sqrt{2})',
  ])('rejects the undefined raw source %s before reduction', (source) => {
    expect(grade('1', source)).toMatchObject({
      state: 'invalid',
      value: 'unknown',
      code: 'undefined-expression',
    });
  });
  it.each(['', ' ', '1+', '\\frac{', '\\placeholder{}'])(
    'retains incomplete/empty source %s and returns invalid',
    (source) => {
      const s = submission(source);
      expect(validateSubmission(s)).toEqual({ ok: true, value: s });
      expect(gradeAnswer(instance([numeric('1')]), s).state).toBe('invalid');
    },
  );
  it.each([
    'x',
    '\\sin(1)',
    '\\sqrt[3]{2}',
    '2^{1/2}',
    '0.1234567',
    '1000000000+1',
    '2^17',
    '1/(\\pi-e)',
    '1\\frac{1}{2}',
  ])('does not convert unsupported source %s into a wrong answer', (source) => {
    expect(grade('1', source)).toMatchObject({
      state: 'indeterminate',
      value: 'unknown',
      proof: 'none',
    });
  });
  it.each(['1/0', '\\sqrt{-1}^2', '0^0', '\\sqrt{\\pi-e}', '1/(\\pi-e)'])(
    'fails official expected instantiation atomically: %s',
    (expected) => {
      const r = instantiateExercise(
        definition([numeric('1'), { ...numeric(expected), id: 'second' }]),
        { seed: 0, instanceId: 'official' },
      );
      expect(r.ok).toBe(false);
      expect(r).not.toHaveProperty('value');
      if (!r.ok)
        expect(r.diagnostics).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              stage: 'expected',
              questionId: 'second',
            }),
          ]),
        );
    },
  );
  it('distinguishes official corruption from an invalid student answer', () => {
    const i = instance([numeric('1/2', 'rational')]);
    const q = i.elements[0]!;
    if (q.type !== 'question' || q.expected.kind !== 'rational')
      throw new Error('Fixture');
    q.expected.value.numerator = 999;
    expect(gradeAnswer(i, submission('1/2'))).toMatchObject({
      state: 'error',
      code: 'official-rational',
      value: 'unknown',
    });
    q.expected.math.source = '1/0';
    expect(gradeAnswer(i, submission('1/2')).state).toBe('error');
  });
});

describe('M3 explicit inclusive tolerance', () => {
  it.each([
    ['10', '10.1', '0.1', '0', 'correct'],
    ['10', '9.9', '0.1', '0', 'correct'],
    ['10', '10.100001', '0.1', '0', 'incorrect'],
    ['10', '11', '0', '0.1', 'correct'],
    ['10', '9', '0', '0.1', 'correct'],
    ['10', '11.1', '0.1', '0.1', 'correct'],
    ['10', '8.9', '0.1', '0.1', 'correct'],
    ['-10', '-8.9', '0.1', '0.1', 'correct'],
    ['-10', '-11.1', '0.1', '0.1', 'correct'],
    ['-10', '-11.100001', '0.1', '0.1', 'incorrect'],
    ['0', '0.1', '0.1', '1', 'correct'],
    ['0', '0.100001', '0.1', '1', 'incorrect'],
    ['1/3', '0.333333', '0.000001', '0', 'correct'],
    ['\\sqrt{2}', '1.414214', '0.000001', '0', 'correct'],
    ['\\sqrt{2}', '1.414212', '0.000001', '0', 'incorrect'],
    ['-\\sqrt{2}', '-1.414214', '0.000001', '0', 'correct'],
    ['\\sqrt{2}', '1.415', '0', '0.001', 'correct'],
    ['\\pi', '3.14159', '0.00001', '0', 'correct'],
    ['\\pi', '3.14', '0.00001', '0', 'incorrect'],
    ['-\\pi', '-3.14159', '0.00001', '0', 'correct'],
    ['e', '2.71828', '0.00001', '0', 'correct'],
    ['2\\pi+1', '7.28318', '0.0001', '0', 'correct'],
  ])('%s vs %s within A=%s, R=%s → %s', (expected, source, a, r, state) => {
    expect(grade(expected, source, 'real', approximate(a, r))).toMatchObject({
      state,
      comparison: 'approximate',
      value: state === 'correct' ? 'within-tolerance' : 'outside-tolerance',
    });
  });
  it('leaves a certified interval crossing a tolerance boundary unknown', () => {
    expect(
      grade('\\pi', '3.141591', 'real', approximate('0.000001')),
    ).toMatchObject({ state: 'indeterminate', value: 'unknown' });
    expect(
      grade('\\sqrt{2}+\\sqrt{3}', '3.146264', 'real', approximate('0.00001'))
        .state,
    ).toBe('indeterminate');
  });
  it('does not introduce a default epsilon', () => {
    expect(grade('1/3', '0.333333').state).toBe('incorrect');
    expect(grade('1', '1.000001', 'real', approximate('0', '0')).state).toBe(
      'incorrect',
    );
  });
  it.each(['\\sqrt{2}', '\\pi', '\\sqrt{2}+\\sqrt{3}'])(
    'accepts an exact identity under any nonnegative tolerance: %s',
    (expected) => {
      for (const a of ['0', '1'])
        expect(grade(expected, expected, 'real', approximate(a))).toMatchObject(
          {
            state: 'correct',
            comparison: 'approximate',
            value: 'within-tolerance',
          },
        );
    },
  );
  it('proves absolute/relative tolerance for a common radical', () => {
    expect(
      grade('2\\sqrt{2}', '3\\sqrt{2}', 'real', approximate('1.5')).state,
    ).toBe('correct');
    expect(
      grade('2\\sqrt{2}', '3\\sqrt{2}', 'real', approximate('1.4')).state,
    ).toBe('incorrect');
    expect(
      grade('2\\sqrt{2}', '3\\sqrt{2}', 'real', approximate('0.001', '0.5'))
        .state,
    ).toBe('correct');
    expect(
      grade('-2\\sqrt{2}', '-3\\sqrt{2}', 'real', approximate('0.001', '0.5'))
        .state,
    ).toBe('correct');
  });
  it('admits a zero expected value when certified student bounds are within the absolute band', () => {
    expect(grade('0', '\\pi-3', 'real', approximate('1'))).toMatchObject({
      state: 'correct',
      proof: 'certified-bounds',
    });
    expect(grade('0', '\\pi-3', 'real', approximate('0.1')).state).toBe(
      'incorrect',
    );
  });
  it.each([
    '-0.1',
    'NaN',
    'Infinity',
    '1e-3',
    '0.1234567',
    '1000001',
    '0\n',
    ' 0',
    '01',
  ])('rejects invalid official absolute tolerance %s', (absolute) => {
    expect(
      validateDefinition(
        definition([numeric('1', 'real', approximate(absolute))]),
      ).ok,
    ).toBe(false);
  });
  it('rejects a relative tolerance above one and extraneous exact tolerance', () => {
    expect(
      validateDefinition(
        definition([numeric('1', 'real', approximate('0', '1.000001'))]),
      ).ok,
    ).toBe(false);
    const d = definition([numeric('1')]);
    (
      d.elements[0] as unknown as { policy: { comparison: unknown } }
    ).policy.comparison = { mode: 'exact', absolute: '1' };
    expect(validateDefinition(d).ok).toBe(false);
  });
});

describe('M3 explicit infinity response', () => {
  it.each([
    ['+\\infty', '\\infty', 'correct'],
    ['-\\infty', '-(\\infty)', 'correct'],
    ['-\\infty', '\\infty', 'incorrect'],
    ['\\infty', '1000000', 'incorrect'],
    ['1', '\\infty', 'incorrect'],
  ])('%s vs %s → %s', (expected, source, state) => {
    expect(grade(expected, source, 'extended-real')).toMatchObject({
      state,
      proof: 'explicit-infinity',
      comparison: 'exact',
    });
  });
  it('requires an extended-real response and refuses infinity arithmetic', () => {
    expect(grade('1', '\\infty').state).toBe('invalid');
    expect(grade('\\infty', '1/0', 'extended-real').state).toBe('invalid');
    expect(grade('\\infty', '\\infty+1', 'extended-real').state).toBe(
      'indeterminate',
    );
    expect(
      instantiateExercise(definition([numeric('\\infty')]), {
        seed: 0,
        instanceId: 'official',
      }).ok,
    ).toBe(false);
  });
  it('uses a special-value identity rather than a tolerance for infinity', () => {
    expect(
      grade('\\infty', '\\infty', 'extended-real', approximate('1', '0.1')),
    ).toMatchObject({
      state: 'correct',
      comparison: 'exact',
      value: 'equal',
      proof: 'explicit-infinity',
    });
  });
});

function mcq(mode: 'single' | 'multiple' = 'multiple'): ExerciseElement {
  return {
    id: 'choice',
    type: 'mcq',
    text: 'Sélectionner.',
    points: 2,
    mode,
    options: ['a', 'b', 'c'].map((id) => ({
      id,
      content: { format: 'text', text: id },
    })),
    expectedOptionIds: mode === 'single' ? ['a'] : ['a', 'c'],
  };
}
function selection(
  optionIds: string[],
  questionId = 'choice',
): AnswerSubmission {
  return {
    schemaVersion: 5,
    instanceId: 'official',
    questionId,
    answer: { format: 'selection', optionIds },
  };
}
function textQuestion(
  normalization?: GradingPolicy['normalization'],
): ExerciseElement {
  return {
    id: 'text',
    type: 'question',
    text: 'Répondre.',
    points: 1,
    response: { format: 'text', kind: 'text' },
    expectedTexts: ['Égalité', 'Équivalence'],
    policy: {
      domain: 'text',
      form: 'value-only',
      ...(normalization === undefined ? {} : { normalization }),
    },
  };
}
describe('M3 discrete IDs and deterministic authorized text', () => {
  it.each([
    [['a', 'c'], 'correct'],
    [['c', 'a'], 'correct'],
    [['a'], 'incorrect'],
    [['b'], 'incorrect'],
    [['a', 'b', 'c'], 'incorrect'],
    [[], 'invalid'],
    [['unknown'], 'invalid'],
    [['a', 'a'], 'invalid'],
  ] as const)('grades selection %j → %s', (ids, state) => {
    expect(gradeAnswer(instance([mcq()]), selection([...ids]))).toMatchObject({
      state,
      proof:
        state === 'correct' || state === 'incorrect' ? 'selection' : 'none',
    });
  });
  it('checks single cardinality, IDs and question format independently', () => {
    const i = instance([numeric('1'), mcq('single'), textQuestion()]);
    expect(gradeAnswer(i, selection(['a', 'b']))).toMatchObject({
      state: 'invalid',
      code: 'selection-cardinality',
    });
    expect(gradeAnswer(i, selection(['a'])).state).toBe('correct');
    expect(gradeAnswer(i, submission('a', 'choice')).state).toBe('invalid');
    expect(gradeAnswer(i, selection(['a'], 'numeric')).state).toBe('invalid');
    expect(gradeAnswer(i, submission('Égalité', 'text')).state).toBe('invalid');
  });
  it('ignores order of displayed QCM options and preserves the snapshot', () => {
    const i = instance([mcq()]);
    const q = i.elements[0]!;
    if (q.type !== 'mcq') throw new Error('Fixture');
    q.options.reverse();
    const before = JSON.stringify(i);
    expect(gradeAnswer(i, selection(['c', 'a'])).state).toBe('correct');
    expect(JSON.stringify(i)).toBe(before);
  });
  it.each([
    ['Égalité', 'correct'],
    ['Équivalence', 'correct'],
    ['égalité', 'incorrect'],
    ['Egalité', 'incorrect'],
    [' Égalité ', 'incorrect'],
    ['E\u0301galité', 'incorrect'],
    ['C’est presque la même chose', 'incorrect'],
    ['', 'invalid'],
  ])('strict authorized text %s → %s', (source, state) => {
    expect(
      gradeAnswer(
        instance([textQuestion()]),
        submission(source, 'text', 'text'),
      ).state,
    ).toBe(state);
  });
  it('applies only explicitly configured normalization; accents remain meaningful', () => {
    const i = instance([
      textQuestion({
        trim: true,
        collapseWhitespace: true,
        ignoreCase: true,
        unicodeNFC: true,
      }),
    ]);
    expect(
      gradeAnswer(i, submission('  e\u0301galité  ', 'text', 'text')),
    ).toMatchObject({
      state: 'correct',
      proof: 'text',
      comparison: 'discrete',
    });
    expect(gradeAnswer(i, submission(' egalité ', 'text', 'text')).state).toBe(
      'incorrect',
    );
  });
  it('normalizes internal whitespace only when authorized', () => {
    const q = textQuestion({ collapseWhitespace: true });
    if (q.type !== 'question' || q.expectedTexts === undefined)
      throw new Error('Fixture');
    q.expectedTexts = ['deux mots'];
    expect(
      gradeAnswer(instance([q]), submission('deux\t\n mots', 'text', 'text'))
        .state,
    ).toBe('correct');
  });
  it('rejects impossible response/expected/policy combinations and no authorized variants', () => {
    for (const change of [
      (q: Record<string, unknown>) => {
        q.expectedTexts = [];
      },
      (q: Record<string, unknown>) => {
        q.expectedLatex = '1';
      },
      (q: Record<string, unknown>) => {
        q.response = { format: 'latex', kind: 'text' };
      },
      (q: Record<string, unknown>) => {
        q.policy = {
          domain: 'text',
          form: 'value-only',
          normalization: { trim: 'yes' },
        };
      },
      (q: Record<string, unknown>) => {
        q.policy = {
          domain: 'text',
          form: 'value-only',
          comparison: approximate('1'),
        };
      },
    ]) {
      const d = definition([textQuestion()]);
      change(d.elements[0] as unknown as Record<string, unknown>);
      expect(validateDefinition(d).ok).toBe(false);
    }
  });
});

describe('M3 official authority, projection, immutability and failures', () => {
  it.each(['seed', 'policy', 'verdict', 'expected', 'parameters', 'isCorrect'])(
    'refuses client authority %s',
    (key) => {
      const i = instance([numeric('1')]);
      expect(
        gradeAnswer(i, {
          ...submission('2'),
          [key]: key === 'verdict' ? 'correct' : true,
        }),
      ).toMatchObject({ state: 'invalid', code: 'submission-contract' });
      expect(
        gradeAnswer(i, {
          ...submission('2'),
          answer: { format: 'latex', source: '2', [key]: true },
        }).state,
      ).toBe('invalid');
    },
  );
  it('uses stable question and instance IDs rather than positions or client values', () => {
    const i = instance([
      { ...numeric('1'), id: 'first' },
      { ...numeric('2'), id: 'second' },
    ]);
    i.elements.reverse();
    expect(gradeAnswer(i, submission('2', 'second')).state).toBe('correct');
    expect(gradeAnswer(i, submission('2', 'first')).state).toBe('incorrect');
    expect(gradeAnswer(i, submission('2', 'missing'))).toMatchObject({
      state: 'invalid',
      code: 'unknown-question',
    });
    expect(
      gradeAnswer(i, { ...submission('1', 'first'), instanceId: 'stale' }),
    ).toMatchObject({ state: 'invalid', code: 'instance-mismatch' });
  });
  it('never executes submission accessors', () => {
    const getter = vi.fn(() => '1');
    const s = submission('2');
    Object.defineProperty(s.answer, 'source', {
      enumerable: true,
      get: getter,
    });
    expect(gradeAnswer(instance([numeric('1')]), s).state).toBe('invalid');
    expect(getter).not.toHaveBeenCalled();
  });
  it('projects new branches with field selection and no expected/policy/secret leak', () => {
    const i = instance([numeric('\\sqrt{2}'), textQuestion(), mcq()]);
    for (const e of i.elements) {
      Object.assign(e, { secret: 'PRIVATE_CANARY' });
      if (e.type === 'question')
        Object.assign(e.response, { secret: 'PRIVATE_CANARY' });
    }
    const publicInstance = projectPublicInstance(i);
    expect(JSON.stringify(publicInstance)).not.toContain('PRIVATE_CANARY');
    expect(JSON.stringify(publicInstance)).not.toMatch(
      /expected|variants|policy|seed|math/,
    );
    const q = publicInstance.elements[1]!;
    if (q.type !== 'question') throw new Error('Fixture');
    expect(q.response).toEqual({ format: 'text', kind: 'text' });
    q.response.kind = 'rational';
    expect(projectPublicInstance(i).elements[1]).toMatchObject({
      response: { kind: 'text' },
    });
  });
  it('retains original templates/raw math, replays and JSON-roundtrips grading', () => {
    const d = definition([
      numeric('\\sqrt{\\mathrm{radicand}}'),
      textQuestion(),
    ]);
    d.generation.definitions = [
      { name: 'radicand', kind: 'integer', min: 8, max: 8, exclusions: [] },
    ];
    const q = d.elements[1]!;
    if (q.type !== 'question' || q.expectedTexts === undefined)
      throw new Error('Fixture');
    q.expectedTexts = ['valeur @radicand'];
    const before = JSON.stringify(d);
    const a = instantiateExercise(d, { seed: 2, instanceId: 'official' });
    const b = instantiateExercise(d, { seed: 2, instanceId: 'official' });
    expect(a).toEqual(b);
    expect(JSON.stringify(d)).toBe(before);
    if (!a.ok) throw new Error('Fixture');
    const restored = JSON.parse(JSON.stringify(a.value)) as ExerciseInstance;
    expect(gradeAnswer(restored, submission('2\\sqrt{2}')).state).toBe(
      'correct',
    );
    expect(
      gradeAnswer(restored, submission('valeur 8', 'text', 'text')).state,
    ).toBe('correct');
    const e = restored.elements[0]!;
    if (e.type !== 'question' || e.expected.kind !== 'real')
      throw new Error('Fixture');
    expect(e.expected.math).toMatchObject({
      source: '\\sqrt{\\mathrm{radicand}}',
      substituted: ['Sqrt', 8],
    });
    expect(
      JSON.parse(
        JSON.stringify(gradeAnswer(restored, submission('2\\sqrt{2}'))),
      ),
    ).toEqual(gradeAnswer(restored, submission('2\\sqrt{2}')));
  });
  it('reports technical failure separately and the next call succeeds', () => {
    const i = instance([numeric('1')]);
    const spy = vi
      .spyOn(ComputeEngine.prototype, 'box')
      .mockImplementationOnce(() => {
        throw new Error('Injected failure');
      });
    try {
      expect(gradeAnswer(i, submission('1')).state).toBe('error');
    } finally {
      spy.mockRestore();
    }
    expect(gradeAnswer(i, submission('1')).state).toBe('correct');
  });
  it('detects corrupted selection and duplicate official question IDs', () => {
    const i = instance([mcq()]);
    const q = i.elements[0]!;
    if (q.type !== 'mcq') throw new Error('Fixture');
    q.expected.optionIds = ['missing'];
    expect(gradeAnswer(i, selection(['a'])).state).toBe('error');
    i.elements.push(q);
    expect(gradeAnswer(i, selection(['a']))).toMatchObject({
      state: 'error',
      code: 'official-question-collision',
    });
  });
  it('reports a student parser exception as a technical error and recovers', () => {
    const i = instance([numeric('1')]);
    const original = ComputeEngine.prototype.parse;
    const spy = vi
      .spyOn(ComputeEngine.prototype, 'parse')
      .mockImplementation(function (this: ComputeEngine, source, options) {
        if (source === '2') throw new Error('Injected parser failure');
        return original.call(this, source, options);
      });
    try {
      expect(gradeAnswer(i, submission('2'))).toMatchObject({
        state: 'error',
        code: 'numeric-library',
        value: 'unknown',
      });
    } finally {
      spy.mockRestore();
    }
    expect(gradeAnswer(i, submission('2')).state).toBe('incorrect');
  });
  it('never fabricates an algebraic verdict before M4', () => {
    const q: ExerciseElement = {
      id: 'numeric',
      type: 'question',
      text: 'Expression',
      points: 1,
      response: { format: 'latex', kind: 'expression' },
      expectedLatex: 'x+1',
      policy: { domain: 'polynomial', form: 'value-only' },
    };
    const d = definition([q]);
    d.variables = [{ name: 'x', domain: 'real' }];
    const i = instantiateExercise(d, { seed: 0, instanceId: 'official' });
    if (!i.ok) throw new Error('Fixture');
    expect(gradeAnswer(i.value, submission('x+1'))).toMatchObject({
      state: 'indeterminate',
      value: 'unknown',
    });
  });
});
