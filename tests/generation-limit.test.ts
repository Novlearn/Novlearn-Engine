import { expect, it, vi } from 'vitest';

vi.mock('../src/generation/random.js', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../src/generation/random.js')>();
  return { ...original, wordStream: () => () => 0xffff_ffff };
});
import { generateVariables } from '../src/generation/variables.js';

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
