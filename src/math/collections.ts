import { ComputeEngine } from '@cortex-js/compute-engine';
import type { GeneratedValue, InstantiatedMath } from '../contracts/types.js';
import { parseCollectionInput } from './input.js';
import type { MathInputContext, MathSyntax } from './input.js';
import {
  admitSource,
  MathFailure,
  substituteParameters,
} from './substitution.js';
import type { InstantiationMathDiagnostic } from './substitution.js';
import { numericOrder, prepareNumeric, compareNumeric } from './numeric.js';
import type { PreparedNumeric } from './numeric.js';

export interface NumericInterval {
  left: PreparedNumeric;
  right: PreparedNumeric;
  leftClosed: boolean;
  rightClosed: boolean;
}
export interface PreparedCollection {
  math: InstantiatedMath;
  kind: 'set' | 'intervals';
  items: PreparedNumeric[];
  intervals: NumericInterval[];
}
type CollectionResult =
  | { ok: true; value: PreparedCollection }
  | { ok: false; diagnostics: InstantiationMathDiagnostic[] };
function fail(
  code: InstantiationMathDiagnostic['code'],
  path: string,
  message: string,
): never {
  throw new MathFailure({ code, path, message });
}

/** Normalize exact interval DATA; mathematical parsing/substitution stays in CortexJS. */
export function normalizeIntervals(
  intervals: readonly NumericInterval[],
  path = '/intervals',
): NumericInterval[] {
  if (intervals.length > 64)
    fail('limit', path, 'At most 64 interval components.');
  const admitted: NumericInterval[] = [];
  for (const interval of intervals) {
    if (
      (interval.left.infinity !== undefined && interval.leftClosed) ||
      (interval.right.infinity !== undefined && interval.rightClosed)
    )
      fail('invalid-syntax', path, 'An infinite endpoint cannot be closed.');
    if (interval.left.infinity === 1 || interval.right.infinity === -1)
      fail('invalid-syntax', path, 'Infinity has a fixed side.');
    const order = numericOrder(interval.left, interval.right);
    if (order === undefined)
      fail('not-calculable', path, 'The endpoint order is unproved.');
    if (order === 1)
      fail(
        'invalid-syntax',
        path,
        'The left endpoint exceeds the right endpoint.',
      );
    if (order === 0 && (!interval.leftClosed || !interval.rightClosed))
      continue;
    admitted.push({ ...interval });
  }
  admitted.sort((a, b) => {
    const order = numericOrder(a.left, b.left);
    if (order === undefined)
      fail('not-calculable', path, 'The component order is unproved.');
    return order || (a.leftClosed === b.leftClosed ? 0 : a.leftClosed ? -1 : 1);
  });
  const result: NumericInterval[] = [];
  for (const next of admitted) {
    const previous = result.at(-1);
    if (!previous) {
      result.push(next);
      continue;
    }
    const contact = numericOrder(previous.right, next.left);
    if (contact === undefined)
      fail('not-calculable', path, 'The component overlap is unproved.');
    if (
      contact < 0 ||
      (contact === 0 && !previous.rightClosed && !next.leftClosed)
    ) {
      result.push(next);
      continue;
    }
    const rightOrder = numericOrder(previous.right, next.right);
    if (rightOrder === undefined)
      fail('not-calculable', path, 'The right endpoint order is unproved.');
    if (rightOrder < 0) {
      previous.right = next.right;
      previous.rightClosed = next.rightClosed;
    } else if (rightOrder === 0) previous.rightClosed ||= next.rightClosed;
    if (numericOrder(previous.left, next.left) === 0)
      previous.leftClosed ||= next.leftClosed;
  }
  return result;
}
/** Set equality tolerates duplicate notation; lack of an equality proof never becomes a mismatch. */
export function compareFiniteSets(
  a: readonly PreparedNumeric[],
  b: readonly PreparedNumeric[],
): boolean | undefined {
  let unknown = false;
  for (const [from, to] of [
    [a, b],
    [b, a],
  ] as const) {
    for (const value of from) {
      const matches = to.map((other) => compareNumeric(value, other).equal);
      if (matches.includes(true)) continue;
      if (matches.every((match) => match === false)) return false;
      unknown = true;
    }
  }
  return unknown ? undefined : true;
}
export function compareCollections(
  a: PreparedCollection,
  b: PreparedCollection,
): boolean | undefined {
  if (a.kind !== b.kind) return undefined;
  if (a.kind === 'set') return compareFiniteSets(a.items, b.items);
  if (a.intervals.length !== b.intervals.length) return false;
  let unknown = false;
  for (let i = 0; i < a.intervals.length; i++) {
    const left = a.intervals[i]!,
      right = b.intervals[i]!;
    if (
      left.leftClosed !== right.leftClosed ||
      left.rightClosed !== right.rightClosed
    )
      return false;
    for (const order of [
      numericOrder(left.left, right.left),
      numericOrder(left.right, right.right),
    ]) {
      if (order !== undefined && order !== 0) return false;
      if (order === undefined) unknown = true;
    }
  }
  return unknown ? undefined : true;
}

/** Whole original collection syntax and substitution retained; every scalar uses the real admission. */
export function prepareCollection(
  source: string,
  context: MathInputContext,
  values: Readonly<Record<string, GeneratedValue>>,
  path: string,
  kind: 'set' | 'intervals',
): CollectionResult {
  const parsed = parseCollectionInput(source, context);
  if (!parsed.ok)
    return {
      ok: false,
      diagnostics: parsed.diagnostics.map((d) => ({ ...d, path })),
    };
  try {
    admitSource(source, path);
    const ce = new ComputeEngine();
    ce.iterationLimit = 1024;
    ce.recursionLimit = 64;
    const substituted = substituteParameters(
      ce,
      parsed.syntax,
      parsed.symbols.parameters,
      values,
      path,
      true,
    );
    const raw = substituted.json;
    const items: PreparedNumeric[] = [];
    const intervals: NumericInterval[] = [];
    const number = (
      node: MathSyntax,
      p: string,
      infinity: boolean,
    ): PreparedNumeric => {
      while (
        Array.isArray(node) &&
        node[0] === 'Delimiter' &&
        node.length === 2
      )
        node = node[1]!;
      if (
        (Array.isArray(node) &&
          [
            'Set',
            'Interval',
            'Union',
            'Sequence',
            'List',
            'Block',
            'Open',
          ].includes(String(node[0]))) ||
        (Array.isArray(node) && node[0] === 'Delimiter' && node.length !== 2)
      )
        fail(
          'invalid-syntax',
          p,
          'A scalar endpoint or finite set member is required.',
        );
      const r = prepareNumeric(
        // Internal re-reading only; public/expected display retains Cortex defaults.
        ce.box(node, { form: 'raw' }).toLatex({
          invisibleMultiply: '\\cdot',
          multiply: '\\cdot',
          digitGroupSeparator: '',
        }),
        {},
        {},
        p,
        infinity,
      );
      if (!r.ok) throw new MathFailure(r.diagnostics[0]!);
      return r.value;
    };
    const finiteSet = (node: MathSyntax, p: string): void => {
      while (
        Array.isArray(node) &&
        node[0] === 'Delimiter' &&
        node.length === 2
      )
        node = node[1]!;
      if (node === 'EmptySet') return;
      if (!Array.isArray(node) || node[0] !== 'Set')
        fail('invalid-syntax', p, 'A finite set is required.');
      let members = (node as MathSyntax[]).slice(1);
      if (
        members.length === 1 &&
        Array.isArray(members[0]) &&
        members[0][0] === 'Delimiter' &&
        members[0].length !== 2
      ) {
        const delimiter = members[0] as MathSyntax[];
        const sep = delimiter[2];
        if (
          sep !== "';'" &&
          !(
            sep !== null &&
            typeof sep === 'object' &&
            !Array.isArray(sep) &&
            'str' in sep &&
            sep.str === ';'
          )
        )
          fail('invalid-syntax', p, 'A tuple is not a finite set member.');
        const body = delimiter[1];
        if (!Array.isArray(body) || body[0] !== 'Sequence')
          fail('invalid-syntax', p, 'Invalid set separator structure.');
        members = (body as MathSyntax[]).slice(1);
      }
      if (members.length > 64)
        fail('limit', p, 'At most 64 finite set members.');
      for (const [i, member] of members.entries())
        items.push(number(member, `${p}/${i}`, false));
    };
    let components = 0;
    const union = (node: MathSyntax, p: string): void => {
      while (
        Array.isArray(node) &&
        node[0] === 'Delimiter' &&
        node.length === 2
      )
        node = node[1]!;
      if (!Array.isArray(node) || node[0] !== 'Union') {
        components++;
        if (components > 64)
          fail(
            'limit',
            p,
            'At most 64 union components, including empty components.',
          );
      }
      if (node === 'EmptySet') return;
      if (!Array.isArray(node))
        fail('invalid-syntax', p, 'An interval or union is required.');
      const a = node as MathSyntax[];
      if (a[0] === 'Union') {
        if (a.length < 3)
          fail('invalid-syntax', p, 'A union requires two components.');
        for (const [i, n] of a.slice(1).entries()) union(n, `${p}/${i}`);
      } else if (a[0] === 'Set') {
        const start = items.length;
        finiteSet(node, p);
        for (const item of items.slice(start))
          intervals.push({
            left: item,
            right: item,
            leftClosed: true,
            rightClosed: true,
          });
      } else if (a[0] === 'Interval' && a.length === 3) {
        const endpoint = (
          n: MathSyntax,
          side: string,
        ): { value: PreparedNumeric; closed: boolean } => {
          const open = Array.isArray(n) && n[0] === 'Open';
          if (open && n.length !== 2)
            fail('invalid-syntax', p, 'Invalid open endpoint.');
          const value = number(open ? n[1]! : n, `${p}/${side}`, true);
          return { value, closed: !open };
        };
        const left = endpoint(a[1]!, 'left'),
          right = endpoint(a[2]!, 'right');
        intervals.push({
          left: left.value,
          right: right.value,
          leftClosed: left.closed,
          rightClosed: right.closed,
        });
      } else
        fail(
          'invalid-syntax',
          p,
          'Only intervals, singleton sets and unions are supported.',
        );
      if (intervals.length > 64)
        fail('limit', p, 'At most 64 union components.');
    };
    if (kind === 'set') finiteSet(raw, path);
    else union(raw, path);
    const normalized =
      kind === 'intervals' ? normalizeIntervals(intervals, path) : [];
    const displayLatex = substituted.latex;
    if (!displayLatex || displayLatex.length > 4096)
      fail('limit', path, 'Collection display exceeds its budget.');
    return {
      ok: true,
      value: {
        kind,
        items,
        intervals: normalized,
        math: { source, syntax: parsed.syntax, substituted: raw, displayLatex },
      },
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        error instanceof MathFailure
          ? error.diagnostic
          : {
              code: 'substitution-failed',
              path,
              message: 'Collection preparation failed.',
            },
      ],
    };
  }
}
