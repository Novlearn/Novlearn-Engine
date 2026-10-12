import { describe, expect, it } from 'vitest';
import * as engine from 'novlearn-exercise-engine';
import * as legacy from 'novlearn-exercise-engine/legacy';

describe('built package boundary', () => {
  it('loads through the public ESM export without browser globals', () => {
    expect(Object.keys(engine).sort()).toEqual([
      'generateVariables',
      'gradeAnswer',
      'instantiateExercise',
      'parseMathInput',
      'projectPublicInstance',
      'validateDefinition',
      'validateSubmission',
    ]);
  });

  it('does not expose internal source paths', async () => {
    const privatePath = 'novlearn-exercise-engine/src/index.js';
    await expect(import(privatePath)).rejects.toThrow();
  });
  it('keeps legacy conversion in its explicit single-function boundary', async () => {
    expect(Object.keys(legacy)).toEqual(['adaptLegacyExercise']);
    const privatePath = 'novlearn-exercise-engine/legacy/source.js';
    await expect(import(privatePath)).rejects.toThrow();
  });
});
