import { describe, expect, it, vi } from 'vitest';
import {
  generateVariables,
  parseMathInput,
  validateDefinition,
} from 'novlearn-exercise-engine';
import type {
  GenerateVariablesOptions,
  GenerationParameterV1,
  IntegerParameterV1,
} from 'novlearn-exercise-engine';
import { sampleIndex, wordStream } from '../src/generation/random.js';
import fixture from './fixtures/contracts/rational-minimum.definition.json' with { type: 'json' };
import packageJson from '../package.json' with { type: 'json' };

const integer = (
  overrides: Partial<IntegerParameterV1> = {},
): IntegerParameterV1 => ({
  name: 'a',
  kind: 'integer',
  min: -3,
  max: 3,
  exclusions: [],
  ...overrides,
});
const mixed: GenerationParameterV1[] = [
  integer({ min: 1, max: 3 }),
  integer({ name: 'b', min: -6, max: 6, exclusions: [0] }),
  integer({ name: 'c', min: -5, max: 5 }),
  {
    name: 'd',
    kind: 'decimal',
    min: -0.3,
    max: 0.3,
    precision: 1,
    exclusions: [0],
  },
  { name: 'f', kind: 'choice', values: [-2, 0.125, 7] },
];

function failed(definitions: unknown, code: string): void {
  const result = generateVariables(definitions, { seed: 42 });
  expect(result.ok).toBe(false);
  expect(result).not.toHaveProperty('values');
  if (!result.ok)
    expect(result.diagnostics.some((d) => d.code === code)).toBe(true);
}

describe('generation replay and word mapping', () => {
  it.each([
    [
      0,
      [1144304738, 1416247, 958946056, 627933444, 2007157716],
      [3, 2, -3, -3, -2],
    ],
    [
      1,
      [2693262067, 11749833, 2265367787, 4213581821, 4159151403],
      [2, 4, -4, 3, -2],
    ],
    [
      42,
      [2581720956, 1925393290, 3661312704, 2876485805, 750819978],
      [1, 5, 0, 3, -2],
    ],
    [
      4294967295,
      [3850105811, 813802916, 3073704848, 4054706436, 3630262831],
      [3, 3, 0, -3, 0.125],
    ],
  ] as const)(
    'pins seed %s words and complete output',
    (seed, words, values) => {
      expect(Array.from({ length: 5 }, wordStream(seed))).toEqual(words);
      const [a, b, c, d, f] = values;
      const result = generateVariables(mixed, { seed });
      expect(result).toEqual({
        ok: true,
        values: {
          a: { kind: 'integer', value: a },
          b: { kind: 'integer', value: b },
          c: { kind: 'integer', value: c },
          d: { kind: 'decimal', coefficient: d, precision: 1 },
          f: { kind: 'choice', value: f },
        },
        replay: {
          engineVersion: packageJson.version,
          generationVersion: 'parameters-v1',
          seed: String(seed),
          draws: 5,
        },
      });
      expect(
        generateVariables(JSON.parse(JSON.stringify(mixed)), {
          seed: String(seed),
          generationVersion: 'parameters-v1',
        }),
      ).toEqual(result);
      expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    },
  );

  it('does not use Math.random or the clock, mutate input or share state', () => {
    const original = JSON.stringify(mixed);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('global random');
    });
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('clock');
    });
    try {
      const first = generateVariables(mixed, { seed: 42 });
      generateVariables(mixed, { seed: 1 });
      expect(generateVariables(mixed, { seed: 42 })).toEqual(first);
      expect(random).not.toHaveBeenCalled();
      expect(clock).not.toHaveBeenCalled();
      if (first.ok) first.values.a = { kind: 'integer', value: 999 };
      expect(generateVariables(mixed, { seed: 42 })).not.toEqual(first);
      expect(JSON.stringify(mixed)).toBe(original);
    } finally {
      random.mockRestore();
      clock.mockRestore();
    }
  });

  it('pins array order, ignores object/exclusion order and skips singleton draws', () => {
    const p = integer({ exclusions: [-2, 0, 2] });
    const reorderedKeys = {
      exclusions: [2, -2, 0],
      max: 3,
      name: 'a',
      min: -3,
      kind: 'integer',
    };
    expect(generateVariables([p], { seed: 0 })).toEqual(
      generateVariables([reorderedKeys], { seed: 0 }),
    );
    const fixed = integer({ name: 'b', min: 10, max: 10 });
    const result = generateVariables([fixed, p], { seed: 0 });
    expect(result.ok && result.replay.draws).toBe(1);
    const alone = generateVariables([p], { seed: 0 });
    expect(result.ok && result.values.a).toEqual(alone.ok && alone.values.a);
    const swapped = generateVariables([mixed[1], mixed[0]], { seed: 42 });
    expect(swapped.ok && swapped.values.a).not.toEqual({
      kind: 'integer',
      value: 1,
    });
  });

  it('rejects the incomplete modulo bucket and bounds rejection attempts', () => {
    const next = vi
      .fn()
      .mockReturnValueOnce(0xffff_ffff)
      .mockReturnValueOnce(8);
    expect(sampleIndex(3, next)).toBe(2);
    expect(next).toHaveBeenCalledTimes(2);
    const stuck = vi.fn(() => 0xffff_ffff);
    expect(sampleIndex(3, stuck)).toBeUndefined();
    expect(stuck).toHaveBeenCalledTimes(128);
    expect(sampleIndex(1, stuck)).toBe(0);
    expect(stuck).toHaveBeenCalledTimes(128);
  });

  it('has no manifest range bias on a fixed-seed smoke corpus', () => {
    const counts = Array<number>(10).fill(0);
    for (let seed = 0; seed < 10_000; seed += 1) {
      const rank = sampleIndex(10, wordStream(seed));
      if (rank === undefined) throw new Error('unexpected exhaustion');
      counts[rank] = (counts[rank] ?? 0) + 1;
    }
    for (const count of counts) {
      expect(count).toBeGreaterThan(800);
      expect(count).toBeLessThan(1200);
    }
  });

  it.each([
    -1,
    -0,
    1.5,
    4294967296,
    NaN,
    Infinity,
    '',
    '01',
    '-0',
    ' 1',
    '1e2',
    '1\n',
    '1\r\n',
    '4294967296',
    {},
    null,
  ])('rejects seed %j without coercion', (seed) => {
    // Deliberately crossing the runtime boundary with invalid client data.
    const result = generateVariables([], { seed } as GenerateVariablesOptions);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostics[0]?.code).toBe('invalid-options');
  });

  it('rejects unknown versions and option fields, and accepts an empty parameter list', () => {
    const result = generateVariables([], {
      seed: 0,
      generationVersion: 'future',
    } as unknown as GenerateVariablesOptions);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.diagnostics[0]?.code).toBe('unsupported-version');
    expect(
      generateVariables([], {
        seed: 0,
        maxAttempts: 1,
      } as GenerateVariablesOptions).ok,
    ).toBe(false);
    expect(generateVariables([], { seed: 0 })).toEqual({
      ok: true,
      values: {},
      replay: {
        engineVersion: '0.0.0',
        generationVersion: 'parameters-v1',
        seed: '0',
        draws: 0,
      },
    });
  });
});

describe('integer domains', () => {
  it('respects every small domain and exclusion complement over many seeds', () => {
    for (let min = -3; min <= 3; min += 1) {
      for (let max = min; max <= 3; max += 1) {
        const domain = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        for (let mask = 0; mask < 2 ** domain.length; mask += 1) {
          const exclusions = domain.filter((_, i) => (mask & (1 << i)) !== 0);
          const allowed = domain.filter((n) => !exclusions.includes(n));
          const seen = new Set<number>();
          for (let seed = 0; seed < 32; seed += 1) {
            const result = generateVariables(
              [integer({ min, max, exclusions })],
              { seed },
            );
            if (allowed.length === 0) {
              expect(result.ok).toBe(false);
              continue;
            }
            if (!result.ok || result.values.a?.kind !== 'integer')
              throw new Error('valid domain rejected');
            expect(allowed).toContain(result.values.a.value);
            expect(Number.isInteger(result.values.a.value)).toBe(true);
            seen.add(result.values.a.value);
          }
          expect([...seen].sort((a, b) => a - b)).toEqual(allowed);
        }
      }
    }
  });

  it.each([
    [{ min: 0.5 }, 'invalid-bounds'],
    [{ max: Infinity }, 'invalid-definition'],
    [{ min: -1_000_001 }, 'invalid-bounds'],
    [{ min: 4, max: 3 }, 'empty-domain'],
    [{ min: 0, max: 0, exclusions: [0] }, 'empty-domain'],
    [{ exclusions: [4] }, 'invalid-definition'],
    [{ exclusions: [0, 0] }, 'invalid-definition'],
    [{ exclusions: [0.1] }, 'invalid-definition'],
  ])('diagnoses invalid integer domain %j', (overrides, code) =>
    failed([integer(overrides)], code),
  );

  it('supports maximum range and an exclusion-reduced singleton', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const result = generateVariables(
        [integer({ min: -1_000_000, max: 1_000_000 })],
        { seed },
      );
      if (!result.ok || result.values.a?.kind !== 'integer')
        throw new Error('large range rejected');
      expect(result.values.a.value).toBeGreaterThanOrEqual(-1_000_000);
      expect(result.values.a.value).toBeLessThanOrEqual(1_000_000);
    }
    expect(
      generateVariables([integer({ min: -1, max: 1, exclusions: [-1, 1] })], {
        seed: 0,
      }),
    ).toMatchObject({
      ok: true,
      values: { a: { kind: 'integer', value: 0 } },
      replay: { draws: 0 },
    });
  });
});

describe('decimal grids and finite choices', () => {
  it('preserves exact coefficient/precision within bounds including off-grid bounds', () => {
    for (let precision = 0; precision <= 6; precision += 1) {
      const scale = 10 ** precision;
      for (let seed = 0; seed < 256; seed += 1) {
        const result = generateVariables(
          [
            {
              name: 'a',
              kind: 'decimal',
              min: -2 / scale,
              max: 3 / scale,
              precision,
              exclusions: [1 / scale],
            },
          ],
          { seed },
        );
        if (!result.ok || result.values.a?.kind !== 'decimal')
          throw new Error('valid decimal rejected');
        expect([-2, -1, 0, 2, 3]).toContain(result.values.a.coefficient);
        expect(Number.isSafeInteger(result.values.a.coefficient)).toBe(true);
      }
    }
    for (const [min, max, coefficient] of [
      [0.071, 0.099, 8],
      [-0.099, -0.071, -8],
    ] as const) {
      const result = generateVariables(
        [
          {
            name: 'a',
            kind: 'decimal',
            min,
            max,
            precision: 2,
            exclusions: [min > 0 ? 0.09 : -0.09],
          },
        ],
        { seed: 0 },
      );
      expect(result).toMatchObject({
        ok: true,
        values: { a: { kind: 'decimal', coefficient, precision: 2 } },
        replay: { draws: 0 },
      });
    }
    expect(
      generateVariables(
        [
          {
            name: 'a',
            kind: 'decimal',
            min: 0.29,
            max: 0.29,
            precision: 2,
            exclusions: [],
          },
        ],
        { seed: 0 },
      ),
    ).toMatchObject({
      ok: true,
      values: { a: { coefficient: 29, precision: 2 } },
    });
    expect(
      generateVariables(
        [
          {
            name: 'a',
            kind: 'decimal',
            min: -1e-20,
            max: 1e-20,
            precision: 6,
            exclusions: [],
          },
        ],
        { seed: 0 },
      ),
    ).toMatchObject({
      ok: true,
      values: { a: { coefficient: 0, precision: 6 } },
    });
  });

  it.each([
    [{ precision: 7 }, 'invalid-definition'],
    [{ precision: -1 }, 'invalid-definition'],
    [{ precision: 1.5 }, 'invalid-definition'],
    [{ min: '0' }, 'invalid-bounds'],
    [{ min: -1_000_001 }, 'invalid-bounds'],
    [{ min: 0.001, max: 0.009 }, 'empty-domain'],
    [{ min: 0, max: 0, exclusions: [0] }, 'empty-domain'],
    [{ min: 1, max: 0 }, 'empty-domain'],
    [{ min: 0, max: 2000, precision: 6 }, 'limit'],
    [{ exclusions: [0.001] }, 'invalid-definition'],
    [{ exclusions: [2] }, 'invalid-definition'],
    [{ exclusions: [0, 0] }, 'invalid-definition'],
    [{ exclusions: ['0'] }, 'invalid-definition'],
  ])('diagnoses invalid decimal domain %j', (overrides, code) =>
    failed(
      [
        {
          name: 'a',
          kind: 'decimal',
          min: -1,
          max: 1,
          precision: 2,
          exclusions: [],
          ...overrides,
        },
      ],
      code,
    ),
  );

  it('never snaps binary arithmetic artifacts onto the grid', () => {
    failed(
      [
        {
          name: 'a',
          kind: 'decimal',
          min: 0.1 + 0.2,
          max: 0.3,
          precision: 1,
          exclusions: [],
        },
      ],
      'empty-domain',
    );
    failed(
      [
        {
          name: 'a',
          kind: 'decimal',
          min: 0,
          max: 1,
          precision: 1,
          exclusions: [0.1 + 0.2],
        },
      ],
      'invalid-definition',
    );
  });

  it('returns only declared choices and preserves finite numeric values', () => {
    const values = [
      -Number.MAX_VALUE,
      -0.125,
      0,
      Number.MIN_VALUE,
      Number.MAX_VALUE,
    ];
    const seen = new Set<number>();
    for (let seed = 0; seed < 256; seed += 1) {
      const result = generateVariables(
        [{ name: 'a', kind: 'choice', values }],
        { seed },
      );
      if (!result.ok || result.values.a?.kind !== 'choice')
        throw new Error('choice rejected');
      expect(values).toContain(result.values.a.value);
      seen.add(result.values.a.value);
    }
    expect(seen.size).toBe(values.length);
    expect(
      generateVariables([{ name: 'a', kind: 'choice', values: [-0] }], {
        seed: 0,
      }),
    ).toMatchObject({
      ok: true,
      values: { a: { kind: 'choice', value: 0 } },
      replay: { draws: 0 },
    });
  });

  it.each(
    [[], [1, 1], [0, -0], ['1'], [Infinity], [NaN], [true], [null]].map(
      (values) => ({ values }),
    ),
  )('rejects invalid choices %j', ({ values }) =>
    failed(
      [{ name: 'a', kind: 'choice', values }],
      values.length === 0 ? 'empty-domain' : 'invalid-definition',
    ),
  );
});

describe('contracts and Lot 3 integration', () => {
  it('generates native trinomial parameters, keeps x free and parses the expected source unchanged', () => {
    const checked = validateDefinition(fixture);
    if (!checked.ok) throw new Error('fixture invalid');
    const before = JSON.stringify(checked.value);
    const result = generateVariables(checked.value.parameters, { seed: 42 });
    expect(result).toMatchObject({
      ok: true,
      values: {
        a: { kind: 'integer', value: 1 },
        b: { kind: 'integer', value: 5 },
        c: { kind: 'integer', value: 0 },
      },
    });
    expect(result).not.toHaveProperty('values.x');
    const parsed = parseMathInput(checked.value.question.expectedLatex, {
      parameters: checked.value.parameters.map((p) => p.name),
      variables: checked.value.variables.map((v) => v.name),
    });
    expect(parsed).toMatchObject({
      ok: true,
      source: checked.value.question.expectedLatex,
      symbols: { variables: [] },
    });
    for (let seed = 0; seed < 512; seed += 1) {
      const sample = generateVariables(checked.value.parameters, { seed });
      if (
        !sample.ok ||
        sample.values.a?.kind !== 'integer' ||
        sample.values.b?.kind !== 'integer'
      )
        throw new Error('fixture generation failed');
      expect(sample.values.a.value).toBeGreaterThan(0);
      expect(sample.values.b.value).not.toBe(0);
    }
    expect(JSON.stringify(checked.value)).toBe(before);
  });
  it.each(['computed', 'tuple', 'triplet', 'perfect_square'])(
    'explicitly rejects deferred type %s',
    (kind) =>
      failed(
        [{ name: 'a', kind, expression: 'process.exit()' }],
        'unsupported-type',
      ),
  );
  it('rejects unmodelled constraints and symbol collisions', () => {
    failed([{ ...integer(), constraint: 'a>0' }], 'invalid-definition');
    failed([integer(), integer()], 'invalid-definition');
    for (const name of ['e', 'i', 'xSommet', '__proto__', 'a\n'])
      failed([integer({ name })], 'invalid-definition');
    expect(parseMathInput('a', { parameters: ['a\n'] }).ok).toBe(false);
    expect(
      validateDefinition({ ...fixture, parameters: [integer({ name: 'a\n' })] })
        .ok,
    ).toBe(false);
  });
  it('bounds collections and refuses JSON violations without invoking getters', () => {
    failed(Array(17).fill(integer()), 'limit');
    failed([{ ...integer(), exclusions: Array(129).fill(0) }], 'limit');
    failed(
      [{ name: 'a', kind: 'choice', values: Array(129).fill(0) }],
      'limit',
    );
    const getter = vi.fn(() => 0);
    failed(
      [
        Object.defineProperty(integer(), 'min', {
          get: getter,
          enumerable: true,
        }),
      ],
      'invalid-definition',
    );
    expect(getter).not.toHaveBeenCalled();
    const cycle: unknown[] = [];
    cycle.push(cycle);
    failed(cycle, 'invalid-definition');
    failed([new Date()], 'invalid-definition');
    failed([() => 1], 'invalid-definition');
    failed(
      new Proxy(
        {},
        {
          ownKeys() {
            throw new Error('hostile object');
          },
        },
      ),
      'invalid-definition',
    );
    failed(
      JSON.parse('[{"name":"a","kind":"choice","values":[1],"__proto__":{}}]'),
      'invalid-definition',
    );
  });
});
