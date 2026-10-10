import type {
  ContractDiagnostic,
  ExerciseDefinitionV1,
  ExerciseDefinitionV2,
  JsonObject,
  JsonValue,
  SubmissionV1,
  ValidationResult,
} from './types.js';
import { inspectComposition } from './composition.js';

const MAX_TEXT = 4096;
const MAX_ITEMS = 128;
const MAX_INTEGER = 1_000_000;
const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);

function child(path: string, key: string | number): string {
  return `${path}/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`;
}

function record(value: JsonValue | undefined): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export class Validation {
  readonly diagnostics: ContractDiagnostic[] = [];
  private nodes = 0;
  private readonly ancestors = new Set<object>();

  issue(path: string, code: ContractDiagnostic['code'], message: string): void {
    // Keep diagnostics bounded even for hostile structures.
    if (this.diagnostics.length < MAX_ITEMS)
      this.diagnostics.push({ path, code, message });
  }

  /** Copy only inert JSON data, without invoking getters or accepting class instances. */
  copy(input: unknown, path = '', depth = 0): JsonValue {
    this.nodes += 1;
    if (depth > 16 || this.nodes > 10_000) {
      this.issue(path, 'limit', 'JSON depth or node budget exceeded.');
      return null;
    }
    if (input === null || typeof input === 'boolean') return input;
    if (typeof input === 'string') {
      if (input.length > MAX_TEXT)
        this.issue(path, 'limit', 'String exceeds 4096 characters.');
      return input;
    }
    if (typeof input === 'number' && Number.isFinite(input)) return input;
    if (typeof input !== 'object' || input === null) {
      this.issue(path, 'invalid-json', 'Expected finite JSON data.');
      return null;
    }
    if (this.ancestors.has(input)) {
      this.issue(path, 'invalid-json', 'Cyclic data is not JSON.');
      return null;
    }
    if (
      !Array.isArray(input) &&
      Object.getPrototypeOf(input) !== Object.prototype &&
      Object.getPrototypeOf(input) !== null
    ) {
      this.issue(path, 'invalid-json', 'Expected a plain JSON object.');
      return null;
    }
    const keys = Reflect.ownKeys(input);
    if (
      keys.length > MAX_ITEMS + (Array.isArray(input) ? 1 : 0) ||
      (Array.isArray(input) && input.length > MAX_ITEMS)
    ) {
      this.issue(path, 'limit', 'Collection exceeds 128 entries.');
      return null;
    }
    this.ancestors.add(input);
    const output: JsonObject = Object.create(null) as JsonObject;
    const array: JsonValue[] = [];
    for (const key of keys) {
      if (Array.isArray(input) && key === 'length') continue;
      if (typeof key === 'string' && key.length > 128) {
        this.issue(path, 'limit', 'Object key exceeds 128 characters.');
        continue;
      }
      if (typeof key !== 'string' || forbiddenKeys.has(key)) {
        this.issue(
          typeof key === 'string' ? child(path, key) : path,
          'invalid-json',
          'Symbol or unsafe object key.',
        );
        continue;
      }
      const property = Object.getOwnPropertyDescriptor(input, key);
      if (!property || !('value' in property) || !property.enumerable) {
        this.issue(
          child(path, key),
          'invalid-json',
          'Only enumerable data properties are allowed.',
        );
        continue;
      }
      if (Array.isArray(input)) {
        if (key !== String(array.length)) {
          this.issue(
            child(path, key),
            'invalid-json',
            'Sparse or decorated arrays are not allowed.',
          );
          continue;
        }
        array.push(this.copy(property.value, child(path, key), depth + 1));
      } else {
        output[key] = this.copy(property.value, child(path, key), depth + 1);
      }
    }
    if (Array.isArray(input) && array.length !== input.length) {
      this.issue(path, 'invalid-json', 'Sparse arrays are not allowed.');
    }
    this.ancestors.delete(input);
    return Array.isArray(input) ? array : output;
  }

  object(
    value: JsonValue | undefined,
    path: string,
    fields: readonly string[],
  ): JsonObject {
    if (!record(value)) {
      this.issue(path, 'type', 'Expected an object.');
      return {};
    }
    for (const key of Object.keys(value)) {
      if (!fields.includes(key))
        this.issue(
          child(path, key),
          'unknown-field',
          'Unknown field; use private extensions for definition metadata.',
        );
    }
    return value;
  }

  list(
    value: JsonValue | undefined,
    path: string,
    max = MAX_ITEMS,
  ): JsonValue[] {
    if (!Array.isArray(value)) {
      this.issue(path, 'type', 'Expected an array.');
      return [];
    }
    if (value.length > max)
      this.issue(path, 'limit', `At most ${max} entries are allowed.`);
    return value;
  }

  text(
    value: JsonValue | undefined,
    path: string,
    max = MAX_TEXT,
    empty = false,
  ): void {
    if (typeof value !== 'string')
      this.issue(path, 'type', 'Expected a string.');
    else if (value.length > max || (!empty && value.trim().length === 0)) {
      this.issue(
        path,
        'value',
        `Expected ${empty ? '0' : '1'} to ${max} characters.`,
      );
    }
  }

  literal(
    value: JsonValue | undefined,
    path: string,
    expected: JsonValue,
  ): void {
    if (value !== expected)
      this.issue(path, 'value', `Expected ${String(expected)}.`);
  }

  version(value: JsonValue | undefined): void {
    if (value !== 1)
      this.issue(
        '/schemaVersion',
        'unknown-version',
        'Only schemaVersion 1 is supported.',
      );
  }

  integer(value: JsonValue | undefined, path: string): value is number {
    if (
      typeof value !== 'number' ||
      !Number.isSafeInteger(value) ||
      Math.abs(value) > MAX_INTEGER
    ) {
      this.issue(
        path,
        'value',
        'Expected an integer between -1000000 and 1000000.',
      );
      return false;
    }
    return true;
  }

  symbol(value: JsonValue | undefined, path: string, names: Set<string>): void {
    if (
      typeof value !== 'string' ||
      value.length !== 1 ||
      !/^[a-z]$/.test(value) ||
      value === 'e' ||
      value === 'i'
    ) {
      this.issue(
        path,
        'value',
        'Expected one lower-case Latin symbol, excluding e and i.',
      );
      return;
    }
    if (names.has(value))
      this.issue(
        path,
        'collision',
        'Parameter and variable names must be unique and disjoint.',
      );
    names.add(value);
  }
}

export function validate<T>(
  input: unknown,
  inspect: (v: Validation, data: JsonValue) => void,
): ValidationResult<T> {
  const v = new Validation();
  let data: JsonValue;
  try {
    data = v.copy(input);
  } catch {
    v.issue('', 'invalid-json', 'Unable to inspect JSON data.');
    return { ok: false, diagnostics: v.diagnostics };
  }
  if (v.diagnostics.length === 0) inspect(v, data);
  if (v.diagnostics.length) return { ok: false, diagnostics: v.diagnostics };
  // All fields have been checked above; the copy is detached from caller-owned data.
  return { ok: true, value: data as T };
}

/** Shared integer domain checks for definition and generation boundaries. */
export function inspectIntegerParameter(
  v: Validation,
  p: JsonObject,
  path: string,
): void {
  const minValid = v.integer(p.min, child(path, 'min'));
  const maxValid = v.integer(p.max, child(path, 'max'));
  const excluded = new Set<number>();
  for (const [i, exclusion] of v
    .list(p.exclusions, child(path, 'exclusions'))
    .entries()) {
    const exclusionPath = child(child(path, 'exclusions'), i);
    if (!v.integer(exclusion, exclusionPath)) continue;
    if (excluded.has(exclusion))
      v.issue(exclusionPath, 'collision', 'Duplicate exclusion.');
    excluded.add(exclusion);
    if (
      minValid &&
      maxValid &&
      typeof p.min === 'number' &&
      typeof p.max === 'number' &&
      (exclusion < p.min || exclusion > p.max)
    ) {
      v.issue(exclusionPath, 'value', 'Exclusion must lie within the range.');
    }
  }
  if (
    minValid &&
    maxValid &&
    typeof p.min === 'number' &&
    typeof p.max === 'number'
  ) {
    if (p.min > p.max)
      v.issue(path, 'impossible-constraints', 'Minimum exceeds maximum.');
    else if (excluded.size >= p.max - p.min + 1)
      v.issue(path, 'impossible-constraints', 'Every value is excluded.');
  }
}

/** Structural validation only: no parsing, substitution or mathematical proof. */
export function validateDefinition(
  input: ExerciseDefinitionV1,
): ValidationResult<ExerciseDefinitionV1>;
export function validateDefinition(
  input: ExerciseDefinitionV2,
): ValidationResult<ExerciseDefinitionV2>;
export function validateDefinition(
  input: unknown,
): ValidationResult<ExerciseDefinitionV1 | ExerciseDefinitionV2>;
export function validateDefinition(
  input: unknown,
): ValidationResult<ExerciseDefinitionV1 | ExerciseDefinitionV2> {
  return validate(input, (v, data) => {
    if (record(data) && data.schemaVersion === 2 && data.kind === 'composed') {
      inspectComposition(v, data);
      return;
    }
    const d = v.object(data, '', [
      'schemaVersion',
      'kind',
      'id',
      'revision',
      'title',
      'parameters',
      'variables',
      'statement',
      'question',
      'extensions',
    ]);
    v.version(d.schemaVersion);
    v.literal(d.kind, '/kind', 'rational-value');
    v.text(d.id, '/id', 128);
    v.text(d.revision, '/revision', 128);
    v.text(d.title, '/title');
    const names = new Set<string>();
    for (const [index, value] of v
      .list(d.parameters, '/parameters', 16)
      .entries()) {
      const path = child('/parameters', index);
      const p = v.object(value, path, [
        'name',
        'kind',
        'min',
        'max',
        'exclusions',
      ]);
      v.symbol(p.name, child(path, 'name'), names);
      v.literal(p.kind, child(path, 'kind'), 'integer');
      inspectIntegerParameter(v, p, path);
    }
    for (const [index, value] of v
      .list(d.variables, '/variables', 16)
      .entries()) {
      const path = child('/variables', index);
      const variable = v.object(value, path, ['name', 'domain']);
      v.symbol(variable.name, child(path, 'name'), names);
      if (variable.domain !== 'real' && variable.domain !== 'integer')
        v.issue(child(path, 'domain'), 'value', 'Expected real or integer.');
    }
    const statement = v.object(d.statement, '/statement', ['text', 'latex']);
    v.text(statement.text, '/statement/text');
    v.text(statement.latex, '/statement/latex');
    const q = v.object(d.question, '/question', [
      'id',
      'text',
      'points',
      'expectedLatex',
      'policy',
    ]);
    v.text(q.id, '/question/id', 128);
    v.text(q.text, '/question/text');
    v.text(q.expectedLatex, '/question/expectedLatex');
    if (
      !v.integer(q.points, '/question/points') ||
      typeof q.points !== 'number' ||
      q.points <= 0
    )
      v.issue(
        '/question/points',
        'value',
        'Points must be a positive integer.',
      );
    const policy = v.object(q.policy, '/question/policy', ['domain', 'form']);
    v.literal(policy.domain, '/question/policy/domain', 'rational');
    v.literal(policy.form, '/question/policy/form', 'value-only');
    if (d.extensions !== undefined && !record(d.extensions))
      v.issue('/extensions', 'type', 'Expected a private JSON object.');
  });
}

/** Transport validation preserves source; instance lookup and mathematical checks remain server responsibilities. */
export function validateSubmission(
  input: unknown,
): ValidationResult<SubmissionV1> {
  return validate(input, (v, data) => {
    const d = v.object(data, '', [
      'schemaVersion',
      'instanceId',
      'questionId',
      'answer',
    ]);
    v.version(d.schemaVersion);
    v.text(d.instanceId, '/instanceId', 128);
    v.text(d.questionId, '/questionId', 128);
    const answer = v.object(d.answer, '/answer', ['format', 'source']);
    v.literal(answer.format, '/answer/format', 'latex');
    v.text(answer.source, '/answer/source', MAX_TEXT, true);
  });
}
