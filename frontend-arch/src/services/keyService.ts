export type EphemeralKey = { keyId: string; keyB64: string; ttlMs: number };

export async function issueEphemeralKey(params: { userId: string; trackId: string; txHash: string }): Promise<EphemeralKey> {
  // TODO: securely generate and deliver ephemeral key; bind to txHash + trackId
  return { keyId: `key-${params.trackId}`, keyB64: 'ZmFrZS1rZXk=', ttlMs: 5 * 60 * 1000 };
}
