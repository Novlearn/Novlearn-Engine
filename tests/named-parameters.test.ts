import { describe, expect, it } from 'vitest';
import {
  generateVariables,
  instantiateExercise,
  parseMathInput,
  projectPublicInstance,
  validateDefinition,
} from 'novlearn-exercise-engine';
import type {
  ExerciseDefinition,
  GenerationDefinition,
  GeneratedValue,
  IntegerVariableDefinition,
} from 'novlearn-exercise-engine';

const integer = (
  name: string,
  min = 1,
  max = min,
): IntegerVariableDefinition => ({
  name,
  kind: 'integer',
  min,
  max,
  exclusions: [],
});
const generation = (
  definitions: GenerationDefinition['definitions'],
  constraints: GenerationDefinition['constraints'] = [],
): GenerationDefinition => ({
  schemaVersion: 5,
  definitions,
  constraints,
  maxAttempts: 128,
  maxDraws: 4096,
});
const reference = (name: string) => `\\mathrm{${name}}`;
function run(definition: GenerationDefinition, seed = 42) {
  const result = generateVariables(definition, { seed });
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result;
}
function whole(value: GeneratedValue | undefined): bigint {
  if (!value) throw new Error('Missing value');
  if (value.kind === 'rational') {
    expect(value.denominator).toBe(1);
    return BigInt(value.numerator);
  }
  if (value.kind !== 'integer') throw new Error('Expected integer');
  return BigInt(value.value);
}

describe('explicit named references through the CortexJS parser', () => {
  it.each([
    'delta',
    'r1',
    'xSommet',
    'u0',
    'kg',
    'length',
    'a',
    'a'.repeat(32),
    'r1234567890123456789012345678901',
  ])(
    'retains the declared symbol %s without interpreting digits or units',
    (name) => {
      const source = reference(name);
      expect(parseMathInput(source, { parameters: [name] })).toMatchObject({
        ok: true,
        source,
        syntax: name,
        symbols: { parameters: [name], variables: [] },
      });
      expect(
        run(
          generation([
            integer(name, 3),
            { name: 'result', kind: 'computed', latex: `${source}+1` },
          ]),
        ).values.result,
      ).toEqual({ kind: 'rational', numerator: 4, denominator: 1 });
    },
  );
  it('keeps plain juxtaposition distinct from a descriptive identifier', () => {
    expect(
      parseMathInput('ab', { parameters: ['a', 'b', 'ab'] }),
    ).toMatchObject({
      ok: true,
      syntax: ['InvisibleOperator', 'a', 'b'],
      symbols: { parameters: ['a', 'b'] },
    });
    expect(
      parseMathInput(reference('ab'), { parameters: ['a', 'b', 'ab'] }),
    ).toMatchObject({
      ok: true,
      syntax: 'ab',
      symbols: { parameters: ['ab'] },
    });
    expect(parseMathInput('r1', { parameters: ['r1'] }).ok).toBe(false);
    expect(parseMathInput('delta', { parameters: ['delta'] }).ok).toBe(false);
  });
  it('does not reinterpret a library unit without the explicit declaration', () => {
    expect(parseMathInput(reference('kg')).ok).toBe(false);
    expect(parseMathInput(reference('kg'), { parameters: ['kg'] }).ok).toBe(
      true,
    );
    expect(parseMathInput(reference('kg')).ok).toBe(false);
  });
  it.each([
    '\\mathrm{r 123456789012345678901}',
    '\\mathrm{r123456789012345678901 }',
    '\\mathrm{r1 23456789012345678901}',
    '\\mathrm { r123456789012345678901}',
    '\\mathrm{r\\ 123456789012345678901}',
    '\\mathrm{r\t123456789012345678901}',
    '\\mathrm{r\n123456789012345678901}',
  ])(
    'keeps identifier digits distinct from numbers with admitted spacing: %j',
    (source) => {
      const name = 'r123456789012345678901';
      expect(parseMathInput(source, { parameters: [name] })).toMatchObject({
        ok: true,
        source,
        syntax: name,
      });
      const result = run(
        generation([
          integer(name, 2),
          { name: 'result', kind: 'computed', latex: `${source}+1` },
        ]),
      );
      expect(result.values.result).toEqual({
        kind: 'rational',
        numerator: 3,
        denominator: 1,
      });
    },
  );
  it.each(['1 23', '\\mathrm{r1}+10000000000', '\\mathrm{r1}+1.1234567'])(
    'still enforces numeric admission outside named references: %s',
    (source) => {
      expect(
        generateVariables(
          generation([
            integer('r1', 2),
            { name: 'result', kind: 'computed', latex: source },
          ]),
          { seed: 42 },
        ).ok,
      ).toBe(false);
    },
  );
  it.each(['toString', 'valueOf', 'hasOwnProperty'])(
    'does not mistake inherited object properties for calculated bounds: %s',
    (name) => {
      const result = run(
        generation(
          [{ name, kind: 'computed', latex: '2' }],
          [
            {
              kind: 'comparison',
              left: { variable: name },
              operator: '==',
              right: { constant: 2 },
            },
          ],
        ),
      );
      expect(result.values[name]).toEqual({
        kind: 'rational',
        numerator: 2,
        denominator: 1,
      });
    },
  );
  it.each([
    'e',
    'i',
    'sin',
    'Pi',
    'constructor',
    'infinity',
    'iNfInItY',
    'prototype',
    '__proto__',
    'r_1',
    '1root',
    'x-y',
    'a\n',
    'a\r\n',
    'a'.repeat(33),
  ])('rejects invalid or reserved names %j before drawing', (name) => {
    expect(parseMathInput('1', { parameters: [name] })).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'invalid-context' }],
    });
    expect(
      generateVariables(generation([integer(name, 1, 2)]), { seed: 42 }),
    ).toMatchObject({
      ok: false,
      replay: { attempts: 0, draws: 0 },
    });
  });
  it('classifies free variables and parameters separately and reports unknown names', () => {
    expect(
      parseMathInput(`${reference('delta')}+${reference('position')}`, {
        parameters: ['delta'],
        variables: ['position'],
      }),
    ).toMatchObject({
      ok: true,
      symbols: { parameters: ['delta'], variables: ['position'] },
    });
    expect(
      parseMathInput(reference('unknown'), { parameters: ['delta'] }),
    ).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'unknown-symbol', symbol: 'unknown' }],
    });
    expect(
      parseMathInput('1', { parameters: ['delta'], variables: ['delta'] }).ok,
    ).toBe(false);
  });
  it('detects named dependency cycles and unknown references before RNG', () => {
    for (const definitions of [
      [{ name: 'delta', kind: 'computed' as const, latex: reference('delta') }],
      [
        { name: 'r1', kind: 'computed' as const, latex: reference('r2') },
        { name: 'r2', kind: 'computed' as const, latex: reference('r1') },
      ],
    ])
      expect(
        generateVariables(generation(definitions), { seed: 42 }),
      ).toMatchObject({
        ok: false,
        diagnostics: expect.arrayContaining([
          expect.objectContaining({ code: 'dependency-cycle' }),
        ]),
        replay: { attempts: 0, draws: 0 },
      });
    expect(
      generateVariables(
        generation([
          integer('r1'),
          { name: 'delta', kind: 'computed', latex: reference('r2') },
        ]),
        { seed: 42 },
      ),
    ).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'invalid-expression' }],
      replay: { attempts: 0, draws: 0 },
    });
  });
  it('links descriptive tuple components, calculated restrictions and exact predicates', () => {
    const definition = generation(
      [
        {
          name: 'product',
          kind: 'computed',
          latex: `${reference('r1')}${reference('r2')}`,
          restrictions: { domain: 'integer', min: 12, max: 12 },
        },
        {
          id: 'roots',
          kind: 'tuple',
          mode: 'choice',
          components: [integer('r1', 1, 6), integer('r2', 1, 6)],
          values: [
            [1, 2],
            [3, 4],
            [5, 6],
          ],
        },
      ],
      [
        {
          kind: 'comparison',
          left: { variable: 'product' },
          operator: '==',
          right: { latex: `${reference('r1')}+8` },
        },
      ],
    );
    definition.maxAttempts = 4;
    // The first condition admits product=12, but the second is false: atomic failure.
    expect(generateVariables(definition, { seed: 42 })).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'attempts-exhausted' }],
    });
    definition.constraints = [];
    const result = run(definition);
    expect(result.values).toEqual({
      r1: { kind: 'integer', value: 3 },
      r2: { kind: 'integer', value: 4 },
      product: { kind: 'rational', numerator: 12, denominator: 1 },
    });
    expect(result.groups).toEqual([{ id: 'roots', components: ['r1', 'r2'] }]);
    expect(result.computed).toEqual([
      { name: 'product', dependencies: ['r1', 'r2'] },
    ]);
  });
});

describe('required recipes with independent integer oracles', () => {
  it('constructs integer roots, square discriminants, binomial squares and chains', () => {
    const definition = generation(
      [
        { name: 'delta', kind: 'computed', latex: 'b^2-4ac' },
        { name: 'square', kind: 'computed', latex: `${reference('r1')}^2` },
        {
          name: 'b',
          kind: 'computed',
          latex: `-a(${reference('r1')}+${reference('r2')})`,
        },
        integer('a', 1, 3),
        integer('r1', -3, 3),
        integer('r2', -3, 3),
        {
          name: 'c',
          kind: 'computed',
          latex: `a${reference('r1')}${reference('r2')}`,
        },
        { name: 'binomialA', kind: 'computed', latex: 'a^2' },
        { name: 'binomialB', kind: 'computed', latex: `2a${reference('r1')}` },
        { name: 'next', kind: 'computed', latex: `${reference('square')}+1` },
      ],
      [
        {
          kind: 'comparison',
          left: { variable: 'delta' },
          operator: '>=',
          right: { constant: 0 },
        },
      ],
    );
    for (let seed = 0; seed < 8; seed++) {
      const values = run(definition, seed).values;
      const a = whole(values.a),
        r1 = whole(values.r1),
        r2 = whole(values.r2);
      expect(whole(values.b)).toBe(-a * (r1 + r2));
      expect(whole(values.c)).toBe(a * r1 * r2);
      expect(whole(values.delta)).toBe(a * a * (r1 - r2) ** 2n);
      expect(whole(values.square)).toBe(r1 * r1);
      expect(whole(values.next)).toBe(r1 * r1 + 1n);
      for (const x of [-2n, 0n, 3n]) {
        expect(a * x * x + whole(values.b) * x + whole(values.c)).toBe(
          a * (x - r1) * (x - r2),
        );
        expect(
          whole(values.binomialA) * x * x +
            whole(values.binomialB) * x +
            whole(values.square),
        ).toBe((a * x + r1) ** 2n);
      }
    }
  }, 30000);
  it('constructs pythagorean triples from arbitrary admissible m>n', () => {
    const definition = generation(
      [
        integer('m', 2, 5),
        integer('n', 1, 4),
        { name: 'sideA', kind: 'computed', latex: 'm^2-n^2' },
        { name: 'sideB', kind: 'computed', latex: '2mn' },
        { name: 'sideC', kind: 'computed', latex: 'm^2+n^2' },
      ],
      [
        {
          kind: 'comparison',
          left: { variable: 'm' },
          operator: '>',
          right: { variable: 'n' },
        },
      ],
    );
    for (let seed = 0; seed < 8; seed++) {
      const values = run(definition, seed).values;
      const a = whole(values.sideA),
        b = whole(values.sideB),
        c = whole(values.sideC);
      expect(a).toBeGreaterThan(0n);
      expect(b).toBeGreaterThan(0n);
      expect(a * a + b * b).toBe(c * c);
    }
  }, 30000);
});

describe('named parameters across a complete private/public snapshot', () => {
  const exercise = (): ExerciseDefinition => ({
    schemaVersion: 5,
    kind: 'composed',
    id: 'named-roots',
    revision: '1',
    title: 'Racine @r1',
    generation: generation([
      integer('r1', 3),
      integer('r2', 5),
      {
        name: 'xSommet',
        kind: 'computed',
        latex: `(${reference('r1')}+${reference('r2')})/2`,
      },
    ]),
    variables: [{ name: 'position', domain: 'real' }],
    elements: [
      { id: 'section', type: 'section', text: 'Sommet @xSommet' },
      {
        id: 'expression',
        type: 'expression',
        sectionId: 'section',
        label: '@r1 et @r2',
        latex: `(${reference('position')}-${reference('r1')})(${reference('position')}-${reference('r2')})`,
      },
      {
        id: 'vertex',
        type: 'question',
        sectionId: 'section',
        text: 'Calculer @xSommet',
        points: 1,
        response: { format: 'latex', kind: 'rational' },
        expectedLatex: reference('xSommet'),
        policy: { domain: 'rational', form: 'value-only' },
      },
      {
        id: 'roots',
        type: 'mcq',
        points: 1,
        text: '@@r1 est @r1',
        mode: 'single',
        options: [
          { id: 'first', content: { format: 'latex', latex: reference('r1') } },
          {
            id: 'second',
            content: { format: 'latex', latex: reference('r2') },
          },
        ],
        expectedOptionIds: ['first'],
      },
    ],
  });
  it('preserves sources, exact answers, free names, templates, IDs and deterministic replay', () => {
    const definition = exercise(),
      before = JSON.stringify(definition);
    const result = instantiateExercise(definition, {
      seed: 42,
      instanceId: 'opaque',
    });
    if (!result.ok) throw new Error(JSON.stringify(result));
    expect(result.value.title).toBe('Racine 3');
    expect(result.value.elements[1]).toMatchObject({
      math: {
        source:
          definition.elements[1]!.type === 'expression'
            ? definition.elements[1]!.latex
            : '',
      },
    });
    expect(result.value.elements[2]).toMatchObject({
      expected: { kind: 'rational', value: { numerator: 4, denominator: 1 } },
    });
    expect(result.value.elements[3]).toMatchObject({ text: '@r1 est 3' });
    expect(
      instantiateExercise(JSON.parse(before), {
        seed: '42',
        instanceId: 'opaque',
      }),
    ).toEqual(result);
    expect(JSON.stringify(definition)).toBe(before);
    const publicInstance = projectPublicInstance(result.value);
    for (const key of [
      'expected',
      'policy',
      'generation',
      'syntax',
      'substituted',
      'optionMath',
    ])
      expect(JSON.stringify(publicInstance)).not.toContain(`"${key}"`);
    expect(publicInstance.elements.map((e) => e.id)).toEqual([
      'section',
      'expression',
      'vertex',
      'roots',
    ]);
  });
  it('refuses parameter/free-variable and tuple/group collisions', () => {
    const definition = exercise();
    definition.variables.push({ name: 'r1', domain: 'real' });
    expect(validateDefinition(definition)).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'collision' }],
    });
    const tuple = {
      id: 'r1',
      kind: 'tuple' as const,
      mode: 'generate' as const,
      components: [integer('r1'), integer('r2')],
    };
    expect(generateVariables(generation([tuple]), { seed: 42 }).ok).toBe(false);
  });
  it.each([
    'toString',
    'valueOf',
    'hasOwnProperty',
    'isPrototypeOf',
    'toLocaleString',
    'propertyIsEnumerable',
  ])(
    'preserves a free variable named like an inherited property: %s',
    (name) => {
      const definition = exercise();
      definition.title = 'Variable libre';
      definition.generation = generation([]);
      definition.variables = [{ name, domain: 'real' }];
      definition.elements = [
        { id: 'free', type: 'expression', latex: `${reference(name)}+1` },
      ];
      const result = instantiateExercise(definition, {
        seed: 42,
        instanceId: 'opaque',
      });
      if (!result.ok) throw new Error(JSON.stringify(result));
      expect(result.value.elements[0]).toMatchObject({
        math: { substituted: ['Add', name, 1] },
      });
    },
  );
});
