// Basic Fuego Network RPC spec and helper types
// This is derived from the public fuego-index repository and kept
// intentionally minimal so we can integrate without importing the full codebase.

export interface FuegoBalanceResponse {
  balance: number; // total confirmed balance in XFG
  unconfirmed: number;
}

export interface FuegoSendRequest {
  toAddress: string;
  amount: number; // XFG units
  feeRate?: number; // optional custom fee
}

export interface FuegoSendResponse {
  txid: string;
}

export interface FuegoTransaction {
  txid: string;
  time: number; // unix timestamp
  amount: number; // negative for sent, positive for received
  confirmations: number;
}

export const DEFAULT_RPC_PORT = 8888;
export const WALLET_RPC_BASE = (port: number = DEFAULT_RPC_PORT) => `http://localhost:${port}/api/v1`;

export const RPC_ENDPOINTS = {
  balance: (port?: number) => `${WALLET_RPC_BASE(port)}/balance`,
  send: (port?: number) => `${WALLET_RPC_BASE(port)}/send`,
  history: (port?: number) => `${WALLET_RPC_BASE(port)}/transactions`,
}; 