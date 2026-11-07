import { Client, networks } from "./generated/index.js";

export { Client, networks };

export const TESTNET = networks.testnet;
export const TESTNET_CONTRACT_ID = networks.testnet.contractId;

export type LooptagClientOptions = ConstructorParameters<typeof Client>[0];

/** Create a typed client for the deployed LOOPTAG contract. */
export function createClient(options: LooptagClientOptions): Client {
  return new Client(options);
}

export function explorerTxUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function explorerContractUrl(
  contractId: string = TESTNET_CONTRACT_ID,
): string {
  return `https://stellar.expert/explorer/testnet/contract/${contractId}`;
}
