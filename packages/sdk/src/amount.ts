/**
 * Exact decimal <-> base-unit conversion for Stellar amounts.
 *
 * Stellar assets use 7 decimal places. Floating point arithmetic is never used
 * for money in this module: decimal strings are parsed into bigint stroops.
 */

export const STELLAR_DECIMALS = 7;
export const STROOPS_PER_UNIT = 10n ** BigInt(STELLAR_DECIMALS);

export interface ParsedAmount {
  /** Amount in the asset's smallest unit. */
  baseUnits: bigint;
  /** Number of decimal places used by the input. */
  decimals: number;
}

/**
 * Parse a human amount such as `"2"`, `"2.5"` or `"0.0000001"` into base units.
 * Prefer passing a plain decimal string for money values to avoid IEEE-754
 * floating-point precision loss. Rejects negative values, scientific notation,
 * ambiguous exponent numbers, and more than `decimals` decimal places.
 */
export function toBaseUnits(
  amount: string | number,
  decimals: number = STELLAR_DECIMALS,
): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new RangeError(
      `decimals must be an integer between 0 and 18, got ${decimals}`,
    );
  }

  const text =
    typeof amount === "number"
      ? numberToPlainString(amount, decimals)
      : amount.trim();
  if (text === "") {
    throw new TypeError("amount must not be empty");
  }
  if (text.startsWith("-")) {
    throw new RangeError("amount must not be negative");
  }
  if (!/^\d+(\.\d+)?$/.test(text)) {
    throw new TypeError(
      `amount must be a plain decimal string, got ${JSON.stringify(amount)}`,
    );
  }

  const [whole = "0", fraction = ""] = text.split(".");
  if (fraction.length > decimals) {
    throw new RangeError(
      `amount ${text} has ${fraction.length} decimal places; ${decimals} are allowed`,
    );
  }

  const padded = fraction.padEnd(decimals, "0");
  return (
    BigInt(whole) * 10n ** BigInt(decimals) +
    BigInt(padded === "" ? "0" : padded)
  );
}

/** Convenience alias for XLM amounts. */
export function toStroops(amount: string | number): bigint {
  return toBaseUnits(amount, STELLAR_DECIMALS);
}

/** Render base units as a plain decimal string, trimming trailing zeros. */
export function fromBaseUnits(
  value: bigint | string | number,
  decimals: number = STELLAR_DECIMALS,
): string {
  const units = typeof value === "bigint" ? value : BigInt(value);
  if (units < 0n) {
    throw new RangeError("value must not be negative");
  }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new RangeError(
      `decimals must be an integer between 0 and 18, got ${decimals}`,
    );
  }

  const factor = 10n ** BigInt(decimals);
  const whole = units / factor;
  const fraction = (units % factor)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return fraction === "" ? whole.toString() : `${whole}.${fraction}`;
}

/** Convenience alias for XLM amounts. */
export function fromStroops(value: bigint | string | number): string {
  return fromBaseUnits(value, STELLAR_DECIMALS);
}

/** Format a base-unit amount for display, e.g. `"2 XLM"`. */
export function formatAmount(
  value: bigint | string | number,
  assetCode = "XLM",
  decimals: number = STELLAR_DECIMALS,
): string {
  return `${fromBaseUnits(value, decimals)} ${assetCode}`;
}

function numberToPlainString(value: number, decimals: number): string {
  if (!Number.isFinite(value)) {
    throw new TypeError(`amount must be finite, got ${value}`);
  }
  if (value < 0) {
    throw new RangeError("amount must not be negative");
  }
  // `String(2)` is "2" and `String(0.0000001)` is "1e-7". Convert exact small
  // decimals without rounding, and reject any exponent-notation number that
  // cannot be represented losslessly at the requested precision.
  const text = String(value);
  if (!text.includes("e") && !text.includes("E")) {
    return text;
  }
  const match = /^([1-9])(?:\.(\d+))?[eE]-(\d+)$/.exec(text);
  if (!match) {
    throw new RangeError(
      `amount ${text} cannot be represented exactly as a number; pass a plain decimal string`,
    );
  }
  const [, head = "0", frac = "", expText = "0"] = match;
  const exp = Number(expText);
  const totalDecimals = exp + frac.length;
  if (totalDecimals > decimals) {
    throw new RangeError(
      `amount ${text} requires ${totalDecimals} decimal places (${decimals} allowed); pass a plain decimal string`,
    );
  }
  return `0.${"0".repeat(exp - 1)}${head}${frac}`;
}
