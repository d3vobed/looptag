import { Buffer } from "buffer";
import { nativeToScVal, xdr } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { decodeLooptagEvent } from "../src/events.js";

const SERIAL_HASH =
  "fa6ceb8d7a5cd1b8bc7c5959830c30704aad79dbe1ba90a794f04de6868712b1";
const ADMIN = "GDI6UIHJGRSHN4FF6FWXUWSVQYYAV2BBH734S3LCYCQQCWYWLLEQ2UXJ";
const ISSUER = "GDI6UIHJGRSHN4FF6FWXUWSVQYYAV2BBH734S3LCYCQQCWYWLLEQ2UXJ";
const OWNER = "GANINHD7GYIUIYH7WTGQ25TZ3BMEJG5JIW6JIJNVOB7PQPWABVW5LQJP";
const STATION = "GDSROSZJFCNGBLFFY3NKMKKC5CMCOXTCAYTL7DFZMRT2P5NF4J4RVBWH";
const XLM = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

function topic(name: string): xdr.ScVal {
  return nativeToScVal(name, { type: "symbol" });
}

function vec(...values: xdr.ScVal[]): xdr.ScVal {
  return xdr.ScVal.scvVec(values);
}

describe("event decoding", () => {
  it("decodes claim_issued", () => {
    const decoded = decodeLooptagEvent(
      [topic("claim_issued"), nativeToScVal(1n, { type: "u64" })],
      vec(
        nativeToScVal(ISSUER, { type: "address" }),
        nativeToScVal(OWNER, { type: "address" }),
        nativeToScVal(20_000_000n, { type: "i128" }),
        nativeToScVal(Buffer.from(SERIAL_HASH, "hex"), { type: "bytes" }),
        nativeToScVal(0n, { type: "u64" }),
      ),
    );

    expect(decoded).toEqual({
      type: "claim_issued",
      claimId: "1",
      issuer: ISSUER,
      owner: OWNER,
      deposit: 20_000_000n,
      serialHash: SERIAL_HASH,
      expiresAt: 0,
    });
  });

  it("decodes init without treating the admin address as a claim id", () => {
    const decoded = decodeLooptagEvent(
      [topic("init"), nativeToScVal(ADMIN, { type: "address" })],
      vec(nativeToScVal(XLM, { type: "address" })),
    );

    expect(decoded).toEqual({ type: "init", admin: ADMIN, depositToken: XLM });
  });

  it("decodes merchant and station events", () => {
    expect(
      decodeLooptagEvent(
        [
          topic("merchant_registered"),
          nativeToScVal(ISSUER, { type: "address" }),
        ],
        vec(
          nativeToScVal("Circular Cafe", { type: "string" }),
          nativeToScVal(true),
        ),
      ),
    ).toEqual({
      type: "merchant_registered",
      merchant: ISSUER,
      name: "Circular Cafe",
      active: true,
    });

    expect(
      decodeLooptagEvent(
        [
          topic("merchant_status_changed"),
          nativeToScVal(ISSUER, { type: "address" }),
        ],
        vec(
          nativeToScVal("Circular Cafe", { type: "string" }),
          nativeToScVal(false),
        ),
      ),
    ).toEqual({
      type: "merchant_status_changed",
      merchant: ISSUER,
      name: "Circular Cafe",
      active: false,
    });

    expect(
      decodeLooptagEvent(
        [topic("station_changed"), nativeToScVal(ISSUER, { type: "address" })],
        vec(nativeToScVal(STATION, { type: "address" }), nativeToScVal(false)),
      ),
    ).toEqual({
      type: "station_changed",
      issuer: ISSUER,
      station: STATION,
      authorized: false,
    });
  });

  it("decodes claim_transferred", () => {
    expect(
      decodeLooptagEvent(
        [topic("claim_transferred"), nativeToScVal(42n, { type: "u64" })],
        vec(
          nativeToScVal(OWNER, { type: "address" }),
          nativeToScVal(STATION, { type: "address" }),
        ),
      ),
    ).toEqual({
      type: "claim_transferred",
      claimId: "42",
      from: OWNER,
      to: STATION,
    });
  });

  it("decodes the return and redemption events", () => {
    expect(
      decodeLooptagEvent(
        [topic("return_authorized"), nativeToScVal(1n, { type: "u64" })],
        vec(
          nativeToScVal(STATION, { type: "address" }),
          nativeToScVal(1_794_093_252n, { type: "u64" }),
        ),
      ),
    ).toEqual({
      type: "return_authorized",
      claimId: "1",
      station: STATION,
      returnedAt: 1_794_093_252,
    });

    expect(
      decodeLooptagEvent(
        [topic("claim_redeemed"), nativeToScVal(1n, { type: "u64" })],
        vec(
          nativeToScVal(OWNER, { type: "address" }),
          nativeToScVal(20_000_000n, { type: "i128" }),
        ),
      ),
    ).toEqual({
      type: "claim_redeemed",
      claimId: "1",
      owner: OWNER,
      deposit: 20_000_000n,
    });
  });

  it("ignores unknown events", () => {
    expect(
      decodeLooptagEvent([topic("other")], vec(nativeToScVal(1n))),
    ).toBeNull();
  });
});
