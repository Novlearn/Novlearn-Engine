import { describe, expect, it, vi } from 'vitest';
import {
  generateVariables,
  instantiateExercise,
  projectPublicInstance,
  validateDefinition,
} from 'novlearn-exercise-engine';
import type {
  ExerciseDefinition,
  ExerciseElement,
  ExerciseInstance,
  PrivateElement,
} from 'novlearn-exercise-engine';
import fixture from './fixtures/contracts/quadratic-multiquestion.definition.json' with { type: 'json' };

function definition(): ExerciseDefinition {
  const result = validateDefinition(fixture);
  if (!result.ok || result.value.schemaVersion !== 5)
    throw new Error('Invalid canonical fixture.');
  return result.value;
}
function instance(
  d: ExerciseDefinition = definition(),
  seed: number | string = 42,
): ExerciseInstance {
  const result = instantiateExercise(d, {
    seed,
    instanceId: 'opaque-server-id',
  });
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.value;
}
function question(
  value: ExerciseInstance,
  id: string,
): Extract<PrivateElement, { type: 'question' }> {
  const q = value.elements.find((e) => e.id === id);
  if (!q || q.type !== 'question') throw new Error(`Missing question ${id}`);
  return q;
}
function mcq(
  mode: 'single' | 'multiple' = 'single',
): Extract<ExerciseElement, { type: 'mcq' }> {
  return {
    id: 'q-choice',
    type: 'mcq',
    text: 'Choisir avec @a.',
    points: 2,
    mode,
    options: [
      { id: 'positive', content: { format: 'latex', latex: 'a' } },
      { id: 'negative', content: { format: 'latex', latex: '-a' } },
      {
        id: 'none',
        content: { format: 'text', text: 'Aucun, @@a reste littéral.' },
      },
    ],
    expectedOptionIds:
      mode === 'single' ? ['positive'] : ['negative', 'positive'],
  };
}
function rejected(
  d: unknown,
  stage: string,
  path: string,
  code?: string,
): void {
  const result = instantiateExercise(d, { seed: 42, instanceId: 'id' });
  expect(result.ok).toBe(false);
  expect(result).not.toHaveProperty('value');
  if (!result.ok)
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage,
          path,
          ...(code === undefined ? {} : { code }),
        }),
      ]),
    );
}

describe('flat multiquestion instantiation through the built package', () => {
  it('instantiates all five ordered elements of the supplied quadratic, with two exact answers', () => {
    const d = definition();
    const before = JSON.stringify(d);
    const value = instance(d);
    expect(value.elements.map((e) => [e.id, e.type])).toEqual(
      d.elements.map((e) => [e.id, e.type]),
    );
    expect(value.elements).toHaveLength(5);
    expect(value.elements[0]).toMatchObject({
      text: 'On considère une fonction de coefficient a=2.',
    });
    expect(value.elements[1]).toMatchObject({
      label: 'f(x) =',
      latex: '2x^2-4x+5',
      math: { source: 'ax^2+bx+c' },
    });
    expect(question(value, 'q-abscissa').expected).toMatchObject({
      kind: 'rational',
      value: { numerator: 1, denominator: 1 },
    });
    expect(question(value, 'q-minimum').expected).toMatchObject({
      kind: 'rational',
      value: { numerator: 3, denominator: 1 },
    });
    expect(value.elements[4]).toMatchObject({
      text: 'Vérifier avec les coefficients 2, -4 et 5.',
    });
    expect(value.generation.values).toEqual({
      a: { kind: 'integer', value: 2 },
      b: { kind: 'integer', value: -4 },
      c: { kind: 'integer', value: 5 },
    });
    expect(value.generation.draws).toBe(0);
    expect(JSON.stringify(d)).toBe(before);
    expect(instance(JSON.parse(JSON.stringify(d)), '42')).toEqual(value);
    expect(JSON.parse(JSON.stringify(value))).toEqual(value);
    expect(projectPublicInstance(JSON.parse(JSON.stringify(value)))).toEqual(
      projectPublicInstance(value),
    );
    expect(JSON.stringify(projectPublicInstance(value))).not.toContain(
      'PRIVATE-SENTINEL',
    );
  });
  it('keeps answers attached to stable IDs after reordering and interleaving prose', () => {
    const d = definition();
    const original = instance(d);
    d.elements = [
      d.elements[3]!,
      d.elements[4]!,
      d.elements[0]!,
      d.elements[2]!,
      d.elements[1]!,
    ];
    const reordered = instance(d);
    expect(reordered.elements.map((e) => e.id)).toEqual(
      d.elements.map((e) => e.id),
    );
    for (const id of ['q-abscissa', 'q-minimum'])
      expect(question(reordered, id).expected).toEqual(
        question(original, id).expected,
      );
  });
  it('supports one question, no parameters, and a flat section with explicit references', () => {
    const d = definition();
    d.generation.definitions = [];
    d.variables = [];
    const q = d.elements[2]!;
    if (q.type !== 'question') throw new Error('Fixture error');
    q.text = 'Calculer.';
    q.expectedLatex = String.raw`\frac{1}{3}+\frac{1}{6}`;
    q.sectionId = 'part';
    d.elements = [
      { id: 'part', type: 'section', text: 'Première partie' },
      { id: 'plain', type: 'text', text: 'a et $x$ restent du texte.' },
      q,
    ];
    const value = instance(d);
    expect(value.generation.values).toEqual({});
    expect(question(value, q.id).expected).toMatchObject({
      value: { numerator: 1, denominator: 2 },
    });
    expect(projectPublicInstance(value).elements[2]).toMatchObject({
      id: q.id,
      sectionId: 'part',
    });
  });
  it('prepares a polynomial expression answer with raw exact substitution and free variables', () => {
    const d = definition();
    const q = d.elements[2]!;
    if (q.type !== 'question') throw new Error('Fixture error');
    q.response.kind = 'expression';
    q.policy.domain = 'polynomial';
    q.expectedLatex = 'a\\frac{1}{2}x+2';
    d.generation.definitions[0] = {
      name: 'a',
      kind: 'integer',
      min: 4,
      max: 4,
      exclusions: [],
    };
    const expected = question(instance(d), q.id).expected;
    expect(expected).toMatchObject({
      kind: 'expression',
      math: { source: q.expectedLatex, displayLatex: '2x+2' },
    });
    expect(expected).not.toHaveProperty('value');
    if (expected.kind !== 'expression') throw new Error('Expected expression');
    expect(JSON.stringify(expected.math.substituted)).toContain('"x"');
  });
  it('integrates the existing decimal and choice generator without losing exact grid encodings', () => {
    const d = definition();
    d.generation.definitions = [
      {
        name: 'a',
        kind: 'decimal',
        min: -0.125,
        max: -0.125,
        precision: 3,
        exclusions: [],
      },
      { name: 'b', kind: 'choice', values: [0.1] },
      { name: 'c', kind: 'integer', min: 5, max: 5, exclusions: [] },
    ];
    const q = d.elements[2]!;
    if (q.type !== 'question') throw new Error('Fixture error');
    q.expectedLatex = 'a+b';
    const value = instance(d);
    expect(value.generation.values.a).toEqual({
      kind: 'decimal',
      coefficient: -125,
      precision: 3,
    });
    expect(value.generation.values.b).toEqual({
      kind: 'choice',
      value: 0.1,
    });
    expect(question(value, q.id).expected).toMatchObject({
      value: { numerator: -1, denominator: 40 },
    });
    expect(value.elements[0]).toMatchObject({
      text: 'On considère une fonction de coefficient a=-0.125.',
    });
    expect(value.elements[1]).toMatchObject({
      latex: '-\\frac{x^2}{8}+\\frac{x}{10}+5',
    });
  });
  it('preserves negative parentheses and powers in a multiquestion exercise', () => {
    const d = definition();
    d.generation.definitions[0] = {
      name: 'a',
      kind: 'integer',
      min: -2,
      max: -2,
      exclusions: [],
    };
    const q = d.elements[2]!;
    if (q.type !== 'question') throw new Error('Fixture error');
    q.expectedLatex = '(a+1)^2';
    expect(question(instance(d), q.id).expected).toMatchObject({
      value: { numerator: 1, denominator: 1 },
    });
    q.expectedLatex = '-a^2';
    expect(question(instance(d), q.id).expected).toMatchObject({
      value: { numerator: -4, denominator: 1 },
    });
  });
  it.each(Array.from({ length: 24 }, (_, seed) => seed))(
    'replays seed %s and verifies both quadratic answers with independent integer arithmetic',
    (seed) => {
      const d = definition();
      d.generation.definitions = [
        { name: 'a', kind: 'integer', min: 1, max: 5, exclusions: [] },
        { name: 'b', kind: 'integer', min: -8, max: 8, exclusions: [0] },
        { name: 'c', kind: 'integer', min: -5, max: 5, exclusions: [] },
      ];
      const generated = generateVariables(d.generation, { seed });
      if (!generated.ok) throw new Error('Generation failed');
      const value = instance(d, seed);
      expect(value.generation.values).toEqual(generated.values);
      expect(value.generation.draws).toBe(generated.replay.draws);
      const a = value.generation.values.a,
        b = value.generation.values.b,
        c = value.generation.values.c;
      if (
        a?.kind !== 'integer' ||
        b?.kind !== 'integer' ||
        c?.kind !== 'integer'
      )
        throw new Error('Expected integer values');
      const x = question(value, 'q-abscissa').expected,
        y = question(value, 'q-minimum').expected;
      if (x.kind !== 'rational' || y.kind !== 'rational')
        throw new Error('Expected rationals');
      expect(BigInt(x.value.numerator) * 2n * BigInt(a.value)).toBe(
        -BigInt(b.value) * BigInt(x.value.denominator),
      );
      expect(BigInt(y.value.numerator) * 4n * BigInt(a.value)).toBe(
        (4n * BigInt(a.value) * BigInt(c.value) - BigInt(b.value) ** 2n) *
          BigInt(y.value.denominator),
      );
      instance(definition(), seed + 1);
      expect(
        JSON.stringify(instance(JSON.parse(JSON.stringify(d)), String(seed))),
      ).toBe(JSON.stringify(value));
    },
  );
});

describe('QCM private selections and public options', () => {
  it.each(['single', 'multiple'] as const)(
    'instantiates %s mode with stable option order and private IDs',
    (mode) => {
      const d = definition();
      d.elements.push(mcq(mode));
      const value = instance(d);
      const q = value.elements.at(-1);
      expect(q).toMatchObject({
        id: 'q-choice',
        type: 'mcq',
        mode,
        expected: {
          kind: 'selection',
          optionIds:
            mode === 'single' ? ['positive'] : ['negative', 'positive'],
        },
      });
      if (q?.type !== 'mcq') throw new Error('Expected mcq');
      expect(q.options.map((o) => o.id)).toEqual([
        'positive',
        'negative',
        'none',
      ]);
      expect(q.options.map((o) => o.content)).toEqual([
        { format: 'latex', latex: '2' },
        { format: 'latex', latex: '-2' },
        { format: 'text', text: 'Aucun, @a reste littéral.' },
      ]);
      const publicQ = projectPublicInstance(value).elements.at(-1);
      expect(publicQ).not.toHaveProperty('expected');
      expect(publicQ).not.toHaveProperty('optionMath');
      expect(publicQ).toMatchObject({ mode, options: q.options });
      const reordered = mcq(mode);
      reordered.options.reverse();
      d.elements[d.elements.length - 1] = reordered;
      expect(instance(d).elements.at(-1)).toMatchObject({
        expected: q.expected,
        options: [...q.options].reverse(),
      });
    },
  );
  it.each([
    [
      { format: 'text', text: '@a' },
      { format: 'text', text: '2' },
    ],
    [
      { format: 'latex', latex: '\\frac{1}{2}' },
      { format: 'latex', latex: '\\frac{2}{4}' },
    ],
    [
      { format: 'latex', latex: 'a' },
      { format: 'text', text: '2' },
    ],
  ] as const)(
    'rejects colliding option content %j after substitution',
    (first, second) => {
      const d = definition();
      const q = mcq();
      q.options = [first, second].map((content, i) => ({
        id: String(i),
        content: { ...content },
      }));
      q.expectedOptionIds = ['0'];
      d.elements.push(q);
      rejected(d, 'option', '/elements/5/options/1/content', 'collision');
    },
  );
  it('rejects symbolic mathematical options without claiming an undecided equivalence', () => {
    const d = definition();
    const q = mcq();
    q.options[0]!.content = { format: 'latex', latex: 'x+1' };
    d.elements.push(q);
    rejected(
      d,
      'option',
      '/elements/5/options/0/content/latex',
      'not-calculable',
    );
  });
});

describe('composition diagnostics and trust boundaries', () => {
  it('drops injected secrets from every nested public branch and creates detached objects', () => {
    const d = definition();
    d.elements.unshift({ id: 'part', type: 'section', text: 'Partie' });
    d.elements.push(mcq());
    for (const e of d.elements)
      e.extensions = { solution: { privateMarker: 'PRIVATE-SENTINEL' } };
    const value = instance(d);
    const secrets = {
      seed: 'PRIVATE-SENTINEL',
      correct: true,
      expectedLatex: 'PRIVATE-SENTINEL',
      extensions: { solution: 'PRIVATE-SENTINEL' },
    };
    Object.assign(value, secrets);
    for (const e of value.elements) {
      Object.assign(e, secrets);
      if (e.type === 'question') Object.assign(e.response, secrets);
      if (e.type === 'mcq')
        for (const o of e.options) {
          Object.assign(o, secrets);
          Object.assign(o.content, secrets);
        }
    }
    const projected = projectPublicInstance(value);
    expect(JSON.stringify(projected)).not.toContain('PRIVATE-SENTINEL');
    for (const key of [
      'expected',
      'expectedLatex',
      'policy',
      'generation',
      'seed',
      'draws',
      'extensions',
      'definition',
      'math',
      'optionMath',
      'correct',
    ])
      expect(JSON.stringify(projected)).not.toContain(`"${key}":`);
    const q = projected.elements.find((e) => e.type === 'question');
    if (q?.type !== 'question') throw new Error('Question missing');
    q.response.kind = 'expression';
    expect(question(value, q.id).response.kind).toBe('rational');
    const choice = projected.elements.at(-1);
    if (choice?.type !== 'mcq') throw new Error('Choice missing');
    choice.options[0]!.content = { format: 'text', text: 'Client change' };
    expect(value.elements.at(-1)).toMatchObject({
      options: [{ content: { format: 'latex', latex: '2' } }, {}, {}],
    });
  });
  it('does not mutate deeply frozen source data or depend on clock/global random state', () => {
    const d = definition();
    const before = JSON.stringify(d);
    const freeze = (input: unknown): void => {
      if (input && typeof input === 'object') {
        Object.values(input).forEach(freeze);
        Object.freeze(input);
      }
    };
    freeze(d);
    const baseline = instance(d);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Random used');
    });
    const date = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('Clock used');
    });
    try {
      expect(instance(d)).toEqual(baseline);
    } finally {
      random.mockRestore();
      date.mockRestore();
    }
    baseline.definition.elements[0]!.id = 'Changed privately';
    expect(JSON.stringify(d)).toBe(before);
    expect(baseline.elements[0]!.id).toBe('introduction');
  });
  it.each([
    'x/x',
    '0/x',
    '0\\cdot\\frac{1}{a-a}',
    '\\frac{0}{a-a}',
    '\\sqrt{-1}',
    'z-z',
    '\\frac{',
    '@a',
    '1.000000000000000001',
  ])(
    'fails the second question atomically for %s with its ID and field path',
    (source) => {
      const d = definition();
      const q = d.elements[3]!;
      if (q.type !== 'question') throw new Error('Fixture error');
      q.expectedLatex = source;
      const result = instantiateExercise(d, { seed: 42, instanceId: 'id' });
      expect(result).not.toHaveProperty('value');
      expect(result.ok).toBe(false);
      if (!result.ok)
        expect(result.diagnostics[0]).toMatchObject({
          stage: 'expected',
          elementId: q.id,
          questionId: q.id,
        });
    },
  );
  it.each(['x/x', '(x^2-1)/(x-1)', 'x^0'])(
    'preserves domain before simplifying expression %s',
    (source) => {
      const d = definition();
      d.elements[1] = { id: 'function', type: 'expression', latex: source };
      const result = instantiateExercise(d, { seed: 42, instanceId: 'id' });
      expect(result.ok).toBe(false);
      expect(result).not.toHaveProperty('value');
      if (!result.ok)
        expect(result.diagnostics[0]).toMatchObject({
          stage: 'statement',
          elementId: 'function',
        });
    },
  );
  it.each(['@ab', '@z', '@a_1'])(
    'does not partially match missing text marker %s',
    (text) => {
      const d = definition();
      d.elements[0] = { id: 'introduction', type: 'text', text };
      rejected(d, 'text', '/elements/0/text', 'missing-variable');
    },
  );
  it('keeps ordinary text and inline LaTeX opaque, with the existing escape convention', () => {
    const d = definition();
    d.elements[0] = {
      id: 'introduction',
      type: 'text',
      text: 'a, ab, alpha ; $a^2$ ; @@ab ; @a ; @.',
    };
    expect(instance(d).elements[0]).toMatchObject({
      text: 'a, ab, alpha ; $a^2$ ; @ab ; 2 ; @.',
    });
  });
  it.each([
    ['042', 'mulberry32-rejection-v1'],
    [42, 'future'],
  ])('rejects invalid seed/version (%s,%s)', (seed, generationVersion) => {
    const result = instantiateExercise(definition(), {
      seed,
      instanceId: 'id',
      generationVersion,
    } as Parameters<typeof instantiateExercise>[1]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostics[0]?.stage).toBe('generation');
  });
  it('rejects hostile inert-data inputs without invoking getters or running author code', () => {
    const getter = vi.fn(() => 2);
    const d = definition();
    Object.defineProperty(d.elements[0], 'text', {
      enumerable: true,
      get: getter,
    });
    rejected(d, 'definition', '/elements/0/text', 'invalid-json');
    expect(getter).not.toHaveBeenCalled();
    const inert = definition();
    inert.extensions = { computed: 'throw new Error("must not execute")' };
    expect(instance(inert).definition.extensions).toEqual(inert.extensions);
    rejected(
      {
        ...definition(),
        computed: () => {
          throw new Error('must not execute');
        },
      },
      'definition',
      '/computed',
      'invalid-json',
    );
  });
  it('rejects unbounded choice math instead of rounding it into an exact result', () => {
    const d = definition();
    d.generation.definitions[0] = {
      name: 'a',
      kind: 'choice',
      values: [0.123456789],
    };
    const result = instantiateExercise(d, { seed: 42, instanceId: 'id' });
    expect(result).toMatchObject({
      ok: false,
      diagnostics: [{ stage: 'statement', code: 'limit' }],
    });
  });
});

describe('strict composed definition validation', () => {
  it('accepts the bounded text/option maxima and rejects oversize collections without truncation', () => {
    const d = definition();
    d.elements = Array.from({ length: 128 }, (_, i) => ({
      id: `text-${i}`,
      type: 'text',
      text: 'Plain text',
    }));
    expect(instance(d).elements).toHaveLength(128);
    d.elements.push({
      id: 'overflow',
      type: 'text',
      text: 'No silent omission',
    });
    rejected(d, 'definition', '/elements', 'limit');
    const q = mcq();
    q.options = Array.from({ length: 64 }, (_, i) => ({
      id: `option-${i}`,
      content: { format: 'text', text: `Distinct option ${i}` },
    }));
    q.expectedOptionIds = ['option-0'];
    d.elements = [q];
    expect(instance(d).elements[0]).toMatchObject({ options: q.options });
    q.options.push({
      id: 'overflow',
      content: { format: 'text', text: 'No silent omission' },
    });
    rejected(d, 'definition', '/elements/0/options', 'limit');
  });
  it('rejects text expansion beyond the final display budget', () => {
    const d = definition();
    d.generation.definitions[0] = {
      name: 'a',
      kind: 'integer',
      min: -1000000,
      max: -1000000,
      exclusions: [],
    };
    d.elements[0] = {
      id: 'introduction',
      type: 'text',
      text: '@a '.repeat(1000),
    };
    rejected(d, 'text', '/elements/0/text', 'limit');
  });
  it.each([
    [
      'duplicate element ID',
      {
        elements: [
          { id: 'q', type: 'text', text: 'One' },
          { id: 'q', type: 'text', text: 'Two' },
        ],
      },
      '/elements/1/id',
      'collision',
    ],
    [
      'unsupported graph',
      { elements: [{ id: 'g', type: 'graph', latex: 'x' }] },
      '/elements/0/type',
      'unsupported-type',
    ],
    ['empty elements', { elements: [] }, '/elements', 'value'],
    [
      'missing section',
      {
        elements: [
          { id: 't', type: 'text', text: 'Text', sectionId: 'missing' },
        ],
      },
      '/elements/0/sectionId',
      'value',
    ],
    [
      'nested section',
      {
        elements: [
          { id: 's', type: 'section', text: 'Section', sectionId: 's' },
        ],
      },
      '/elements/0/sectionId',
      'value',
    ],
    [
      'malformed tuple',
      {
        generation: {
          ...definition().generation,
          definitions: [{ name: 'a', kind: 'tuple', values: [[1, 2]] }],
        },
      },
      '/generation/definitions/0/mode',
      'value',
    ],
    [
      'computed without source',
      {
        generation: {
          ...definition().generation,
          definitions: [{ name: 'a', kind: 'computed' }],
        },
      },
      '/generation/definitions/0/latex',
      'type',
    ],
    [
      'empty generation domain',
      {
        generation: {
          ...definition().generation,
          definitions: [
            { name: 'a', kind: 'integer', min: 2, max: 2, exclusions: [2] },
          ],
        },
      },
      '/generation/definitions/0',
      'impossible-constraints',
    ],
    [
      'parameter/free variable collision',
      { variables: [{ name: 'a', domain: 'real' }] },
      '/variables/0/name',
      'collision',
    ],
    [
      'intervariable constraint',
      { constraints: [{ latex: 'b>a' }] },
      '/constraints',
      'unknown-field',
    ],
  ])('diagnoses %s', (_name, changes, path, code) =>
    rejected({ ...definition(), ...changes }, 'definition', path, code),
  );
  it.each([
    [
      'duplicate option',
      (q: ReturnType<typeof mcq>) => {
        q.options[1]!.id = q.options[0]!.id;
      },
      '/options/1/id',
      'collision',
    ],
    [
      'unknown expected ID',
      (q: ReturnType<typeof mcq>) => {
        q.expectedOptionIds = ['missing'];
      },
      '/expectedOptionIds/0',
      'value',
    ],
    [
      'duplicate selection',
      (q: ReturnType<typeof mcq>) => {
        q.mode = 'multiple';
        q.expectedOptionIds = ['positive', 'positive'];
      },
      '/expectedOptionIds/1',
      'collision',
    ],
    [
      'single cardinality',
      (q: ReturnType<typeof mcq>) => {
        q.expectedOptionIds = ['positive', 'negative'];
      },
      '/expectedOptionIds',
      'value',
    ],
    [
      'empty expected',
      (q: ReturnType<typeof mcq>) => {
        q.expectedOptionIds = [];
      },
      '/expectedOptionIds',
      'value',
    ],
    [
      'too few options',
      (q: ReturnType<typeof mcq>) => {
        q.options = [q.options[0]!];
      },
      '/options',
      'value',
    ],
  ] as const)('diagnoses QCM %s', (_name, change, suffix, code) => {
    const q = mcq();
    change(q);
    const d = definition();
    d.elements.push(q);
    rejected(d, 'definition', `/elements/5${suffix}`, code);
  });
  it('rejects inconsistent question policy rather than silently coercing it', () => {
    const d = definition();
    const q = d.elements[2]!;
    if (q.type !== 'question') throw new Error('Fixture error');
    q.policy.domain = 'polynomial';
    rejected(d, 'definition', '/elements/2/policy/domain', 'value');
  });
});
