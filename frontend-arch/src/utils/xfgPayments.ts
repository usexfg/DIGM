export type XfgOrder = {
  orderId: string;
  trackId: string;
  priceXfg: string; // decimal string
  recipients: Array<{ address: string; amount: string }>;
  memo?: string;
};

export async function buildOrder(params: Omit<XfgOrder, 'memo'>): Promise<XfgOrder> {
  const memo = params.orderId;
  return { ...params, memo };
}

export async function requestWalletPayment(order: XfgOrder): Promise<{ txHash: string }> {
  // TODO: integrate with XfgWallet UI / provider
  return { txHash: '0x-mock' };
}

export async function verifyPayment(
  txHash: string,
  expected: { amount: string; recipients: Array<{ address: string; amount: string }>; memo: string }
): Promise<boolean> {
  // TODO: query fuego index/RPC to verify amount, recipients, memo
  return true;
}
