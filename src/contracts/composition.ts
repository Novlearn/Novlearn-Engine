import type { JsonValue } from './types.js';
import type { Validation } from './validation.js';
import { validateParameters } from './parameters.js';
import { generationNames, validateGenerationV2 } from './generation-v2.js';
import { resolvedNames, validateGenerationV3 } from './generation-v3.js';

/** Structural composition checks on the already copied inert JSON. No math or RNG. */
export function inspectComposition(
  v: Validation,
  data: JsonValue,
  version: 2 | 3 | 4 = 2,
): void {
  const d = v.object(data, '', [
    'schemaVersion',
    'kind',
    'id',
    'revision',
    'title',
    version >= 3 ? 'generation' : 'parameters',
    'variables',
    'elements',
    'extensions',
  ]);
  v.literal(d.schemaVersion, '/schemaVersion', version);
  v.literal(d.kind, '/kind', 'composed');
  v.text(d.id, '/id', 128);
  v.text(d.revision, '/revision', 128);
  v.text(d.title, '/title');
  const names = new Set<string>();
  if (version === 4) {
    const generation = validateGenerationV3(d.generation);
    if (!generation.ok)
      for (const issue of generation.diagnostics)
        v.issue(`/generation${issue.path}`, issue.code, issue.message);
    else for (const name of resolvedNames(generation.value)) names.add(name);
  } else if (version === 3) {
    const generation = validateGenerationV2(d.generation);
    if (!generation.ok) {
      for (const issue of generation.diagnostics)
        v.issue(`/generation${issue.path}`, issue.code, issue.message);
    } else
      for (const name of generationNames(generation.value)) names.add(name);
  } else {
    const parameters = validateParameters(d.parameters);
    if (!parameters.ok) {
      for (const issue of parameters.diagnostics)
        v.issue(`/parameters${issue.path}`, issue.code, issue.message);
    } else for (const p of parameters.value) names.add(p.name);
  }
  for (const [index, value] of v
    .list(d.variables, '/variables', 16)
    .entries()) {
    const path = `/variables/${index}`;
    const variable = v.object(value, path, ['name', 'domain']);
    v.symbol(variable.name, `${path}/name`, names);
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
            ? ['text', 'points', 'response', 'expectedLatex', 'policy']
            : tag === 'mcq'
              ? ['text', 'points', 'mode', 'options', 'expectedOptionIds']
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
    if (tag === 'text' || tag === 'section') {
      v.text(e.text, `${path}/text`);
      if (tag === 'section' && typeof e.id === 'string') sections.add(e.id);
    } else if (tag === 'expression') {
      v.text(e.latex, `${path}/latex`);
      if (e.label !== undefined) v.text(e.label, `${path}/label`);
    } else if (tag === 'question' || tag === 'mcq') {
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
        v.text(e.expectedLatex, `${path}/expectedLatex`);
        const response = v.object(e.response, `${path}/response`, [
          'format',
          'kind',
        ]);
        v.literal(response.format, `${path}/response/format`, 'latex');
        if (response.kind !== 'rational' && response.kind !== 'expression')
          v.issue(
            `${path}/response/kind`,
            'value',
            'Expected rational or expression.',
          );
        const policy = v.object(e.policy, `${path}/policy`, ['domain', 'form']);
        v.literal(
          policy.domain,
          `${path}/policy/domain`,
          response.kind === 'expression' ? 'polynomial' : 'rational',
        );
        v.literal(policy.form, `${path}/policy/form`, 'value-only');
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
        'Unsupported element; only text, section, expression, question and mcq are instantiable.',
      );
  }
  for (const reference of references)
    if (typeof reference.value === 'string' && !sections.has(reference.value))
      v.issue(reference.path, 'value', 'Referenced section does not exist.');
}
