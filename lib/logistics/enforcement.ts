/** Active corridor ids that must be deactivated so `keepId` becomes the sole active one. */
export function corridorsToDeactivate(activeIds: string[], keepId: string): string[] {
  return activeIds.filter((id) => id !== keepId);
}
