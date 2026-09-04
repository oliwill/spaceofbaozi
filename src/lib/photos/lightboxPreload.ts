export function adjacentIndices(index: number, length: number): number[] {
  if (index < 0 || index >= length) return [];
  return [index - 1, index + 1].filter((item) => item >= 0 && item < length);
}
