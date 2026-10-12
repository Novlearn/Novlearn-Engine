import { describe, expect, it } from 'vitest';
import { adaptLegacyExercise } from 'novlearn-exercise-engine/legacy';
import type { LegacyRecipe } from 'novlearn-exercise-engine/legacy';
import {
  gradeAnswer,
  instantiateExercise,
  projectPublicInstance,
  validateDefinition,
} from 'novlearn-exercise-engine';
import type { ExerciseInstance } from 'novlearn-exercise-engine';
import rows from './fixtures/legacy/exercises_rows.original.json' with { type: 'json' };
import rawRecipes from './fixtures/legacy/recipes.json' with { type: 'json' };
import inventory from './fixtures/legacy/inventory.json' with { type: 'json' };
import { convertLegacyMath } from '../dist/adapters/legacy/source.js';

const recipes: Record<string, LegacyRecipe> = rawRecipes as Record<
  string,
  LegacyRecipe
>;
function adaptation(id: number) {
  const row = rows.find((r) => r.id === id)!;
  return adaptLegacyExercise(row, 'database-row-v1', recipes[String(id)]!);
}
function official(id: number, seed: number): ExerciseInstance {
  const adapted = adaptation(id);
  if (!adapted.ok) throw new Error(JSON.stringify(adapted.report.diagnostics));
  const result = instantiateExercise(adapted.definition, {
    seed,
    instanceId: `legacy-${id}-${seed}`,
  });
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.value;
}
function scalar(instance: ExerciseInstance, name: string): number {
  const v = instance.generation.values[name];
  if (!v) return NaN;
  return v.kind === 'rational'
    ? v.numerator / v.denominator
    : v.kind === 'decimal'
      ? v.coefficient / 10 ** v.precision
      : v.value;
}
describe('reviewed historical conversion, distinct from a production migration', () => {
  it('preserves French decimals and admits digits belonging to declared placeholder names', () => {
    expect(convertLegacyMath('1{,}25', new Map(), [])).toBe('1{,}25');
    expect(
      convertLegacyMath('@u1234567890+1', new Map([['u1234567890', 'a']]), []),
    ).toBe('\\mathrm{a}+1');
  });
  for (const row of rows)
    it(`preserves every original field and encoded string of ${row.id}`, () => {
      const adapted = adaptation(row.id);
      expect(adapted.ok, JSON.stringify(adapted.report.diagnostics)).toBe(true);
      if (!adapted.ok) return;
      expect(adapted.report.original).toEqual(row);
      expect(adapted.definition.extensions?.legacy).toMatchObject({
        original: row,
        decodedContent: JSON.parse(row.content),
        decodedCompetences: JSON.parse(row.competences),
      });
      expect(adapted.report.productionMigration).toBe(false);
      expect(validateDefinition(adapted.definition).ok).toBe(true);
      expect(adapted.definition.elements.map((e) => e.id)).toEqual(
        JSON.parse(row.content).elements.map((e: { id: number }) =>
          String(e.id),
        ),
      );
    });
  it('covers all 558 inventoried paths without dropping unmapped fields', () => {
    const mapped = rows.flatMap((row) =>
      adaptation(row.id).report.mappings.map((m) => ({
        rowId: row.id,
        scope: m.scope,
        path: m.path,
      })),
    );
    const observed = inventory.entries.map((e) => ({
      rowId: e.rowId,
      scope: e.scope,
      path: e.path,
    }));
    expect(mapped).toEqual(observed);
  });
  for (const row of rows)
    for (const seed of [0, 1, 42, 0xffffffff])
      it(`instantiates and grades full row ${row.id} at seed ${seed}`, () => {
        const instance = official(row.id, seed);
        const projected = projectPublicInstance(instance);
        expect(JSON.stringify(projected)).not.toMatch(
          /expected|policy|legacyPath|correctAnswer|decodedContent|generation|seed/,
        );
        expect(instance.elements.length).toBe(
          JSON.parse(row.content).elements.length,
        );
        const a = scalar(instance, 'a'),
          b = scalar(instance, 'b'),
          k = scalar(instance, 'k');
        const answers: Record<number, string[]> = {
          1: ['-\\infty'],
          6: [`\\ln(${k})`],
          64: ['7'],
          78: [`\\sqrt{${k}}`],
          96: [String(2 * k)],
          103: [`\\frac{${-b}}{${2 * a}}`],
          106: [`${a}\\ln(x)+${a + b}`, `e^{\\frac{${-(a + b)}}{${a}}}`],
        };
        let index = 0;
        for (const q of instance.elements)
          if (q.type === 'question' || q.type === 'mcq') {
            const answer =
              q.type === 'mcq'
                ? {
                    format: 'selection' as const,
                    optionIds: q.expected.optionIds,
                  }
                : {
                    format: 'latex' as const,
                    source: answers[row.id]![index++]!,
                  };
            const submission = {
              schemaVersion: 5,
              instanceId: instance.instanceId,
              questionId: q.id,
              answer,
            };
            expect(gradeAnswer(instance, submission).state).toBe('correct');
            expect(
              gradeAnswer(instance, {
                ...submission,
                answer:
                  q.type === 'mcq'
                    ? { format: 'selection', optionIds: [] }
                    : { format: 'latex', source: '' },
              }),
            ).toMatchObject({ state: 'invalid', code: 'empty-answer' });
            if (q.type === 'mcq') {
              const wrong = q.options.find(
                (o) => !q.expected.optionIds.includes(o.id),
              );
              if (wrong)
                expect(
                  gradeAnswer(instance, {
                    ...submission,
                    answer: { format: 'selection', optionIds: [wrong.id] },
                  }).state,
                ).toBe('incorrect');
            }
          }
        if (row.id === 36) {
          expect(a).not.toBe(0);
          expect(scalar(instance, 'b')).toBe(a * a + 1);
          expect(scalar(instance, 'c')).toBe(2 * a);
          expect(scalar(instance, 'd')).toBe(-a);
        }
        if (row.id === 78) {
          const u0 = scalar(instance, 'u0');
          expect(u0).not.toBe(1);
          expect(k).not.toBe(2 * u0 * u0);
          expect([4, 9]).not.toContain(k);
        }
        if (row.id === 96) {
          expect(scalar(instance, 'limitValue')).toBe(2 * k);
          expect(scalar(instance, 'u0')).toBeLessThanOrEqual(2 * k);
        }
        if (row.id === 106) {
          expect(a).not.toBe(b);
          expect(scalar(instance, 'c')).toBe(-a - b);
        }
      }, 20000);
  it('requires the approved conflict decision for103', () => {
    const recipe = structuredClone(recipes['103']!);
    delete recipe.flags;
    const r = adaptLegacyExercise(
      rows.find((r) => r.id === 103),
      'database-row-v1',
      recipe,
    );
    expect(r.ok).toBe(false);
    expect(r.report.diagnostics[0]?.message).toContain('conflicting flags');
    const embedded = adaptLegacyExercise(
      rows.find((r) => r.id === 103),
      'database-row-v1',
      {
        ...recipes['103']!,
        flags: { flash: 'content' },
        id: 'reviewed-new-id',
      },
    );
    expect(embedded.ok).toBe(true);
    if (embedded.ok) {
      expect(embedded.definition.catalogue?.exerciseType).toBe('classic');
      expect(
        embedded.report.mappings.find(
          (m) => m.scope === 'content' && m.path === '/isFlash',
        )?.disposition,
      ).toBe('mapped');
      expect(
        embedded.report.mappings.find(
          (m) => m.scope === 'row' && m.path === '/Is_Flash',
        )?.disposition,
      ).toBe('preserved-private');
      expect(
        embedded.report.mappings.find(
          (m) => m.scope === 'row' && m.path === '/id',
        )?.disposition,
      ).toBe('preserved-private');
    }
    const good = adaptation(103);
    if (good.ok) expect(good.definition.catalogue?.exerciseType).toBe('flash');
  });
  it('preserves default graph visibility, synthetic scoped IDs and private hints', () => {
    const r = adaptation(64);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const graph = r.definition.elements.find(
      (e) => e.type === 'function-graph',
    );
    if (graph?.type === 'function-graph')
      expect(graph.functions[0]?.showExpression).toBe(true);
    expect(
      r.report.decisions.some((d) => d.includes('synthetic path ID')),
    ).toBe(true);
    expect(r.definition.catalogue?.difficulty).toBeUndefined();
    const second = adaptation(36);
    if (second.ok)
      expect(
        second.definition.elements.find((e) => e.type === 'mcq')?.extensions
          ?.legacy,
      ).toHaveProperty('hint');
  });
  it('accepts explicitly decoded publication and flat Creator shapes as synthetic source-based tests', () => {
    const row = rows[0]!,
      recipe = recipes[String(row.id)]!;
    const content = JSON.parse(row.content),
      competences = JSON.parse(row.competences);
    const publication = { ...row, content, competences };
    const flat = {
      id: row.id,
      title: row.title,
      appTitle: row.app_title,
      chapter: row.chapter,
      difficulty: row.difficulty,
      competences,
      variables: content.variables,
      elements: content.elements,
      Is_Flash: row.Is_Flash,
      Need_Calculator: row.Need_Calculator,
    };
    expect(
      adaptLegacyExercise(publication, 'creator-publication-v1', recipe).ok,
    ).toBe(true);
    const flatResult = adaptLegacyExercise(flat, 'creator-document-v1', recipe);
    expect(flatResult.ok).toBe(true);
    expect(
      flatResult.report.mappings.find(
        (m) => m.scope === 'row' && m.path === '/appTitle',
      )?.target,
    ).toBe('/catalogue/appTitle');
    const { id: discardedId, ...fresh } = flat;
    expect(discardedId).toBe(row.id);
    expect(
      adaptLegacyExercise(fresh, 'creator-document-v1', {
        ...recipe,
        id: 'new-reviewed-id',
      }).ok,
    ).toBe(true);
    expect(adaptLegacyExercise(publication, 'database-row-v1', recipe).ok).toBe(
      false,
    );
  });
  it('never invokes getters, accepts JS programs or silently skips unsupported elements', () => {
    let invoked = 0;
    const hostile = {
      get content() {
        invoked++;
        return '{}';
      },
    };
    expect(
      adaptLegacyExercise(hostile, 'database-row-v1', recipes['1']!).ok,
    ).toBe(false);
    expect(invoked).toBe(0);
    for (const expression of [
      'process.exit(0)',
      '(()=>{throw 1})()',
      'Math.random()',
      '1%comment\n+2',
      '2^{}',
      '1.',
      '@ab',
      '@u01',
      '1.1234567',
    ]) {
      const row = structuredClone(rows.find((r) => r.id === 36)!);
      const c = JSON.parse(row.content);
      c.variables[1].expression = expression;
      row.content = JSON.stringify(c);
      expect(
        adaptLegacyExercise(row, 'database-row-v1', recipes['36']!).ok,
        expression,
      ).toBe(false);
    }
    const row = structuredClone(rows[0]!);
    const c = JSON.parse(row.content);
    c.elements[0].type = 'javascript';
    row.content = JSON.stringify(c);
    expect(adaptLegacyExercise(row, 'database-row-v1', recipes['1']!).ok).toBe(
      false,
    );
    row.content = '{bad json';
    expect(adaptLegacyExercise(row, 'database-row-v1', recipes['1']!).ok).toBe(
      false,
    );
  });
  it('rejects malformed or unknown recipe data rather than returning an ill-typed report', () => {
    const recipe = recipes['1']!;
    for (const mutation of [
      { decisions: [1] },
      { decisions: 'text' },
      { questions: [] },
      { flags: { flash: 'invented' } },
      { unknown: true },
    ]) {
      const hostile = { ...recipe, ...mutation };
      expect(
        adaptLegacyExercise(
          rows[0],
          'database-row-v1',
          hostile as unknown as LegacyRecipe,
        ).ok,
      ).toBe(false);
    }
  });
});
