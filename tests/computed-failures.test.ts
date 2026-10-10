import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  unknown: false,
  unknownAt: Infinity,
  calls: 0,
  throwComparison: false,
  undefinedValue: false,
  throwEvaluation: false,
}));
vi.mock('../src/math/comparison.js', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../src/math/comparison.js')>();
  return {
    numericOrder: () => {
      const compare = original.numericOrder();
      return (...args: Parameters<typeof compare>) => {
        if (state.throwComparison) throw new Error('comparison failed');
        state.calls += 1;
        return state.unknown || state.calls === state.unknownAt
          ? undefined
          : compare(...args);
      };
    },
  };
});
vi.mock('../src/math/substitution.js', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../src/math/substitution.js')>();
  return {
    ...original,
    instantiateMath: (...args: Parameters<typeof original.instantiateMath>) => {
      if (state.throwEvaluation)
        throw new Error('unexpected evaluation failure');
      const r = original.instantiateMath(...args);
      return state.undefinedValue && r.ok
        ? { ok: true as const, value: r.value }
        : r;
    },
  };
});
vi.mock('../src/generation/random.js', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../src/generation/random.js')>();
  return { ...original, wordStream: vi.fn(original.wordStream) };
});
import { generateVariables } from '../src/generation/variables.js';
import { instantiateExercise } from '../src/instantiation.js';
import { wordStream } from '../src/generation/random.js';
import type { GenerationDefinition } from '../src/contracts/types.js';
const fixture = (): GenerationDefinition => ({
  schemaVersion: 5,
  maxAttempts: 4,
  maxDraws: 64,
  definitions: [
    { kind: 'integer', name: 'a', min: 1, max: 3, exclusions: [] },
    { kind: 'computed', name: 'b', latex: 'a+1' },
  ],
  constraints: [
    {
      kind: 'comparison',
      left: { variable: 'b' },
      operator: '<',
      right: { constant: 0 },
    },
    {
      kind: 'comparison',
      left: { latex: 'b+1' },
      operator: '>',
      right: { constant: 0 },
    },
  ],
});
const run = (d: unknown = fixture()) =>
  generateVariables(d, {
    seed: 42,
    generationVersion: 'mulberry32-rejection-v1',
  });
beforeEach(() => {
  state.unknown = false;
  state.unknownAt = Infinity;
  state.calls = 0;
  state.throwComparison = false;
  state.undefinedValue = false;
  state.throwEvaluation = false;
  vi.mocked(wordStream).mockClear();
});

it.each(['unknown', 'cycle', 'unsupported'] as const)(
  'rejects %s before starting the RNG',
  (kind) => {
    const d = fixture();
    d.definitions[1] = {
      kind: 'computed',
      name: 'b',
      latex: kind === 'unknown' ? 'z' : kind === 'cycle' ? 'b+1' : '\\sqrt{4}',
    };
    expect(run(d)).toMatchObject({
      ok: false,
      replay: { draws: 0, attempts: 0 },
    });
    expect(wordStream).not.toHaveBeenCalled();
  },
);
it('never accepts unknown arithmetic comparisons, even after a false condition', () => {
  // First b<0 is exact false, then the math operand comparison is injected unknown.
  const d = fixture();
  d.constraints[0]!.left = { constant: 1 };
  d.constraints[0]!.right = { constant: 2 };
  d.constraints[0]!.operator = '>';
  // Use an expression so a static impossibility does not short-circuit the candidate.
  d.constraints[0]!.left = { latex: '1' };
  state.unknownAt = 2;
  const r = run(d);
  expect(r).toMatchObject({
    ok: false,
    diagnostics: [{ code: 'indeterminate-constraint' }],
    replay: { attempts: 1, draws: 1 },
  });
  expect(r).not.toHaveProperty('values');
});
it('keeps a missing exact computed result distinct from false constraints', () => {
  state.undefinedValue = true;
  const r = run();
  expect(r).toMatchObject({
    ok: false,
    diagnostics: [
      { code: 'indeterminate-expression', path: '/definitions/1/latex' },
    ],
  });
  expect(r).not.toHaveProperty('computed');
});
it('propagates unknown restrictions instead of retrying', () => {
  const d = fixture();
  d.definitions[1] = {
    kind: 'computed',
    name: 'b',
    latex: 'a+1',
    restrictions: { domain: 'rational', min: 0 },
  };
  state.unknown = true;
  expect(run(d)).toMatchObject({
    ok: false,
    diagnostics: [
      { code: 'indeterminate-constraint', path: '/definitions/1/restrictions' },
    ],
    replay: { attempts: 1 },
  });
});
it('keeps comparison exceptions separate from indetermination and impossibility', () => {
  state.throwComparison = true;
  expect(run()).toMatchObject({
    ok: false,
    diagnostics: [{ code: 'comparison-failed' }],
    replay: { attempts: 1 },
  });
});
it('keeps evaluation exceptions distinct from mathematical rejection', () => {
  state.throwEvaluation = true;
  expect(run()).toMatchObject({
    ok: false,
    diagnostics: [{ code: 'evaluation-failed', path: '/definitions/1/latex' }],
  });
});
it('does not leak an instance when the computed result is indeterminate', () => {
  state.undefinedValue = true;
  const r = instantiateExercise(
    {
      schemaVersion: 5,
      kind: 'composed',
      id: 'sample',
      revision: '1',
      title: 'Test',
      generation: fixture(),
      variables: [],
      elements: [{ id: 'text', type: 'text', text: '@a' }],
    },
    { seed: 42, instanceId: 'opaque' },
  );
  expect(r).toMatchObject({
    ok: false,
    diagnostics: [
      {
        stage: 'generation',
        code: 'indeterminate-expression',
        path: '/generation/definitions/1/latex',
      },
    ],
  });
  expect(r).not.toHaveProperty('value');
});
it('rejects getters without invoking them, with bounded inert diagnostics', () => {
  const getter = vi.fn(() => 'a');
  const d = fixture();
  Object.defineProperty(d.definitions[1], 'latex', {
    get: getter,
    enumerable: true,
  });
  expect(run(d)).toMatchObject({ ok: false, replay: { attempts: 0 } });
  expect(getter).not.toHaveBeenCalled();
});
