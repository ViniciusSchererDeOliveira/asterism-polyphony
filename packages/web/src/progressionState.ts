export function previewIndexAfterRemoval(current: number | null, removed: number): number | null {
  if (current === null || current === removed) return null;
  return current > removed ? current - 1 : current;
}
