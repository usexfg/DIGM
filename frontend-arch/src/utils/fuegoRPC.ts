// Placeholder implementation for FuegoRPCClient
export class FuegoRPCClient {
  async getCurrentBlockHeight(): Promise<number> {
    return Date.now();
  }

  async getBalance(address: string): Promise<{ xfg: number; heat: number }> {
    return { xfg: 0, heat: 0 };
  }

  async getTransactionsByExtraType(
    type: number, 
    fromBlock?: number, 
    toBlock?: number
  ): Promise<any[]> {
    return [];
  }
}
