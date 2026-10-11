import type {
  DisplayElementData,
  Endpoint,
  PlotWindow,
  RichFragment,
  TableCell,
} from './contracts/elements.js';

interface DisplayMapper<N, R> {
  number(value: N, path: string): R;
  text(value: string, path: string): string;
  formula(value: string, path: string, relation: boolean): string;
}

/** Select every field explicitly, shared by instantiation and safe public projection. */
export function mapDisplayData<N, R>(
  e: DisplayElementData<N>,
  mapper: DisplayMapper<N, R>,
  path: string,
): DisplayElementData<R> {
  const num = (value: N, p: string) => mapper.number(value, `${path}${p}`);
  const text = (value: string, p: string) => mapper.text(value, `${path}${p}`);
  const formula = (value: string, p: string, relation = false) =>
    mapper.formula(value, `${path}${p}`, relation);
  const content = (fragments: RichFragment[]): RichFragment[] =>
    fragments.map((f, i) =>
      f.type === 'text'
        ? {
            type: 'text',
            text: text(f.text, `/content/${i}/text`),
            ...(f.emphasis === undefined ? {} : { emphasis: f.emphasis }),
          }
        : {
            type: 'math',
            latex: formula(f.latex, `/content/${i}/latex`),
            display: f.display,
          },
    );
  const endpoint = (value: Endpoint<N>, p: string): Endpoint<R> =>
    value.kind === 'finite'
      ? { kind: 'finite', value: num(value.value, `${p}/value`) }
      : { kind: value.kind };
  const window = (w: PlotWindow<N>): PlotWindow<R> => ({
    xMin: num(w.xMin, '/window/xMin'),
    xMax: num(w.xMax, '/window/xMax'),
    yMin: num(w.yMin, '/window/yMin'),
    yMax: num(w.yMax, '/window/yMax'),
  });
  const cell = (c: TableCell<N>, p: string): TableCell<R> =>
    c.kind === 'text'
      ? { kind: 'text', text: text(c.text, `${p}/text`) }
      : c.kind === 'math'
        ? { kind: 'math', latex: formula(c.latex, `${p}/latex`) }
        : { kind: 'number', value: num(c.value, `${p}/value`) };
  switch (e.type) {
    case 'rich-text':
      return { type: e.type, content: content(e.content) };
    case 'hint':
    case 'explanation':
      return {
        type: e.type,
        ...(e.questionId === undefined ? {} : { questionId: e.questionId }),
        content: content(e.content),
      };
    case 'equation':
      return {
        type: e.type,
        latex: formula(e.latex, '/latex', true),
        ...(e.label === undefined ? {} : { label: text(e.label, '/label') }),
      };
    case 'system':
      return {
        type: e.type,
        relations: e.relations.map((r, i) => ({
          id: r.id,
          latex: formula(r.latex, `/relations/${i}/latex`, true),
        })),
      };
    case 'function-graph':
      return {
        type: e.type,
        variable: e.variable,
        window: window(e.window),
        showGrid: e.showGrid,
        functions: e.functions.map((f, i) => ({
          id: f.id,
          latex: formula(f.latex, `/functions/${i}/latex`),
          color: f.color,
          showExpression: f.showExpression,
          ...(f.label === undefined
            ? {}
            : { label: text(f.label, `/functions/${i}/label`) }),
        })),
      };
    case 'sequence-graph': {
      const s = e.sequence;
      return {
        type: e.type,
        window: window(e.window),
        showGrid: e.showGrid,
        connectPoints: e.connectPoints,
        sequence:
          s.mode === 'points'
            ? {
                mode: s.mode,
                points: s.points.map((p, i) => ({
                  index: p.index,
                  value: num(p.value, `/sequence/points/${i}/value`),
                })),
              }
            : s.mode === 'explicit'
              ? {
                  mode: s.mode,
                  indexVariable: s.indexVariable,
                  start: s.start,
                  count: s.count,
                  latex: formula(s.latex, '/sequence/latex'),
                }
              : {
                  mode: s.mode,
                  indexVariable: s.indexVariable,
                  termVariable: s.termVariable,
                  start: s.start,
                  count: s.count,
                  initial: num(s.initial, '/sequence/initial'),
                  recurrence: formula(s.recurrence, '/sequence/recurrence'),
                },
      };
    }
    case 'sign-table':
      return {
        type: e.type,
        variable: e.variable,
        points: e.points.map((p, i) => endpoint(p, `/points/${i}`)),
        rows: e.rows.map((r, i) => ({
          id: r.id,
          label: text(r.label, `/rows/${i}/label`),
          signs: [...r.signs],
          pointSigns: [...r.pointSigns],
        })),
      };
    case 'variation-table':
      return {
        type: e.type,
        variable: e.variable,
        directions: [...e.directions],
        points: e.points.map((p, i) => ({
          x: endpoint(p.x, `/points/${i}/x`),
          excluded: p.excluded,
          ...(p.value === undefined
            ? {}
            : { value: endpoint(p.value, `/points/${i}/value`) }),
          ...(p.leftLimit === undefined
            ? {}
            : { leftLimit: endpoint(p.leftLimit, `/points/${i}/leftLimit`) }),
          ...(p.rightLimit === undefined
            ? {}
            : {
                rightLimit: endpoint(p.rightLimit, `/points/${i}/rightLimit`),
              }),
        })),
      };
    case 'value-table':
      return {
        type: e.type,
        columns: e.columns.map((c, i) => text(c, `/columns/${i}`)),
        rows: e.rows.map((r, i) => r.map((c, j) => cell(c, `/rows/${i}/${j}`))),
      };
    case 'statistics-table':
      return {
        type: e.type,
        rows: e.rows.map((r, i) => ({
          label: text(r.label, `/rows/${i}/label`),
          value: num(r.value, `/rows/${i}/value`),
          frequency: num(r.frequency, `/rows/${i}/frequency`),
        })),
      };
    case 'probability-tree':
      return {
        type: e.type,
        exhaustive: e.exhaustive,
        nodes: e.nodes.map((n, i) => ({
          id: n.id,
          label: text(n.label, `/nodes/${i}/label`),
          ...(n.parentId === undefined ? {} : { parentId: n.parentId }),
          ...(n.probability === undefined
            ? {}
            : { probability: num(n.probability, `/nodes/${i}/probability`) }),
        })),
      };
    case 'vectors':
      return {
        type: e.type,
        dimension: e.dimension,
        showCoordinates: e.showCoordinates,
        vectors: e.vectors.map((v, i) => ({
          id: v.id,
          label: text(v.label, `/vectors/${i}/label`),
          color: v.color,
          coordinates: v.coordinates.map((n, j) =>
            num(n, `/vectors/${i}/coordinates/${j}`),
          ),
        })),
      };
    case 'geometry':
      return {
        type: e.type,
        window: window(e.window),
        showGrid: e.showGrid,
        points: e.points.map((p, i) => ({
          id: p.id,
          label: text(p.label, `/points/${i}/label`),
          coordinates: [
            num(p.coordinates[0], `/points/${i}/coordinates/0`),
            num(p.coordinates[1], `/points/${i}/coordinates/1`),
          ],
        })),
        objects: e.objects.map((o, i) =>
          o.kind === 'circle'
            ? {
                id: o.id,
                kind: o.kind,
                center: o.center,
                radius: num(o.radius, `/objects/${i}/radius`),
                color: o.color,
              }
            : o.kind === 'polygon'
              ? {
                  id: o.id,
                  kind: o.kind,
                  vertices: [...o.vertices],
                  color: o.color,
                }
              : {
                  id: o.id,
                  kind: o.kind,
                  from: o.from,
                  to: o.to,
                  color: o.color,
                },
        ),
      };
    case 'complex-plane':
      return {
        type: e.type,
        window: window(e.window),
        showGrid: e.showGrid,
        showCoordinates: e.showCoordinates,
        points: e.points.map((p, i) => ({
          id: p.id,
          label: text(p.label, `/points/${i}/label`),
          real: num(p.real, `/points/${i}/real`),
          imaginary: num(p.imaginary, `/points/${i}/imaginary`),
          color: p.color,
        })),
      };
  }
}
