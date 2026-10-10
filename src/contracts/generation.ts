import type {
  GenerationDefinition,
  ScalarVariableDefinition,
  JsonValue,
  ValidationResult,
} from './types.js';
import {
  validate,
  inspectIntegerParameter,
  type Validation,
} from './validation.js';
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

export function admissibleScalar(
  p: ScalarVariableDefinition,
): ScalarVariableDefinition {
  return p.kind === 'choice'
    ? {
        name: p.name,
        kind: 'choice',
        values: p.values.filter((n) => !p.exclusions?.includes(n)),
      }
    : p;
}

/** Row typing is separate from exclusions, which discard whole rows. */
export function rowValueValid(p: ScalarVariableDefinition, n: number): boolean {
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
  components: ScalarVariableDefinition[],
  row: number[],
): boolean {
  return components.every((p, i) => !p.exclusions?.includes(row[i]!));
}

export function generationNames(d: GenerationDefinition): string[] {
  return d.definitions.flatMap((p) =>
    p.kind === 'tuple' ? p.components.map((c) => c.name) : [p.name],
  );
}

function inspectScalar(
  v: Validation,
  value: JsonValue,
  path: string,
  names: Set<string>,
): ScalarVariableDefinition | undefined {
  // Inspect the tag only after copying inert JSON; never execute caller properties.
  const tag =
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value.kind
      : undefined;
  const fields =
    tag === 'choice'
      ? ['name', 'kind', 'values', 'exclusions']
      : tag === 'decimal'
        ? ['name', 'kind', 'min', 'max', 'precision', 'exclusions']
        : ['name', 'kind', 'min', 'max', 'exclusions'];
  const p = v.object(value, path, fields);
  v.symbol(p.name, `${path}/name`, names);
  if (tag === 'integer') {
    inspectIntegerParameter(v, p, path);
  } else if (tag === 'choice') {
    const values = v.list(p.values, `${path}/values`);
    if (values.length === 0)
      v.issue(path, 'impossible-constraints', 'Choice list is empty.');
    const seen = new Set<number>();
    for (const [i, item] of values.entries()) {
      if (typeof item !== 'number')
        v.issue(`${path}/values/${i}`, 'type', 'Expected a finite number.');
      else {
        if (seen.has(item))
          v.issue(
            `${path}/values/${i}`,
            'collision',
            'Duplicate choice (including 0 and -0).',
          );
        seen.add(item);
      }
    }

    if (p.exclusions !== undefined) {
      const excluded = new Set<number>();
      for (const [i, n] of v
        .list(p.exclusions, path + '/exclusions')
        .entries()) {
        if (typeof n !== 'number' || !seen.has(n))
          v.issue(
            path + '/exclusions/' + i,
            'value',
            'Exclusion must occur in the choice list.',
          );
        else {
          if (excluded.has(n))
            v.issue(
              path + '/exclusions/' + i,
              'collision',
              'Duplicate exclusion.',
            );
          excluded.add(n);
        }
      }
      if (excluded.size >= values.length)
        v.issue(path, 'impossible-constraints', 'Every choice is excluded.');
    }
  } else if (tag === 'decimal') {
    const { min, max, precision } = p;
    if (
      typeof precision !== 'number' ||
      !Number.isInteger(precision) ||
      precision < 0 ||
      precision > 6
    ) {
      v.issue(
        `${path}/precision`,
        'value',
        'Precision must be an integer from 0 to 6.',
      );
      return undefined;
    }
    if (
      typeof min !== 'number' ||
      typeof max !== 'number' ||
      Math.abs(min) > 1_000_000 ||
      Math.abs(max) > 1_000_000
    ) {
      if (typeof min !== 'number' || Math.abs(min) > 1_000_000)
        v.issue(
          `${path}/min`,
          'value',
          'Bound must be finite and within +/-1000000.',
        );
      if (typeof max !== 'number' || Math.abs(max) > 1_000_000)
        v.issue(
          `${path}/max`,
          'value',
          'Bound must be finite and within +/-1000000.',
        );
      return undefined;
    }
    const low = decimalGrid(min, precision).ceil;
    const high = decimalGrid(max, precision).floor;
    if (Math.abs(low) > 1_000_000_000 || Math.abs(high) > 1_000_000_000) {
      v.issue(path, 'limit', 'Scaled decimal bounds exceed +/-1000000000.');
      return undefined;
    }
    const excluded = new Set<number>();
    for (const [i, item] of v
      .list(p.exclusions, `${path}/exclusions`)
      .entries()) {
      const ep = `${path}/exclusions/${i}`;
      if (typeof item !== 'number' || item < min || item > max) {
        v.issue(ep, 'value', 'Exclusion must be a number within the bounds.');
        continue;
      }
      const grid = decimalGrid(item, precision);
      if (!grid.aligned)
        v.issue(ep, 'value', 'Exclusion must lie on the decimal grid.');
      else {
        if (excluded.has(grid.floor))
          v.issue(ep, 'collision', 'Duplicate exclusion.');
        excluded.add(grid.floor);
      }
    }
    if (min > max || low > high || excluded.size >= high - low + 1)
      v.issue(
        path,
        'impossible-constraints',
        'Decimal grid has no admissible values.',
      );
  } else {
    v.issue(
      `${path}/kind`,
      'value',
      'Unsupported generation type; only integer, decimal and choice are supported.',
    );
  }

  return v.diagnostics.length === 0
    ? (value as unknown as ScalarVariableDefinition)
    : undefined;
}
function inspectComputed(
  v: Validation,
  input: JsonValue,
  path: string,
  names: Set<string>,
): void {
  const p = v.object(input, path, ['name', 'kind', 'latex', 'restrictions']);
  v.symbol(p.name, `${path}/name`, names);
  v.text(p.latex, `${path}/latex`);
  if (p.restrictions !== undefined) {
    const r = v.object(p.restrictions, `${path}/restrictions`, [
      'domain',
      'min',
      'max',
      'exclusions',
    ]);
    if (r.domain !== 'integer' && r.domain !== 'rational')
      v.issue(
        `${path}/restrictions/domain`,
        'value',
        'Expected integer or rational.',
      );
    for (const key of ['min', 'max'] as const)
      if (
        r[key] !== undefined &&
        (typeof r[key] !== 'number' || !exactNumber(r[key]))
      )
        v.issue(
          `${path}/restrictions/${key}`,
          'value',
          'Expected a bounded exact numeric restriction.',
        );
    if (typeof r.min === 'number' && typeof r.max === 'number' && r.min > r.max)
      v.issue(
        `${path}/restrictions`,
        'impossible-constraints',
        'Minimum exceeds maximum.',
      );
    if (r.exclusions !== undefined) {
      const seen = new Set<number>();
      for (const [j, n] of v
        .list(r.exclusions, `${path}/restrictions/exclusions`)
        .entries()) {
        if (typeof n !== 'number' || !exactNumber(n))
          v.issue(
            `${path}/restrictions/exclusions/${j}`,
            'value',
            'Expected bounded exact exclusions.',
          );
        else {
          if (seen.has(n))
            v.issue(
              `${path}/restrictions/exclusions/${j}`,
              'collision',
              'Duplicate exclusion.',
            );
          seen.add(n);
        }
      }
    }
  }
}
/** Inspect already copied inert JSON once, preserving declaration paths. */
export function inspectGeneration(v: Validation, data: JsonValue): void {
  const d = v.object(data, '', [
    'schemaVersion',
    'definitions',
    'constraints',
    'maxAttempts',
    'maxDraws',
  ]);
  if (d.schemaVersion !== 5)
    v.issue(
      '/schemaVersion',
      'unknown-version',
      'Expected generation schemaVersion 5.',
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
    if (tag === 'computed') {
      inspectComputed(v, inputDefinition, path, names);
      continue;
    }
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
          if (
            rowAllowed(scalars as ScalarVariableDefinition[], row as number[])
          )
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
  for (const [i, inputConstraint] of v
    .list(d.constraints, '/constraints', 32)
    .entries()) {
    const path = `/constraints/${i}`;
    const c = v.object(inputConstraint, path, [
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
      v.issue(`${path}/operator`, 'value', 'Unsupported comparison operator.');
    for (const key of ['left', 'right'] as const) {
      const op = v.object(c[key], `${path}/${key}`, [
        'variable',
        'constant',
        'latex',
      ]);
      if (Object.keys(op).length !== 1)
        v.issue(
          `${path}/${key}`,
          'value',
          'Operand requires exactly one variable, constant or latex.',
        );
      if (
        Object.hasOwn(op, 'variable') &&
        (typeof op.variable !== 'string' || !names.has(op.variable))
      )
        v.issue(`${path}/${key}/variable`, 'value', 'Unknown resolved name.');
      if (
        Object.hasOwn(op, 'constant') &&
        (typeof op.constant !== 'number' || !exactNumber(op.constant))
      )
        v.issue(
          `${path}/${key}/constant`,
          'value',
          'Expected a bounded exact constant.',
        );
      if (Object.hasOwn(op, 'latex')) v.text(op.latex, `${path}/${key}/latex`);
    }
  }
}
export function validateGeneration(
  input: unknown,
): ValidationResult<GenerationDefinition> {
  return validate(input, inspectGeneration);
}
