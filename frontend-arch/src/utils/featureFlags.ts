export const featureFlags = {
  useWebTorrent: true,
  allowPublicTrackersFallback: false,
  enablePurchaseGating: true,
};

export type FeatureFlagKey = keyof typeof featureFlags;

export function isEnabled<K extends FeatureFlagKey>(key: K): boolean {
  return featureFlags[key];
}
