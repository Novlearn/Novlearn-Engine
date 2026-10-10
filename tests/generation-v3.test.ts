import { describe, expect, it } from 'vitest';
import {
  generateVariables,
  instantiateExercise,
  projectPublicInstance,
  validateDefinition,
} from 'novlearn-exercise-engine';
import type {
  ComputedParameterV3,
  ComparisonConstraintV3,
  ExerciseDefinitionV4,
  GenerationDefinitionV3,
  GeneratedValueV3,
  IntegerParameterV1,
} from 'novlearn-exercise-engine';

const integer = (
  name: string,
  min = 1,
  max = min,
  exclusions: number[] = [],
): IntegerParameterV1 => ({ name, kind: 'integer', min, max, exclusions });
const computed = (
  name: string,
  latex: string,
  restrictions?: ComputedParameterV3['restrictions'],
): ComputedParameterV3 => ({
  name,
  kind: 'computed',
  latex,
  ...(restrictions ? { restrictions } : {}),
});
const definition = (
  definitions: GenerationDefinitionV3['definitions'],
  constraints: ComparisonConstraintV3[] = [],
): GenerationDefinitionV3 => ({
  schemaVersion: 3,
  definitions,
  constraints,
  maxAttempts: 128,
  maxDraws: 4096,
});
const run = (d: unknown, seed: number | string = 42) =>
  generateVariables(d, { seed, generationVersion: 'variables-v3' });
function success(d: unknown, seed: number | string = 42) {
  const r = run(d, seed);
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r;
}
function failed(d: unknown, code: string, path?: string) {
  const r = run(d);
  expect(r.ok).toBe(false);
  expect(r).not.toHaveProperty('values');
  expect(r).not.toHaveProperty('groups');
  expect(r).not.toHaveProperty('computed');
  if (r.ok) throw new Error('Unexpected success');
  expect(r.diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code, ...(path ? { path } : {}) }),
    ]),
  );
  expect(run(JSON.parse(JSON.stringify(d)), '42')).toEqual(r);
  return r;
}
const ratio = (n: number, d = 1) => ({
  kind: 'rational',
  numerator: n,
  denominator: d,
});
function number(v: GeneratedValueV3): bigint {
  if (v.kind === 'rational') {
    expect(v.denominator).toBe(1);
    return BigInt(v.numerator);
  }
  if (v.kind !== 'integer') throw new Error('Expected integer fixture');
  return BigInt(v.value);
}

describe('computed exact values and dependency resolution', () => {
  it('resolves reversed declarations and multiple inputs once, without consuming RNG words', () => {
    const d = definition([
      computed('d', 'c+1'),
      computed('c', 'ab'),
      integer('a', 3),
      computed('f', '2a+3'),
      integer('b', 2),
    ]);
    const r = success(d);
    expect(r.values).toEqual({
      a: { kind: 'integer', value: 3 },
      b: { kind: 'integer', value: 2 },
      c: ratio(6),
      d: ratio(7),
      f: ratio(9),
    });
    expect(r.computed).toEqual([
      { name: 'c', dependencies: ['a', 'b'] },
      { name: 'd', dependencies: ['c'] },
      { name: 'f', dependencies: ['a'] },
    ]);
    expect(r.replay).toMatchObject({
      draws: 0,
      attempts: 1,
      generationVersion: 'variables-v3',
    });
    expect(success(JSON.parse(JSON.stringify(d)), '42')).toEqual(r);
  });
  it('keeps fraction information for terminating decimals and exact nested products', () => {
    const r = success(
      definition([
        integer('a', 3),
        integer('b', 2),
        computed('c', 'a/b'),
        computed('d', 'bc'),
      ]),
    );
    expect(r.values.c).toEqual(ratio(3, 2));
    expect(r.values.d).toEqual(ratio(3));
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });
  it.each(['0.1+0.2', '0{,}1+0{,}2'])(
    'encodes source decimals exactly: %s',
    (latex) => {
      expect(success(definition([computed('a', latex)])).values.a).toEqual(
        ratio(3, 10),
      );
    },
  );
  it('preserves decimal grid and exact choice through calculated dependencies', () => {
    const r = success(
      definition([
        {
          name: 'a',
          kind: 'decimal',
          min: 0.29,
          max: 0.29,
          precision: 2,
          exclusions: [],
        },
        { name: 'b', kind: 'choice', values: [0.125] },
        computed('c', 'a+b'),
      ]),
    );
    expect(r.values.a).toEqual({
      kind: 'decimal',
      coefficient: 29,
      precision: 2,
    });
    expect(r.values.c).toEqual(ratio(83, 200));
  });
  it('keeps original source and has no mutable global context', () => {
    const d = definition([integer('a', -2), computed('b', 'a^2')]);
    const before = JSON.stringify(d);
    Object.freeze(d.definitions[1]);
    const r = success(d);
    expect(r.values.b).toEqual(ratio(4));
    success(definition([integer('a', 7), computed('b', 'a^2')]));
    expect(success(d)).toEqual(r);
    expect(JSON.stringify(d)).toBe(before);
  });
  it.each([
    [[computed('a', 'b+1')], 'invalid-expression'],
    [[computed('a', 'a+1')], 'dependency-cycle'],
    [[computed('a', 'b+1'), computed('b', 'a+1')], 'dependency-cycle'],
    [
      [computed('a', 'b+1'), computed('b', 'c+1'), computed('c', 'a+1')],
      'dependency-cycle',
    ],
    [[integer('a'), computed('a', '2')], 'invalid-definition'],
    [[computed('a', '2'), computed('a', '3')], 'invalid-definition'],
    [[computed('delta', '2')], 'invalid-definition'],
    [[computed('r1', '2')], 'invalid-definition'],
  ] as const)(
    'rejects references, cycles and names before any attempt %#',
    (definitions, code) => {
      const r = failed(definition([...definitions]), code);
      expect(r.replay).toMatchObject({ draws: 0, attempts: 0 });
      if (code === 'dependency-cycle')
        expect(r.diagnostics[0]!.message).toContain('a');
    },
  );
  it.each([
    'a+',
    '\\sqrt{4}',
    '\\sqrt{-1}',
    '\\pi',
    '\\sin(a)',
    'a=2',
    'globalThis.process.exit()',
    '1.23456789',
    '1 2',
  ])('rejects invalid or unsupported calculation before RNG: %s', (latex) => {
    const r = run(definition([integer('a', 1, 10), computed('b', latex)]));
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Unexpected success');
    expect(r.replay).toMatchObject({ draws: 0, attempts: 0 });
    expect(r).not.toHaveProperty('values');
  });
  it.each(['1/0', 'a/(a-a)', '0^0'])(
    'reports singularity before reducing: %s',
    (latex) => {
      failed(
        definition([integer('a', 2), computed('b', latex)]),
        'undefined-expression',
      );
    },
  );
  it.each(['a^{17}', 'a^{-1}', 'a^{1/2}'])(
    'refuses exponents outside bounded arithmetic: %s',
    (latex) => {
      failed(
        definition([integer('a', 2), computed('b', latex)]),
        'unsupported-expression',
      );
    },
  );
  it('checks exact intermediate and AST budgets', () => {
    failed(definition([computed('a', '1000000^2-1000000^2')]), 'limit');
    failed(
      definition([computed('a', Array(129).fill('1').join('+'))]),
      'limit',
    );
  });
  it('limits sixteen total values including computed and tuple components', () => {
    const names = 'abcdfghjklmnopqrstu'.split('');
    failed(definition(names.map((n) => computed(n, '1'))), 'limit');
    expect(
      Object.keys(
        success(definition(names.slice(0, 16).map((n) => computed(n, '1'))))
          .values,
      ),
    ).toHaveLength(16);
  });
  it('rejects tuple/component/name collisions', () => {
    const tuple = {
      kind: 'tuple' as const,
      id: 'pair',
      mode: 'generate' as const,
      components: [integer('a'), integer('b')],
    };
    failed(definition([tuple, computed('a', '2')]), 'invalid-definition');
    failed(
      definition([{ ...tuple, id: 'c' }, computed('c', '2')]),
      'invalid-definition',
    );
  });
});

describe('complete candidate constraints and replay', () => {
  it('retries a computed inequality with the same continuous scalar sequence', () => {
    const d = definition(
      [integer('a', 1, 10), computed('b', '2a+3')],
      [
        {
          kind: 'comparison',
          left: { variable: 'b' },
          operator: '<',
          right: { constant: 15 },
        },
        {
          kind: 'comparison',
          left: { variable: 'b' },
          operator: '>',
          right: { constant: 7 },
        },
      ],
    );
    const r = success(d);
    expect(r.values).toEqual({
      a: { kind: 'integer', value: 5 },
      b: ratio(13),
    });
    expect(r.replay).toMatchObject({ attempts: 3, draws: 3 });
    expect(success(d, '42')).toEqual(r);
    const historical = generateVariables(
      definition([integer('a', 1, 10)]).definitions,
      { seed: 42 },
    );
    expect(historical.ok && historical.values.a).toEqual({
      kind: 'integer',
      value: 7,
    });
    // Independent reproduction of seven draws by the historical scalar sampler.
    const names = 'abcdfgh'.split('');
    const sequence = generateVariables(
      names.map((n) => integer(n, 1, 10)),
      { seed: 42 },
    );
    expect(
      sequence.ok &&
        Object.values(sequence.values).map((v) =>
          v.kind === 'decimal' ? v.coefficient : v.value,
        ),
    ).toEqual([7, 1, 5, 6, 9, 8, 1]);
  });
  it.each(['<', '<=', '>', '>=', '==', '!='] as const)(
    'compares exact expressions and fractions with %s',
    (operator) => {
      const right =
        operator === '<'
          ? 2
          : operator === '>'
            ? 1
            : operator === '!='
              ? 2
              : 1.5;
      const r = success(
        definition(
          [integer('a', 3), integer('b', 2), computed('c', 'a/b')],
          [
            {
              kind: 'comparison',
              left: { latex: 'c' },
              operator,
              right: { constant: right },
            },
          ],
        ),
      );
      expect(r.values.c).toEqual(ratio(3, 2));
    },
  );
  it('returns no context when the budget exhausts an impossible calculated predicate', () => {
    const d = {
      ...definition(
        [integer('a', 1, 3), computed('b', '2a')],
        [
          {
            kind: 'comparison',
            left: { latex: 'b+1' },
            operator: '==',
            right: { variable: 'a' },
          },
        ],
      ),
      maxAttempts: 4,
    };
    const r = failed(d, 'attempts-exhausted');
    expect(r.replay).toMatchObject({ attempts: 4, draws: 4 });
  });
  it('retains static impossibility proofs and exposes original definition paths', () => {
    const r = failed(
      definition(
        [computed('b', 'a+1'), integer('a', 1, 3)],
        [
          {
            kind: 'comparison',
            left: { variable: 'a' },
            operator: '<',
            right: { constant: 0 },
          },
        ],
      ),
      'empty-domain',
      '/constraints/0',
    );
    expect(r.replay).toMatchObject({ attempts: 0, draws: 0 });
    failed(
      { ...definition([computed('b', '1'), integer('a', 0, 0, [0])]) },
      'empty-domain',
      '/definitions/1',
    );
  });
  it('bounds continuous RNG consumption', () => {
    const r = failed(
      {
        ...definition(
          [integer('a', 1, 3), computed('b', '2a')],
          [
            {
              kind: 'comparison',
              left: { variable: 'b' },
              operator: '<',
              right: { constant: 0 },
            },
          ],
        ),
        maxDraws: 2,
      },
      'limit',
      '/definitions/0',
    );
    expect(r.replay).toMatchObject({ draws: 2, attempts: 3 });
  });
  it('retries integer, exact range and exclusion restrictions without clamping', () => {
    const r = success(
      definition([
        integer('a', 1, 10),
        computed('b', 'a/2', {
          domain: 'integer',
          min: 1,
          max: 2,
          exclusions: [1],
        }),
      ]),
    );
    expect(r.values.b).toEqual(ratio(2));
    expect(r.values.a).toEqual({ kind: 'integer', value: 4 });
    expect(r.replay.attempts).toBeGreaterThan(1);
  });
  it('fails explicitly for out of result domain and inverted restrictions', () => {
    failed(
      {
        ...definition([computed('a', '1/2', { domain: 'integer' })]),
        maxAttempts: 3,
      },
      'attempts-exhausted',
    );
    const r = failed(
      definition([computed('a', '1', { domain: 'rational', min: 2, max: 1 })]),
      'empty-domain',
    );
    expect(r.replay?.attempts).toBe(0);
  });
  it('does not hide a later singularity after rejecting a result restriction', () => {
    failed(
      definition([
        computed('a', '1/2', { domain: 'integer' }),
        computed('b', '1/(a-a)'),
      ]),
      'undefined-expression',
      '/definitions/1/latex',
    );
  });
  it('bounds predicate lists and validates every restriction field', () => {
    const relation: ComparisonConstraintV3 = {
      kind: 'comparison',
      left: { latex: '1' },
      operator: '==',
      right: { constant: 1 },
    };
    failed(
      definition([computed('a', '1')], Array(33).fill(relation)),
      'limit',
      '/constraints',
    );
    for (const restrictions of [
      { domain: 'real' },
      { domain: 'integer', min: 0.1234567 },
      { domain: 'rational', exclusions: [1, 1] },
      { domain: 'rational', exclusions: [Infinity] },
    ]) {
      const r = run({
        ...definition([]),
        definitions: [
          { kind: 'computed', name: 'a', latex: '1', restrictions },
        ],
      });
      expect(r).toMatchObject({ ok: false, replay: { attempts: 0, draws: 0 } });
    }
  });
  it.each([
    {
      kind: 'comparison',
      left: { latex: 'z+1' },
      operator: '==',
      right: { constant: 1 },
    },
    {
      kind: 'comparison',
      left: { latex: '\\sqrt{4}' },
      operator: '==',
      right: { constant: 2 },
    },
    {
      kind: 'comparison',
      left: { variable: 'a', latex: 'a' },
      operator: '==',
      right: { constant: 1 },
    },
    {
      kind: 'comparison',
      left: { constant: 0.1234567 },
      operator: '==',
      right: { constant: 1 },
    },
  ])('rejects invalid constraints before any attempt %#', (constraint) => {
    const r = run({
      ...definition([integer('a', 1, 10)]),
      constraints: [constraint],
    });
    expect(r.ok).toBe(false);
    expect(r.replay).toMatchObject({ attempts: 0, draws: 0 });
  });
});

describe('mathematical integration with independent BigInt oracles', () => {
  it('computes discriminants on 32 seeds', () => {
    const d = definition([
      integer('a', -3, 3),
      integer('b', -6, 6),
      integer('c', -5, 5),
      computed('d', 'b^2-4ac'),
    ]);
    for (let seed = 0; seed < 32; seed++) {
      const v = success(d, seed).values;
      expect(number(v.d!)).toBe(
        number(v.b!) ** 2n - 4n * number(v.a!) * number(v.c!),
      );
    }
  });
  it('constructs integer-root quadratics and verifies the square identity for 24 seeds', () => {
    // r/s are the current safe names for the pedagogical roots r1/r2.
    const d = definition(
      [
        computed('d', 'b^2-4ac'),
        computed('b', '-a(r+s)'),
        integer('a', -3, 3, [0]),
        integer('r', -4, 4),
        computed('c', 'ars'),
        integer('s', -4, 4),
      ],
      [
        {
          kind: 'comparison',
          left: { latex: 'd' },
          operator: '==',
          right: { latex: 'a^2(r-s)^2' },
        },
      ],
    );
    let equalRoots = false,
      distinctRoots = false;
    for (let seed = 0; seed < 24; seed++) {
      const v = success(d, seed).values;
      const a = number(v.a!),
        r = number(v.r!),
        s = number(v.s!);
      expect(number(v.b!)).toBe(-a * (r + s));
      expect(number(v.c!)).toBe(a * r * s);
      expect(number(v.d!)).toBe(a * a * (r - s) * (r - s));
      expect(number(v.d!)).toBeGreaterThanOrEqual(0n);
      equalRoots ||= r === s;
      distinctRoots ||= r !== s;
    }
    expect(equalRoots && distinctRoots).toBe(true);
  }, 30000);
  it('calculates from tuple components and checks the pythagorean predicate over 24 seeds', () => {
    const d = definition(
      [
        computed('s', 'a^2+b^2'),
        {
          kind: 'tuple',
          id: 'triangle',
          mode: 'choice',
          components: [
            integer('a', 1, 17),
            integer('b', 1, 17),
            integer('c', 1, 17),
          ],
          values: [
            [3, 4, 5],
            [5, 12, 13],
            [8, 15, 17],
          ],
        },
      ],
      [
        {
          kind: 'comparison',
          left: { variable: 's' },
          operator: '==',
          right: { latex: 'c^2' },
        },
      ],
    );
    for (let seed = 0; seed < 24; seed++) {
      const r = success(d, seed);
      expect(number(r.values.s!)).toBe(number(r.values.c!) ** 2n);
      expect(r.groups).toEqual([
        { id: 'triangle', components: ['a', 'b', 'c'] },
      ]);
      expect(r.computed).toEqual([{ name: 's', dependencies: ['a', 'b'] }]);
      expect(r.replay).toMatchObject({ attempts: 1, draws: 1 });
    }
  }, 30000);
});

const exercise = (): ExerciseDefinitionV4 => ({
  schemaVersion: 4,
  kind: 'composed',
  id: 'computed-quadratic',
  revision: '1',
  title: 'Trinôme @a',
  generation: definition([
    integer('a', 2),
    integer('b', -4),
    integer('c', 5),
    computed('d', 'b^2-4ac'),
    computed('s', '-b/(2a)'),
  ]),
  variables: [{ name: 'x', domain: 'real' }],
  elements: [
    { id: 'intro', type: 'text', text: 'a=@a, b=@b, c=@c' },
    { id: 'polynomial', type: 'expression', latex: 'ax^2+bx+c' },
    {
      id: 'discriminant',
      type: 'question',
      text: 'Calculer le discriminant.',
      points: 1,
      response: { format: 'latex', kind: 'rational' },
      expectedLatex: 'd',
      policy: { domain: 'rational', form: 'value-only' },
    },
    {
      id: 'vertex',
      type: 'question',
      text: 'Calculer le sommet.',
      points: 1,
      response: { format: 'latex', kind: 'rational' },
      expectedLatex: 's',
      policy: { domain: 'rational', form: 'value-only' },
    },
  ],
});

describe('one resolved context in multiquestion v4', () => {
  it('keeps IDs, exact private answers, free variables and JSON replay', () => {
    const d = exercise(),
      before = JSON.stringify(d);
    const o = { seed: 42, instanceId: 'opaque' };
    expect(validateDefinition(d).ok).toBe(true);
    const r = instantiateExercise(d, o);
    if (!r.ok) throw new Error(JSON.stringify(r));
    expect(r.value.schemaVersion).toBe(4);
    expect(r.value.instantiationVersion).toBe('composed-instance-v4');
    expect(r.value.generation.parameters.d).toEqual(ratio(-24));
    expect(r.value.generation.computed.map((c) => c.name)).toEqual(['d', 's']);
    const answers = r.value.elements.filter((e) => e.type === 'question');
    expect(
      answers.map((e) => [
        e.id,
        e.expected.kind === 'rational' ? e.expected.value : null,
      ]),
    ).toEqual([
      ['discriminant', ratio(-24)],
      ['vertex', ratio(1)],
    ]);
    expect(r.value.elements[1]).toMatchObject({ latex: '2x^2-4x+5' });
    expect(
      instantiateExercise(JSON.parse(JSON.stringify(d)), { ...o, seed: '42' }),
    ).toEqual(r);
    expect(JSON.stringify(d)).toBe(before);
    Object.assign(r.value.elements[2]!, {
      seed: 'injected-secret',
      computed: { secret: 'hidden' },
    });
    const q = r.value.elements[2]!;
    if (q.type === 'question')
      Object.assign(q.response, { expectedLatex: 'hidden' });
    const publicInstance = projectPublicInstance(r.value);
    expect(publicInstance.schemaVersion).toBe(4);
    const json = JSON.stringify(publicInstance);
    for (const secret of [
      'generation',
      'computed',
      'expected',
      'policy',
      'seed',
      'dependencies',
      'numerator',
      'definition',
      'instantiationVersion',
    ])
      expect(json).not.toContain(`"${secret}"`);
    d.elements.reverse();
    const reversed = instantiateExercise(d, o);
    if (!reversed.ok) throw new Error(JSON.stringify(reversed));
    expect(
      reversed.value.elements
        .filter((e) => e.type === 'question')
        .map((e) => e.id),
    ).toEqual(['vertex', 'discriminant']);
    expect(reversed.value.generation).toEqual(r.value.generation);
  });
  it('renders rational parameters as fractions in prose and substitutes them in QCM', () => {
    const d = exercise();
    d.generation = definition([computed('a', '3/2')]);
    d.variables = [];
    d.elements = [
      { id: 'text', type: 'text', text: '@a' },
      {
        id: 'mcq',
        type: 'mcq',
        text: 'Quelle valeur ?',
        points: 1,
        mode: 'single',
        options: [
          { id: 'yes', content: { format: 'latex', latex: 'a' } },
          { id: 'no', content: { format: 'latex', latex: '2' } },
        ],
        expectedOptionIds: ['yes'],
      },
    ];
    const r = instantiateExercise(d, { seed: 42, instanceId: 'opaque' });
    if (!r.ok) throw new Error(JSON.stringify(r));
    expect(r.value.elements[0]).toMatchObject({ text: '3/2' });
    expect(projectPublicInstance(r.value).elements[1]).not.toHaveProperty(
      'expected',
    );
  });
  it('returns no instance after a failed later question or generation', () => {
    const d = exercise();
    const q = d.elements[3]!;
    if (q.type !== 'question') throw new Error('fixture');
    q.expectedLatex = '1/0';
    const r = instantiateExercise(d, { seed: 42, instanceId: 'opaque' });
    expect(r).not.toHaveProperty('value');
    expect(r).toMatchObject({
      ok: false,
      diagnostics: [{ questionId: 'vertex', code: 'undefined-expression' }],
    });
    d.generation.definitions.push(computed('f', 'z'));
    const failure = instantiateExercise(d, { seed: 42, instanceId: 'opaque' });
    expect(failure).toMatchObject({
      ok: false,
      diagnostics: [
        {
          stage: 'generation',
          path: '/generation/definitions/5/latex',
          code: 'invalid-expression',
        },
      ],
    });
  });
  it('rejects computed/free variable collisions and incompatible versions', () => {
    const d = exercise();
    d.variables.push({ name: 'd', domain: 'real' });
    expect(validateDefinition(d).ok).toBe(false);
    d.variables.pop();
    expect(
      instantiateExercise(d, {
        seed: 42,
        instanceId: 'opaque',
        instantiationVersion: 'composed-instance-v3',
      }).ok,
    ).toBe(false);
    expect(
      instantiateExercise(d, {
        seed: 42,
        instanceId: 'opaque',
        generationVersion: 'variables-v2',
      }).ok,
    ).toBe(false);
    expect(
      generateVariables(d.generation, {
        seed: 42,
        generationVersion: 'variables-v2',
      }).ok,
    ).toBe(false);
  });
  it('rejects whole tuple candidates using a calculated result and keeps provenance', () => {
    const g = definition(
      [
        {
          kind: 'tuple',
          id: 'pair',
          mode: 'choice',
          components: [integer('a', 1, 9), integer('b', 1, 9)],
          values: [
            [1, 2],
            [3, 4],
            [5, 6],
          ],
        },
        computed('c', 'ab'),
      ],
      [
        {
          kind: 'comparison',
          left: { variable: 'c' },
          operator: '==',
          right: { constant: 12 },
        },
      ],
    );
    const r = success(g);
    expect(r.values).toEqual({
      a: { kind: 'integer', value: 3 },
      b: { kind: 'integer', value: 4 },
      c: ratio(12),
    });
    expect(r.groups).toEqual([{ id: 'pair', components: ['a', 'b'] }]);
    expect(r.replay.attempts).toBeGreaterThan(1);
    expect(r.replay.draws).toBe(r.replay.attempts);
  });
});
