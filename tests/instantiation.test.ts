import { describe, expect, it, vi } from 'vitest';
import {
  instantiateExercise,
  projectPublicInstance,
  validateDefinition,
  validateSubmission,
} from 'novlearn-exercise-engine';
import type {
  ExerciseDefinitionV1,
  InstantiateExerciseOptions,
  PrivateInstanceV1,
} from 'novlearn-exercise-engine';
import fixture from './fixtures/contracts/rational-minimum.definition.json' with { type: 'json' };

function definition(): ExerciseDefinitionV1 {
  const result = validateDefinition(fixture);
  if (!result.ok) throw new Error('Invalid test fixture.');
  return result.value;
}
function fixed(a = 2, b = -4, c = 3): ExerciseDefinitionV1 {
  const d = definition();
  d.parameters = ['a', 'b', 'c'].map((name, i) => ({
    name,
    kind: 'integer',
    min: [a, b, c][i]!,
    max: [a, b, c][i]!,
    exclusions: [],
  }));
  return d;
}
function instance(
  d: unknown = definition(),
  seed: number | string = 42,
): PrivateInstanceV1 {
  const result = instantiateExercise(d, {
    seed,
    instanceId: 'opaque-server-id',
  });
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.value;
}

describe('native rational instance', () => {
  it('instantiates real question 103 with a computed exact answer and preserved source', () => {
    const value = instance();
    expect(value.generation).toEqual({
      version: 'parameters-v1',
      seed: '42',
      draws: 3,
      parameters: { a: 1, b: 5, c: 0 },
    });
    expect(value.expectedMath.value).toEqual({
      kind: 'rational',
      numerator: -5,
      denominator: 2,
    });
    expect(value.display.statement.latex).toBe('x^2+5x');
    expect(value.expectedLatex).toBe('-\\frac{5}{2}');
    expect(value.definition).toEqual(fixture);
    expect(value.statementMath.source).toBe(fixture.statement.latex);
    expect(value.expectedMath.source).toBe(fixture.question.expectedLatex);
    expect(value.expectedMath.syntax).toEqual([
      'Divide',
      ['Negate', 'b'],
      ['InvisibleOperator', 2, 'a'],
    ]);
    expect(value.expectedMath.substituted).toEqual([
      'Divide',
      ['Negate', 5],
      ['Multiply', 2, 1],
    ]);
    expect(value.instantiationVersion).toBe('rational-instance-v1');
  });
  it('produces the supplied integer example end to end', () => {
    const value = instance(fixed());
    expect(value.display.statement.latex).toBe('2x^2-4x+3');
    expect(value.expectedMath.value).toEqual({
      kind: 'rational',
      numerator: 1,
      denominator: 1,
    });
    expect(value.generation.draws).toBe(0);
  });
  it('distinguishes abscissa and value of the minimum, including a fractional answer', () => {
    const d = fixed(3, -2, 5);
    const abscissa = instance(d);
    d.question.expectedLatex = 'c-\\frac{b^2}{4a}';
    const minimum = instance(d);
    expect(abscissa.expectedMath.value).toEqual({
      kind: 'rational',
      numerator: 1,
      denominator: 3,
    });
    expect(minimum.expectedMath.value).toEqual({
      kind: 'rational',
      numerator: 14,
      denominator: 3,
    });
    expect(abscissa.expectedLatex).toBe('\\frac{1}{3}');
  });
  it('replays byte-identically after JSON transport, normalized seed, and unrelated calls', () => {
    const first = instance();
    instance(fixed(1, 6, -2), 17);
    const replay = instance(
      JSON.parse(JSON.stringify(first.definition)),
      first.generation.seed,
    );
    expect(JSON.stringify(replay)).toBe(JSON.stringify(first));
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(instance(definition(), 43).generation.parameters).not.toEqual(
      first.generation.parameters,
    );
  });
  it('does not mutate frozen definitions and keeps snapshot/display copies detached', () => {
    const d = definition();
    const before = JSON.stringify(d);
    const freeze = (input: unknown): void => {
      if (input && typeof input === 'object') {
        Object.values(input).forEach(freeze);
        Object.freeze(input);
      }
    };
    freeze(d);
    const value = instance(d);
    value.definition.title = 'changed privately';
    expect(JSON.stringify(d)).toBe(before);
    expect(value.display.title).toBe(fixture.title);
    expect(value.definition.extensions).toEqual(fixture.extensions);
  });
  it.each(Array.from({ length: 64 }, (_, seed) => seed))(
    'checks the rational minimum with independent arithmetic for seed %s',
    (seed) => {
      const value = instance(definition(), seed);
      const { a, b, c } = value.generation.parameters;
      const { numerator: n, denominator: q } = value.expectedMath.value;
      expect(a).toBeGreaterThan(0);
      expect(BigInt(n) * 2n * BigInt(a!)).toBe(-BigInt(b!) * BigInt(q));
      // f(x0+1)-f(x0)=a>0; c is irrelevant to the abscissa.
      expect(2 * a! * n + b! * q).toBe(0);
      expect(c).toBeGreaterThanOrEqual(-5);
    },
  );
  it('substitutes text markers only in designated fields, with escaping and complete names', () => {
    const d = fixed();
    d.title = 'a @a';
    d.statement.text = 'a, b, c restent du texte : @a, @b, @c ; @@a ; @@ ; @.';
    d.question.text = 'Avec a=@a, calculer x.';
    const value = instance(d);
    expect(value.display.title).toBe('a 2');
    expect(value.display.statement.text).toBe(
      'a, b, c restent du texte : 2, -4, 3 ; @a ; @ ; @.',
    );
    expect(value.display.question.text).toBe('Avec a=2, calculer x.');
    d.statement.text = '@ab';
    const result = instantiateExercise(d, { seed: 42, instanceId: 'id' });
    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          stage: 'text',
          code: 'missing-variable',
          path: '/statement/text',
          symbol: 'ab',
        },
      ],
    });
  });
  it('does not substitute text-like names in ordinary prose or interpret prose as mathematics', () => {
    const d = fixed();
    d.statement.text = 'Calculer avec a, ab, alpha et a^2 ; $f(x)$.';
    expect(instance(d).display.statement.text).toBe(d.statement.text);
  });
  it('projects an explicit detached allowlist, dropping even injected display fields', () => {
    const privateValue = instance();
    Object.assign(privateValue.display.question, {
      policy: 'secret',
      correct: true,
      expectedLatex: 'secret',
    });
    Object.assign(privateValue.display.statement, { seed: 'secret' });
    const publicValue = projectPublicInstance(privateValue);
    expect(Object.keys(publicValue).sort()).toEqual([
      'instanceId',
      'question',
      'schemaVersion',
      'statement',
      'title',
    ]);
    expect(Object.keys(publicValue.question).sort()).toEqual([
      'id',
      'points',
      'text',
    ]);
    expect(Object.keys(publicValue.statement).sort()).toEqual([
      'latex',
      'text',
    ]);
    for (const secret of [
      'expected',
      'generation',
      'parameters',
      'seed',
      'policy',
      'correct',
      'extensions',
      'sourceSha256',
      'definition',
    ])
      expect(JSON.stringify(publicValue)).not.toContain(`"${secret}`);
    publicValue.statement.text = 'client change';
    expect(privateValue.display.statement.text).toBe(fixture.statement.text);
    expect(
      validateSubmission({
        schemaVersion: 1,
        instanceId: publicValue.instanceId,
        questionId: publicValue.question.id,
        answer: { format: 'latex', source: '1' },
      }).ok,
    ).toBe(true);
  });
  it('does not depend on time or global randomness', () => {
    const baseline = instance();
    const date = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('Clock used');
    });
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Random used');
    });
    try {
      expect(instance()).toEqual(baseline);
    } finally {
      date.mockRestore();
      random.mockRestore();
    }
  });
});

describe('explicit instantiation failures, never partial instances', () => {
  it.each([
    ['\\frac{1}{a-a}', 'undefined-expression'],
    ['0\\cdot\\frac{1}{a-a}', 'undefined-expression'],
    ['\\frac{0}{a-a}', 'undefined-expression'],
    ['0^0', 'undefined-expression'],
    ['x', 'not-calculable'],
    ['x-x', 'not-calculable'],
    ['0x', 'not-calculable'],
    ['d-d', 'unknown-symbol'],
    ['0d', 'unknown-symbol'],
    ['\\sqrt{-1}', 'unsupported'],
    ['\\pi', 'unsupported'],
    ['\\infty', 'unsupported'],
    ['a^{1000}', 'unsupported'],
    ['a^{-1}', 'unsupported'],
    ['1.00000000000000000001', 'limit'],
    ['1e1000', 'limit'],
    ['1000000000+1', 'limit'],
  ])('rejects expected source %s with %s', (source, code) => {
    const d = fixed();
    d.question.expectedLatex = source;
    const result = instantiateExercise(d, { seed: 42, instanceId: 'id' });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ stage: 'expected', code }),
        ]),
      );
    expect(result).not.toHaveProperty('value');
  });
  it.each(['x/x', '(x^2-1)/(x-1)', '0/x', 'x^0'])(
    'refuses unsafe statement domain %s before reduction',
    (source) => {
      const d = fixed();
      d.statement.latex = source;
      const result = instantiateExercise(d, { seed: 42, instanceId: 'id' });
      expect(result.ok).toBe(false);
      if (!result.ok)
        expect(result.diagnostics[0]).toMatchObject({
          stage: 'statement',
          path: '/statement/latex',
        });
    },
  );
  it('keeps legacy @ math syntax explicitly unsupported', () => {
    const d = fixed();
    d.statement.latex = '@a x^2';
    expect(
      instantiateExercise(d, { seed: 42, instanceId: 'id' }),
    ).toMatchObject({
      ok: false,
      diagnostics: [{ stage: 'statement', code: 'invalid-syntax' }],
    });
  });
  it('rejects unsupported elements without touching private extensions', () => {
    const d = definition();
    expect(
      instantiateExercise(
        { ...d, elements: [{ type: 'graph' }] },
        { seed: 42, instanceId: 'id' },
      ),
    ).toMatchObject({
      ok: false,
      diagnostics: [
        { stage: 'definition', code: 'unknown-field', path: '/elements' },
      ],
    });
    d.extensions = {
      ...d.extensions,
      graph: { expression: '@a*x^2' },
      computed: 'throw new Error()',
    };
    expect(instance(d).definition.extensions).toEqual(d.extensions);
  });
  it('reports invalid definition and empty local domain', () => {
    expect(instantiateExercise(null, { seed: 42, instanceId: 'id' }).ok).toBe(
      false,
    );
    const d = fixed();
    d.parameters[0]!.exclusions = [2];
    expect(
      instantiateExercise(d, { seed: 42, instanceId: 'id' }),
    ).toMatchObject({
      ok: false,
      diagnostics: [{ stage: 'definition', code: 'impossible-constraints' }],
    });
  });
  it.each([
    { seed: 42, instanceId: '' },
    { seed: 42, instanceId: 'id', instantiationVersion: 'future' },
    { seed: 42, instanceId: 'id', generationVersion: 'future' },
    { seed: '042', instanceId: 'id' },
    { seed: 42, instanceId: 'id', policy: { domain: 'anything' } },
  ])(
    'validates options and delegates seed/version validation to Lot 4',
    (options) => {
      const result = instantiateExercise(
        definition(),
        options as InstantiateExerciseOptions,
      );
      expect(result.ok).toBe(false);
      expect(result).not.toHaveProperty('value');
    },
  );
  it('never invokes getters in definitions or options', () => {
    const getter = vi.fn(() => 'id');
    const options = {
      seed: 42,
      get instanceId() {
        return getter();
      },
    };
    expect(instantiateExercise(definition(), options).ok).toBe(false);
    expect(
      instantiateExercise(
        {
          get schemaVersion() {
            return getter();
          },
        },
        { seed: 42, instanceId: 'id' },
      ).ok,
    ).toBe(false);
    expect(getter).not.toHaveBeenCalled();
  });
});
