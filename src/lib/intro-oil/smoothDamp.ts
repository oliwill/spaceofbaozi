// 带速度状态的 smoothDamp（CP5：唯一一层平滑，禁止再叠加 lerp —— D-126）
export interface DampState {
  current: number;
  velocity: number;
}

/** 数值稳定版 smoothDamp 步进；dt 秒，smoothTime 越大越慢。 */
export function smoothDampStep(state: DampState, target: number, smoothTime: number, dt: number): DampState {
  const omega = 2 / Math.max(0.0001, smoothTime);
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = state.current - target;
  const temp = (state.velocity + omega * change) * dt;
  const velocity = (state.velocity - omega * temp) * exp;
  const current = target + (change + temp) * exp;
  // 过冲钳制：到位后速度清零，不回摆穿过目标
  if (change > 0 === current > target) return { current: target, velocity: 0 };
  return { current, velocity };
}

export function isSettled(state: DampState, target: number): boolean {
  return Math.abs(state.current - target) < 1e-4 && Math.abs(state.velocity) < 1e-4;
}
