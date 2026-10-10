import { describe, expect, it, vi } from 'vitest';
import {
  generateVariables,
  instantiateExercise,
  projectPublicInstance,
  validateDefinition,
} from 'novlearn-exercise-engine';
import type {
  ComparisonConstraint,
  ExerciseDefinition,
  GeneratedValue,
  GenerationDefinition,
  IntegerVariableDefinition,
  ScalarVariableDefinition,
  TupleVariableDefinition,
} from 'novlearn-exercise-engine';
import { sampleIndex, wordStream } from '../src/generation/random.js';

const integer = (
  name: string,
  min = 1,
  max = 10,
  exclusions: number[] = [],
): IntegerVariableDefinition => ({
  name,
  kind: 'integer',
  min,
  max,
  exclusions,
});
const comparison = (
  operator: ComparisonConstraint['operator'],
  a = 'a',
  b = 'b',
): ComparisonConstraint => ({
  kind: 'comparison',
  left: { variable: a },
  operator,
  right: { variable: b },
});
const definition = (
  definitions: GenerationDefinition['definitions'],
  constraints: ComparisonConstraint[] = [],
): GenerationDefinition => ({
  schemaVersion: 5,
  definitions,
  constraints,
  maxAttempts: 128,
  maxDraws: 4096,
});
const run = (d: unknown, seed: number | string = 42) =>
  generateVariables(d, { seed, generationVersion: 'mulberry32-rejection-v1' });
function success(d: unknown, seed: number | string = 42) {
  const r = run(d, seed);
  if (!r.ok || !('groups' in r)) throw new Error(JSON.stringify(r));
  return r;
}
function failed(d: unknown, code = 'invalid-definition', path?: string) {
  const r = run(d);
  expect(r.ok).toBe(false);
  expect(r).not.toHaveProperty('values');
  expect(r).not.toHaveProperty('groups');
  if (r.ok) throw new Error('Unexpected success.');
  expect(r.diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code,
        ...(path === undefined ? {} : { path }),
      }),
    ]),
  );
  return r;
}
function rational(v: GeneratedValue): [bigint, bigint] {
  if (v.kind === 'rational')
    return [BigInt(v.numerator), BigInt(v.denominator)];
  if (v.kind === 'integer') return [BigInt(v.value), 1n];
  if (v.kind === 'decimal')
    return [BigInt(v.coefficient), 10n ** BigInt(v.precision)];
  // Independent test oracle for the bounded choice fixtures (no CortexJS).
  const [whole, fraction = ''] = String(v.value).split('.');
  return [BigInt(whole! + fraction), 10n ** BigInt(fraction.length)];
}
function order(a: GeneratedValue, b: GeneratedValue): bigint {
  const [an, ad] = rational(a),
    [bn, bd] = rational(b);
  return an * bd - bn * ad;
}
const pythagorean = (): Extract<
  TupleVariableDefinition,
  { mode: 'choice' }
> => ({
  kind: 'tuple',
  id: 'triangle',
  mode: 'choice',
  components: [integer('a', 1, 17), integer('b', 1, 17), integer('c', 1, 17)],
  values: [
    [3, 4, 5],
    [5, 12, 13],
    [8, 15, 17],
  ],
});

describe('atomic tuples and replay', () => {
  it('accepts maximum arity and exactly sixteen bindings without expanding domains', () => {
    const names = 'abcdfghjklmnopqrs'.split('');
    const d = definition(
      [0, 1].map((i) => ({
        kind: 'tuple' as const,
        id: `group-${i}`,
        mode: 'generate' as const,
        components: names
          .slice(i * 8, i * 8 + 8)
          .map((n) => integer(n, -1_000_000, 1_000_000)),
      })),
    );
    const r = success({ ...d, maxDraws: 65536 });
    expect(Object.keys(r.values)).toHaveLength(16);
    expect(r.groups.map((g) => g.components.length)).toEqual([8, 8]);
    expect(r.replay.draws).toBe(16);
  });
  it.each([2, 3, 4])(
    'generates a tuple of arity %i with one ordered binding list',
    (arity) => {
      const names = ['a', 'b', 'c', 'd'].slice(0, arity);
      const d = definition([
        {
          kind: 'tuple',
          id: 'group',
          mode: 'generate',
          components: names.map((name) => integer(name, -5, 5, [-2, 0, 2])),
        },
      ]);
      const r = success(d);
      expect(Object.keys(r.values)).toEqual(names);
      expect(r.groups).toEqual([{ id: 'group', components: names }]);
      expect(r.replay).toMatchObject({ draws: arity, attempts: 1 });
      expect(success(JSON.parse(JSON.stringify(d)), '42')).toEqual(r);
      for (const v of Object.values(r.values))
        expect([-2, 0, 2]).not.toContain(
          v.kind === 'decimal'
            ? v.coefficient
            : v.kind === 'rational'
              ? v.numerator / v.denominator
              : v.value,
        );
    },
  );

  it('selects only complete predefined rows and verifies Pythagoras for 256 seeds', () => {
    const p = pythagorean();
    if (p.mode !== 'choice') throw new Error('Wrong fixture.');
    const observed = new Set<string>();
    for (let seed = 0; seed < 256; seed += 1) {
      const r = success(definition([p]), seed);
      const numbers = ['a', 'b', 'c'].map((name) => {
        const v = r.values[name]!;
        if (v.kind !== 'integer') throw new Error('Wrong type.');
        return v.value;
      });
      expect(p.values).toContainEqual(numbers);
      const [a, b, c] = numbers.map(BigInt);
      expect(a! * a! + b! * b!).toBe(c! * c!);
      observed.add(JSON.stringify(numbers));
      expect(r.replay).toMatchObject({ draws: 1, attempts: 1 });
    }
    expect(observed.size).toBe(3);
  });

  it('removes entire excluded rows without mixing or mutating them', () => {
    const p = pythagorean();
    p.components[0]!.exclusions = [3, 8];
    const d = definition([p]);
    const before = JSON.stringify(d);
    const r = success(d);
    expect(r.values).toEqual({
      a: { kind: 'integer', value: 5 },
      b: { kind: 'integer', value: 12 },
      c: { kind: 'integer', value: 13 },
    });
    expect(r.replay.draws).toBe(0);
    expect(JSON.stringify(d)).toBe(before);
    p.components[0]!.exclusions.push(5);
    failed(d, 'empty-domain', '/definitions/0/values');
  });

  it('shares scalar integer/decimal/choice sampling without changing the v1 sequence', () => {
    const scalars: ScalarVariableDefinition[] = [
      integer('a'),
      {
        name: 'b',
        kind: 'decimal',
        min: -0.3,
        max: 0.3,
        precision: 1,
        exclusions: [0],
      },
      { name: 'c', kind: 'choice', values: [-2, 0.125, 7] },
    ];
    const old = generateVariables(definition(scalars), { seed: 42 });
    const current = success(
      definition([
        { kind: 'tuple', id: 'mixed', mode: 'generate', components: scalars },
      ]),
    );
    if (!old.ok) throw new Error('Invalid fixture.');
    expect(current.values).toEqual(old.values);
    expect(current.replay.draws).toBe(old.replay.draws);
  });

  it('supports mixed predefined decimal/choice rows and choice exclusions', () => {
    const d = definition([
      {
        id: 'mixed',
        kind: 'tuple',
        mode: 'choice',
        components: [
          {
            name: 'a',
            kind: 'decimal',
            min: -0.3,
            max: 0.3,
            precision: 1,
            exclusions: [0],
          },
          { name: 'b', kind: 'choice', values: [0.125, 7], exclusions: [7] },
        ],
        values: [
          [0, 0.125],
          [-0.2, 7],
          [0.3, 0.125],
        ],
      },
    ]);
    expect(success(d).values).toEqual({
      a: { kind: 'decimal', coefficient: 3, precision: 1 },
      b: { kind: 'choice', value: 0.125 },
    });
    expect(
      success(
        definition([
          {
            name: 'a',
            kind: 'choice',
            values: [-2, 0, 2, 3],
            exclusions: [-2, 0, 2],
          },
        ]),
      ).values.a,
    ).toEqual({ kind: 'choice', value: 3 });
  });

  it('redraws the whole candidate on a continuous stream, including scalars and other groups', () => {
    const d = definition(
      [
        integer('c'),
        {
          kind: 'tuple',
          id: 'ordered',
          mode: 'generate',
          components: [integer('a'), integer('b')],
        },
        {
          kind: 'tuple',
          id: 'other',
          mode: 'generate',
          components: [integer('f'), integer('g')],
        },
      ],
      [comparison('<'), comparison('>', 'f', 'c')],
    );
    let draws = 0;
    const stream = wordStream(42);
    const next = () => {
      draws += 1;
      return stream();
    };
    let expected: number[] = [],
      attempts = 0;
    do {
      expected = Array.from({ length: 5 }, () => 1 + sampleIndex(10, next)!);
      attempts += 1;
    } while (!(expected[1]! < expected[2]! && expected[3]! > expected[0]!));
    expect(attempts).toBeGreaterThan(1);
    const r = success(d);
    expect(
      Object.values(r.values).map((v) =>
        v.kind === 'decimal'
          ? v.coefficient
          : v.kind === 'rational'
            ? v.numerator / v.denominator
            : v.value,
      ),
    ).toEqual(expected);
    expect(r.replay).toMatchObject({ draws, attempts });
  });

  it('has a canonical retry vector and independent object key order', () => {
    const d = definition(
      [
        {
          kind: 'tuple',
          id: 'ordered',
          mode: 'generate',
          components: [integer('a'), integer('b')],
        },
      ],
      [comparison('<')],
    );
    const r = success(d);
    expect(r.values).toEqual({
      a: { kind: 'integer', value: 5 },
      b: { kind: 'integer', value: 6 },
    });
    expect(r.replay).toEqual({
      engineVersion: '0.1.0',
      generationVersion: 'mulberry32-rejection-v1',
      seed: '42',
      draws: 4,
      attempts: 2,
    });
    const reverseKeys = (v: unknown): unknown =>
      Array.isArray(v)
        ? v.map(reverseKeys)
        : v !== null && typeof v === 'object'
          ? Object.fromEntries(
              Object.entries(v)
                .reverse()
                .map(([k, n]) => [k, reverseKeys(n)]),
            )
          : v;
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Forbidden RNG');
    });
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('Forbidden clock');
    });
    try {
      expect(success(reverseKeys(d), '42')).toEqual(r);
    } finally {
      random.mockRestore();
      clock.mockRestore();
    }
  });
});

describe('six exact comparisons', () => {
  it('checks scalar/component and cross-group constraints on 128 seeds', () => {
    const d = definition(
      [
        integer('a', -5, 5, [-2, 0, 2]),
        {
          kind: 'tuple',
          id: 'one',
          mode: 'generate',
          components: [integer('b'), integer('c')],
        },
        {
          kind: 'tuple',
          id: 'two',
          mode: 'choice',
          components: [integer('d'), integer('f')],
          values: [
            [1, 3],
            [2, 7],
            [5, 9],
          ],
        },
      ],
      [
        comparison('<', 'a', 'b'),
        comparison('<=', 'c', 'f'),
        comparison('!=', 'b', 'd'),
      ],
    );
    for (let seed = 0; seed < 128; seed += 1) {
      const r = success(d, seed);
      expect(order(r.values.a!, r.values.b!)).toBeLessThan(0n);
      expect(order(r.values.c!, r.values.f!)).toBeLessThanOrEqual(0n);
      expect(order(r.values.b!, r.values.d!)).not.toBe(0n);
      const a = r.values.a!;
      expect(a.kind === 'integer' && ![-2, 0, 2].includes(a.value)).toBe(true);
    }
  }, 30_000);
  it.each(['<', '<=', '>', '>=', '==', '!='] as const)(
    'verifies %s by independent rational arithmetic on 96 seeds',
    (operator) => {
      const components: ScalarVariableDefinition[] = [
        {
          name: 'a',
          kind: 'decimal',
          min: -0.3,
          max: 0.3,
          precision: 1,
          exclusions: [0],
        },
        {
          name: 'b',
          kind: 'choice',
          values: [-0.3, -0.1, 0.1, 0.3],
          exclusions: [-0.3],
        },
      ];
      const d = definition(
        [{ id: 'comparison', kind: 'tuple', mode: 'generate', components }],
        [comparison(operator)],
      );
      for (let seed = 0; seed < 96; seed += 1) {
        const r = success(d, seed);
        const diff = order(r.values.a!, r.values.b!);
        const oracle = {
          '<': diff < 0n,
          '<=': diff <= 0n,
          '>': diff > 0n,
          '>=': diff >= 0n,
          '==': diff === 0n,
          '!=': diff !== 0n,
        };
        expect(oracle[operator]).toBe(true);
        expect(r.values.a).not.toMatchObject({ coefficient: 0 });
        expect(r.values.b).not.toMatchObject({ value: -0.3 });
      }
    },
    30_000,
  );

  it('accepts constants and equivalent exact encodings, without tolerance', () => {
    const d = definition(
      [
        {
          name: 'a',
          kind: 'decimal',
          min: 0.1,
          max: 0.1,
          precision: 6,
          exclusions: [],
        },
      ],
      [{ ...comparison('=='), right: { constant: 0.1 } }],
    );
    expect(success(d).values.a).toEqual({
      kind: 'decimal',
      coefficient: 100000,
      precision: 6,
    });
    failed(
      {
        ...d,
        constraints: [{ ...comparison('=='), right: { constant: 0.100001 } }],
      },
      'empty-domain',
    );
    expect(
      success(
        definition(
          [],
          [
            {
              kind: 'comparison',
              operator: '<',
              left: { constant: 0 },
              right: { constant: 0.000001 },
            },
          ],
        ),
      ).replay.draws,
    ).toBe(0);
  });

  it.each(['<', '>', '!='] as const)(
    'proves a %s a impossible before any attempt',
    (operator) => {
      const r = failed(
        definition([integer('a')], [comparison(operator, 'a', 'a')]),
        'empty-domain',
        '/constraints/0',
      );
      expect(r.replay).toMatchObject({ attempts: 0, draws: 0 });
    },
  );
  it.each(['<=', '>=', '=='] as const)('accepts a %s a', (operator) => {
    success(definition([integer('a')], [comparison(operator, 'a', 'a')]));
  });
  it.each(['<', '<=', '=='] as const)(
    'proves disjoint bounds incompatible for %s',
    (operator) => {
      const r = failed(
        definition(
          [integer('a', 5, 8), integer('b', 1, 3)],
          [comparison(operator)],
        ),
        'empty-domain',
      );
      expect(r.replay?.draws).toBe(0);
    },
  );
  it('proves exclusions at interval endpoints and filtered rows before drawing', () => {
    failed(
      definition(
        [integer('a', 1, 2, [1]), integer('b', 1, 1)],
        [comparison('<')],
      ),
      'empty-domain',
    );
    const p = pythagorean();
    p.components[0]!.exclusions = [3, 5];
    failed(
      definition([p], [{ ...comparison('<'), right: { constant: 8 } }]),
      'empty-domain',
    );
  });
  it('reports bounded exhaustion, never impossibility or partial results, for contradictory relations', () => {
    const d = {
      ...definition(
        [integer('a', 1, 3), integer('b', 1, 3)],
        [comparison('>'), comparison('>', 'b', 'a')],
      ),
      maxAttempts: 4,
    };
    const r = failed(d, 'attempts-exhausted', '/constraints');
    expect(r.replay).toMatchObject({ attempts: 4, draws: 8 });
    expect(run(d, '42')).toEqual(r);
  });
  it('enforces maxDraws during a candidate without returning the earlier values', () => {
    const r = failed(
      { ...definition([integer('a'), integer('b')]), maxDraws: 1 },
      'limit',
      '/definitions/1',
    );
    expect(r.replay).toMatchObject({ attempts: 1, draws: 1 });
    expect(
      run({ ...definition([integer('a'), integer('b')]), maxDraws: 1 }),
    ).toEqual(r);
  });
});

describe('untrusted tuple and comparison contracts', () => {
  it.each([
    [[], 'empty-domain'],
    [[[3, 4]], 'invalid-definition'],
    [[[3, 4, 5, 6]], 'invalid-definition'],
    [[[3, '4', 5]], 'invalid-definition'],
    [[[3.5, 4, 5]], 'invalid-definition'],
    [[[3, 40, 5]], 'invalid-definition'],
    [
      [
        [3, 4, 5],
        [3, 4, 5],
      ],
      'invalid-definition',
    ],
  ])('rejects malformed choice rows %j', (values, code) => {
    failed(
      definition([{ ...pythagorean(), values } as TupleVariableDefinition]),
      code as string,
    );
  });
  it.each([
    [{ name: 'a', kind: 'computed', source: '2*b' }, 'invalid-definition'],
    [
      { name: 'x1', kind: 'integer', min: 1, max: 2, exclusions: [] },
      'invalid-definition',
    ],
    [
      { name: 'e', kind: 'integer', min: 1, max: 2, exclusions: [] },
      'invalid-definition',
    ],
    [
      { name: 'a', kind: 'choice', values: [1, 2], exclusions: [3] },
      'invalid-definition',
    ],
    [
      { name: 'a', kind: 'choice', values: [1, 2], exclusions: [1, 1] },
      'invalid-definition',
    ],
    [
      { name: 'a', kind: 'choice', values: [1], exclusions: [1] },
      'empty-domain',
    ],
    [
      { name: 'a', kind: 'choice', values: [1], exclusions: {} },
      'invalid-definition',
    ],
    [
      {
        name: 'a',
        kind: 'decimal',
        min: 0,
        max: 0,
        precision: 1,
        exclusions: [0],
      },
      'empty-domain',
    ],
  ])('rejects invalid scalar/component %j', (p, code) => {
    failed(definition([p as ScalarVariableDefinition]), code);
    failed(
      definition([
        {
          kind: 'tuple',
          id: 'bad',
          mode: 'generate',
          components: [p as ScalarVariableDefinition, integer('b')],
        },
      ]),
      code,
    );
  });
  it.each([
    { ...comparison('<'), left: { variable: 'z' } },
    { ...comparison('<'), operator: '===' },
    { ...comparison('<'), operator: {} },
    { ...comparison('<'), left: { variable: 'a', constant: 1 } },
    { ...comparison('<'), right: {} },
    { ...comparison('<'), right: { constant: '3' } },
    { ...comparison('<'), right: { constant: 0.0000001 } },
    { kind: 'expression', latex: 'a^2+b^2=c^2' },
  ])('rejects unsupported/malformed constraint %j', (c) => {
    failed(
      { ...definition([integer('a'), integer('b')]), constraints: [c] },
      c.kind === 'expression' ? 'unsupported-type' : 'invalid-definition',
    );
  });
  it.each([
    [integer('a'), integer('a')],
    [
      integer('a'),
      {
        kind: 'tuple',
        id: 't',
        mode: 'generate',
        components: [integer('a'), integer('b')],
      },
    ],
    [
      {
        kind: 'tuple',
        id: 'a',
        mode: 'generate',
        components: [integer('a'), integer('b')],
      },
    ],
    [
      {
        kind: 'tuple',
        id: 'same',
        mode: 'generate',
        components: [integer('a'), integer('b')],
      },
      {
        kind: 'tuple',
        id: 'same',
        mode: 'generate',
        components: [integer('c'), integer('d')],
      },
    ],
  ])('rejects duplicate or ambiguous names/IDs', (...parameters) => {
    failed(definition(parameters as GenerationDefinition['definitions']));
  });
  it.each([0, 1, 9])('rejects tuple arity %i', (arity) => {
    failed(
      definition([
        {
          kind: 'tuple',
          id: 'bad',
          mode: 'generate',
          components: Array.from({ length: arity }, (_, i) =>
            integer('abcdfghjk'[i]!),
          ),
        },
      ]),
      arity > 8 ? 'limit' : 'invalid-definition',
    );
  });
  it.each([
    { maxAttempts: 0 },
    { maxAttempts: 129 },
    { maxAttempts: 1.5 },
    { maxDraws: 0 },
    { maxDraws: 65537 },
    { maxDraws: '3' },
    {
      constraints: Array.from({ length: 33 }, () => comparison('<=', 'a', 'a')),
    },
  ])('enforces explicit resource budget %j', (overrides) => {
    failed({ ...definition([integer('a')]), ...overrides }, 'limit');
  });
  it('bounds total bindings, declarations, row size, JSON nodes and depth', () => {
    const names = 'abcdfghjklmnopqrstu'.split('');
    failed(definition(names.map((n) => integer(n))), 'limit');
    failed(
      definition(
        [0, 1, 2].map((i) => ({
          kind: 'tuple',
          id: `t${i}`,
          mode: 'generate',
          components: names.slice(i * 6, i * 6 + 6).map((n) => integer(n)),
        })),
      ),
      'limit',
    );
    failed(
      definition([
        {
          ...pythagorean(),
          values: Array.from({ length: 129 }, () => [3, 4, 5]),
        },
      ]),
      'limit',
    );
    const large = definition(
      Array.from({ length: 16 }, (_, i) => ({
        ...pythagorean(),
        id: String(i),
        values: Array.from({ length: 128 }, () => Array(8).fill(1) as number[]),
      })),
    );
    failed(large, 'limit');
    let deep: unknown = 1;
    for (let i = 0; i < 18; i += 1) deep = { nested: deep };
    failed(deep, 'limit');
  });
  it('copies frozen definitions and rejects getters, code, cycles and non-JSON numbers without execution', () => {
    const d = definition([pythagorean()]);
    const freeze = (v: unknown): void => {
      if (v && typeof v === 'object') {
        Object.values(v).forEach(freeze);
        Object.freeze(v);
      }
    };
    freeze(d);
    const r = success(d);
    r.values.a = { kind: 'integer', value: 999 };
    r.groups[0]!.components[0] = 'z';
    expect(success(d).groups[0]!.components[0]).toBe('a');
    const getter = vi.fn(() => d);
    const hostile = Object.defineProperty({}, 'definitions', {
      enumerable: true,
      get: getter,
    });
    failed(hostile);
    expect(getter).not.toHaveBeenCalled();
    for (const bad of [NaN, Infinity, 1n, () => 3, new Date(), Array(2)])
      failed({ ...d, definitions: [bad] });
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    failed(cyclic);
    failed({
      ...d,
      constraints: [
        { ...comparison('<'), right: { constant: 'globalThis.pwned=true' } },
      ],
    });
    failed(JSON.parse('{"__proto__": {"pwned":true}}'));
  });
  it('rejects many simultaneous errors without invoking row operations on invalid components', () => {
    const d = definition(
      Array.from({ length: 16 }, (_, i) => ({
        kind: 'tuple',
        id: String(i),
        mode: 'choice',
        components: [
          {
            name: 'a',
            kind: 'choice',
            values: Array.from({ length: 128 }, () => 0.0000001),
            exclusions: {},
          },
          integer('b'),
        ],
        values: [[1, 1]],
      })) as unknown as GenerationDefinition['definitions'],
    );
    const r = failed(d);
    expect(r.diagnostics.length).toBeLessThanOrEqual(128);
  });
  it('accepts only the canonical object contract and rejects legacy arrays', () => {
    const d = definition([integer('a')]);
    expect(generateVariables(d, { seed: 42 }).ok).toBe(true);
    expect(run([integer('a')]).ok).toBe(false);
    expect(generateVariables([integer('a')], { seed: 42 }).ok).toBe(false);
    failed({ ...d, schemaVersion: 99 }, 'unsupported-version');
  });
});

describe('minimal composition integration', () => {
  const exercise = (): ExerciseDefinition => ({
    schemaVersion: 5,
    kind: 'composed',
    id: 'triangle',
    revision: '1',
    title: 'Triangle @a, @b, @c',
    generation: definition([pythagorean()]),
    variables: [],
    elements: [
      { id: 'sides', type: 'text', text: 'Côtés @a, @b, @c.' },
      { id: 'formula', type: 'expression', latex: 'a^2+b^2' },
      {
        id: 'area',
        type: 'question',
        text: 'Calculer ab/2.',
        points: 1,
        response: { format: 'latex', kind: 'rational' },
        expectedLatex: '\\frac{ab}{2}',
        policy: { domain: 'rational', form: 'value-only' },
      },
    ],
  });
  it('uses the generated bindings in prose/math/questions and retains private groups', () => {
    const d = exercise();
    const before = JSON.stringify(d);
    const r = instantiateExercise(d, { seed: 42, instanceId: 'server-id' });
    if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
    const g = success(d.generation);
    expect(r.value.generation.values).toEqual(g.values);
    expect(r.value.generation.groups).toEqual(g.groups);
    expect(r.value.generation).toMatchObject({
      attempts: 1,
      version: 'mulberry32-rejection-v1',
    });
    const a = rational(g.values.a!)[0],
      b = rational(g.values.b!)[0];
    const q = r.value.elements.find((e) => e.id === 'area');
    if (q?.type !== 'question' || q.expected.kind !== 'rational')
      throw new Error('Missing expected.');
    expect(BigInt(q.expected.value.numerator) * 2n).toBe(
      a * b * BigInt(q.expected.value.denominator),
    );
    const pub = projectPublicInstance(r.value);
    expect(pub.schemaVersion).toBe(5);
    expect(JSON.stringify(pub)).not.toMatch(
      /generation|groups|expected|policy|seed|syntax|definition/,
    );
    expect(JSON.stringify(d)).toBe(before);
    expect(
      instantiateExercise(JSON.parse(before), {
        seed: '42',
        instanceId: 'server-id',
      }),
    ).toEqual(r);
  });
  it('rejects free variable collisions and old/new schema confusion', () => {
    expect(
      validateDefinition({
        ...exercise(),
        variables: [{ name: 'a', domain: 'real' }],
      }).ok,
    ).toBe(false);
    expect(validateDefinition({ ...exercise(), schemaVersion: 2 }).ok).toBe(
      false,
    );
    expect(validateDefinition({ ...exercise(), parameters: [] }).ok).toBe(
      false,
    );
    expect(
      instantiateExercise(exercise(), {
        seed: 42,
        instanceId: 'id',
        generationVersion: 'parameters-v1',
      } as unknown as Parameters<typeof instantiateExercise>[1]).ok,
    ).toBe(false);
    expect(
      instantiateExercise(exercise(), {
        seed: 42,
        instanceId: 'id',
        instantiationVersion: 'composed-instance-v2',
      } as unknown as Parameters<typeof instantiateExercise>[1]).ok,
    ).toBe(false);
  });
  it('keeps a free x symbol and consumes exact decimal/choice tuple values in the canonical instance', () => {
    const d = exercise();
    d.generation = definition([
      {
        kind: 'tuple',
        id: 'coefficients',
        mode: 'choice',
        components: [
          {
            name: 'a',
            kind: 'decimal',
            min: -0.3,
            max: 0.3,
            precision: 1,
            exclusions: [],
          },
          { name: 'b', kind: 'choice', values: [0.125] },
        ],
        values: [[-0.2, 0.125]],
      },
    ]);
    d.title = '@a et @b';
    d.variables = [{ name: 'x', domain: 'real' }];
    d.elements = [
      { id: 'formula', type: 'expression', latex: 'ax+b' },
      {
        id: 'sum',
        type: 'question',
        text: '@a + @b',
        points: 1,
        response: { format: 'latex', kind: 'rational' },
        expectedLatex: 'a+b',
        policy: { domain: 'rational', form: 'value-only' },
      },
    ];
    const r = instantiateExercise(d, { seed: 0, instanceId: 'id' });
    if (!r.ok) throw new Error(JSON.stringify(r));
    expect(r.value.title).toBe('-0.2 et 0.125');
    const expression = r.value.elements[0]!;
    if (expression.type !== 'expression') throw new Error('Missing formula.');
    expect(expression.math.source).toBe('ax+b');
    expect(expression.latex).toContain('x');
    const q = r.value.elements[1]!;
    if (q.type !== 'question' || q.expected.kind !== 'rational')
      throw new Error('Missing sum.');
    expect(q.expected.value).toEqual({
      kind: 'rational',
      numerator: -3,
      denominator: 40,
    });
    expect(r.value.generation.values.a).toEqual({
      kind: 'decimal',
      coefficient: -2,
      precision: 1,
    });
  });
  it('does not build partial elements when constrained generation exhausts', () => {
    const d = exercise();
    d.generation = {
      ...definition(
        [integer('a', 1, 3), integer('b', 1, 3)],
        [comparison('>'), comparison('>', 'b', 'a')],
      ),
      maxAttempts: 2,
    };
    const r = instantiateExercise(d, { seed: 42, instanceId: 'id' });
    expect(r).toMatchObject({
      ok: false,
      diagnostics: [{ stage: 'generation', code: 'attempts-exhausted' }],
    });
    expect(r).not.toHaveProperty('value');
  });
});
