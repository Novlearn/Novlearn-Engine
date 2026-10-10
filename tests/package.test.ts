import { describe, expect, it } from 'vitest';
import * as engine from 'novlearn-exercise-engine';

describe('built package boundary', () => {
  it('loads through the public ESM export without browser globals', () => {
    expect(Object.keys(engine).sort()).toEqual([
      'parseMathInput',
      'validateDefinition',
      'validateSubmission',
    ]);
  });

  it('does not expose internal source paths', async () => {
    const privatePath = 'novlearn-exercise-engine/src/index.js';
    await expect(import(privatePath)).rejects.toThrow();
  });
});
