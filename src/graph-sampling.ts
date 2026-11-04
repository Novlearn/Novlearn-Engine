import { ComputeEngine } from '@cortex-js/compute-engine';
import type { Expression } from '@cortex-js/compute-engine';
import type { ExerciseInstance } from './contracts/types.js';
import type {
  PrivateDisplayElement,
  RenderNumber,
} from './contracts/elements.js';
import { supportedSnapshotVersion } from './contracts/snapshot-version.js';
import { GRAPH_PROFILE } from './contracts/graph.js';
import type {
  DisplayGraph,
  GraphSamplingResult,
  GraphDiagnostic,
  GraphSeries,
  GraphDiagnosticCode,
} from './contracts/graph.js';
import { GraphMath, GraphBudget, GraphMathFailure } from './math/graph.js';
import type { GraphDomains } from './math/graph.js';
import { checkDisplayData } from './math/display-data-checks.js';

type GraphElement = Extract<
  PrivateDisplayElement,
  { type: 'function-graph' | 'sequence-graph' }
>;
const issue = (error: unknown): GraphDiagnosticCode => {
  if (error instanceof GraphMathFailure) return error.code;
  throw error;
};
const rational = (ce: ComputeEngine, n: RenderNumber): Expression => {
  if (
    !Number.isSafeInteger(n.numerator) ||
    !Number.isSafeInteger(n.denominator) ||
    n.denominator <= 0
  )
    throw new Error('invalid-number');
  return ce.box(['Rational', n.numerator, n.denominator]).evaluate();
};

/** Trusted server snapshots only. Shape is never proof of browser provenance. */
export async function sampleDisplayGraph(
  official: ExerciseInstance,
  elementId: string,
  profile: typeof GRAPH_PROFILE = GRAPH_PROFILE,
): Promise<GraphSamplingResult> {
  if (profile !== GRAPH_PROFILE) return { ok: false, error: 'invalid-profile' };
  let element: GraphElement;
  try {
    if (
      !official ||
      !supportedSnapshotVersion(official) ||
      typeof official.instanceId !== 'string' ||
      !official.instanceId ||
      !Array.isArray(official.elements)
    )
      return { ok: false, error: 'invalid-instance' };
    const matches = official.elements.filter((e) => e.id === elementId);
    if (matches.length !== 1) return { ok: false, error: 'invalid-element' };
    const selected = matches[0]!;
    if (
      selected.type !== 'function-graph' &&
      selected.type !== 'sequence-graph'
    )
      return { ok: false, error: 'invalid-element' };
    element = selected;
    if (!Array.isArray(element.mathFields))
      return { ok: false, error: 'invalid-instance' };
    if (
      element.type === 'function-graph' &&
      (!element.functions.length ||
        element.functions.length > 16 ||
        new Set(element.functions.map((f) => f.id)).size !==
          element.functions.length)
    )
      return { ok: false, error: 'invalid-instance' };
    if (
      element.type === 'sequence-graph' &&
      element.sequence.mode !== 'points' &&
      (!Number.isSafeInteger(element.sequence.start) ||
        !Number.isInteger(element.sequence.count) ||
        element.sequence.count < 1 ||
        element.sequence.count > 64)
    )
      return { ok: false, error: 'invalid-instance' };
    checkDisplayData(element, '/graph');
  } catch {
    return { ok: false, error: 'invalid-instance' };
  }
  try {
    const material = JSON.stringify({
      profile,
      instanceId: official.instanceId,
      elementId,
      type: element.type,
      window: element.window,
      ...(element.type === 'function-graph'
        ? {
            variable: element.variable,
            functions: element.functions.map((f) => ({
              id: f.id,
              latex: f.latex,
            })),
          }
        : { sequence: element.sequence, connectPoints: element.connectPoints }),
      mathFields: element.mathFields
        .filter((f) => f.admission === 'display-only')
        .map((f) => ({
          path: f.path,
          source: f.math.source,
          substituted: f.math.substituted,
        })),
    });
    const digest = await globalThis.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(material),
    );
    const sourceSha256 = Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
    const budget = new GraphBudget();
    const domains: GraphDomains = {
      intervals: new Map(),
      scalars: new Map(),
      segments: new Map(),
    };
    const diagnostics: GraphDiagnostic[] = [];
    const series: GraphSeries[] = [];
    const source = (suffix: string) => {
      const found = element.mathFields.filter(
        (f) => f.admission === 'display-only' && f.path.endsWith(suffix),
      );
      if (found.length !== 1)
        throw new GraphMathFailure('unsupported-expression');
      return found[0]!.math;
    };
    if (element.type === 'function-graph') {
      const ce = new ComputeEngine();
      ce.iterationLimit = 1024;
      ce.recursionLimit = 64;
      const min = rational(ce, element.window.xMin),
        max = rational(ce, element.window.xMax);
      const xs = Array.from({ length: 65 }, (_, i) =>
        ce
          .box([
            'Add',
            min.json,
            ['Multiply', ['Rational', i, 64], ['Subtract', max.json, min.json]],
          ])
          .evaluate(),
      );
      for (const [fIndex, f] of element.functions.entries()) {
        const line: GraphSeries = { id: f.id, points: [], segments: [] };
        series.push(line);
        let math: GraphMath | undefined;
        try {
          math = new GraphMath(
            source(`/functions/${fIndex}/latex`),
            [element.variable],
            budget,
            domains,
          );
        } catch (error) {
          diagnostics.push({ seriesId: f.id, code: issue(error) });
          continue;
        }
        for (const [sample, x] of xs.entries()) {
          try {
            const result = math.value({ [element.variable]: x });
            const coordinates = x.toRational();
            if (!coordinates) throw new GraphMathFailure('non-finite');
            const renderX = coordinates[0] / coordinates[1];
            if (!Number.isFinite(renderX))
              throw new GraphMathFailure('non-finite');
            const previous = line.points.at(-1);
            line.points.push({
              sample,
              x: Object.is(renderX, -0) ? 0 : renderX,
              y: result.value,
            });
            if (previous && previous.sample === sample - 1) {
              const connection = math.segment(xs[sample - 1]!, x);
              if (connection === 'safe')
                line.segments.push([
                  line.points.length - 2,
                  line.points.length - 1,
                ]);
              else
                diagnostics.push({
                  seriesId: f.id,
                  code: connection,
                  fromSample: sample - 1,
                  toSample: sample,
                });
            }
          } catch (error) {
            diagnostics.push({ seriesId: f.id, code: issue(error), sample });
          }
        }
      }
    } else {
      const s = element.sequence,
        line: GraphSeries = { id: element.id, points: [], segments: [] };
      series.push(line);
      if (s.mode === 'points') {
        for (const [sample, p] of s.points.entries()) {
          const y = p.value.numerator / p.value.denominator;
          if (!Number.isFinite(y) || !Number.isSafeInteger(p.index))
            throw new Error('invalid-sequence-point');
          line.points.push({ sample, x: p.index, y });
          if (element.connectPoints && sample)
            line.segments.push([sample - 1, sample]);
        }
      } else {
        let math: GraphMath | undefined;
        try {
          math = new GraphMath(
            source(
              s.mode === 'explicit'
                ? '/sequence/latex'
                : '/sequence/recurrence',
            ),
            s.mode === 'explicit'
              ? [s.indexVariable]
              : [s.indexVariable, s.termVariable],
            budget,
            domains,
          );
        } catch (error) {
          diagnostics.push({ seriesId: element.id, code: issue(error) });
        }
        if (math) {
          let previous: Expression | undefined =
            s.mode === 'recurrent' ? rational(math.ce, s.initial) : undefined;
          let broken = false;
          for (let sample = 0; sample < s.count; sample++) {
            if (broken) {
              diagnostics.push({
                seriesId: element.id,
                code: 'dependent-term',
                sample,
              });
              continue;
            }
            try {
              const index = s.start + sample;
              if (!Number.isSafeInteger(index))
                throw new GraphMathFailure('non-finite');
              let value: number;
              if (s.mode === 'recurrent' && sample === 0) {
                budget.spend();
                value = s.initial.numerator / s.initial.denominator;
                if (!Number.isFinite(value))
                  throw new GraphMathFailure('non-finite');
              } else {
                const bindings: Record<string, Expression> = {
                  [s.indexVariable]: math.ce.box(
                    s.mode === 'recurrent' ? index - 1 : index,
                  ),
                };
                if (s.mode === 'recurrent')
                  bindings[s.termVariable] = previous!;
                const result = math.value(bindings, s.mode === 'recurrent');
                value = result.value;
                previous = result.expression;
              }
              line.points.push({
                sample,
                x: index,
                y: Object.is(value, -0) ? 0 : value,
              });
              if (
                element.connectPoints &&
                line.points.length > 1 &&
                line.points.at(-2)!.sample === sample - 1
              )
                line.segments.push([
                  line.points.length - 2,
                  line.points.length - 1,
                ]);
            } catch (error) {
              diagnostics.push({
                seriesId: element.id,
                code: issue(error),
                sample,
              });
              if (s.mode === 'recurrent') broken = true;
            }
          }
        }
      }
    }
    const state = diagnostics.length
      ? series.every((s) => !s.points.length)
        ? 'unsupported'
        : 'partial'
      : 'complete';
    const value: DisplayGraph = {
      schemaVersion: 1,
      profile,
      instanceId: official.instanceId,
      elementId,
      sourceSha256,
      approximation: 'numeric',
      formulaDomain: 'unverified',
      state,
      series,
      diagnostics,
      evaluations: budget.used,
    };
    return { ok: true, value };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}
