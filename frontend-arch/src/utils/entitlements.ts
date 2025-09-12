type EntitlementRecord = { txHash: string; at: number };

export async function hasEntitlement(userId: string, trackId: string): Promise<boolean> {
  // TODO: query GUN entitlements; local cache as optimization
  return false;
}

export async function grantEntitlement(userId: string, trackId: string, txHash: string): Promise<void> {
  // TODO: write to GUN: users/{userId}/entitlements/{trackId} -> { txHash, at }
  void { userId, trackId, txHash };
}
