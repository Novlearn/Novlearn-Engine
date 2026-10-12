import { Validation, validateDefinition } from '../../contracts/validation.js';
import type {
  ExerciseDefinition,
  ExerciseElement,
  JsonObject,
  JsonValue,
  VariableDefinition,
} from '../../contracts/types.js';
import { isMathName } from '../../contracts/names.js';
import { convertLegacyMath, convertLegacyText } from './source.js';
import type { LegacyAdaptation, LegacyRecipe, LegacyReport } from './types.js';

function object(value: JsonValue | undefined, path: string): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: expected object`);
  return value;
}
function string(value: JsonValue | undefined, path: string): string {
  if (typeof value !== 'string') throw new Error(`${path}: expected string`);
  return value;
}
function number(value: JsonValue | undefined, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error(`${path}: expected finite number`);
  return value;
}
function boolean(value: JsonValue | undefined, path: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${path}: expected boolean`);
  return value;
}
function list(value: JsonValue | undefined, path: string): JsonValue[] {
  if (!Array.isArray(value)) throw new Error(`${path}: expected array`);
  return value;
}
function identity(value: JsonValue | undefined, path: string): string {
  if (typeof value === 'number' && Number.isSafeInteger(value))
    return String(value);
  if (typeof value === 'string' && value.length > 0) return value;
  throw new Error(`${path}: expected stable string or integer ID`);
}
function pointer(key: string): string {
  return key.replaceAll('~', '~0').replaceAll('/', '~1');
}

/** Explicit conversion only. Unknown data remains private; unsupported behavior blocks. */
export function adaptLegacyExercise(
  input: unknown,
  sourceFormat: LegacyReport['sourceFormat'],
  recipe: LegacyRecipe,
): LegacyAdaptation {
  const validation = new Validation();
  const raw = validation.copy(input);
  const report: LegacyReport = {
    adapterVersion: 'legacy-to-canonical-v1',
    sourceFormat,
    classification: 'blocked',
    original: {},
    mappings: [],
    decisions: [],
    diagnostics: validation.diagnostics.map((d) => ({
      path: d.path,
      message: d.message,
    })),
    productionMigration: false,
  };
  if (report.diagnostics.length) return { ok: false, report };
  try {
    const row = object(raw, '');
    report.original = row;
    // Recipes are inert data too; getters/functions/unsafe keys cannot become authority.
    const rv = new Validation();
    const recipeObject = rv.object(rv.copy(recipe), '/recipe', [
      'id',
      'revision',
      'defaults',
      'variables',
      'aliases',
      'constraints',
      'questions',
      'flags',
      'decisions',
    ]);
    rv.text(recipeObject.revision, '/recipe/revision');
    if (recipeObject.id !== undefined) rv.text(recipeObject.id, '/recipe/id');
    rv.list(recipeObject.decisions, '/recipe/decisions').forEach((d, i) =>
      rv.text(d, `/recipe/decisions/${i}`),
    );
    rv.list(recipeObject.variables, '/recipe/variables');
    if (recipeObject.constraints !== undefined)
      rv.list(recipeObject.constraints, '/recipe/constraints');
    const q = object(recipeObject.questions, '/recipe/questions');
    Object.entries(q).forEach(([id, value]) =>
      rv.object(value, `/recipe/questions/${pointer(id)}`, [
        'response',
        'policy',
      ]),
    );
    if (recipeObject.aliases !== undefined) {
      const a = object(recipeObject.aliases, '/recipe/aliases');
      Object.entries(a).forEach(([name, value]) =>
        rv.text(value, `/recipe/aliases/${pointer(name)}`),
      );
    }
    if (recipeObject.flags !== undefined) {
      const f = rv.object(recipeObject.flags, '/recipe/flags', [
        'flash',
        'calculator',
      ]);
      for (const key of Object.keys(f))
        if (f[key] !== 'row' && f[key] !== 'content')
          rv.issue(
            `/recipe/flags/${key}`,
            'value',
            'Expected row or content flag authority.',
          );
    }
    if (rv.diagnostics.length) {
      report.diagnostics = rv.diagnostics.map((d) => ({
        path: d.path,
        message: d.message,
      }));
      return { ok: false, report };
    }
    if (recipe.defaults !== 'observed-creator-v1' || !recipe.revision.trim())
      throw new Error('recipe: explicit default profile and revision required');
    if (
      ![
        'database-row-v1',
        'creator-document-v1',
        'creator-publication-v1',
      ].includes(sourceFormat)
    )
      throw new Error('sourceFormat: unsupported format');
    report.decisions = [...recipe.decisions];
    const decoded = new Validation();
    const content =
      sourceFormat === 'database-row-v1'
        ? object(
            decoded.copy(JSON.parse(string(row.content, '/content'))),
            '/content',
          )
        : sourceFormat === 'creator-document-v1'
          ? { variables: row.variables!, elements: row.elements! }
          : object(row.content, '/content');
    const skills =
      sourceFormat === 'database-row-v1'
        ? decoded.copy(JSON.parse(string(row.competences, '/competences')))
        : (row.competences ?? []);
    if (decoded.diagnostics.length)
      throw new Error('decoded: JSON budget exceeded');
    const mapped = new Map<string, string>();
    const mark = (scope: string, path: string, target: string) =>
      mapped.set(`${scope}:${path}`, target);
    const walk = (
      scope: 'row' | 'content' | 'competences',
      value: JsonValue,
      path = '',
    ): void => {
      const target = mapped.get(`${scope}:${path}`);
      report.mappings.push({
        scope,
        path,
        disposition: target ? 'mapped' : 'preserved-private',
        ...(target ? { target } : {}),
      });
      if (value && typeof value === 'object')
        Object.entries(value).forEach(([key, child]) =>
          walk(scope, child, `${path}/${pointer(key)}`),
        );
    };
    const aliases = recipe.aliases ?? {};
    const names = new Map<string, string>();
    const variables = list(content.variables, '/content/variables');
    for (const [i, item] of variables.entries()) {
      const variable = object(item, `/content/variables/${i}`);
      const old = string(variable.name, `/content/variables/${i}/name`);
      const name = Object.hasOwn(aliases, old) ? aliases[old]! : old;
      if (
        !isMathName(name) ||
        names.has(old) ||
        [...names.values()].includes(name)
      )
        throw new Error(
          `/content/variables/${i}/name: invalid or colliding parameter`,
        );
      names.set(old, name);
    }
    for (const alias of Object.keys(aliases))
      if (!names.has(alias))
        throw new Error(`recipe/aliases/${alias}: unknown parameter`);
    const math = (s: JsonValue | undefined, p: string) =>
      convertLegacyMath(
        string(s, p),
        names,
        recipe.variables.map((v) => v.name),
      );
    const text = (s: JsonValue | undefined, p: string) =>
      convertLegacyText(string(s, p), names);
    const definitions: VariableDefinition[] = [];
    const constraints = [...(recipe.constraints ?? [])];
    variables.forEach((item, i) => {
      const p = `/variables/${i}`,
        v = object(item, p),
        name = names.get(string(v.name, p))!;
      const exclusions: number[] = [];
      const exclusionSource = string(v.exclusions, `${p}/exclusions`);
      // Delimiters belong to the historical exclusion data grammar, not algebra.
      for (const entry of exclusionSource
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)) {
        if (entry.startsWith('@') && names.has(entry.slice(1)))
          constraints.push({
            kind: 'comparison',
            left: { variable: name },
            operator: '!=',
            right: { variable: names.get(entry.slice(1))! },
          });
        else if (
          /^[+-]?\d+(?:\.\d+)?$/.test(entry) &&
          Number.isFinite(Number(entry))
        )
          exclusions.push(Number(entry));
        else throw new Error(`${p}/exclusions: unsupported exclusion source`);
      }
      if (v.type === 'integer')
        definitions.push({
          name,
          kind: 'integer',
          min: number(v.min, p),
          max: number(v.max, p),
          exclusions,
        });
      else if (v.type === 'decimal')
        definitions.push({
          name,
          kind: 'decimal',
          min: number(v.min, p),
          max: number(v.max, p),
          precision: number(v.decimals, p),
          exclusions,
        });
      else if (v.type === 'choice')
        definitions.push({
          name,
          kind: 'choice',
          values: list(v.choices, p).map((n) => number(n, p)),
          exclusions,
        });
      else if (v.type === 'computed') {
        if (exclusionSource.trim())
          throw new Error(
            `${p}/exclusions: computed exclusions require explicit reviewed constraints`,
          );
        definitions.push({
          name,
          kind: 'computed',
          latex: math(v.expression, `${p}/expression`),
        });
        report.decisions.push(
          `${p}: stored min/max/choices/decimals inactive in observed computed generators; preserved privately`,
        );
      } else throw new Error(`${p}/type: unsupported variable behavior`);
      mark('content', `${p}/name`, `/generation/definitions/${i}/name`);
      mark('content', `${p}/type`, `/generation/definitions/${i}/kind`);
      for (const field of v.type === 'computed'
        ? ['expression']
        : v.type === 'choice'
          ? ['choices', 'exclusions']
          : v.type === 'decimal'
            ? ['min', 'max', 'decimals', 'exclusions']
            : ['min', 'max', 'exclusions'])
        mark('content', `${p}/${field}`, `/generation/definitions/${i}`);
    });
    const elements: ExerciseElement[] = [];
    const usedQuestions = new Set<string>();
    list(content.elements, '/elements').forEach((item, i) => {
      const p = `/elements/${i}`,
        e = object(item, p),
        c = object(e.content, `${p}/content`),
        id = identity(e.id, `${p}/id`);
      const target = `/elements/${elements.length}`;
      mark('content', `${p}/id`, `${target}/id`);
      mark('content', `${p}/type`, `${target}/type`);
      const extensions = { legacyPath: p, legacy: c };
      if (e.type === 'text') {
        elements.push({ id, type: 'text', text: text(c.text, p), extensions });
        mark('content', `${p}/content/text`, `${target}/text`);
      } else if (e.type === 'question') {
        const profile = Object.hasOwn(recipe.questions, id)
          ? recipe.questions[id]
          : undefined;
        if (!profile)
          throw new Error(
            `${p}: explicit reviewed response and policy required`,
          );
        if (
          !['number', 'expression', 'text'].includes(string(c.answerFormat, p))
        )
          throw new Error(`${p}/answerFormat: unsupported format`);
        if (
          c.answerFormat === 'expression' &&
          profile.response.kind !== 'expression' &&
          profile.response.kind !== 'log-affine-positive'
        )
          throw new Error(`${p}: expression profile required`);
        usedQuestions.add(id);
        elements.push({
          id,
          type: 'question',
          text: text(c.question, p),
          points: number(c.points, p),
          response: profile.response,
          policy: profile.policy,
          expectedLatex: math(c.correctAnswer, p),
          extensions,
        });
        for (const field of [
          'question',
          'points',
          'correctAnswer',
          'answerFormat',
        ])
          mark('content', `${p}/content/${field}`, target);
      } else if (e.type === 'mcq') {
        const multiple = boolean(c.multipleChoice, p);
        if (
          c.multipleAnswers !== undefined &&
          boolean(c.multipleAnswers, p) !== multiple
        )
          throw new Error(`${p}: conflicting MCQ flags`);
        const options = list(c.options, p).map((item, j) => {
          const option = object(item, `${p}/options/${j}`);
          const optionId =
            option.id === undefined
              ? `legacy-option-${i}-${j}`
              : identity(option.id, p);
          if (option.id === undefined)
            report.decisions.push(
              `${p}/content/options/${j}/id: synthetic path ID ${optionId}`,
            );
          mark(
            'content',
            `${p}/content/options/${j}/text`,
            `${target}/options/${j}/content/text`,
          );
          mark(
            'content',
            `${p}/content/options/${j}/correct`,
            `${target}/expectedOptionIds`,
          );
          return {
            id: optionId,
            content: { format: 'text' as const, text: text(option.text, p) },
            correct: boolean(option.correct, p),
          };
        });
        if (c.points === undefined)
          report.decisions.push(
            `${p}/content/points: observed Creator MCQ default 1`,
          );
        elements.push({
          id,
          type: 'mcq',
          text: text(c.question, p),
          points: c.points === undefined ? 1 : number(c.points, p),
          mode: multiple ? 'multiple' : 'single',
          options: options.map(({ id, content }) => ({ id, content })),
          expectedOptionIds: options.filter((o) => o.correct).map((o) => o.id),
          extensions,
        });
        mark('content', `${p}/content/question`, `${target}/text`);
        mark('content', `${p}/content/multipleChoice`, `${target}/mode`);
      } else if (e.type === 'graph') {
        if (
          !recipe.variables.some((v) => v.name === 'x' && v.domain === 'real')
        )
          throw new Error(`${p}: graph requires declared real x`);
        const n = (key: string) => ({
          latex: String(number(c[key], `${p}/${key}`)),
        });
        const functions = list(c.functions, p).map((item, j) => {
          const f = object(item, p),
            functionId =
              f.id === undefined
                ? `legacy-function-${i}-${j}`
                : identity(f.id, p);
          if (f.id === undefined)
            report.decisions.push(
              `${p}/content/functions/${j}/id: synthetic path ID ${functionId}`,
            );
          if (f.showExpression === undefined)
            report.decisions.push(
              `${p}/content/functions/${j}/showExpression: observed renderer default true`,
            );
          for (const field of ['expression', 'color', 'showExpression'])
            mark(
              'content',
              `${p}/content/functions/${j}/${field}`,
              `${target}/functions/${j}`,
            );
          return {
            id: functionId,
            latex: math(f.expression, p),
            color: string(f.color, p),
            showExpression:
              f.showExpression === undefined
                ? true
                : boolean(f.showExpression, p),
          };
        });
        elements.push({
          id,
          type: 'function-graph',
          variable: 'x',
          window: {
            xMin: n('xMin'),
            xMax: n('xMax'),
            yMin: n('yMin'),
            yMax: n('yMax'),
          },
          showGrid: boolean(c.showGrid, p),
          functions,
          extensions,
        });
        for (const key of ['xMin', 'xMax', 'yMin', 'yMax', 'showGrid'])
          mark('content', `${p}/content/${key}`, target);
      } else throw new Error(`${p}/type: unsupported element behavior`);
    });
    for (const id of Object.keys(recipe.questions))
      if (!usedQuestions.has(id))
        throw new Error(`recipe/questions/${id}: unused profile`);
    const flag = (
      rowKey: string,
      contentKey: string,
      choice: 'row' | 'content' | undefined,
    ): boolean => {
      const outer = row[rowKey],
        inner = content[contentKey];
      if (
        outer !== undefined &&
        inner !== undefined &&
        outer !== inner &&
        !choice
      )
        throw new Error(`/${rowKey}: conflicting flags require decision`);
      const value =
        choice === 'content'
          ? inner
          : choice === 'row'
            ? outer
            : (outer ?? inner);
      return boolean(value, `/${rowKey}`);
    };
    const flash = flag('Is_Flash', 'isFlash', recipe.flags?.flash),
      calc = flag(
        'Need_Calculator',
        'needCalculator',
        recipe.flags?.calculator,
      );
    const definition: ExerciseDefinition = {
      schemaVersion: 5,
      kind: 'composed',
      id: identity(recipe.id ?? row.id, '/id'),
      revision: recipe.revision,
      title: string(row.title, '/title'),
      catalogue: {
        chapter: string(row.chapter, '/chapter'),
        skills: list(skills, '/competences').map((s) =>
          string(s, '/competences'),
        ),
        exerciseType: flash ? 'flash' : 'classic',
        needsCalculator: calc,
        appTitle: string(
          sourceFormat === 'creator-document-v1'
            ? row.appTitle
            : (row.app_title ?? content.apptitle),
          '/app_title',
        ),
      },
      generation: {
        schemaVersion: 5,
        definitions,
        constraints,
        maxAttempts: 128,
        maxDraws: 10000,
      },
      variables: recipe.variables,
      elements,
      extensions: {
        legacy: {
          adapterVersion: report.adapterVersion,
          sourceFormat,
          original: row,
          decodedContent: content,
          decodedCompetences: skills,
          recipe: JSON.parse(JSON.stringify(recipe)) as JsonValue,
        },
      },
    };
    for (const [field, target] of Object.entries({
      title: '/title',
      chapter: '/catalogue/chapter',
      competences: '/catalogue/skills',
    }))
      mark('row', `/${field}`, target);
    if (recipe.id === undefined) mark('row', '/id', '/id');
    else
      report.decisions.push(
        `/id: canonical ID ${recipe.id} selected by recipe; original ID preserved privately`,
      );
    if (sourceFormat === 'creator-document-v1')
      mark('row', '/appTitle', '/catalogue/appTitle');
    else if (row.app_title !== undefined)
      mark('row', '/app_title', '/catalogue/appTitle');
    else mark('content', '/apptitle', '/catalogue/appTitle');
    for (const [outer, inner, choice, target] of [
      ['Is_Flash', 'isFlash', recipe.flags?.flash, '/catalogue/exerciseType'],
      [
        'Need_Calculator',
        'needCalculator',
        recipe.flags?.calculator,
        '/catalogue/needsCalculator',
      ],
    ] as const) {
      const embedded =
        choice === 'content' || (choice !== 'row' && row[outer] === undefined);
      mark(
        embedded ? 'content' : 'row',
        `/${embedded ? inner : outer}`,
        target,
      );
    }
    walk('row', row);
    walk('content', content);
    walk('competences', skills!);
    const checked = validateDefinition(definition);
    if (!checked.ok) {
      report.diagnostics = checked.diagnostics.map((d) => ({
        path: d.path,
        message: d.message,
      }));
      return { ok: false, report };
    }
    report.classification = 'adaptable';
    return { ok: true, definition: checked.value, report };
  } catch (error) {
    report.diagnostics.push({
      path: '',
      message:
        error instanceof Error ? error.message : 'Legacy conversion failed',
    });
    return { ok: false, report };
  }
}
