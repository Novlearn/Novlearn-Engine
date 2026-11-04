import { describe, expect, it } from 'vitest';
import * as engine from 'novlearn-exercise-engine';
import * as legacy from 'novlearn-exercise-engine/legacy';
import * as remoteHost from 'novlearn-exercise-engine/remote-host';
import packageJson from '../package.json' with { type: 'json' };

describe('built package boundary', () => {
  it('versions the new API package separately from unchanged replay snapshots', () => {
    expect(packageJson.version).toBe('0.2.1');
    expect(engine.GRAPH_PROFILE).toBe('display-graph-v1');
    expect(typeof engine.sampleDisplayGraph).toBe('function');
  });
  it('loads through the public ESM export without browser globals', () => {
    expect(Object.keys(engine).sort()).toEqual([
      'GRAPH_PROFILE',
      'generateVariables',
      'gradeAnswer',
      'instantiateExercise',
      'parseMathInput',
      'projectPublicInstance',
      'sampleDisplayGraph',
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
  it('keeps the private transport in its explicit single-function boundary', () => {
    expect(Object.keys(remoteHost)).toEqual(['createRemoteHost']);
  });
});
