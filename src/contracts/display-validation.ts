import type { JsonObject, JsonValue } from './types.js';
import { Validation } from './validation.js';

export const displayFields: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    'rich-text': ['content'],
    equation: ['latex', 'label'],
    system: ['relations'],
    hint: ['questionId', 'content'],
    explanation: ['questionId', 'content'],
    'function-graph': ['variable', 'window', 'showGrid', 'functions'],
    'sequence-graph': ['window', 'showGrid', 'connectPoints', 'sequence'],
    'sign-table': ['variable', 'points', 'rows'],
    'variation-table': ['variable', 'points', 'directions'],
    'value-table': ['columns', 'rows'],
    'statistics-table': ['rows'],
    'probability-tree': ['exhaustive', 'nodes'],
    vectors: ['dimension', 'showCoordinates', 'vectors'],
    geometry: ['window', 'showGrid', 'points', 'objects'],
    'complex-plane': ['window', 'showGrid', 'showCoordinates', 'points'],
  });

/** Inert structural validation. Numeric/order/domain checks occur after substitution. */
export function inspectDisplayElement(
  v: Validation,
  e: JsonObject,
  path: string,
  variables: ReadonlyMap<string, string>,
): void {
  const choice = (
    value: JsonValue | undefined,
    p: string,
    allowed: readonly JsonValue[],
  ) => {
    if (!allowed.some((item) => item === value))
      v.issue(p, 'value', `Expected one of ${allowed.map(String).join(', ')}.`);
  };
  const bool = (value: JsonValue | undefined, p: string) => {
    if (typeof value !== 'boolean') v.issue(p, 'type', 'Expected a boolean.');
  };
  const numeric = (value: JsonValue | undefined, p: string) => {
    const n = v.object(value, p, ['latex']);
    v.text(n.latex, `${p}/latex`);
  };
  const endpoint = (value: JsonValue | undefined, p: string) => {
    const n = v.object(value, p, ['kind', 'value']);
    choice(n.kind, `${p}/kind`, [
      'finite',
      'negative-infinity',
      'positive-infinity',
    ]);
    if (n.kind === 'finite') numeric(n.value, `${p}/value`);
    else if (n.value !== undefined)
      v.issue(
        `${p}/value`,
        'unknown-field',
        'An infinite endpoint has no finite value.',
      );
  };
  const list = (value: JsonValue | undefined, p: string, min = 1, max = 64) => {
    const result = v.list(value, p, max);
    if (result.length < min)
      v.issue(p, 'value', `At least ${min} entries are required.`);
    return result;
  };
  const variable = (
    value: JsonValue | undefined,
    p: string,
    integer = false,
  ) => {
    v.text(value, p, 32);
    if (
      typeof value === 'string' &&
      (!variables.has(value) || (integer && variables.get(value) !== 'integer'))
    )
      v.issue(
        p,
        'value',
        integer
          ? 'Expected a declared integer free variable.'
          : 'Expected a declared free variable.',
      );
  };
  const id = (value: JsonValue | undefined, p: string, ids: Set<string>) => {
    v.text(value, p, 128);
    if (typeof value === 'string') {
      if (ids.has(value))
        v.issue(p, 'collision', 'Duplicate local identifier.');
      ids.add(value);
    }
  };
  const color = (value: JsonValue | undefined, p: string) => {
    if (
      typeof value !== 'string' ||
      /^#[0-9a-fA-F]{6}$/.exec(value)?.[0] !== value
    )
      v.issue(p, 'value', 'Expected a six-digit hex color.');
  };
  const rich = (value: JsonValue | undefined, p: string) => {
    for (const [i, item] of list(value, p).entries()) {
      const f = v.object(item, `${p}/${i}`, [
        'type',
        'text',
        'emphasis',
        'latex',
        'display',
      ]);
      if (f.type === 'text') {
        v.text(f.text, `${p}/${i}/text`, 4096, true);
        if (f.emphasis !== undefined)
          choice(f.emphasis, `${p}/${i}/emphasis`, ['strong', 'emphasis']);
        for (const key of ['latex', 'display'])
          if (f[key] !== undefined)
            v.issue(
              `${p}/${i}/${key}`,
              'unknown-field',
              'Text fragment cannot carry math fields.',
            );
      } else if (f.type === 'math') {
        v.text(f.latex, `${p}/${i}/latex`);
        choice(f.display, `${p}/${i}/display`, ['inline', 'block']);
        for (const key of ['text', 'emphasis'])
          if (f[key] !== undefined)
            v.issue(
              `${p}/${i}/${key}`,
              'unknown-field',
              'Math fragment cannot carry text fields.',
            );
      } else
        v.issue(
          `${p}/${i}/type`,
          'unsupported-type',
          'Expected text or math fragment.',
        );
    }
  };
  const window = () => {
    const w = v.object(e.window, `${path}/window`, [
      'xMin',
      'xMax',
      'yMin',
      'yMax',
    ]);
    for (const key of ['xMin', 'xMax', 'yMin', 'yMax'])
      numeric(w[key], `${path}/window/${key}`);
    bool(e.showGrid, `${path}/showGrid`);
  };
  const coordinates = (
    value: JsonValue | undefined,
    p: string,
    dimension: number,
  ) => {
    const a = v.list(value, p, 3);
    if (a.length !== dimension)
      v.issue(p, 'value', 'Coordinate count must equal dimension.');
    a.forEach((n, i) => numeric(n, `${p}/${i}`));
  };
  switch (e.type) {
    case 'rich-text':
    case 'hint':
    case 'explanation':
      rich(e.content, `${path}/content`);
      if (e.questionId !== undefined)
        v.text(e.questionId, `${path}/questionId`, 128);
      break;
    case 'equation':
      v.text(e.latex, `${path}/latex`);
      if (e.label !== undefined) v.text(e.label, `${path}/label`);
      break;
    case 'system': {
      const ids = new Set<string>();
      for (const [i, value] of list(
        e.relations,
        `${path}/relations`,
        2,
        16,
      ).entries()) {
        const p = `${path}/relations/${i}`,
          r = v.object(value, p, ['id', 'latex']);
        id(r.id, `${p}/id`, ids);
        v.text(r.latex, `${p}/latex`);
      }
      break;
    }
    case 'function-graph': {
      window();
      variable(e.variable, `${path}/variable`);
      const ids = new Set<string>();
      for (const [i, value] of list(
        e.functions,
        `${path}/functions`,
        1,
        16,
      ).entries()) {
        const p = `${path}/functions/${i}`,
          f = v.object(value, p, [
            'id',
            'latex',
            'color',
            'label',
            'showExpression',
          ]);
        id(f.id, `${p}/id`, ids);
        v.text(f.latex, `${p}/latex`);
        color(f.color, `${p}/color`);
        bool(f.showExpression, `${p}/showExpression`);
        if (f.label !== undefined) v.text(f.label, `${p}/label`);
      }
      break;
    }
    case 'sequence-graph': {
      window();
      bool(e.connectPoints, `${path}/connectPoints`);
      const p = `${path}/sequence`,
        s = v.object(e.sequence, p, [
          'mode',
          'points',
          'indexVariable',
          'termVariable',
          'start',
          'count',
          'latex',
          'initial',
          'recurrence',
        ]);
      choice(s.mode, `${p}/mode`, ['points', 'explicit', 'recurrent']);
      const allowed =
        s.mode === 'points'
          ? ['mode', 'points']
          : s.mode === 'explicit'
            ? ['mode', 'indexVariable', 'start', 'count', 'latex']
            : [
                'mode',
                'indexVariable',
                'termVariable',
                'start',
                'count',
                'initial',
                'recurrence',
              ];
      for (const key of Object.keys(s))
        if (!allowed.includes(key))
          v.issue(
            `${p}/${key}`,
            'unknown-field',
            'Field does not belong to this sequence mode.',
          );
      if (s.mode === 'points') {
        let previous = -Infinity;
        for (const [i, value] of list(s.points, `${p}/points`).entries()) {
          const q = `${p}/points/${i}`,
            point = v.object(value, q, ['index', 'value']);
          if (v.integer(point.index, `${q}/index`)) {
            if (point.index <= previous)
              v.issue(
                `${q}/index`,
                'value',
                'Point indices must be strictly increasing.',
              );
            previous = point.index;
          }
          numeric(point.value, `${q}/value`);
        }
      } else {
        variable(s.indexVariable, `${p}/indexVariable`, true);
        v.integer(s.start, `${p}/start`);
        if (v.integer(s.count, `${p}/count`) && (s.count < 1 || s.count > 64))
          v.issue(`${p}/count`, 'value', 'Expected 1–64 terms.');
        if (
          typeof s.start === 'number' &&
          typeof s.count === 'number' &&
          s.start + s.count - 1 > 1_000_000
        )
          v.issue(
            `${p}/count`,
            'limit',
            'Last index exceeds the index budget.',
          );
        if (s.mode === 'explicit') v.text(s.latex, `${p}/latex`);
        else {
          variable(s.termVariable, `${p}/termVariable`);
          if (s.termVariable === s.indexVariable)
            v.issue(
              `${p}/termVariable`,
              'collision',
              'Term and index variables must be distinct.',
            );
          numeric(s.initial, `${p}/initial`);
          v.text(s.recurrence, `${p}/recurrence`);
        }
      }
      break;
    }
    case 'sign-table': {
      variable(e.variable, `${path}/variable`);
      const points = list(e.points, `${path}/points`, 2, 32);
      points.forEach((p, i) => endpoint(p, `${path}/points/${i}`));
      const ids = new Set<string>();
      for (const [i, value] of list(e.rows, `${path}/rows`, 1, 16).entries()) {
        const p = `${path}/rows/${i}`,
          r = v.object(value, p, ['id', 'label', 'signs', 'pointSigns']);
        id(r.id, `${p}/id`, ids);
        v.text(r.label, `${p}/label`);
        const signs = v.list(r.signs, `${p}/signs`, 31),
          at = v.list(r.pointSigns, `${p}/pointSigns`, 32);
        if (signs.length !== points.length - 1 || at.length !== points.length)
          v.issue(
            p,
            'value',
            'One sign per interval and one point sign per endpoint are required.',
          );
        signs.forEach((s, j) => choice(s, `${p}/signs/${j}`, ['+', '-', '0']));
        at.forEach((s, j) => {
          choice(s, `${p}/pointSigns/${j}`, ['0', 'excluded', null]);
          const point = points[j];
          if (
            point &&
            typeof point === 'object' &&
            !Array.isArray(point) &&
            point.kind !== 'finite' &&
            s !== null
          )
            v.issue(
              `${p}/pointSigns/${j}`,
              'value',
              'Infinite endpoints have no point sign.',
            );
        });
      }
      break;
    }
    case 'variation-table': {
      variable(e.variable, `${path}/variable`);
      const points = list(e.points, `${path}/points`, 2, 32);
      for (const [i, value] of points.entries()) {
        const p = `${path}/points/${i}`,
          point = v.object(value, p, [
            'x',
            'value',
            'leftLimit',
            'rightLimit',
            'excluded',
          ]);
        endpoint(point.x, `${p}/x`);
        bool(point.excluded, `${p}/excluded`);
        for (const key of ['value', 'leftLimit', 'rightLimit'])
          if (point[key] !== undefined) endpoint(point[key], `${p}/${key}`);
        if (point.excluded === true && point.value !== undefined)
          v.issue(
            `${p}/value`,
            'value',
            'An excluded point cannot have a defined value.',
          );
        if (
          point.value === undefined &&
          point.leftLimit === undefined &&
          point.rightLimit === undefined
        )
          v.issue(
            p,
            'value',
            'A value or prescribed one-sided limit is required.',
          );
      }
      const directions = v.list(e.directions, `${path}/directions`, 31);
      if (directions.length !== points.length - 1)
        v.issue(
          `${path}/directions`,
          'value',
          'One direction per interval is required.',
        );
      directions.forEach((d, i) =>
        choice(d, `${path}/directions/${i}`, [
          'increasing',
          'decreasing',
          'constant',
        ]),
      );
      break;
    }
    case 'value-table': {
      const columns = list(e.columns, `${path}/columns`, 1, 16);
      columns.forEach((c, i) => v.text(c, `${path}/columns/${i}`));
      for (const [i, value] of list(e.rows, `${path}/rows`).entries()) {
        const p = `${path}/rows/${i}`,
          cells = v.list(value, p, 16);
        if (cells.length !== columns.length)
          v.issue(p, 'value', 'Table rows must be rectangular.');
        for (const [j, value] of cells.entries()) {
          const q = `${p}/${j}`,
            cell = v.object(value, q, ['kind', 'text', 'value', 'latex']);
          choice(cell.kind, `${q}/kind`, ['text', 'number', 'math']);
          const key =
            cell.kind === 'text'
              ? 'text'
              : cell.kind === 'number'
                ? 'value'
                : 'latex';
          if (key === 'value') numeric(cell.value, `${q}/value`);
          else v.text(cell[key], `${q}/${key}`, 4096, key === 'text');
          for (const forbidden of ['text', 'value', 'latex'])
            if (forbidden !== key && cell[forbidden] !== undefined)
              v.issue(
                `${q}/${forbidden}`,
                'unknown-field',
                'Field does not belong to this cell kind.',
              );
        }
      }
      break;
    }
    case 'statistics-table':
      for (const [i, value] of list(e.rows, `${path}/rows`).entries()) {
        const p = `${path}/rows/${i}`,
          r = v.object(value, p, ['label', 'value', 'frequency']);
        v.text(r.label, `${p}/label`);
        numeric(r.value, `${p}/value`);
        numeric(r.frequency, `${p}/frequency`);
      }
      break;
    case 'probability-tree': {
      bool(e.exhaustive, `${path}/exhaustive`);
      const nodes = list(e.nodes, `${path}/nodes`),
        ids = new Set<string>(),
        parents = new Map<string, string>();
      let roots = 0;
      for (const [i, value] of nodes.entries()) {
        const p = `${path}/nodes/${i}`,
          n = v.object(value, p, ['id', 'parentId', 'label', 'probability']);
        id(n.id, `${p}/id`, ids);
        v.text(n.label, `${p}/label`);
        if (n.parentId === undefined) {
          roots++;
          if (n.probability !== undefined)
            v.issue(
              `${p}/probability`,
              'value',
              'Root has no edge probability.',
            );
        } else {
          v.text(n.parentId, `${p}/parentId`, 128);
          numeric(n.probability, `${p}/probability`);
          if (typeof n.id === 'string' && typeof n.parentId === 'string')
            parents.set(n.id, n.parentId);
        }
      }
      if (roots !== 1)
        v.issue(`${path}/nodes`, 'value', 'Exactly one root is required.');
      for (const [child, parent] of parents) {
        if (!ids.has(parent))
          v.issue(`${path}/nodes`, 'value', 'Parent does not exist.');
        const seen = new Set([child]);
        let current: string | undefined = parent;
        while (current !== undefined) {
          if (seen.has(current)) {
            v.issue(`${path}/nodes`, 'value', 'Cyclic probability tree.');
            break;
          }
          seen.add(current);
          current = parents.get(current);
        }
      }
      break;
    }
    case 'vectors': {
      choice(e.dimension, `${path}/dimension`, [2, 3]);
      bool(e.showCoordinates, `${path}/showCoordinates`);
      const ids = new Set<string>();
      for (const [i, value] of list(e.vectors, `${path}/vectors`).entries()) {
        const p = `${path}/vectors/${i}`,
          vector = v.object(value, p, ['id', 'label', 'coordinates', 'color']);
        id(vector.id, `${p}/id`, ids);
        v.text(vector.label, `${p}/label`);
        color(vector.color, `${p}/color`);
        coordinates(
          vector.coordinates,
          `${p}/coordinates`,
          typeof e.dimension === 'number' ? e.dimension : 2,
        );
      }
      break;
    }
    case 'geometry': {
      window();
      const points = new Set<string>(),
        objects = new Set<string>();
      for (const [i, value] of list(e.points, `${path}/points`).entries()) {
        const p = `${path}/points/${i}`,
          point = v.object(value, p, ['id', 'label', 'coordinates']);
        id(point.id, `${p}/id`, points);
        v.text(point.label, `${p}/label`);
        coordinates(point.coordinates, `${p}/coordinates`, 2);
      }
      const reference = (value: JsonValue | undefined, p: string) => {
        v.text(value, p, 128);
        if (typeof value === 'string' && !points.has(value))
          v.issue(p, 'value', 'Referenced point does not exist.');
      };
      for (const [i, value] of list(
        e.objects,
        `${path}/objects`,
        0,
      ).entries()) {
        const p = `${path}/objects/${i}`,
          o = v.object(value, p, [
            'id',
            'kind',
            'from',
            'to',
            'center',
            'radius',
            'vertices',
            'color',
          ]);
        id(o.id, `${p}/id`, objects);
        color(o.color, `${p}/color`);
        choice(o.kind, `${p}/kind`, ['segment', 'line', 'circle', 'polygon']);
        const allowed =
          o.kind === 'circle'
            ? ['center', 'radius']
            : o.kind === 'polygon'
              ? ['vertices']
              : ['from', 'to'];
        for (const key of ['from', 'to', 'center', 'radius', 'vertices'])
          if (!allowed.includes(key) && o[key] !== undefined)
            v.issue(
              `${p}/${key}`,
              'unknown-field',
              'Field does not belong to this geometric object.',
            );
        if (o.kind === 'circle') {
          reference(o.center, `${p}/center`);
          numeric(o.radius, `${p}/radius`);
        } else if (o.kind === 'polygon') {
          const vertices = list(o.vertices, `${p}/vertices`, 3, 32),
            seen = new Set<string>();
          vertices.forEach((r, j) => {
            reference(r, `${p}/vertices/${j}`);
            if (typeof r === 'string') {
              if (seen.has(r))
                v.issue(
                  `${p}/vertices/${j}`,
                  'collision',
                  'Polygon vertices must be distinct.',
                );
              seen.add(r);
            }
          });
        } else {
          reference(o.from, `${p}/from`);
          reference(o.to, `${p}/to`);
          if (o.from === o.to)
            v.issue(p, 'value', 'Endpoints must have distinct IDs.');
        }
      }
      break;
    }
    case 'complex-plane': {
      window();
      bool(e.showCoordinates, `${path}/showCoordinates`);
      const ids = new Set<string>();
      for (const [i, value] of list(e.points, `${path}/points`).entries()) {
        const p = `${path}/points/${i}`,
          point = v.object(value, p, [
            'id',
            'label',
            'real',
            'imaginary',
            'color',
          ]);
        id(point.id, `${p}/id`, ids);
        v.text(point.label, `${p}/label`);
        color(point.color, `${p}/color`);
        numeric(point.real, `${p}/real`);
        numeric(point.imaginary, `${p}/imaginary`);
      }
      break;
    }
  }
}
