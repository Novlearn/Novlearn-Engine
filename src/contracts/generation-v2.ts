import type {
  GenerationDefinitionV2,
  GenerationParameterV1,
  ScalarParameterV2,
  JsonValue,
  ValidationResult,
} from './types.js';
import { validate, type Validation } from './validation.js';
import { validateParameters } from './parameters.js';
import { decimalGrid } from './decimal-grid.js';

/** Numeric transport only, not a parser or an algebra evaluator. */
export function exactNumber(
  value: number,
): { coefficient: number; precision: number } | undefined {
  for (let precision = 0; precision <= 6; precision += 1) {
    const grid = decimalGrid(value, precision);
    if (grid.aligned && Math.abs(grid.floor) <= 1_000_000_000)
      return { coefficient: grid.floor === 0 ? 0 : grid.floor, precision };
  }
  return undefined;
}

export function admissibleScalar(p: ScalarParameterV2): GenerationParameterV1 {
  return p.kind === 'choice'
    ? {
        name: p.name,
        kind: 'choice',
        values: p.values.filter((n) => !p.exclusions?.includes(n)),
      }
    : p;
}

/** Row typing is separate from exclusions, which discard whole rows. */
export function rowValueValid(p: ScalarParameterV2, n: number): boolean {
  if (p.kind === 'choice') return p.values.includes(n);
  return (
    n >= p.min &&
    n <= p.max &&
    (p.kind === 'integer'
      ? Number.isInteger(n)
      : decimalGrid(n, p.precision).aligned)
  );
}

export function rowAllowed(
  components: ScalarParameterV2[],
  row: number[],
): boolean {
  return components.every((p, i) => !p.exclusions?.includes(row[i]!));
}

export function generationNames(d: GenerationDefinitionV2): string[] {
  return d.definitions.flatMap((p) =>
    p.kind === 'tuple' ? p.components.map((c) => c.name) : [p.name],
  );
}

function inspectScalar(
  v: Validation,
  input: JsonValue,
  path: string,
  names: Set<string>,
): ScalarParameterV2 | undefined {
  const tag =
    input !== null && typeof input === 'object' && !Array.isArray(input)
      ? input.kind
      : undefined;
  // Existing scalar validation remains the source of grid/domain rules.
  let scalarInput = input;
  if (tag === 'choice') {
    const p = v.object(input, path, ['name', 'kind', 'values', 'exclusions']);
    scalarInput = {
      name: p.name ?? null,
      kind: 'choice',
      values: p.values ?? null,
    };
  }
  const checked = validateParameters([scalarInput]);
  if (!checked.ok) {
    for (const d of checked.diagnostics)
      v.issue(path + d.path.slice(2), d.code, d.message);
    return undefined;
  }
  const p = input as unknown as ScalarParameterV2;
  v.symbol(p.name, `${path}/name`, names);
  if (p.kind === 'choice') {
    for (const [i, n] of p.values.entries()) {
      if (!exactNumber(n))
        v.issue(
          `${path}/values/${i}`,
          'limit',
          'Choice requires an exact six-place numeric encoding within coefficient +/-1000000000.',
        );
    }
    if (p.exclusions !== undefined) {
      const seen = new Set<number>();
      for (const [i, n] of v
        .list(p.exclusions, `${path}/exclusions`)
        .entries()) {
        const ep = `${path}/exclusions/${i}`;
        if (typeof n !== 'number' || !p.values.includes(n))
          v.issue(ep, 'value', 'Exclusion must occur in the choice list.');
        else {
          if (seen.has(n)) v.issue(ep, 'collision', 'Duplicate exclusion.');
          seen.add(n);
        }
      }
      if (seen.size >= p.values.length)
        v.issue(path, 'impossible-constraints', 'Every choice is excluded.');
    }
  }
  // Never expose a component to row inspection after any validation failure,
  // including when the diagnostic list has reached its bounded capacity.
  return v.diagnostics.length === 0 ? p : undefined;
}

/** Runtime boundary: JSON is copied before reading any discriminant or operand. */
export function validateGenerationV2(
  input: unknown,
): ValidationResult<GenerationDefinitionV2> {
  return validate(input, (v, data) => {
    const d = v.object(data, '', [
      'schemaVersion',
      'definitions',
      'constraints',
      'maxAttempts',
      'maxDraws',
    ]);
    if (d.schemaVersion !== 2)
      v.issue(
        '/schemaVersion',
        'unknown-version',
        'Expected generation schemaVersion 2.',
      );
    for (const [key, max] of [
      ['maxAttempts', 128],
      ['maxDraws', 65_536],
    ] as const) {
      const n = d[key];
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > max)
        v.issue(
          `/${key}`,
          'limit',
          `Expected an integer budget from 1 to ${max}.`,
        );
    }
    const names = new Set<string>();
    const ids = new Set<string>();
    for (const [index, inputDefinition] of v
      .list(d.definitions, '/definitions', 16)
      .entries()) {
      const path = `/definitions/${index}`;
      const tag =
        inputDefinition !== null &&
        typeof inputDefinition === 'object' &&
        !Array.isArray(inputDefinition)
          ? inputDefinition.kind
          : undefined;
      if (tag !== 'tuple') {
        inspectScalar(v, inputDefinition, path, names);
        continue;
      }
      const mode = (inputDefinition as { mode?: JsonValue }).mode;
      const p = v.object(inputDefinition, path, [
        'id',
        'kind',
        'mode',
        'components',
        ...(mode === 'choice' ? ['values'] : []),
      ]);
      v.text(p.id, `${path}/id`, 128);
      if (typeof p.id === 'string') {
        if (ids.has(p.id))
          v.issue(`${path}/id`, 'collision', 'Duplicate tuple ID.');
        ids.add(p.id);
      }
      if (mode !== 'choice' && mode !== 'generate')
        v.issue(`${path}/mode`, 'value', 'Expected choice or generate.');
      const components = v.list(p.components, `${path}/components`, 8);
      if (components.length < 2)
        v.issue(`${path}/components`, 'value', 'Tuple arity must be 2 to 8.');
      const scalars = components.map((c, i) =>
        inspectScalar(v, c, `${path}/components/${i}`, names),
      );
      if (mode === 'choice') {
        const rows = v.list(p.values, `${path}/values`);
        if (rows.length === 0)
          v.issue(
            `${path}/values`,
            'impossible-constraints',
            'Tuple choice list is empty.',
          );
        const seen = new Set<string>();
        let allowed = 0;
        for (const [i, inputRow] of rows.entries()) {
          const rp = `${path}/values/${i}`;
          const row = v.list(inputRow, rp, 8);
          if (row.length !== components.length)
            v.issue(rp, 'value', 'Row arity must match components.');
          let valid =
            row.length === scalars.length &&
            scalars.every((s) => s !== undefined);
          for (const [j, n] of row.entries()) {
            const s = scalars[j];
            if (typeof n !== 'number' || !s || !rowValueValid(s, n)) {
              v.issue(
                `${rp}/${j}`,
                'value',
                'Row value must respect the component type, bounds, grid or choice list.',
              );
              valid = false;
            }
          }
          if (valid) {
            const key = JSON.stringify(row);
            if (seen.has(key))
              v.issue(
                rp,
                'collision',
                'Duplicate tuple row (including zero signs).',
              );
            seen.add(key);
            if (rowAllowed(scalars as ScalarParameterV2[], row as number[]))
              allowed += 1;
          }
        }
        if (allowed === 0 && v.diagnostics.length === 0)
          v.issue(
            `${path}/values`,
            'impossible-constraints',
            'Every tuple row is excluded.',
          );
      }
    }
    if (names.size > 16)
      v.issue(
        '/definitions',
        'limit',
        'At most 16 named values across all scalars and tuples.',
      );
    for (const id of ids)
      if (names.has(id))
        v.issue(
          '/definitions',
          'collision',
          'Tuple IDs and mathematical names must be disjoint.',
        );
    for (const [i, constraint] of v
      .list(d.constraints, '/constraints', 32)
      .entries()) {
      const path = `/constraints/${i}`;
      const c = v.object(constraint, path, [
        'kind',
        'left',
        'operator',
        'right',
      ]);
      v.literal(c.kind, `${path}/kind`, 'comparison');
      if (
        typeof c.operator !== 'string' ||
        !['<', '<=', '>', '>=', '==', '!='].includes(c.operator)
      )
        v.issue(
          `${path}/operator`,
          'value',
          'Unsupported comparison operator.',
        );
      for (const key of ['left', 'right'] as const) {
        const op = v.object(c[key], `${path}/${key}`, ['variable', 'constant']);
        const hasVariable = Object.hasOwn(op, 'variable');
        const hasConstant = Object.hasOwn(op, 'constant');
        if (hasVariable === hasConstant)
          v.issue(
            `${path}/${key}`,
            'value',
            'Operand requires exactly one variable or constant.',
          );
        if (
          hasVariable &&
          (typeof op.variable !== 'string' || !names.has(op.variable))
        )
          v.issue(
            `${path}/${key}/variable`,
            'value',
            'Unknown generated name.',
          );
        if (
          hasConstant &&
          (typeof op.constant !== 'number' || !exactNumber(op.constant))
        )
          v.issue(
            `${path}/${key}/constant`,
            'value',
            'Constant requires an exact six-place numeric encoding within coefficient +/-1000000000.',
          );
      }
    }
  });
}
