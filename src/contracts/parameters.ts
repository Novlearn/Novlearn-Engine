import type { GenerationParameterV1, ValidationResult } from './types.js';
import { decimalGrid } from './decimal-grid.js';
import { inspectIntegerParameter, validate } from './validation.js';

/** Internal validator sharing the Lot 2 inert JSON and symbol boundary. */
export function validateParameters(
  input: unknown,
): ValidationResult<GenerationParameterV1[]> {
  return validate(input, (v, data) => {
    const names = new Set<string>();
    for (const [index, value] of v.list(data, '', 16).entries()) {
      const path = `/${index}`;
      // Inspect the tag only after copying inert JSON; never execute caller properties.
      const tag =
        value !== null && typeof value === 'object' && !Array.isArray(value)
          ? value.kind
          : undefined;
      const fields =
        tag === 'choice'
          ? ['name', 'kind', 'values']
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
          continue;
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
          continue;
        }
        const low = decimalGrid(min, precision).ceil;
        const high = decimalGrid(max, precision).floor;
        if (Math.abs(low) > 1_000_000_000 || Math.abs(high) > 1_000_000_000) {
          v.issue(path, 'limit', 'Scaled decimal bounds exceed +/-1000000000.');
          continue;
        }
        const excluded = new Set<number>();
        for (const [i, item] of v
          .list(p.exclusions, `${path}/exclusions`)
          .entries()) {
          const ep = `${path}/exclusions/${i}`;
          if (typeof item !== 'number' || item < min || item > max) {
            v.issue(
              ep,
              'value',
              'Exclusion must be a number within the bounds.',
            );
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
    }
  });
}
