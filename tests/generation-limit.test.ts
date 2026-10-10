import { expect, it, vi } from 'vitest';

vi.mock('../src/generation/random.js', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../src/generation/random.js')>();
  return { ...original, wordStream: () => () => 0xffff_ffff };
});
import { generateVariables } from '../src/generation/variables.js';
import { instantiateExercise } from '../src/instantiation.js';
import fixture from './fixtures/contracts/rational-minimum.definition.json' with { type: 'json' };
import composedFixture from './fixtures/contracts/quadratic-multiquestion.definition.json' with { type: 'json' };

it('returns a resource diagnostic without partial values when random rejection exhausts', () => {
  const result = generateVariables(
    [
      { name: 'a', kind: 'integer', min: 1, max: 1, exclusions: [] },
      { name: 'b', kind: 'integer', min: 0, max: 2, exclusions: [] },
    ],
    { seed: 0 },
  );
  expect(result).toEqual({
    ok: false,
    diagnostics: [
      {
        path: '/1',
        code: 'limit',
        message:
          'Random rank rejection exceeded 128 words; no impossibility is inferred.',
      },
    ],
  });
  expect(result).not.toHaveProperty('values');
});

it('propagates Lot 4 generation failure without constructing a partial instance', () => {
  const result = instantiateExercise(fixture, {
    seed: 0,
    instanceId: 'server-id',
  });
  expect(result).toMatchObject({
    ok: false,
    diagnostics: [{ stage: 'generation', code: 'limit', path: '/0' }],
  });
  expect(result).not.toHaveProperty('value');
});

it('propagates the same exhausted Lot 4 draw for composition v2 without partial elements', () => {
  const result = instantiateExercise(
    {
      ...composedFixture,
      parameters: [
        { name: 'a', kind: 'integer', min: 1, max: 3, exclusions: [] },
        ...composedFixture.parameters.slice(1),
      ],
    },
    { seed: 0, instanceId: 'server-id' },
  );
  expect(result).toMatchObject({
    ok: false,
    diagnostics: [{ stage: 'generation', code: 'limit', path: '/0' }],
  });
  expect(result).not.toHaveProperty('value');
});
