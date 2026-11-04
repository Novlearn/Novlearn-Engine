import { ComputeEngine, isNumber } from '@cortex-js/compute-engine';
import type { Expression } from '@cortex-js/compute-engine';
import type { InstantiatedMath } from '../contracts/types.js';
import type { MathSyntax } from './input.js';
import { prepareAlgebraSyntax } from './algebra.js';
import type { PreparedAlgebra } from './algebra.js';
import { exactNumber, exactOrder, numericOrder } from './numeric.js';
import type { PreparedNumeric } from './numeric.js';
import type { GraphDiagnosticCode } from '../contracts/graph.js';

export class GraphMathFailure extends Error {
  constructor(readonly code: GraphDiagnosticCode) {
    super(code);
  }
}
export class GraphBudget {
  used = 0;
  spend() {
    if (this.used >= 2048) throw new GraphMathFailure('budget-limit');
    this.used++;
  }
}
const emptyMath: InstantiatedMath = {
  source: '',
  syntax: 0,
  substituted: 0,
  displayLatex: '',
};
const numeric = (expression: Expression): PreparedNumeric => {
  const exact = exactNumber(expression.evaluate());
  return {
    math: emptyMath,
    expression,
    ...(exact === undefined ? {} : { exact }),
  };
};
type Condition = {
  expression: Expression;
  relation: 'NotEqual' | 'Greater' | 'GreaterEqual';
  key: string;
  fixed?: boolean;
  domain?: PreparedAlgebra;
};
/** Immutable exact-domain proofs, shared only inside one sampling operation. */
export type GraphDomains = {
  intervals: Map<string, PreparedAlgebra | null>;
  scalars: Map<string, boolean>;
  segments: Map<string, boolean | null>;
};
const hasVariable = (node: MathSyntax, names: readonly string[]): boolean =>
  typeof node === 'string'
    ? names.includes(node)
    : Array.isArray(node) &&
      (node as MathSyntax[]).slice(1).some((n) => hasVariable(n, names));

/** Cortex parses/substitutes/evaluates; existing exact algebra certifies interval membership. */
export class GraphMath {
  readonly ce = new ComputeEngine();
  readonly expression: Expression;
  private readonly conditions: Condition[] = [];
  constructor(
    math: InstantiatedMath,
    private readonly variables: readonly string[],
    private readonly budget: GraphBudget,
    private readonly domains: GraphDomains = {
      intervals: new Map(),
      scalars: new Map(),
      segments: new Map(),
    },
  ) {
    this.ce.iterationLimit = 1024;
    this.ce.recursionLimit = 64;
    this.ce.precision = 32;
    let nodes = 0;
    const inspect = (node: MathSyntax, depth = 0): void => {
      if (++nodes > 128 || depth > 16)
        throw new GraphMathFailure('unsupported-expression');
      if (typeof node === 'number') {
        if (!Number.isFinite(node)) throw new GraphMathFailure('non-finite');
        return;
      }
      if (typeof node === 'string') {
        if (!['Pi', 'ExponentialE', ...variables].includes(node))
          throw new GraphMathFailure('unsupported-expression');
        return;
      }
      if (
        node &&
        typeof node === 'object' &&
        !Array.isArray(node) &&
        'num' in node
      ) {
        if (
          typeof node.num !== 'string' ||
          node.num.length > 40 ||
          !Number.isFinite(Number(node.num))
        )
          throw new GraphMathFailure('unsupported-expression');
        return;
      }
      if (!Array.isArray(node) || typeof node[0] !== 'string')
        throw new GraphMathFailure('unsupported-expression');
      const items = node as readonly MathSyntax[];
      const head = String(items[0]);
      const args = items.slice(1);
      const unary = [
        'Negate',
        'Delimiter',
        'Square',
        'Sqrt',
        'Sin',
        'Cos',
        'Tan',
        'Ln',
        'Lb',
        'Lg',
        'Exp',
        'Abs',
      ];
      const binary = ['Rational', 'Divide', 'Subtract', 'Power', 'Root'];
      if (!(
        (unary.includes(head) && args.length === 1) ||
        (binary.includes(head) && args.length === 2) ||
        (['Add', 'Multiply'].includes(head) && args.length >= 2) ||
        (head === 'Log' && [1, 2].includes(args.length))
      ))
        throw new GraphMathFailure('unsupported-expression');
      args.forEach((n) => inspect(n, depth + 1));
      if (head === 'Divide' || head === 'Rational')
        this.condition(args[1]!, 'NotEqual');
      if (['Ln', 'Log', 'Lb', 'Lg'].includes(head)) {
        this.condition(args[0]!, 'Greater');
        if (head === 'Log' && args.length === 2) {
          this.condition(args[1]!, 'Greater');
          this.condition(['Subtract', args[1]!, 1], 'NotEqual');
        }
      }
      if (head === 'Sqrt' || head === 'Root') {
        if (
          head === 'Root' &&
          this.ce.box(args[1]!).evaluate().toRational()?.join('/') !== '2/1'
        )
          throw new GraphMathFailure('unsupported-expression');
        this.condition(args[0]!, 'GreaterEqual');
      }
      if (head === 'Tan') this.condition(['Cos', args[0]!], 'NotEqual');
      if (head === 'Power') {
        const rational = hasVariable(args[1]!, variables)
          ? undefined
          : this.ce.box(args[1]!).evaluate().toRational();
        const integer = rational?.[1] === 1 ? rational[0] : undefined;
        if (integer !== undefined) {
          if (!Number.isInteger(integer) || Math.abs(integer) > 16)
            throw new GraphMathFailure('unsupported-expression');
          if (integer <= 0) this.condition(args[0]!, 'NotEqual');
        } else this.condition(args[0]!, 'Greater');
      }
    };
    inspect(math.substituted);
    this.expression = this.ce.box(math.substituted, { form: 'raw' });
  }
  private condition(raw: MathSyntax, relation: Condition['relation']) {
    this.budget.spend();
    const expression = this.ce.box(raw, { form: 'raw' });
    const key = JSON.stringify([this.variables, relation, raw]);
    const condition: Condition = { expression, relation, key };
    if (!hasVariable(raw, this.variables))
      condition.fixed = this.holds(condition, expression);
    else if (this.variables.length === 1) {
      if (!this.domains.intervals.has(key)) {
        const prepared = prepareAlgebraSyntax(
          [relation, raw, 0],
          this.variables[0]!,
          '/graph/domain',
        );
        this.domains.intervals.set(key, prepared.ok ? prepared.value : null);
      }
      const domain = this.domains.intervals.get(key);
      if (domain) condition.domain = domain;
    }
    this.conditions.push(condition);
  }
  private holds(condition: Condition, value: Expression): boolean {
    const exact = exactNumber(value.evaluate());
    const order = exact === undefined ? undefined : exactOrder(exact, 0);
    if (order === undefined) throw new GraphMathFailure('domain-unverified');
    return condition.relation === 'NotEqual'
      ? order !== 0
      : condition.relation === 'Greater'
        ? order === 1
        : order >= 0;
  }
  private contains(
    condition: Condition,
    a: Expression,
    b: Expression,
  ): boolean | undefined {
    if (condition.fixed !== undefined) return condition.fixed;
    const domain = condition.domain;
    const solutions = domain?.solutions;
    if (!domain || !solutions) return undefined;
    const left = numeric(a),
      right = numeric(b);
    const candidates = [
      ...solutions.intervals,
      ...solutions.items.map((p) => ({
        left: p,
        right: p,
        leftClosed: true,
        rightClosed: true,
      })),
    ];
    let unknown = false;
    for (const interval of candidates) {
      const l = numericOrder(left, interval.left),
        r = numericOrder(right, interval.right);
      if (l === undefined || r === undefined) {
        unknown = true;
        continue;
      }
      if (
        !(l > 0 || (l === 0 && interval.leftClosed)) ||
        !(r < 0 || (r === 0 && interval.rightClosed))
      )
        continue;
      let excluded = false;
      for (const p of domain.exclusions) {
        const x = numericOrder(left, p),
          y = numericOrder(right, p);
        if (x === undefined || y === undefined) {
          unknown = true;
          excluded = true;
          break;
        }
        if (x <= 0 && y >= 0) {
          excluded = true;
          break;
        }
      }
      if (!excluded) return true;
    }
    return unknown ? undefined : false;
  }
  value(
    bindings: Record<string, Expression>,
    retainExact = false,
  ): {
    value: number;
    expression: Expression;
  } {
    for (const condition of this.conditions) {
      if (condition.fixed !== undefined) {
        if (!condition.fixed) throw new GraphMathFailure('domain-gap');
        continue;
      }
      this.budget.spend();
      const key = JSON.stringify([
        condition.key,
        this.variables.map((name) => bindings[name]?.json),
      ]);
      let allowed = this.domains.scalars.get(key);
      if (allowed === undefined) {
        const scalar = condition.expression.subs(bindings, {
          canonical: false,
        });
        allowed = this.holds(condition, scalar);
        this.domains.scalars.set(key, allowed);
      }
      if (!allowed) throw new GraphMathFailure('domain-gap');
    }
    this.budget.spend();
    const bound = this.expression.subs(bindings, { canonical: false });
    const evaluatedApproximation = bound.N();
    if (!isNumber(evaluatedApproximation))
      throw new GraphMathFailure('non-finite');
    const approximation = evaluatedApproximation.numericValue;
    const real =
      typeof approximation === 'number' ? approximation : approximation?.re;
    const imaginary = typeof approximation === 'number' ? 0 : approximation?.im;
    if (typeof real !== 'number' || !Number.isFinite(real) || imaginary !== 0)
      throw new GraphMathFailure('non-finite');
    const evaluated = retainExact ? bound.evaluate() : evaluatedApproximation;
    if (JSON.stringify(evaluated.json).length > 4096)
      throw new GraphMathFailure('budget-limit');
    return { value: Object.is(real, -0) ? 0 : real, expression: evaluated };
  }
  segment(
    a: Expression,
    b: Expression,
  ): 'safe' | 'domain-gap' | 'domain-unverified' {
    for (const condition of this.conditions) {
      this.budget.spend();
      const key = JSON.stringify([condition.key, a.json, b.json]);
      if (!this.domains.segments.has(key))
        this.domains.segments.set(key, this.contains(condition, a, b) ?? null);
      const allowed = this.domains.segments.get(key);
      if (allowed !== true)
        return allowed === false ? 'domain-gap' : 'domain-unverified';
    }
    return 'safe';
  }
}
