export function desktopEndingAtProgress(progress: number) {
  if (progress < 0.91) return null;

  const approachStart = 0.932;
  const approachEnd = 0.956;
  const revealEnd = 0.938;
  const approach = Math.min(1, Math.max(0, (progress - approachStart) / (approachEnd - approachStart)));

  return {
    personFrame: progress < approachStart ? 4 : progress < 0.944 ? 5 : progress < approachEnd ? 6 : 7,
    dogFrame: progress < 0.944 ? 0 : progress < 0.95 ? 1 : progress < approachEnd ? 2
      : progress < 0.963 ? 3 : progress < 0.972 ? 6 : 7,
    dogVisible: progress >= approachStart,
    dogOpacity: Math.min(1, Math.max(0, (progress - approachStart) / (revealEnd - approachStart))),
    dogOffsetWidths: 0.1 * (1 - approach) ** 2,
  };
}
