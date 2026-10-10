import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  calls: 0,
  unknownAt: Infinity,
  throwAt: Infinity,
  stuckWords: false,
}));
vi.mock('../src/math/comparison.js', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../src/math/comparison.js')>();
  return {
    numericOrder: () => {
      const compare = original.numericOrder();
      return (...args: Parameters<typeof compare>) => {
        state.calls += 1;
        if (state.calls === state.throwAt) throw new Error('Math failure');
        return state.calls === state.unknownAt ? undefined : compare(...args);
      };
    },
  };
});
vi.mock('../src/generation/random.js', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../src/generation/random.js')>();
  return {
    ...original,
    wordStream: vi.fn((seed: number) =>
      state.stuckWords ? () => 0xffff_ffff : original.wordStream(seed),
    ),
  };
});
import { generateVariables } from '../src/generation/variables.js';
import { instantiateExercise } from '../src/instantiation.js';
import { wordStream } from '../src/generation/random.js';
import type { GenerationDefinitionV2 } from '../src/contracts/types.js';

const fixture = (): GenerationDefinitionV2 => ({
  schemaVersion: 2,
  maxAttempts: 4,
  maxDraws: 4096,
  definitions: [
    { name: 'a', kind: 'integer', min: 1, max: 3, exclusions: [] },
    { name: 'b', kind: 'integer', min: 1, max: 3, exclusions: [] },
  ],
  constraints: [
    {
      kind: 'comparison',
      left: { variable: 'a' },
      operator: '<',
      right: { variable: 'b' },
    },
  ],
});
const run = (d = fixture()) =>
  generateVariables(d, { seed: 42, generationVersion: 'variables-v2' });
beforeEach(() => {
  state.calls = 0;
  state.unknownAt = Infinity;
  state.throwAt = Infinity;
  state.stuckWords = false;
  vi.mocked(wordStream).mockClear();
});

it('does not start the RNG for malformed contracts, empty domains or proven impossible relations', () => {
  const d = fixture();
  d.constraints[0]!.right = { variable: 'a' };
  expect(run(d)).toMatchObject({
    ok: false,
    diagnostics: [{ code: 'empty-domain' }],
    replay: { draws: 0, attempts: 0 },
  });
  expect(
    run({
      ...fixture(),
      definitions: [{ name: 'a', kind: 'choice', values: [] }],
    }).ok,
  ).toBe(false);
  expect(wordStream).not.toHaveBeenCalled();
});

it('reports indeterminate static comparison separately, without drawing or accepting a candidate', () => {
  state.unknownAt = 1;
  const r = run();
  expect(r).toMatchObject({
    ok: false,
    diagnostics: [{ code: 'indeterminate-constraint', path: '/constraints/0' }],
    replay: { draws: 0, attempts: 0 },
  });
  expect(r).not.toHaveProperty('values');
  expect(wordStream).not.toHaveBeenCalled();
});

it('aborts for indetermination during complete-candidate checking, including after a false constraint', () => {
  const d = fixture();
  d.constraints[0]!.operator = '>';
  d.constraints.push({
    kind: 'comparison',
    left: { variable: 'b' },
    operator: '<',
    right: { variable: 'a' },
  });
  // Two interval checks, then false a>b for seed 42 (a=1,b=2), then unknown b<a.
  state.unknownAt = 4;
  const r = run(d);
  expect(r).toMatchObject({
    ok: false,
    diagnostics: [{ code: 'indeterminate-constraint', path: '/constraints/1' }],
    replay: { attempts: 1, draws: 2 },
  });
  expect(r).not.toHaveProperty('values');
  expect(state.calls).toBe(4);
});

it('keeps math exceptions distinct from unknown and mathematical impossibility', () => {
  state.throwAt = 2;
  const r = run();
  expect(r).toMatchObject({
    ok: false,
    diagnostics: [{ code: 'comparison-failed' }],
    replay: { attempts: 1, draws: 2 },
  });
  expect(r).not.toHaveProperty('values');
});

it.each(['choice', 'generate'] as const)(
  'limits word rejection inside tuple mode %s',
  (mode) => {
    state.stuckWords = true;
    const components = ['a', 'b'].map((name) => ({
      name,
      kind: 'integer' as const,
      min: 0,
      max: 2,
      exclusions: [],
    }));
    const d: GenerationDefinitionV2 = {
      ...fixture(),
      constraints: [],
      definitions: [
        {
          id: 'pair',
          kind: 'tuple',
          components,
          ...(mode === 'choice'
            ? {
                mode,
                values: [
                  [0, 0],
                  [1, 1],
                  [2, 2],
                ],
              }
            : { mode }),
        },
      ],
    };
    const r = run(d);
    expect(r).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'limit' }],
      replay: { attempts: 1, draws: 128 },
    });
    expect(r).not.toHaveProperty('values');
    expect(r).not.toHaveProperty('groups');
  },
);

it('propagates indeterminate generation to v3 without constructing a partial instance', () => {
  state.unknownAt = 2;
  const r = instantiateExercise(
    {
      schemaVersion: 3,
      kind: 'composed',
      id: 'id',
      revision: '1',
      title: 'test',
      generation: fixture(),
      variables: [],
      elements: [{ id: 'text', type: 'text', text: '@a' }],
    },
    { seed: 42, instanceId: 'id' },
  );
  expect(r).toMatchObject({
    ok: false,
    diagnostics: [{ stage: 'generation', code: 'indeterminate-constraint' }],
  });
  expect(r).not.toHaveProperty('value');
});
