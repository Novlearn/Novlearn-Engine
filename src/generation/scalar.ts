import type { ScalarVariableDefinition } from '../contracts/types.js';
import type { GeneratedScalarValue } from '../contracts/types.js';
import { decimalGrid } from '../contracts/decimal-grid.js';
import { sampleIndex } from './random.js';

/** Deterministic scalar rank mapping; callers supply one continuous stream. */
export function sampleScalar(
  parameter: ScalarVariableDefinition,
  nextWord: () => number,
): GeneratedScalarValue | undefined {
  if (parameter.kind === 'choice') {
    const rank = sampleIndex(parameter.values.length, nextWord);
    if (rank === undefined) return undefined;
    const chosen = parameter.values[rank]!;
    return { kind: 'choice', value: chosen === 0 ? 0 : chosen };
  }
  const precision = parameter.kind === 'decimal' ? parameter.precision : 0;
  const min =
    parameter.kind === 'decimal'
      ? decimalGrid(parameter.min, precision).ceil
      : parameter.min;
  const max =
    parameter.kind === 'decimal'
      ? decimalGrid(parameter.max, precision).floor
      : parameter.max;
  const exclusions = parameter.exclusions
    .map((n) =>
      parameter.kind === 'decimal' ? decimalGrid(n, precision).floor : n,
    )
    .sort((a, b) => a - b);
  const rank = sampleIndex(max - min + 1 - exclusions.length, nextWord);
  if (rank === undefined) return undefined;
  let coefficient = min + rank;
  for (const excluded of exclusions) {
    if (excluded > coefficient) break;
    coefficient += 1;
  }
  return parameter.kind === 'integer'
    ? { kind: 'integer', value: coefficient === 0 ? 0 : coefficient }
    : {
        kind: 'decimal',
        coefficient: coefficient === 0 ? 0 : coefficient,
        precision,
      };
}
