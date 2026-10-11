import type {
  ComparisonConstraint,
  ComparisonOperand,
  ScalarVariableDefinition,
  GeneratedGroup,
  GenerationDefinition,
  ComputedBinding,
  GeneratedScalarValue,
  GeneratedValue,
} from '../contracts/types.js';
import { admissibleScalar, rowAllowed } from '../contracts/generation.js';
import { decimalGrid } from '../contracts/decimal-grid.js';
import { numericOrder } from '../math/comparison.js';
import type {
  GenerateVariablesResult,
  GenerationDiagnostic,
  GenerationReplay,
} from './variables.js';
import { sampleScalar } from './scalar.js';
import { sampleIndex, wordStream } from './random.js';
type Plan =
  | { kind: 'scalar'; path: string; parameter: ScalarVariableDefinition }
  | {
      kind: 'tuple';
      path: string;
      id: string;
      components: ScalarVariableDefinition[];
      rows?: number[][];
    };
type Bounds = { min: GeneratedScalarValue; max: GeneratedScalarValue };

function rowValue(
  p: ScalarVariableDefinition,
  n: number,
): GeneratedScalarValue {
  return p.kind === 'decimal'
    ? {
        kind: 'decimal',
        coefficient: decimalGrid(n, p.precision).floor,
        precision: p.precision,
      }
    : { kind: p.kind, value: n === 0 ? 0 : n };
}

function scalarBounds(p: ScalarVariableDefinition): Bounds {
  if (p.kind === 'choice')
    return {
      min: rowValue(p, Math.min(...p.values)),
      max: rowValue(p, Math.max(...p.values)),
    };
  const precision = p.kind === 'decimal' ? p.precision : 0;
  let low = p.kind === 'decimal' ? decimalGrid(p.min, precision).ceil : p.min;
  let high = p.kind === 'decimal' ? decimalGrid(p.max, precision).floor : p.max;
  const excluded = new Set(
    p.exclusions.map((n) =>
      p.kind === 'decimal' ? decimalGrid(n, precision).floor : n,
    ),
  );
  while (excluded.has(low)) low += 1;
  while (excluded.has(high)) high -= 1;
  const value = (coefficient: number): GeneratedScalarValue =>
    p.kind === 'decimal'
      ? { kind: 'decimal', coefficient, precision }
      : { kind: 'integer', value: coefficient };
  return { min: value(low), max: value(high) };
}

function relation(
  op: ComparisonConstraint['operator'],
  order: -1 | 0 | 1,
): boolean {
  switch (op) {
    case '<':
      return order < 0;
    case '<=':
      return order <= 0;
    case '>':
      return order > 0;
    case '>=':
      return order >= 0;
    case '==':
      return order === 0;
    case '!=':
      return order !== 0;
  }
}

export class ResolutionFailure extends Error {
  constructor(readonly diagnostic: GenerationDiagnostic) {
    super(diagnostic.message);
  }
}

export interface CandidateResolution {
  computed: ComputedBinding[];
  resolve(values: Record<string, GeneratedValue>): boolean;
  expression(
    source: string,
    values: Record<string, GeneratedValue>,
    path: string,
  ): GeneratedValue;
}

/** One complete-candidate loop: draw, resolve, compare, reject within fixed budgets. */
export function generateCandidates(
  d: GenerationDefinition,
  seed: string,
  resolution: CandidateResolution,
): GenerateVariablesResult {
  const replay: GenerationReplay = {
    engineVersion: '0.1.0',
    generationVersion: 'mulberry32-rejection-v1',
    seed,
    draws: 0,
    attempts: 0,
  };
  const fail = (
    path: string,
    code: GenerationDiagnostic['code'],
    message: string,
  ): GenerateVariablesResult => ({
    ok: false,
    diagnostics: [{ path, code, message }],
    replay: { ...replay },
  });
  const plans: Plan[] = d.definitions.flatMap((p, i): Plan[] => {
    if (p.kind === 'computed') return [];
    const path = `/definitions/${i}`;
    return [
      p.kind !== 'tuple'
        ? { kind: 'scalar', path, parameter: admissibleScalar(p) }
        : {
            kind: 'tuple',
            path,
            id: p.id,
            components: p.components.map(admissibleScalar),
            ...(p.mode === 'choice'
              ? {
                  rows: p.values.filter((row) => rowAllowed(p.components, row)),
                }
              : {}),
          },
    ];
  });
  const groups: GeneratedGroup[] = [];
  const bounds: Record<string, Bounds> = {};
  for (const p of plans) {
    if (p.kind === 'scalar')
      bounds[p.parameter.name] = scalarBounds(p.parameter);
    else {
      groups.push({ id: p.id, components: p.components.map((c) => c.name) });
      for (const [i, c] of p.components.entries()) {
        const values = p.rows?.map((row) => row[i]!);
        bounds[c.name] = values
          ? {
              min: rowValue(c, Math.min(...values)),
              max: rowValue(c, Math.max(...values)),
            }
          : scalarBounds(c);
      }
    }
  }
  let activePath = '/constraints';
  class WordLimit extends Error {}
  class UnknownComparison extends Error {}
  try {
    // Instantiate only when comparisons exist; ordinary tuple choices do not need math.
    const order = d.constraints.length ? numericOrder() : undefined;
    const compare = (a: GeneratedValue, b: GeneratedValue): -1 | 0 | 1 => {
      const result = order?.(a, b);
      if (result === undefined) throw new UnknownComparison();
      return result;
    };
    const operandBounds = (
      op: Exclude<ComparisonOperand, { latex: string }>,
    ): Bounds =>
      'variable' in op
        ? bounds[op.variable]!
        : {
            min: { kind: 'choice', value: op.constant },
            max: { kind: 'choice', value: op.constant },
          };
    // Conservative interval proofs and reflexive comparisons only, no relation solver.
    for (const [i, c] of d.constraints.entries()) {
      activePath = `/constraints/${i}`;
      if (
        'latex' in c.left ||
        'latex' in c.right ||
        ('variable' in c.left && !Object.hasOwn(bounds, c.left.variable)) ||
        ('variable' in c.right && !Object.hasOwn(bounds, c.right.variable))
      )
        continue;
      const a = operandBounds(c.left),
        b = operandBounds(c.right);
      let possible: boolean;
      if (
        'variable' in c.left &&
        'variable' in c.right &&
        c.left.variable === c.right.variable
      )
        possible = relation(c.operator, 0);
      else if (c.operator === '==')
        possible = compare(a.min, b.max) <= 0 && compare(a.max, b.min) >= 0;
      else if (c.operator === '!=')
        possible = !(
          compare(a.min, a.max) === 0 &&
          compare(b.min, b.max) === 0 &&
          compare(a.min, b.min) === 0
        );
      else
        possible =
          c.operator === '<' || c.operator === '<='
            ? relation(c.operator, compare(a.min, b.max))
            : relation(c.operator, compare(a.max, b.min));
      if (!possible)
        return fail(
          activePath,
          'empty-domain',
          'Comparison is proven impossible over the admitted domains.',
        );
    }
    const stream = wordStream(Number(seed));
    const nextWord = (): number => {
      if (replay.draws >= d.maxDraws) throw new WordLimit();
      replay.draws += 1;
      return stream();
    };
    const operand = (
      op: ComparisonOperand,
      values: Record<string, GeneratedValue>,
      path: string,
    ): GeneratedValue =>
      'latex' in op
        ? resolution.expression(op.latex, values, path)
        : 'variable' in op
          ? values[op.variable]!
          : { kind: 'choice', value: op.constant };
    for (let attempt = 1; attempt <= d.maxAttempts; attempt += 1) {
      replay.attempts = attempt;
      const entries: [string, GeneratedScalarValue][] = [];
      for (const p of plans) {
        activePath = p.path;
        if (p.kind === 'tuple' && p.rows) {
          const rank = sampleIndex(p.rows.length, nextWord);
          if (rank === undefined)
            return fail(
              activePath,
              'limit',
              'Random rank rejection exceeded 128 words; no impossibility is inferred.',
            );
          const row = p.rows[rank]!;
          for (const [i, c] of p.components.entries())
            entries.push([c.name, rowValue(c, row[i]!)]);
        } else {
          const components = p.kind === 'scalar' ? [p.parameter] : p.components;
          for (const [i, c] of components.entries()) {
            activePath =
              p.kind === 'scalar' ? p.path : `${p.path}/components/${i}`;
            const value = sampleScalar(c, nextWord);
            if (value === undefined)
              return fail(
                activePath,
                'limit',
                'Random rank rejection exceeded 128 words; no impossibility is inferred.',
              );
            entries.push([c.name, value]);
          }
        }
      }
      const values: Record<string, GeneratedValue> =
        Object.fromEntries(entries);
      let accepted = resolution.resolve(values);
      // All constraints are checked, including after a false one: unknown never becomes rejection.
      for (const [i, c] of d.constraints.entries()) {
        activePath = `/constraints/${i}`;
        if (
          !relation(
            c.operator,
            compare(
              operand(c.left, values, `${activePath}/left/latex`),
              operand(c.right, values, `${activePath}/right/latex`),
            ),
          )
        )
          accepted = false;
      }
      if (accepted) {
        return {
          ok: true,
          values,
          groups,
          computed: resolution.computed,
          replay: { ...replay },
        };
      }
    }
    return fail(
      '/constraints',
      'attempts-exhausted',
      'Complete-candidate search exhausted maxAttempts; no impossibility is inferred.',
    );
  } catch (error) {
    if (error instanceof ResolutionFailure)
      return {
        ok: false,
        diagnostics: [error.diagnostic],
        replay: { ...replay },
      };
    return error instanceof WordLimit
      ? fail(
          activePath,
          'limit',
          'Generation exhausted maxDraws; no impossibility is inferred.',
        )
      : error instanceof UnknownComparison
        ? fail(
            activePath,
            'indeterminate-constraint',
            'Exact numeric comparison is indeterminate; no candidate is returned.',
          )
        : fail(
            activePath,
            'comparison-failed',
            'Numeric comparison failed; no candidate is returned.',
          );
  }
}
