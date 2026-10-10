import type {
  GenerationDefinitionV3,
  ComputedParameterV3,
  ValidationResult,
} from './types.js';
import { validate } from './validation.js';
import {
  exactNumber,
  generationNames,
  validateGenerationV2,
} from './generation-v2.js';

export function resolvedNames(d: GenerationDefinitionV3): string[] {
  return d.definitions.flatMap((p) =>
    p.kind === 'tuple' ? p.components.map((c) => c.name) : [p.name],
  );
}

/** Inert structural validation; mathematical references are checked by resolution before RNG. */
export function validateGenerationV3(
  input: unknown,
): ValidationResult<GenerationDefinitionV3> {
  return validate(input, (v, data) => {
    const d = v.object(data, '', [
      'schemaVersion',
      'definitions',
      'constraints',
      'maxAttempts',
      'maxDraws',
    ]);
    if (d.schemaVersion !== 3)
      v.issue(
        '/schemaVersion',
        'unknown-version',
        'Expected generation schemaVersion 3.',
      );
    const definitions = v.list(d.definitions, '/definitions', 16);
    const random: typeof definitions = [];
    const indices: number[] = [];
    const computed: { value: ComputedParameterV3; path: string }[] = [];
    for (const [i, inputDefinition] of definitions.entries()) {
      const path = `/definitions/${i}`;
      if (
        inputDefinition !== null &&
        typeof inputDefinition === 'object' &&
        !Array.isArray(inputDefinition) &&
        inputDefinition.kind === 'computed'
      ) {
        const p = v.object(inputDefinition, path, [
          'name',
          'kind',
          'latex',
          'restrictions',
        ]);
        v.symbol(p.name, `${path}/name`, new Set());
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
          if (
            typeof r.min === 'number' &&
            typeof r.max === 'number' &&
            r.min > r.max
          )
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
        computed.push({ value: p as unknown as ComputedParameterV3, path });
      } else {
        random.push(inputDefinition);
        indices.push(i);
      }
    }
    // All historical scalar/tuple/domain rules remain in the v2 validator.
    const base = validateGenerationV2({
      schemaVersion: 2,
      definitions: random,
      constraints: [],
      maxAttempts: d.maxAttempts,
      maxDraws: d.maxDraws,
    });
    const names = new Set<string>();
    if (!base.ok)
      for (const issue of base.diagnostics) {
        const parts = issue.path.split('/');
        if (parts[1] === 'definitions' && parts[2] !== undefined)
          parts[2] = String(indices[Number(parts[2])] ?? parts[2]);
        v.issue(parts.join('/'), issue.code, issue.message);
      }
    else for (const name of generationNames(base.value)) names.add(name);
    for (const p of computed) v.symbol(p.value.name, `${p.path}/name`, names);
    if (names.size > 16)
      v.issue('/definitions', 'limit', 'At most sixteen resolved values.');
    if (base.ok)
      for (const p of base.value.definitions)
        if (p.kind === 'tuple' && names.has(p.id))
          v.issue(
            '/definitions',
            'collision',
            'Tuple IDs and resolved names must be disjoint.',
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
        v.issue(
          `${path}/operator`,
          'value',
          'Unsupported comparison operator.',
        );
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
        if (Object.hasOwn(op, 'latex'))
          v.text(op.latex, `${path}/${key}/latex`);
      }
    }
  });
}
