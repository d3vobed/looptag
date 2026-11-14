import { describe, expect, it } from "vitest";
import {
  formatAmount,
  fromBaseUnits,
  fromStroops,
  STROOPS_PER_UNIT,
  toBaseUnits,
  toStroops,
} from "../src/amount.js";

describe("amounts", () => {
  it("converts whole and fractional XLM to stroops", () => {
    expect(STROOPS_PER_UNIT).toBe(10_000_000n);
    expect(toStroops("2")).toBe(20_000_000n);
    expect(toStroops("2.5")).toBe(25_000_000n);
    expect(toStroops("0.0000001")).toBe(1n);
    expect(toStroops("1.2345678")).toBe(12_345_678n);
    expect(toStroops(2)).toBe(20_000_000n);
    expect(toStroops(0.0000001)).toBe(1n);
  });

  it("renders stroops without floating point drift", () => {
    expect(fromStroops(20_000_000n)).toBe("2");
    expect(fromStroops(25_000_000n)).toBe("2.5");
    expect(fromStroops(1n)).toBe("0.0000001");
    expect(fromStroops("12345678")).toBe("1.2345678");
    expect(formatAmount(20_000_000n, "XLM")).toBe("2 XLM");
    expect(fromBaseUnits(1_500_000n, 6)).toBe("1.5");
  });

  it("rejects unsafe or malformed amounts", () => {
    expect(() => toStroops("1.12345678")).toThrow(/decimal places/);
    expect(() => toStroops("-1")).toThrow(/negative/);
    expect(() => toStroops("1e3")).toThrow(/plain decimal/);
    expect(() => toStroops("1.23e-7")).toThrow(/plain decimal/);
    expect(() => toStroops("")).toThrow(/empty/);
    expect(() => fromStroops(-1n)).toThrow(/negative/);
  });

  it("handles exponent-notation numbers safely without silent rounding", () => {
    expect(toStroops(1e-7)).toBe(1n);
    expect(() => toStroops(1.23e-7)).toThrow(/decimal string/);
    expect(() => toStroops(1e21)).toThrow(/decimal string/);
    expect(() => toStroops(Number.NaN)).toThrow(/finite/);
    expect(() => toStroops(Number.POSITIVE_INFINITY)).toThrow(/finite/);
    expect(() => toStroops(Number.NEGATIVE_INFINITY)).toThrow(/finite/);
  });
});
