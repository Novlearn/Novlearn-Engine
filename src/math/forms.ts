import { ComputeEngine } from '@cortex-js/compute-engine';
import type { AtomicForm, FormPolicy } from '../contracts/types.js';
import type { MathSyntax } from './input.js';
import { encode } from './substitution.js';
import { exactNumber, exactOrder } from './numeric.js';

export interface FormWitness {
  conforms: boolean | undefined;
  code: string;
}
function unwrap(node: MathSyntax): MathSyntax {
  while (Array.isArray(node) && node[0] === 'Delimiter' && node.length === 2)
    node = node[1]!;
  return node;
}
/** Integer notation only: a decimal such as 1.0 is deliberately not an integer atom. */
function integer(node: MathSyntax): number | undefined {
  node = unwrap(node);
  if (Array.isArray(node) && node[0] === 'Negate' && node.length === 2) {
    const n = integer(node[1]!);
    return n === undefined ? undefined : -n;
  }
  return typeof node === 'number' &&
    Number.isSafeInteger(node) &&
    Math.abs(node) <= 1e9
    ? node
    : undefined;
}
function contains(node: MathSyntax, variable: string): boolean {
  if (node === variable) return true;
  if (!Array.isArray(node)) return false;
  const children: MathSyntax[] = [...node].slice(1);
  return children.some((n) => contains(n, variable));
}
function coprime(ce: ComputeEngine, a: number, b: number): boolean | undefined {
  const gcd = ce.box(['GCD', a, b]).evaluate().toRational();
  return gcd === null || gcd === undefined
    ? undefined
    : gcd[0] === 1 && gcd[1] === 1;
}
function fraction(node: MathSyntax, ce: ComputeEngine): boolean | undefined {
  node = unwrap(node);
  if (Array.isArray(node) && node[0] === 'Negate' && node.length === 2)
    return fraction(node[1]!, ce);
  if (integer(node) !== undefined) return true; // denominator one
  if (!Array.isArray(node) || node[0] !== 'Divide' || node.length !== 3)
    return false;
  const a = integer(node[1]!);
  const b = integer(node[2]!);
  if (a === undefined || b === undefined) return undefined;
  if (b === 0) return undefined; // domain admission belongs to the value pipeline
  return coprime(ce, a, b);
}
/** True only when no distribution in the official variable remains. */
function monomial(node: MathSyntax, variable: string): boolean | undefined {
  node = unwrap(node);
  if (!contains(node, variable)) return true;
  if (node === variable) return true;
  if (!Array.isArray(node)) return undefined;
  const args: MathSyntax[] = [...node].slice(1);
  switch (node[0]) {
    case 'Negate':
      return monomial(args[0]!, variable);
    case 'Multiply':
    case 'InvisibleOperator': {
      const results = args.map((n) => monomial(n, variable));
      return results.includes(false)
        ? false
        : results.includes(undefined)
          ? undefined
          : true;
    }
    case 'Divide':
      return contains(args[1]!, variable)
        ? undefined
        : monomial(args[0]!, variable);
    case 'Square':
      return monomial(args[0]!, variable);
    case 'Power': {
      const exponent = integer(args[1]!);
      if (exponent === undefined || exponent < 1 || exponent > 16)
        return undefined;
      return monomial(args[0]!, variable);
    }
    case 'Add':
    case 'Subtract':
      return false;
    default:
      return undefined;
  }
}
function terms(node: MathSyntax): MathSyntax[] {
  node = unwrap(node);
  if (Array.isArray(node) && node[0] === 'Add')
    return [...node].slice(1).flatMap(terms);
  if (Array.isArray(node) && node[0] === 'Subtract')
    return [...terms(node[1]!), ['Negate', node[2]!] as MathSyntax];
  return [node];
}
/** Track explicit signs through a monomial without evaluating or distributing it. */
function explicitSigns(node: MathSyntax): number {
  node = unwrap(node);
  if (typeof node === 'number') return node < 0 ? 1 : 0;
  if (!Array.isArray(node)) return 0;
  const children: MathSyntax[] = [...node].slice(1);
  return (
    (node[0] === 'Negate' ? 1 : 0) +
    children.reduce<number>((total, n) => total + explicitSigns(n), 0)
  );
}
function reducedTerm(
  node: MathSyntax,
  variable: string,
  ce: ComputeEngine,
): number | false | undefined {
  node = unwrap(node);
  if (explicitSigns(node) > 1) return false;
  if (Array.isArray(node) && node[0] === 'Negate') {
    const child = unwrap(node[1]!);
    return reducedTerm(child, variable, ce);
  }
  if (node === variable) return 1;
  if (Array.isArray(node) && (node[0] === 'Power' || node[0] === 'Square')) {
    const exponent = node[0] === 'Square' ? 2 : integer(node[2]!);
    if (unwrap(node[1]!) !== variable || exponent === undefined) return false;
    return exponent >= 2 && exponent <= 16 ? exponent : false;
  }
  if (!contains(node, variable)) {
    if (
      Array.isArray(node) &&
      node[0] === 'Divide' &&
      Math.abs(integer(node[2]!) ?? 0) === 1
    )
      return false;
    const simple =
      typeof node === 'number' ||
      (typeof node === 'object' &&
        !Array.isArray(node) &&
        node !== null &&
        'num' in node);
    const rational = simple ? true : fraction(node, ce);
    if (rational !== true) return rational;
    const value = ce
      .box(encode(node, '/form/coefficient'))
      .evaluate()
      .toRational();
    return value === undefined || value === null
      ? undefined
      : value[0] === 0
        ? false
        : 0;
  }
  if (!Array.isArray(node)) return undefined;
  if (node[0] === 'Multiply' || node[0] === 'InvisibleOperator') {
    if (node.length !== 3) return false;
    const factors: MathSyntax[] = [...node].slice(1);
    const scalar = factors.find((n) => !contains(n, variable));
    const power = factors.find((n) => contains(n, variable));
    if (scalar === undefined || power === undefined) return false;
    const coefficientForm = reducedTerm(scalar, variable, ce);
    if (coefficientForm === undefined) return undefined;
    if (coefficientForm !== 0) return false;
    const value = ce
      .box(encode(scalar, '/form/coefficient'))
      .evaluate()
      .toRational();
    if (!value) return undefined;
    if (value[0] === 0 || Math.abs(Number(value[0])) === Number(value[1]))
      return false;
    return reducedTerm(power, variable, ce);
  }
  if (node[0] === 'Divide') {
    const denominator = integer(node[2]!);
    if (denominator === undefined || denominator === 0) return undefined;
    if (Math.abs(denominator) === 1) return false;
    const degree = reducedTerm(node[1]!, variable, ce);
    if (degree === false || degree === undefined) return degree;
    const coefficients = ce.box(node[1]!).polynomialCoefficients(variable);
    if (!coefficients) return undefined;
    const coefficient = coefficients[0]?.evaluate().toRational();
    if (!coefficient || coefficient[1] !== 1) return false;
    const gcd = coprime(ce, Number(coefficient[0]), denominator);
    return gcd === true ? degree : gcd;
  }
  return false;
}
function atomic(
  form: AtomicForm,
  syntax: MathSyntax,
  variable: string,
  ce: ComputeEngine,
): boolean | undefined {
  if (form === 'irreducible-fraction') return fraction(syntax, ce);
  if (form === 'power-of-e') {
    const node = unwrap(syntax);
    if (
      !Array.isArray(node) ||
      node[0] !== 'Power' ||
      node.length !== 3 ||
      unwrap(node[1]!) !== 'ExponentialE'
    )
      return false;
    const exponent = ce.box(encode(node[2]!, '/form/exponent')).evaluate();
    return (
      exponent.toRational() !== null && exponent.toRational() !== undefined
    );
  }
  if (form === 'factorized') return factorized(syntax, variable, ce);
  const items = terms(syntax);
  const expanded = items.map((n) => monomial(n, variable));
  if (expanded.includes(false)) return false;
  if (expanded.includes(undefined)) return undefined;
  if (form === 'expanded') return true;
  if (items.length === 1) {
    let atom = unwrap(items[0]!);
    if (explicitSigns(atom) > 1) return false;
    if (integer(atom) === 0) return true;
    if (Array.isArray(atom) && atom[0] === 'Negate') atom = unwrap(atom[1]!);
    if (!Array.isArray(atom) && typeof atom !== 'string') {
      const zero = exactNumber(ce.box(encode(atom, '/form/zero')).evaluate());
      if (zero !== undefined && exactOrder(zero, 0) === 0) return true;
    }
  }
  const degrees = items.map((n) => reducedTerm(n, variable, ce));
  if (degrees.includes(false)) return false;
  if (degrees.includes(undefined)) return undefined;
  return new Set(degrees).size === degrees.length;
}
/** Complete over Q: nonzero scalars are units; only degree 0/1/2 irreducibility is proved. */
function factorized(
  node: MathSyntax,
  variable: string,
  ce: ComputeEngine,
  unitOnly = false,
): boolean | undefined {
  node = unwrap(node);
  if (!contains(node, variable)) {
    if (!unitOnly) return true;
    const value = exactNumber(ce.box(encode(node, '/form/unit')).evaluate());
    const sign = value === undefined ? undefined : exactOrder(value, 0);
    return sign === undefined ? undefined : sign !== 0;
  }
  if (Array.isArray(node)) {
    if (node[0] === 'Negate')
      return factorized(node[1]!, variable, ce, unitOnly);
    if (node[0] === 'Multiply' || node[0] === 'InvisibleOperator') {
      const factors: MathSyntax[] = [...node].slice(1);
      const results = factors.map((n) => factorized(n, variable, ce, true));
      return results.includes(false)
        ? false
        : results.includes(undefined)
          ? undefined
          : true;
    }
    if (node[0] === 'Power' || node[0] === 'Square') {
      const exponent = node[0] === 'Square' ? 2 : integer(node[2]!);
      if (exponent === undefined || exponent < 1 || exponent > 16)
        return undefined;
      return factorized(node[1]!, variable, ce, true);
    }
    if (node[0] === 'Divide' && !contains(node[2]!, variable))
      return factorized(node[1]!, variable, ce, unitOnly);
  }
  const coefficients = ce
    .box(encode(node, '/form/factor'))
    .polynomialCoefficients(variable);
  if (!coefficients) return undefined;
  const values = coefficients.map((c) => c.evaluate());
  if (
    !values.every(
      (c) => c.toRational() !== null && exactNumber(c) !== undefined,
    )
  )
    return undefined;
  while (values.length > 1 && exactOrder(exactNumber(values[0]!)!, 0) === 0)
    values.shift();
  if (values.length === 1) return exactOrder(exactNumber(values[0]!)!, 0) !== 0;
  if (values.length === 2) return true;
  if (values.length !== 3) return undefined;
  const [a, b, c] = values;
  const discriminant = ce
    .function('Subtract', [
      ce.function('Square', [b!]),
      ce.function('Multiply', [4, a!, c!]),
    ])
    .evaluate();
  const exact = exactNumber(discriminant);
  if (exact === undefined) return undefined;
  const sign = exactOrder(exact, 0);
  if (sign === -1) return true;
  if (sign === 0) return false;
  if (sign !== 1) return undefined;
  const root = ce.function('Sqrt', [discriminant]).evaluate();
  const rootExact = exactNumber(root);
  if (rootExact === undefined) return undefined;
  if (root.toRational() !== null) return false;
  // An exact q*sqrt(d) with integer square-free d>1 proves a non-rational square root.
  if (typeof rootExact !== 'number') {
    const witness = rootExact.asExact;
    if (
      witness &&
      'radical' in witness &&
      typeof witness.radical === 'number' &&
      witness.radical > 1
    )
      return true;
  }
  return undefined;
}
/** Call only after raw admission. Uses the preserved ORIGINAL AST, never evaluated syntax. */
export function checkForm(
  policy: FormPolicy,
  syntax: MathSyntax,
  variable = 'z',
  references: readonly MathSyntax[] = [],
): FormWitness {
  if (policy === 'value-only')
    return { conforms: true, code: 'form-not-required' };
  const ce = new ComputeEngine();
  ce.iterationLimit = 1024;
  ce.recursionLimit = 64;
  if (typeof policy === 'object' && policy.kind === 'accepted-latex') {
    const conforms = references.length
      ? references.some((n) => signature(n) === signature(syntax))
      : undefined;
    return {
      conforms,
      code:
        conforms === true
          ? 'form-conforming'
          : conforms === false
            ? 'form-nonconforming'
            : 'form-proof',
    };
  }
  const choices = typeof policy === 'string' ? [policy] : policy.anyOf;
  const results = choices.map((form) => atomic(form, syntax, variable, ce));
  const conforms = results.includes(true)
    ? true
    : results.includes(undefined)
      ? undefined
      : false;
  return {
    conforms,
    code:
      conforms === true
        ? 'form-conforming'
        : conforms === false
          ? 'form-nonconforming'
          : 'form-proof',
  };
}
/** Only presentation grouping and multiplication spelling are ignored; operand order stays significant. */
function signature(node: MathSyntax): string {
  node = unwrap(node);
  if (!Array.isArray(node)) return JSON.stringify(node);
  if (node[0] === 'Rational' && node[2] === 1) return signature(node[1]!);
  const head =
    node[0] === 'InvisibleOperator'
      ? 'Multiply'
      : node[0] === 'Rational'
        ? 'Divide'
        : node[0];
  const children: MathSyntax[] = [...node].slice(1);
  return JSON.stringify([head, ...children.map(signature)]);
}
