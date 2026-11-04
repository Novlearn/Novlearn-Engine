import { describe, expect, it } from 'vitest';
import {
  generateVariables,
  instantiateExercise,
  projectPublicInstance,
  validateDefinition,
  validateSubmission,
} from 'novlearn-exercise-engine';
import type { GenerateVariablesOptions } from 'novlearn-exercise-engine';
import reference from './fixtures/canonical/reference-vectors.json' with { type: 'json' };
// Replay pipeline stays 0.1.0; package 0.2.1 adds the transport and graph APIs.

describe('canonical contract and reference vectors', () => {
  it.each(reference.vectors)(
    'pins complete generation for seed $seed',
    ({ seed, result }) => {
      const generated = generateVariables(reference.definition.generation, {
        seed,
      });
      expect(generated).toEqual(result);
      expect(
        generateVariables(reference.definition.generation, {
          seed: String(seed),
        }),
      ).toEqual(result);
      if (!generated.ok) throw new Error('Reference generation failed');
      expect(generated.replay.engineVersion).toBe('0.1.0');
      const { a, b, c, d, f, g, h } = generated.values;
      if (
        a?.kind !== 'integer' ||
        b?.kind !== 'integer' ||
        c?.kind !== 'rational' ||
        d?.kind !== 'rational'
      )
        throw new Error('Reference kinds changed');
      // Independent oracle: no CortexJS and no generator used to derive the expected identity.
      const square = BigInt(a.value) ** 2n + BigInt(b.value) ** 2n;
      expect(BigInt(c.numerator)).toBe(square * BigInt(c.denominator));
      expect(2n * BigInt(d.numerator)).toBe(square * BigInt(d.denominator));
      expect(BigInt(d.numerator)).toBeGreaterThan(10n * BigInt(d.denominator));
      expect(f).not.toMatchObject({ value: 2 });
      expect(g).not.toMatchObject({ coefficient: 0 });
      expect(h).toEqual({ kind: 'choice', value: 0.125 });
    },
  );

  it('pins the complete official snapshot and its detached public projection', () => {
    const before = JSON.stringify(reference.definition);
    const result = instantiateExercise(reference.definition, {
      seed: 42,
      instanceId: 'official-reference',
    });
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
    expect(result.value).toEqual(reference.snapshot);
    expect(projectPublicInstance(result.value)).toEqual(
      reference.publicInstance,
    );
    expect(
      instantiateExercise(JSON.parse(before), {
        seed: '42',
        instanceId: 'official-reference',
      }),
    ).toEqual(result);
    expect(JSON.stringify(reference.definition)).toBe(before);
    expect(result.value.generation).toMatchObject({ attempts: 2, draws: 6 });
    expect(result.value).not.toHaveProperty('instantiationVersion');
    const serialized = JSON.stringify(projectPublicInstance(result.value));
    expect(serialized).not.toContain('PRIVATE-REFERENCE');
    for (const key of ['seed', 'expected', 'computed', 'definition', 'policy'])
      expect(serialized).not.toContain(`"${key}":`);
  });

  it.each([1, 2, 3, 4])(
    'refuses experimental schema %s without implicit adaptation',
    (schemaVersion) => {
      const definition = { ...reference.definition, schemaVersion };
      const checked = validateDefinition(definition);
      expect(checked.ok).toBe(false);
      if (!checked.ok)
        expect(checked.diagnostics).toContainEqual(
          expect.objectContaining({
            code: 'unknown-version',
            path: '/schemaVersion',
          }),
        );
      expect(
        instantiateExercise(definition, { seed: 42, instanceId: 'id' }),
      ).not.toHaveProperty('value');
      expect(
        generateVariables(
          { ...reference.definition.generation, schemaVersion },
          { seed: 42 },
        ).ok,
      ).toBe(false);
      expect(
        validateSubmission({
          schemaVersion,
          instanceId: 'id',
          questionId: 'square',
          answer: { format: 'latex', source: '25' },
        }).ok,
      ).toBe(false);
    },
  );

  it.each(['parameters-v1', 'variables-v2', 'variables-v3'])(
    'refuses experimental algorithm %s',
    (generationVersion) => {
      const result = generateVariables(reference.definition.generation, {
        seed: 42,
        generationVersion,
      } as unknown as GenerateVariablesOptions);
      expect(result).toMatchObject({
        ok: false,
        diagnostics: [{ code: 'unsupported-version' }],
      });
      expect(result).not.toHaveProperty('values');
    },
  );

  it('preserves finite choices while refusing to claim exact math beyond the profile', () => {
    const generation = {
      schemaVersion: 5,
      definitions: [{ name: 'a', kind: 'choice', values: [Number.MAX_VALUE] }],
      constraints: [],
      maxAttempts: 1,
      maxDraws: 1,
    };
    expect(generateVariables(generation, { seed: 0 })).toMatchObject({
      ok: true,
      values: { a: { kind: 'choice', value: Number.MAX_VALUE } },
      replay: { draws: 0 },
    });
    const calculated = generateVariables(
      {
        ...generation,
        definitions: [
          ...generation.definitions,
          { name: 'b', kind: 'computed', latex: 'a' },
        ],
      },
      { seed: 0 },
    );
    expect(calculated).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'limit' }],
    });
    expect(calculated).not.toHaveProperty('values');
  });
});
