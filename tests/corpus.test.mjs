import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Test-only documentary decoding, not a runtime legacy adapter.
const raw = readFileSync(
  new URL('./fixtures/legacy/exercises_rows.original.json', import.meta.url),
);
const rows = JSON.parse(raw.toString('utf8'));
const inventory = JSON.parse(
  readFileSync(
    new URL('./fixtures/legacy/inventory.json', import.meta.url),
    'utf8',
  ),
);

describe('received historical corpus conservation', () => {
  it('anchors the native transcription to the chosen historical question', () => {
    const native = JSON.parse(
      readFileSync(
        new URL(
          './fixtures/contracts/rational-minimum.definition.json',
          import.meta.url,
        ),
        'utf8',
      ),
    );
    const row = rows.find((row) => row.id === 103);
    const source = JSON.parse(row.content);
    const question = source.elements[2];
    expect(native.title).toBe(row.title);
    expect(native.elements[2].id).toBe(String(question.id));
    expect(native.elements[2].text).toBe(question.content.question);
    expect(native.elements[2].points).toBe(question.content.points);
    expect(native.generation.definitions).toEqual(
      source.variables.map((p) => ({
        name: p.name,
        kind: p.type,
        min: p.min,
        max: p.max,
        exclusions: p.exclusions === '' ? [] : [Number(p.exclusions)],
      })),
    );
    expect(native.elements[0].text).toBe(
      'Soit f une fonction définie sur les réels par la formule suivante.',
    );
  });
  it('preserves all original bytes and the recorded provenance hash', () => {
    expect(raw).toEqual(
      readFileSync(new URL('../docs/exercises_rows.json', import.meta.url)),
    );
    expect(raw.length).toBe(14583);
    expect(createHash('sha256').update(raw).digest('hex')).toBe(
      '0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae',
    );
    expect(inventory.sha256).toBe(
      createHash('sha256').update(raw).digest('hex'),
    );
    expect(inventory.bytes).toBe(raw.length);
  });

  it('inventories every field of each row and of the decoded content and competences', () => {
    const entries = [];
    function walk(value, path, scope, rowId) {
      entries.push({
        rowId,
        scope,
        path,
        type:
          value === null
            ? 'null'
            : Array.isArray(value)
              ? 'array'
              : typeof value,
        status: 'preserved-original',
      });
      if (value !== null && typeof value === 'object') {
        for (const [key, item] of Object.entries(value))
          walk(
            item,
            `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`,
            scope,
            rowId,
          );
      }
    }
    expect(rows.map((row) => row.id)).toEqual([1, 6, 36, 64, 78, 96, 103, 106]);
    expect(inventory.rowIds).toEqual(rows.map((row) => row.id));
    for (const row of rows) {
      walk(row, '', 'row', row.id);
      walk(JSON.parse(row.content), '', 'content', row.id);
      walk(JSON.parse(row.competences), '', 'competences', row.id);
    }
    expect(inventory.entries).toEqual(entries);
    expect(entries).toHaveLength(558);
  });

  it('round-trips decoded JSON data without erasing encoded source strings or conflicts', () => {
    expect(JSON.parse(JSON.stringify(rows))).toEqual(rows);
    const row = rows.find((row) => row.id === 103);
    if (!row) throw new Error('Missing received row 103');
    const content = JSON.parse(row.content);
    expect(row.Is_Flash).toBe(true);
    expect(content.isFlash).toBe(false);
    expect(content.elements[2]?.content.correctAnswer).toBe(
      '\\frac{-@b}{2*@a}',
    );
    expect(JSON.parse(JSON.stringify(content))).toEqual(content);
    expect(JSON.parse(JSON.stringify(row)).content).toBe(row.content);
  });
});
