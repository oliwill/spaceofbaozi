export type PixelPoint = { x: number; y: number };

export function leashPath(hand: PixelPoint, collar: PixelPoint, slack: number): string {
  const dx = collar.x - hand.x;
  return `M ${hand.x} ${hand.y} C ${hand.x + dx * 0.35} ${hand.y + slack}, ${hand.x + dx * 0.65} ${collar.y + slack}, ${collar.x} ${collar.y}`;
}
