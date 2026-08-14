export function frameAtProgress(progress: number, frameCount: number, loop: boolean): number {
  if (!Number.isInteger(frameCount) || frameCount < 1) throw new RangeError("frameCount must be positive");
  const value = Math.min(1, Math.max(0, progress));
  if (loop && value === 1) return 0;
  return Math.min(frameCount - 1, Math.floor(value * frameCount));
}
