/** Encode the shortest decimal spelling of a finite JS number onto a grid.
 * This is numeric transport conversion, not expression parsing or approximation.
 * Callers validate magnitude and precision first. BigInts never leave this module.
 */
export function decimalGrid(
  value: number,
  precision: number,
): {
  floor: number;
  ceil: number;
  aligned: boolean;
} {
  const [mantissa = '0', exponent = '0'] = value.toString().split('e');
  const [whole = '0', fraction = ''] = mantissa.split('.');
  const digits = BigInt(whole + fraction);
  const shift = Number(exponent) - fraction.length + precision;
  if (shift >= 0) {
    const coefficient = Number(digits * 10n ** BigInt(shift));
    return { floor: coefficient, ceil: coefficient, aligned: true };
  }
  const divisor = 10n ** BigInt(-shift);
  const quotient = digits / divisor;
  const remainder = digits % divisor;
  return {
    floor: Number(quotient - (remainder < 0n ? 1n : 0n)),
    ceil: Number(quotient + (remainder > 0n ? 1n : 0n)),
    aligned: remainder === 0n,
  };
}
