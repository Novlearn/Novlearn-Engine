import { describe, expect, it } from 'vitest';
import {
  instantiateExercise,
  parseMathInput,
  projectPublicInstance,
  validateDefinition,
} from 'novlearn-exercise-engine';
import type {
  DisplayElement,
  ExerciseDefinition,
  ExerciseElement,
  ExerciseInstance,
  NumericField,
  PlotWindow,
} from 'novlearn-exercise-engine';
import rows from './fixtures/legacy/exercises_rows.original.json' with { type: 'json' };

const n = (latex: string): NumericField => ({ latex });
const finite = (latex: string) => ({
  kind: 'finite' as const,
  value: n(latex),
});
const window = (): PlotWindow<NumericField> => ({
  xMin: n('-a'),
  xMax: n('a+2'),
  yMin: n('-5'),
  yMax: n('5'),
});
const rich = () => [
  { type: 'text' as const, text: 'Valeur @a', emphasis: 'strong' as const },
  { type: 'math' as const, latex: 'ax+1', display: 'inline' as const },
];
const graph = (): Extract<DisplayElement, { type: 'function-graph' }> => ({
  id: 'graph',
  type: 'function-graph',
  variable: 'x',
  window: window(),
  showGrid: true,
  functions: [
    {
      id: 'f',
      latex: '\\sin(2.5*x^2)',
      color: '#6805e1',
      showExpression: true,
      label: 'f @a',
    },
  ],
});
const tree = (): Extract<DisplayElement, { type: 'probability-tree' }> => ({
  id: 'tree',
  type: 'probability-tree',
  exhaustive: true,
  nodes: [
    { id: 'root', label: 'Ω' },
    { id: 'yes', parentId: 'root', label: 'A @a', probability: n('a/6') },
    { id: 'no', parentId: 'root', label: 'non A', probability: n('1-a/6') },
  ],
});
const geometry = (): Extract<DisplayElement, { type: 'geometry' }> => ({
  id: 'geometry',
  type: 'geometry',
  window: window(),
  showGrid: true,
  points: [
    { id: 'A', label: 'A @a', coordinates: [n('a'), n('0')] },
    { id: 'B', label: 'B', coordinates: [n('0'), n('1')] },
    { id: 'C', label: 'C', coordinates: [n('1'), n('1')] },
  ],
  objects: [
    { id: 'segment', kind: 'segment', from: 'A', to: 'B', color: '#123456' },
    { id: 'line', kind: 'line', from: 'B', to: 'C', color: '#123456' },
    {
      id: 'circle',
      kind: 'circle',
      center: 'A',
      radius: n('a'),
      color: '#123456',
    },
    {
      id: 'triangle',
      kind: 'polygon',
      vertices: ['A', 'B', 'C'],
      color: '#123456',
    },
  ],
});
const fixtures = (): DisplayElement[] => [
  { id: 'rich', type: 'rich-text', content: rich() },
  { id: 'eq', type: 'equation', latex: 'ax=1', label: 'Équation @a' },
  {
    id: 'system',
    type: 'system',
    relations: [
      { id: 'r1', latex: 'x+y=a' },
      { id: 'r2', latex: 'x-y\\leq 2' },
    ],
  },
  { id: 'hint', type: 'hint', questionId: 'question', content: rich() },
  {
    id: 'explanation',
    type: 'explanation',
    questionId: 'question',
    content: [
      { type: 'text', text: 'secret-solution @a' },
      { type: 'math', latex: 'a+1', display: 'block' },
    ],
  },
  graph(),
  {
    id: 'points',
    type: 'sequence-graph',
    window: window(),
    showGrid: true,
    connectPoints: false,
    sequence: {
      mode: 'points',
      points: [
        { index: 0, value: n('a') },
        { index: 1, value: n('a+1') },
      ],
    },
  },
  {
    id: 'explicit',
    type: 'sequence-graph',
    window: window(),
    showGrid: false,
    connectPoints: true,
    sequence: {
      mode: 'explicit',
      indexVariable: 'n',
      start: 0,
      count: 16,
      latex: 'n^2+a',
    },
  },
  {
    id: 'recurrent',
    type: 'sequence-graph',
    window: window(),
    showGrid: true,
    connectPoints: false,
    sequence: {
      mode: 'recurrent',
      indexVariable: 'n',
      termVariable: 'u',
      start: 1,
      count: 16,
      initial: n('a'),
      recurrence: 'u+a',
    },
  },
  {
    id: 'signs',
    type: 'sign-table',
    variable: 'x',
    points: [
      { kind: 'negative-infinity' },
      finite('a'),
      { kind: 'positive-infinity' },
    ],
    rows: [
      {
        id: 'f',
        label: 'x-a (@a)',
        signs: ['-', '+'],
        pointSigns: [null, '0', null],
      },
    ],
  },
  {
    id: 'variations',
    type: 'variation-table',
    variable: 'x',
    points: [
      {
        x: { kind: 'negative-infinity' },
        excluded: true,
        rightLimit: { kind: 'positive-infinity' },
      },
      { x: finite('a'), excluded: false, value: finite('0') },
      {
        x: { kind: 'positive-infinity' },
        excluded: true,
        leftLimit: { kind: 'positive-infinity' },
      },
    ],
    directions: ['decreasing', 'increasing'],
  },
  {
    id: 'values',
    type: 'value-table',
    columns: ['x', 'f(x) @a'],
    rows: [
      [
        { kind: 'number', value: n('a') },
        { kind: 'math', latex: '\\ln(x-a)' },
      ],
      [
        { kind: 'text', text: '@a' },
        { kind: 'number', value: n('a/2') },
      ],
    ],
  },
  {
    id: 'stats',
    type: 'statistics-table',
    rows: [
      { label: 'Classe @a', value: n('a/2'), frequency: n('a') },
      { label: 'B', value: n('4'), frequency: n('0') },
    ],
  },
  tree(),
  {
    id: 'vectors',
    type: 'vectors',
    dimension: 3,
    showCoordinates: true,
    vectors: [
      {
        id: 'v',
        label: 'v @a',
        coordinates: [n('a'), n('1/3'), n('-2')],
        color: '#123456',
      },
    ],
  },
  geometry(),
  {
    id: 'complex',
    type: 'complex-plane',
    window: window(),
    showGrid: true,
    showCoordinates: true,
    points: [
      {
        id: 'z',
        label: 'z @a',
        real: n('a'),
        imaginary: n('-a/2'),
        color: '#123456',
      },
    ],
  },
];
function definition(
  elements: ExerciseElement[] = fixtures(),
): ExerciseDefinition {
  return {
    schemaVersion: 5,
    kind: 'composed',
    id: 'synthetic-display',
    revision: '1',
    title: 'Données @a',
    generation: {
      schemaVersion: 5,
      definitions: [
        { name: 'a', kind: 'integer', min: 3, max: 3, exclusions: [] },
      ],
      constraints: [],
      maxAttempts: 4,
      maxDraws: 16,
    },
    variables: [
      { name: 'x', domain: 'real' },
      { name: 'y', domain: 'real' },
      { name: 'n', domain: 'integer' },
      { name: 'u', domain: 'real' },
    ],
    elements: [
      { id: 'section', type: 'section', text: 'Données' },
      ...elements.map((e) => ({ ...e, sectionId: 'section' })),
      {
        id: 'question',
        type: 'question',
        text: 'Calculer',
        points: 1,
        response: { format: 'latex', kind: 'rational' },
        expectedLatex: 'a+1',
        policy: { domain: 'rational', form: 'value-only' },
      },
    ],
  };
}
function run(d = definition()): ExerciseInstance {
  const result = instantiateExercise(d, { seed: 42, instanceId: 'opaque' });
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result.value;
}
function rejected(
  e: DisplayElement,
  stage: 'definition' | 'statement' | 'text' = 'definition',
) {
  const result = instantiateExercise(definition([e]), {
    seed: 42,
    instanceId: 'opaque',
  });
  expect(result.ok).toBe(false);
  if (!result.ok)
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ stage })]),
    );
  expect(result).not.toHaveProperty('value');
}

describe('native prescribed display data (synthetic, no historical migration)', () => {
  it('validates, substitutes every family, keeps stable order and retains private provenance', () => {
    const d = definition(),
      original = JSON.stringify(d),
      instance = run(d);
    expect(JSON.stringify(d)).toBe(original);
    expect(run(JSON.parse(original))).toEqual(instance);
    expect(instance.elements.map((e) => e.id)).toEqual(
      d.elements.map((e) => e.id),
    );
    const publicInstance = projectPublicInstance(instance);
    expect(publicInstance.elements.map((e) => e.id)).toEqual(
      d.elements
        .filter((e) => e.type !== 'hint' && e.type !== 'explanation')
        .map((e) => e.id),
    );
    expect(JSON.stringify(publicInstance)).not.toContain('@a');
    for (const key of [
      'source',
      'syntax',
      'substituted',
      'mathFields',
      'expected',
      'policy',
      'generation',
      'seed',
      'extensions',
      'secret-solution',
    ])
      expect(JSON.stringify(publicInstance)).not.toContain(key);
    for (const element of instance.elements)
      if ('mathFields' in element) {
        expect(element.formulaDomain).toBe('unverified');
        expect(element.mathFields.length).toBeGreaterThan(0);
        expect(
          element.mathFields.every((f) => f.path.startsWith('/elements/')),
        ).toBe(true);
      }
    expect(instance.elements.find((e) => e.id === 'vectors')).toMatchObject({
      vectors: [
        {
          coordinates: [
            { numerator: 3, denominator: 1 },
            { numerator: 1, denominator: 3 },
            { numerator: -2, denominator: 1 },
          ],
        },
      ],
    });
    expect(instance.elements.find((e) => e.id === 'complex')).toMatchObject({
      points: [
        {
          real: { numerator: 3, denominator: 1 },
          imaginary: { numerator: -3, denominator: 2 },
        },
      ],
    });
    expect(instance.elements.find((e) => e.id === 'tree')).toMatchObject({
      nodes: [
        { id: 'root' },
        { probability: { numerator: 1, denominator: 2 } },
        { probability: { numerator: 1, denominator: 2 } },
      ],
    });
    expect(instance.elements.find((e) => e.id === 'rich')).toMatchObject({
      content: [{ text: 'Valeur 3' }, { type: 'math' }],
    });
  }, 30000);
  it('selects nested public fields and returns detached objects even with injected private extras', () => {
    const instance = run(),
      baseline = projectPublicInstance(instance);
    const inject = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) {
        value.forEach(inject);
        return;
      }
      for (const child of Object.values(value)) inject(child);
      Object.assign(value, { privateCanary: 'SECRET' });
    };
    instance.elements.forEach(inject);
    const projection = projectPublicInstance(instance);
    expect(projection).toEqual(baseline);
    expect(JSON.stringify(projection)).not.toContain('SECRET');
    const element = projection.elements.find((e) => e.type === 'geometry');
    if (!element || element.type !== 'geometry')
      throw new Error('Missing geometry');
    element.points[0]!.coordinates[0].numerator = 999;
    element.objects.length = 0;
    expect(projectPublicInstance(instance)).toEqual(baseline);
  }, 30000);
  it('preserves excluded points and prescribed one-sided limits without inferring variation', () => {
    const element: DisplayElement = {
      id: 'v',
      type: 'variation-table',
      variable: 'x',
      points: [
        { x: finite('-1'), value: finite('2'), excluded: false },
        {
          x: finite('0'),
          leftLimit: { kind: 'positive-infinity' },
          rightLimit: { kind: 'negative-infinity' },
          excluded: true,
        },
        { x: finite('1'), value: finite('-2'), excluded: false },
      ],
      directions: ['increasing', 'increasing'],
    };
    expect(run(definition([element])).elements[1]).toMatchObject({
      points: [
        { value: { value: { numerator: 2 } } },
        {
          excluded: true,
          leftLimit: { kind: 'positive-infinity' },
          rightLimit: { kind: 'negative-infinity' },
        },
        { value: { value: { numerator: -2 } } },
      ],
    });
  });
});

describe('display admission never grants a mathematical proof', () => {
  it('encodes inserted numeric choices exactly before display instead of relying on machine floats', () => {
    const e = graph();
    e.functions[0]!.latex = 'ax';
    e.window = { xMin: n('-1'), xMax: n('1'), yMin: n('-1'), yMax: n('1') };
    const d = definition([e]);
    d.generation.definitions = [{ name: 'a', kind: 'choice', values: [0.5] }];
    const result = run(d).elements[1];
    if (!result || !('mathFields' in result))
      throw new Error('Missing math fields');
    expect(result.mathFields.at(-1)?.math.substituted).toEqual([
      'Multiply',
      ['Rational', 5, 10],
      'x',
    ]);
    d.generation.definitions = [
      { name: 'a', kind: 'choice', values: [0.123456789] },
    ];
    expect(
      instantiateExercise(d, { seed: 42, instanceId: 'opaque' }),
    ).toMatchObject({
      ok: false,
      diagnostics: expect.arrayContaining([
        expect.objectContaining({
          code: 'limit',
          path: '/elements/1/functions/0/latex',
        }),
      ]),
    });
  });
  it.each([
    '\\sin(2.5*x^2)',
    '\\cos x',
    '\\tan(x)',
    '\\ln(x-a)/(x-a)',
    '\\exp(x)',
    '\\sqrt{x}',
    'x/x',
    '1/0',
    '0^0',
  ])('preserves raw formula %s without evaluation or domain claim', (latex) => {
    const element = graph();
    element.functions[0]!.latex = latex;
    const result = run(definition([element])).elements[1];
    if (!result || !('mathFields' in result))
      throw new Error('Missing math fields');
    const field = result.mathFields.find((f) =>
      f.path.endsWith('/functions/0/latex'),
    );
    expect(field).toMatchObject({
      admission: 'display-only',
      math: { source: latex },
    });
    expect(result.formulaDomain).toBe('unverified');
    expect(parseMathInput('\\sin x', { variables: ['x'] }).ok).toBe(false);
  });
  it.each(['x=1', 'x<1', 'x\\leq a', 'x\\geq 1', 'x\\neq 0'])(
    'displays relation %s',
    (latex) => {
      expect(
        run(definition([{ id: 'relation', type: 'equation', latex }]))
          .elements[1],
      ).toMatchObject({ type: 'equation', formulaDomain: 'unverified' });
    },
  );
  it.each(['x+1', '\\sin x'])(
    'rejects nonrelations in equation elements: %s',
    (latex) =>
      rejected({ id: 'relation', type: 'equation', latex }, 'statement'),
  );
  it.each([
    'y+a',
    'x=1',
    '\\int x',
    'z+1',
    '\\placeholder{}',
    'x+',
    '1.0000001*x',
    '100000000000*x',
  ])(
    'rejects unsupported, incomplete, oversize or out-of-scope graph input: %s',
    (latex) => {
      const element = graph();
      element.functions[0]!.latex = latex;
      rejected(element, 'statement');
    },
  );
  it('keeps numeric render data finite, closed and exact', () => {
    for (const latex of ['x', '1/0', '\\sqrt{2}', '\\sin(1)']) {
      const element = graph();
      element.window.xMax = n(latex);
      rejected(element, 'statement');
    }
    const element = graph();
    element.window.xMax = n('a/2');
    element.window.xMin = n('0');
    expect(run(definition([element])).elements[1]).toMatchObject({
      window: { xMax: { numerator: 3, denominator: 2 } },
    });
  });
  it('isolates presentation formulas from expected-answer admission', () => {
    const d = definition([graph()]);
    const question = d.elements.at(-1);
    if (!question || question.type !== 'question')
      throw new Error('Missing question');
    question.expectedLatex = '\\sin(1)';
    expect(
      instantiateExercise(d, { seed: 42, instanceId: 'opaque' }),
    ).toMatchObject({
      ok: false,
      diagnostics: [{ stage: 'expected', code: 'unsupported' }],
    });
  });
  it('qualifies the observed sine graph64 by manual native transcription only', () => {
    const row = rows.find((r) => r.id === 64);
    if (!row) throw new Error('Missing original');
    const observed = JSON.parse(row.content) as {
      elements: {
        type: string;
        content: {
          functions: { expression: string; color: string }[];
          xMin: number;
          xMax: number;
          yMin: number;
          yMax: number;
          showGrid: boolean;
        };
      }[];
    };
    const original = observed.elements.find((e) => e.type === 'graph')?.content;
    if (!original) throw new Error('Missing graph');
    const e = graph();
    e.functions[0]!.latex = original.functions[0]!.expression;
    e.functions[0]!.color = original.functions[0]!.color;
    e.window = {
      xMin: n(String(original.xMin)),
      xMax: n(String(original.xMax)),
      yMin: n(String(original.yMin)),
      yMax: n(String(original.yMax)),
    };
    e.showGrid = original.showGrid;
    const result = run(definition([e])).elements[1];
    expect(result).toMatchObject({
      type: 'function-graph',
      window: { xMin: { numerator: -2 }, xMax: { numerator: 2 } },
      functions: [{ color: '#6805e1' }],
    });
    if (!result || !('mathFields' in result))
      throw new Error('Missing provenance');
    expect(result.mathFields.at(-1)?.math.source).toBe(
      original.functions[0]!.expression,
    );
  });
});

describe('structural, reference and exact prescribed-data failures', () => {
  it.each([
    ['constant', 'positive-infinity', 'positive-infinity'],
    ['constant', 'negative-infinity', 'negative-infinity'],
    ['increasing', 'positive-infinity', 'positive-infinity'],
    ['increasing', 'negative-infinity', 'negative-infinity'],
    ['decreasing', 'negative-infinity', 'negative-infinity'],
    ['decreasing', 'positive-infinity', 'positive-infinity'],
  ] as const)(
    'rejects impossible infinite variation %s %s %s',
    (direction, left, right) => {
      rejected(
        {
          id: 'v',
          type: 'variation-table',
          variable: 'x',
          points: [
            { x: finite('0'), excluded: true, rightLimit: { kind: left } },
            { x: finite('1'), excluded: true, leftLimit: { kind: right } },
          ],
          directions: [direction],
        },
        'statement',
      );
    },
  );
  it('retains validated catalogue privately and projects keyboard hints without authority', () => {
    const d = definition([graph()]);
    d.catalogue = {
      chapter: 'Functions',
      difficulty: 2,
      skills: ['derivative'],
      exerciseType: 'flash',
      needsCalculator: false,
      appTitle: '',
    };
    const q = d.elements.at(-1);
    if (!q || q.type !== 'question') throw new Error('Missing question');
    q.keyboard = 'fractions-roots';
    const instance = run(d),
      projected = projectPublicInstance(instance);
    expect(instance.definition.catalogue).toEqual(d.catalogue);
    expect(projected).not.toHaveProperty('catalogue');
    expect(projected.elements.at(-1)).toMatchObject({
      keyboard: 'fractions-roots',
    });
    expect(
      validateDefinition({
        ...d,
        elements: [{ ...q, keyboard: 'execute-script' }],
      }).ok,
    ).toBe(false);
  });
  it.each([
    { skills: ['a', 'a'] },
    { difficulty: 0 },
    { needsCalculator: 'false' },
    { exerciseType: 'untrusted' },
    { publicAnswer: 'secret' },
  ])('rejects malformed catalogue metadata %#', (catalogue) => {
    const d = { ...definition([graph()]), catalogue };
    expect(validateDefinition(d).ok).toBe(false);
  });
  it.each(['1+(x=1)', '\\sin(x=1)', '(x=1)/(x=2)'])(
    'rejects nested relation in a scalar graph: %s',
    (latex) => {
      const e = graph();
      e.functions[0]!.latex = latex;
      rejected(e, 'statement');
    },
  );
  it.each(['1+(x<1)=0', 'x=(y=1)', 'x=1=2', 'x<y<2'])(
    'rejects nested or chained relations in an equation: %s',
    (latex) => rejected({ id: 'eq', type: 'equation', latex }, 'statement'),
  );
  it.each(['(x=1)', '\\left(x=1\\right)'])(
    'admits transparent relation grouping: %s',
    (latex) =>
      expect(
        run(definition([{ id: 'eq', type: 'equation', latex }])),
      ).toBeDefined(),
  );
  it('rejects contradictory variations, infinite defined values and impossible limit sides', () => {
    const e: Extract<DisplayElement, { type: 'variation-table' }> = {
      id: 'v',
      type: 'variation-table',
      variable: 'x',
      points: [
        { x: finite('0'), value: finite('2'), excluded: false },
        { x: finite('1'), value: finite('1'), excluded: false },
      ],
      directions: ['increasing'],
    };
    rejected(e, 'statement');
    e.directions = ['constant'];
    rejected(e, 'statement');
    e.directions = ['decreasing'];
    expect(run(definition([e]))).toBeDefined();
    e.points[0]!.value = { kind: 'positive-infinity' };
    rejected(e, 'statement');
    e.points[0] = {
      x: { kind: 'negative-infinity' },
      excluded: true,
      leftLimit: finite('1'),
    };
    rejected(e, 'statement');
  });
  it('rejects a degenerate line even when point IDs differ, including rationals', () => {
    const e = geometry();
    e.points[0]!.coordinates = [n('1/2'), n('0')];
    e.points[1]!.coordinates = [n('a/6'), n('0')];
    e.objects = [
      { id: 'line', kind: 'line', from: 'A', to: 'B', color: '#123456' },
    ];
    rejected(e, 'statement');
  });
  it('requires disjoint branch sums to stay at most one in partial trees', () => {
    const e = tree();
    e.exhaustive = false;
    e.nodes[1]!.probability = n('4/5');
    e.nodes[2]!.probability = n('4/5');
    rejected(e, 'statement');
  });
  it('never invokes accessors in new nested data', () => {
    const e = graph();
    let calls = 0;
    Object.defineProperty(e.functions[0], 'latex', {
      enumerable: true,
      get() {
        calls++;
        return 'x';
      },
    });
    expect(validateDefinition(definition([e])).ok).toBe(false);
    expect(calls).toBe(0);
  });
  it('rejects unknown types and fields rather than dropping them', () => {
    expect(
      validateDefinition(
        definition([
          { id: 'unknown', type: 'mesh' } as unknown as ExerciseElement,
        ]),
      ),
    ).toMatchObject({ ok: false });
    expect(
      validateDefinition(
        definition([{ ...graph(), automaticSampling: true } as DisplayElement]),
      ),
    ).toMatchObject({
      ok: false,
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ code: 'unknown-field' }),
      ]),
    });
  });
  it.each(['unknown', 'section', 'graph'])(
    'requires hint references to identify questions: %s',
    (questionId) =>
      rejected({ id: 'hint', type: 'hint', questionId, content: rich() }),
  );
  it('rejects unsafe rich content and mismatched fragment fields', () => {
    for (const content of [
      [{ type: 'html', html: '<script>evil</script>' }],
      [{ type: 'text', text: 'a', latex: 'x' }],
      [{ type: 'math', latex: 'x', text: 'a', display: 'inline' }],
    ])
      expect(
        validateDefinition(
          definition([
            {
              id: 'rich',
              type: 'rich-text',
              content,
            } as unknown as DisplayElement,
          ]),
        ).ok,
      ).toBe(false);
  });
  it('rejects a nonrectangular table and ambiguous cell kinds', () => {
    for (const rows of [
      [[{ kind: 'number', value: n('1') }]],
      [
        [
          { kind: 'number', value: n('1'), text: 'bad' },
          { kind: 'text', text: 'ok' },
        ],
      ],
    ])
      expect(
        validateDefinition(
          definition([
            {
              id: 'table',
              type: 'value-table',
              columns: ['x', 'y'],
              rows,
            } as DisplayElement,
          ]),
        ).ok,
      ).toBe(false);
  });
  it('requires dimensions and coordinate counts to agree', () =>
    rejected({
      id: 'v',
      type: 'vectors',
      dimension: 3,
      showCoordinates: true,
      vectors: [
        {
          id: 'a',
          label: 'a',
          coordinates: [n('1'), n('2')],
          color: '#123456',
        },
      ],
    }));
  it('checks local IDs, point references and distinct polygon vertices', () => {
    for (const mutation of [
      (e: ReturnType<typeof geometry>) => {
        e.points[1]!.id = 'A';
      },
      (e: ReturnType<typeof geometry>) => {
        e.objects.push({
          id: 'bad',
          kind: 'line',
          from: 'A',
          to: 'missing',
          color: '#123456',
        });
      },
      (e: ReturnType<typeof geometry>) => {
        e.objects.push({
          id: 'bad',
          kind: 'polygon',
          vertices: ['A', 'B', 'B'],
          color: '#123456',
        });
      },
    ]) {
      const e = geometry();
      mutation(e);
      rejected(e);
    }
  });
  it('rejects cycles, missing parents, multiple roots and missing edge probabilities', () => {
    const cases: ReturnType<typeof tree>['nodes'][] = [
      [
        { id: 'a', parentId: 'b', label: 'a', probability: n('1') },
        { id: 'b', parentId: 'a', label: 'b', probability: n('1') },
        { id: 'root', label: 'root' },
      ],
      [
        { id: 'root', label: 'root' },
        { id: 'a', parentId: 'missing', label: 'a', probability: n('1') },
      ],
      [
        { id: 'a', label: 'a' },
        { id: 'b', label: 'b' },
      ],
      [
        { id: 'root', label: 'root' },
        { id: 'a', parentId: 'root', label: 'a' },
      ],
    ];
    for (const nodes of cases) {
      const e = tree();
      e.nodes = nodes;
      rejected(e);
    }
  });
  it.each(['-1/3', '4/3'])(
    'rejects out-of-range edge probability %s',
    (latex) => {
      const e = tree();
      e.exhaustive = false;
      e.nodes[1]!.probability = n(latex);
      rejected(e, 'statement');
    },
  );
  it('checks exact sums with zero tolerance, and allows nonexhaustive trees explicitly', () => {
    const e = tree();
    e.nodes[1]!.probability = n('1/3');
    e.nodes[2]!.probability = n('2/3');
    expect(run(definition([e]))).toBeDefined();
    e.nodes[2]!.probability = n('0.666666');
    rejected(e, 'statement');
    e.exhaustive = false;
    expect(run(definition([e]))).toBeDefined();
  });
  it('requires strictly ordered numeric plot bounds and positive radii after substitution', () => {
    const e = graph();
    e.window.xMax = n('-a');
    rejected(e, 'statement');
    const g = geometry();
    const circle = g.objects.find((o) => o.kind === 'circle');
    if (!circle || circle.kind !== 'circle') throw new Error('Missing circle');
    circle.radius = n('a-3');
    rejected(g, 'statement');
  });
  it('checks signs and variation abscissas numerically rather than lexically', () => {
    const e: DisplayElement = {
      id: 's',
      type: 'sign-table',
      variable: 'x',
      points: [finite('2'), finite('10')],
      rows: [{ id: 'f', label: 'f', signs: ['+'], pointSigns: [null, null] }],
    };
    expect(run(definition([e]))).toBeDefined();
    e.points = [finite('10'), finite('2')];
    rejected(e, 'statement');
    e.points = [finite('2'), finite('2')];
    rejected(e, 'statement');
    e.points = [finite('2'), finite('10')];
    e.rows[0]!.signs = [];
    rejected(e);
  });
  it.each(['-1', '1/2'])(
    'requires statistics frequency to be a nonnegative integer: %s',
    (latex) =>
      rejected(
        {
          id: 's',
          type: 'statistics-table',
          rows: [{ label: 'A', value: n('1'), frequency: n(latex) }],
        },
        'statement',
      ),
  );
  it('rejects incompatible sequence modes, free index domains, unordered points and oversized term count', () => {
    const base = {
      id: 's',
      type: 'sequence-graph' as const,
      window: window(),
      showGrid: true,
      connectPoints: false,
    };
    rejected({
      ...base,
      sequence: {
        mode: 'explicit',
        indexVariable: 'x',
        start: 0,
        count: 16,
        latex: 'x+a',
      },
    });
    rejected({
      ...base,
      sequence: {
        mode: 'explicit',
        indexVariable: 'n',
        start: 0,
        count: 65,
        latex: 'n+a',
      },
    });
    rejected({
      ...base,
      sequence: {
        mode: 'points',
        points: [
          { index: 2, value: n('1') },
          { index: 1, value: n('2') },
        ],
      },
    });
    expect(
      validateDefinition(
        definition([
          {
            ...base,
            sequence: {
              mode: 'points',
              latex: 'n+a',
              points: [{ index: 0, value: n('1') }],
            },
          } as DisplayElement,
        ]),
      ).ok,
    ).toBe(false);
  });
  it('reports missing parameters and late incoherence atomically, without partial instance', () => {
    const e = graph();
    e.functions[0]!.label = '@missing';
    rejected(e, 'text');
  });
});
