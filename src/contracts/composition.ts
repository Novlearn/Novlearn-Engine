import type { JsonValue, GenerationDefinition } from './types.js';
import { Validation } from './validation.js';
import { inspectGeneration, generationNames } from './generation.js';
import { displayFields, inspectDisplayElement } from './display-validation.js';
import { inspectQuestionAnswer } from './answer-validation.js';
/** Structural composition checks on the already copied inert JSON. No math or RNG. */
export function inspectComposition(v: Validation, data: JsonValue): void {
  const d = v.object(data, '', [
    'schemaVersion',
    'kind',
    'id',
    'revision',
    'title',
    'catalogue',
    'generation',
    'variables',
    'elements',
    'extensions',
  ]);
  v.version(d.schemaVersion);
  v.literal(d.kind, '/kind', 'composed');
  v.text(d.id, '/id', 128);
  v.text(d.revision, '/revision', 128);
  v.text(d.title, '/title');
  if (d.catalogue !== undefined) {
    const c = v.object(d.catalogue, '/catalogue', [
      'chapter',
      'difficulty',
      'skills',
      'exerciseType',
      'needsCalculator',
      'appTitle',
    ]);
    for (const key of ['chapter', 'appTitle'])
      if (c[key] !== undefined)
        v.text(c[key], `/catalogue/${key}`, 4096, key === 'appTitle');
    if (
      c.difficulty !== undefined &&
      v.integer(c.difficulty, '/catalogue/difficulty') &&
      c.difficulty < 1
    )
      v.issue(
        '/catalogue/difficulty',
        'value',
        'Difficulty is a positive ordinal.',
      );
    if (c.skills !== undefined) {
      const ids = new Set<string>();
      v.list(c.skills, '/catalogue/skills', 64).forEach((value, index) => {
        v.text(value, `/catalogue/skills/${index}`, 128);
        if (typeof value === 'string') {
          if (ids.has(value))
            v.issue(
              `/catalogue/skills/${index}`,
              'collision',
              'Duplicate skill identifier.',
            );
          ids.add(value);
        }
      });
    }
    if (
      c.exerciseType !== undefined &&
      c.exerciseType !== 'flash' &&
      c.exerciseType !== 'classic'
    )
      v.issue('/catalogue/exerciseType', 'value', 'Expected flash or classic.');
    if (
      c.needsCalculator !== undefined &&
      typeof c.needsCalculator !== 'boolean'
    )
      v.issue('/catalogue/needsCalculator', 'type', 'Expected a boolean.');
  }
  const names = new Set<string>();
  const variableDomains = new Map<string, string>();
  // Share the same inert structural inspector without reconstructing older schemas.
  const local = new Validation();
  inspectGeneration(local, d.generation ?? null);
  for (const issue of local.diagnostics)
    v.issue('/generation' + issue.path, issue.code, issue.message);
  if (!local.diagnostics.length)
    for (const name of generationNames(
      d.generation as unknown as GenerationDefinition,
    ))
      names.add(name);
  for (const [index, value] of v
    .list(d.variables, '/variables', 16)
    .entries()) {
    const path = `/variables/${index}`;
    const variable = v.object(value, path, ['name', 'domain']);
    v.symbol(variable.name, `${path}/name`, names);
    if (
      typeof variable.name === 'string' &&
      typeof variable.domain === 'string'
    )
      variableDomains.set(variable.name, variable.domain);
    if (variable.domain !== 'real' && variable.domain !== 'integer')
      v.issue(`${path}/domain`, 'value', 'Expected real or integer.');
  }
  const metadata = (value: JsonValue | undefined, path: string): void => {
    if (
      value !== undefined &&
      (value === null || typeof value !== 'object' || Array.isArray(value))
    )
      v.issue(path, 'type', 'Expected a private JSON object.');
  };
  metadata(d.extensions, '/extensions');
  const ids = new Set<string>();
  const sections = new Set<string>();
  const questions = new Set<string>();
  const questionReferences: { value: JsonValue; path: string }[] = [];
  const references: { value: JsonValue; path: string }[] = [];
  const uniqueId = (
    value: JsonValue | undefined,
    path: string,
    used: Set<string>,
  ): void => {
    v.text(value, path, 128);
    if (typeof value !== 'string') return;
    if (used.has(value)) v.issue(path, 'collision', 'Duplicate identifier.');
    used.add(value);
  };
  const elements = v.list(d.elements, '/elements');
  if (elements.length === 0)
    v.issue('/elements', 'value', 'At least one element is required.');
  for (const [index, value] of elements.entries()) {
    const path = `/elements/${index}`;
    const tag =
      value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value.type
        : undefined;
    const common = ['id', 'type', 'sectionId', 'extensions'];
    const fields =
      tag === 'text' || tag === 'section'
        ? ['text']
        : tag === 'expression'
          ? ['latex', 'label']
          : tag === 'question'
            ? [
                'text',
                'points',
                'response',
                'expectedLatex',
                'expectedTexts',
                'policy',
                'keyboard',
              ]
            : tag === 'mcq'
              ? [
                  'text',
                  'points',
                  'mode',
                  'options',
                  'expectedOptionIds',
                  'keyboard',
                ]
              : typeof tag === 'string' && Object.hasOwn(displayFields, tag)
                ? displayFields[tag]!
                : [];
    const e = v.object(value, path, [...common, ...fields]);
    uniqueId(e.id, `${path}/id`, ids);
    metadata(e.extensions, `${path}/extensions`);
    if (e.sectionId !== undefined) {
      v.text(e.sectionId, `${path}/sectionId`, 128);
      references.push({ value: e.sectionId, path: `${path}/sectionId` });
      if (tag === 'section')
        v.issue(
          `${path}/sectionId`,
          'value',
          'Sections are flat and cannot belong to another section.',
        );
    }
    if (typeof tag === 'string' && Object.hasOwn(displayFields, tag)) {
      inspectDisplayElement(v, e, path, variableDomains);
      if (
        (tag === 'hint' || tag === 'explanation') &&
        e.questionId !== undefined
      )
        questionReferences.push({
          value: e.questionId,
          path: `${path}/questionId`,
        });
    } else if (tag === 'text' || tag === 'section') {
      v.text(e.text, `${path}/text`);
      if (tag === 'section' && typeof e.id === 'string') sections.add(e.id);
    } else if (tag === 'expression') {
      v.text(e.latex, `${path}/latex`);
      if (e.label !== undefined) v.text(e.label, `${path}/label`);
    } else if (tag === 'question' || tag === 'mcq') {
      if (
        e.keyboard !== undefined &&
        ![
          'numeric',
          'algebraic',
          'fractions-roots',
          'sets-intervals',
          'mcq',
        ].some((hint) => hint === e.keyboard)
      )
        v.issue(`${path}/keyboard`, 'value', 'Unsupported keyboard hint.');
      if (typeof e.id === 'string') questions.add(e.id);
      v.text(e.text, `${path}/text`);
      if (
        !v.integer(e.points, `${path}/points`) ||
        typeof e.points !== 'number' ||
        e.points <= 0
      )
        v.issue(
          `${path}/points`,
          'value',
          'Points must be a positive integer.',
        );
      if (tag === 'question') {
        inspectQuestionAnswer(v, e, path);
      } else {
        if (e.mode !== 'single' && e.mode !== 'multiple')
          v.issue(`${path}/mode`, 'value', 'Expected single or multiple.');
        const options = v.list(e.options, `${path}/options`, 64);
        if (options.length < 2)
          v.issue(
            `${path}/options`,
            'value',
            'At least two options are required.',
          );
        const optionIds = new Set<string>();
        for (const [i, option] of options.entries()) {
          const op = `${path}/options/${i}`;
          const o = v.object(option, op, ['id', 'content']);
          uniqueId(o.id, `${op}/id`, optionIds);
          const content = v.object(o.content, `${op}/content`, [
            'format',
            'text',
            'latex',
          ]);
          if (content.format === 'text') {
            v.text(content.text, `${op}/content/text`);
            if (content.latex !== undefined)
              v.issue(
                `${op}/content/latex`,
                'unknown-field',
                'Text content cannot carry LaTeX.',
              );
          } else if (content.format === 'latex') {
            v.text(content.latex, `${op}/content/latex`);
            if (content.text !== undefined)
              v.issue(
                `${op}/content/text`,
                'unknown-field',
                'LaTeX content cannot carry text.',
              );
          } else
            v.issue(`${op}/content/format`, 'value', 'Expected text or latex.');
        }
        const expected = v.list(
          e.expectedOptionIds,
          `${path}/expectedOptionIds`,
          64,
        );
        if (
          expected.length === 0 ||
          (e.mode === 'single' && expected.length !== 1)
        )
          v.issue(
            `${path}/expectedOptionIds`,
            'value',
            'Expected a nonempty selection, with one ID in single mode.',
          );
        const selected = new Set<string>();
        for (const [i, id] of expected.entries()) {
          const ep = `${path}/expectedOptionIds/${i}`;
          uniqueId(id, ep, selected);
          if (typeof id === 'string' && !optionIds.has(id))
            v.issue(ep, 'value', 'Expected option ID does not exist.');
        }
      }
    } else
      v.issue(
        `${path}/type`,
        'unsupported-type',
        'Unsupported element; no data or behavior is silently discarded.',
      );
  }
  for (const reference of references)
    if (typeof reference.value === 'string' && !sections.has(reference.value))
      v.issue(reference.path, 'value', 'Referenced section does not exist.');
  for (const reference of questionReferences)
    if (typeof reference.value === 'string' && !questions.has(reference.value))
      v.issue(reference.path, 'value', 'Referenced question does not exist.');
}
