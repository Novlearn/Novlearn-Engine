import { element } from './elements.js';
import { describe, expect, it } from 'vitest';
import {
  validateDefinition,
  validateSubmission,
} from 'novlearn-exercise-engine';
import type { ExerciseDefinition } from 'novlearn-exercise-engine';
import fixture from './fixtures/contracts/rational-minimum.definition.json' with { type: 'json' };

function definition(): ExerciseDefinition {
  const input: unknown = fixture;
  const result = validateDefinition(input);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  if (result.value.schemaVersion !== 5)
    throw new Error('Expected canonical fixture.');
  return result.value;
}

function rejected(input: unknown, path: string, code?: string): void {
  const result = validateDefinition(input);
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path, ...(code ? { code } : {}) }),
      ]),
    );
  }
}

describe('native rational-value definition contract', () => {
  it('accepts the reviewed question from row 103 and preserves sources and private extensions', () => {
    const original = definition();
    original.extensions = {
      legacy: {
        alias: 'Is_Flash',
        falseFlag: false,
        unknown: [null, 2, '  source  '],
      },
    };
    const result = validateDefinition(original);
    expect(result).toEqual({ ok: true, value: original });
    if (!result.ok) return;
    expect(result.value.variables).toEqual([{ name: 'x', domain: 'real' }]);
    expect(element(result.value, 'question').expectedLatex).toBe(
      '\\frac{-b}{2a}',
    );
    expect(
      validateDefinition(JSON.parse(JSON.stringify(result.value))),
    ).toEqual(result);
    element(original, 'question').expectedLatex = 'mutated';
    expect(element(result.value, 'question').expectedLatex).toBe(
      '\\frac{-b}{2a}',
    );
  });

  it.each([null, [], 7, 'text', undefined])(
    'rejects a non-object root: %s',
    (input) => {
      expect(validateDefinition(input).ok).toBe(false);
    },
  );

  it('rejects unknown or missing versions without guessing a legacy schema', () => {
    rejected(
      { ...definition(), schemaVersion: 99 },
      '/schemaVersion',
      'unknown-version',
    );
    const unversioned: Partial<ExerciseDefinition> = definition();
    delete unversioned.schemaVersion;
    rejected(unversioned, '/schemaVersion', 'unknown-version');
  });

  it('does not silently accept aliases or colliding historical flags', () => {
    rejected(
      { ...definition(), Is_Flash: true, isFlash: false },
      '/Is_Flash',
      'unknown-field',
    );
    rejected(
      { ...definition(), correct_answer: '7' },
      '/correct_answer',
      'unknown-field',
    );
    rejected(
      { ...definition(), family: 'rational-value' },
      '/family',
      'unknown-field',
    );
  });

  it('reports exact nested field paths', () => {
    const d = definition();
    rejected(
      {
        ...d,
        elements: [
          d.elements[0],
          d.elements[1],
          { ...element(d, 'question'), points: '1' },
        ],
      },
      '/elements/2/points',
      'value',
    );
    rejected(
      {
        ...d,
        elements: [
          d.elements[0],
          d.elements[1],
          { ...element(d, 'question'), expectedLatex: null },
        ],
      },
      '/elements/2/expectedLatex',
      'type',
    );
    rejected(
      {
        ...d,
        elements: [
          d.elements[0],
          d.elements[1],
          {
            ...element(d, 'question'),
            policy: { domain: 'real', form: 'reduced' },
          },
        ],
      },
      '/elements/2/policy/domain',
      'value',
    );
  });

  it('rejects duplicate symbols and collisions between parameters and variables', () => {
    const d = definition();
    rejected(
      {
        ...d,
        generation: {
          ...definition().generation,
          definitions: [
            ...d.generation.definitions,
            d.generation.definitions[0],
          ],
        },
      },
      '/generation/definitions/3/name',
      'collision',
    );
    rejected(
      { ...d, variables: [{ name: 'a', domain: 'real' }] },
      '/variables/0/name',
      'collision',
    );
    rejected(
      { ...d, variables: [...d.variables, ...d.variables] },
      '/variables/1/name',
      'collision',
    );
  });

  it.each(['e', 'i', 'a b', 'u_0', '__proto__', 'sin'])(
    'rejects reserved or unsupported symbols %s',
    (name) => {
      rejected(
        { ...definition(), variables: [{ name, domain: 'real' }] },
        '/variables/0/name',
        'value',
      );
    },
  );

  it.each([1.5, 1_000_001, Number.MAX_SAFE_INTEGER])(
    'rejects integer bounds outside the contract: %s',
    (min) => {
      const d = definition();
      rejected(
        {
          ...d,
          generation: {
            ...definition().generation,
            definitions: [{ ...d.generation.definitions[0], min }],
          },
        },
        '/generation/definitions/0/min',
        'value',
      );
    },
  );

  it('rejects reversed ranges, fully excluded ranges, duplicate and out-of-range exclusions', () => {
    const d = definition();
    const p = { name: 'a', kind: 'integer', min: 1, max: 2, exclusions: [] };
    rejected(
      {
        ...d,
        generation: {
          ...definition().generation,
          definitions: [{ ...p, min: 3 }],
        },
      },
      '/generation/definitions/0',
      'impossible-constraints',
    );
    rejected(
      {
        ...d,
        generation: {
          ...definition().generation,
          definitions: [{ ...p, exclusions: [1, 2] }],
        },
      },
      '/generation/definitions/0',
      'impossible-constraints',
    );
    rejected(
      {
        ...d,
        generation: {
          ...definition().generation,
          definitions: [{ ...p, exclusions: [1, 1] }],
        },
      },
      '/generation/definitions/0/exclusions/1',
      'collision',
    );
    rejected(
      {
        ...d,
        generation: {
          ...definition().generation,
          definitions: [{ ...p, exclusions: [3] }],
        },
      },
      '/generation/definitions/0/exclusions/0',
      'value',
    );
    expect(
      validateDefinition({
        ...d,
        generation: {
          ...definition().generation,
          definitions: [{ ...p, exclusions: [1] }],
        },
      }).ok,
    ).toBe(true);
  });

  it('rejects malformed computed declarations and symbolic exclusions', () => {
    const d = definition();
    rejected(
      {
        ...d,
        generation: {
          ...definition().generation,
          definitions: [
            {
              name: 'a',
              kind: 'computed',
              min: 1,
              max: 2,
              exclusions: [],
              expression: '2*b',
            },
          ],
        },
      },
      '/generation/definitions/0/latex',
      'type',
    );
    rejected(
      {
        ...d,
        generation: {
          ...definition().generation,
          definitions: [
            { name: 'a', kind: 'integer', min: 1, max: 2, exclusions: ['@b'] },
          ],
        },
      },
      '/generation/definitions/0/exclusions/0',
      'value',
    );
  });

  it('validates structure without claiming mathematical admissibility', () => {
    const d = definition();
    element(d, 'question').expectedLatex = '\\frac{';
    element(d, 'expression').latex = 'q/q';
    expect(validateDefinition(d).ok).toBe(true);
    // The math boundary must check errors, unknown symbols and domains before use.
  });

  it('bounds strings, lists and nested extensions', () => {
    rejected({ ...definition(), title: 'x'.repeat(4097) }, '/title', 'limit');
    rejected(
      {
        ...definition(),
        generation: {
          ...definition().generation,
          definitions: Array.from({ length: 17 }, (_, i) => ({
            name: String(i),
            kind: 'integer',
            min: 1,
            max: 2,
            exclusions: [],
          })),
        },
      },
      '/generation/definitions',
      'limit',
    );
    let nested: unknown = 1;
    for (let i = 0; i < 20; i += 1) nested = { next: nested };
    const result = validateDefinition({
      ...definition(),
      extensions: { nested },
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.diagnostics.some((d) => d.code === 'limit')).toBe(true);
  });

  it('rejects cyclic, nonfinite, executable and unsafe extension data without running getters', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const cases = [
      cyclic,
      { value: NaN },
      { value: Infinity },
      { value: () => 1 },
      { value: new Date() },
      JSON.parse('{"__proto__":{"polluted":true}}'),
      { constructor: 1 },
      { [Symbol('secret')]: true },
    ];
    for (const extensions of cases)
      expect(validateDefinition({ ...definition(), extensions }).ok).toBe(
        false,
      );
    let invoked = false;
    const extensions = Object.defineProperty({}, 'danger', {
      enumerable: true,
      get() {
        invoked = true;
        throw new Error('must not run');
      },
    });
    expect(validateDefinition({ ...definition(), extensions }).ok).toBe(false);
    expect(invoked).toBe(false);
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
  });

  it('rejects sparse/decorated arrays instead of dropping data', () => {
    const sparse = new Array<unknown>(2);
    const decorated = Object.assign([], { custom: 1 });
    expect(
      validateDefinition({ ...definition(), extensions: { sparse } }).ok,
    ).toBe(false);
    expect(
      validateDefinition({ ...definition(), extensions: { decorated } }).ok,
    ).toBe(false);
  });
});

describe('submission transport contract', () => {
  const submission = {
    schemaVersion: 5,
    instanceId: 'server-instance',
    questionId: '1780008000003',
    answer: { format: 'latex', source: '  \\frac{1}{2}  ' },
  };

  it('preserves the original source exactly, including incomplete input', () => {
    expect(validateSubmission(submission)).toEqual({
      ok: true,
      value: submission,
    });
    for (const source of ['', 'x+', '\\placeholder{x}', '3,14']) {
      expect(
        validateSubmission({
          ...submission,
          answer: { format: 'latex', source },
        }).ok,
      ).toBe(true);
    }
  });

  it.each([
    'seed',
    'policy',
    'verdict',
    'parameters',
    'expectedLatex',
    'extensions',
  ])('rejects client authority field %s', (key) => {
    const result = validateSubmission({ ...submission, [key]: 'untrusted' });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({ path: `/${key}`, code: 'unknown-field' }),
      );
  });

  it('rejects version, format, source type and length errors', () => {
    expect(validateSubmission({ ...submission, schemaVersion: 0 }).ok).toBe(
      false,
    );
    expect(
      validateSubmission({
        ...submission,
        answer: { format: 'math-json', source: '1' },
      }).ok,
    ).toBe(false);
    expect(
      validateSubmission({
        ...submission,
        answer: { format: 'latex', source: 1 },
      }).ok,
    ).toBe(false);
    expect(
      validateSubmission({
        ...submission,
        answer: { format: 'latex', source: 'x'.repeat(4097) },
      }).ok,
    ).toBe(false);
    expect(validateSubmission({ ...submission, instanceId: '' }).ok).toBe(
      false,
    );
  });

  it('rejects oversized keys without echoing them into diagnostic paths', () => {
    const oversizedKey = 'x'.repeat(100_000);
    const inputs = [
      validateDefinition({
        ...definition(),
        extensions: { [oversizedKey]: 1 },
      }),
      validateSubmission({ ...submission, [oversizedKey]: 1 }),
    ];
    for (const result of inputs) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.diagnostics).toContainEqual(
          expect.objectContaining({ code: 'limit' }),
        );
        expect(
          result.diagnostics.every(
            (diagnostic) => diagnostic.path.length < 256,
          ),
        ).toBe(true);
      }
    }
    const withinLimit = 'x'.repeat(128);
    expect(
      validateDefinition({ ...definition(), extensions: { [withinLimit]: 1 } })
        .ok,
    ).toBe(true);
  });
});
