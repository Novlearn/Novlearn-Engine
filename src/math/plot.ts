import { ComputeEngine } from '@cortex-js/compute-engine';
import type { PublicDisplayElement, GraphPlot } from '../contracts/elements.js';
import { parseDisplayInput } from './input.js';

/** Approximate rendering data only. Never used as a domain proof or a verdict. */
export function sampleFunctionGraph(
  graph: Extract<PublicDisplayElement, { type: 'function-graph' }>,
): GraphPlot {
  const xMin = graph.window.xMin.numerator / graph.window.xMin.denominator;
  const xMax = graph.window.xMax.numerator / graph.window.xMax.denominator;
  if (
    !Number.isFinite(xMin) ||
    !Number.isFinite(xMax) ||
    xMin >= xMax ||
    graph.functions.length > 8
  )
    throw new Error('unsupported-plot');
  const ce = new ComputeEngine({ precision: 'machine' });
  ce.iterationLimit = 1024;
  ce.recursionLimit = 64;
  const count = 513;
  const values = graph.functions.map((fn) => {
    const parsed = parseDisplayInput(fn.latex, { variables: [graph.variable] });
    if (!parsed.ok) throw new Error('unsupported-plot');
    const expression = ce.box(parsed.syntax, { form: 'raw' });
    return Array.from({ length: count }, (_, index) => {
      const x = xMin + ((xMax - xMin) * index) / (count - 1);
      const n = expression
        .subs({ [graph.variable]: x }, { canonical: false })
        .N();
      return n.im === 0 && Number.isFinite(n.re) ? n.re : null;
    });
  });
  return { version: 'cortex-samples-v1', xMin, xMax, values };
}
