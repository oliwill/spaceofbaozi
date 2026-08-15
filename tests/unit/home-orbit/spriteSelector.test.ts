import { describe, expect, it } from "vitest";
import { selectDogSprite, selectPersonGaze } from "@/lib/home-orbit/spriteSelector";
import { HOME_ORBIT_CONTRACT } from "@/lib/home-orbit/contract";

// 契约来源：baozi-space-orbit-interaction-handoff-v1.0 spec/implementation-notes.md §3 与 interaction-contract.json
// 坐标系：x 向右、y 向下、角度从右侧起顺时针（弧度）；atan2(dy, dx) 输出同此约定。
//
// DOG selectDogSprite({ angle, angularVelocity, radiusX, radiusY, elapsedMovingSeconds, lastDirection })
//   → { direction, gaitFrame, moving }
// 方向取自椭圆切线速度 atan2(vy, vx)，vx = -radiusX*sin(angle)*angularVelocity、
// vy = radiusY*cos(angle)*angularVelocity；8 方向每 45°：direction = round(atan2(vy,vx)/45°) mod 8，
// 右 0°→0、下 90°→2、左 180°→4、上 270°→6，逆时针完全反向。
// 方向迟滞 9°：角度须越过当前方向扇区边界（±22.5°）再多 9° 才切换，回落须回到边界以内 9°。
// |angularVelocity| < 0.06（stopAngularVelocityRadPerSec）→ moving=false：保留 lastDirection，
// gaitFrame 归零（contact frame）；步态 9fps 四帧：gaitFrame = floor(elapsedMovingSeconds*9) % 4。
//
// PERSON selectPersonGaze({ dogX, dogY, filteredAngle, dtSeconds, lastDirection })
//   → { direction, filteredAngle }
// gaze 目标 = atan2(renderedDogY, renderedDogX)——渲染后的狗偏移，而非轨道 targetAngle / 指针；
// 110ms 一阶低通：filteredAngle += shortestArc(上一帧, 目标) * (1 - exp(-dtSeconds/0.11))，
// filteredAngle 回绕 [0, 2π)；12 方向每 30°（direction = round(angle/30°) mod 12）、7° 迟滞
// （切换阈值 15°+7°）。

const DEG = Math.PI / 180;
const RADIUS_X = 200;
const RADIUS_Y = 90; // radiusY = radiusX * 0.45，与 perspectiveMapper 测试一致
const STOP_VELOCITY = HOME_ORBIT_CONTRACT.orbit.stopAngularVelocityRadPerSec; // 0.06
const GAIT_FPS = HOME_ORBIT_CONTRACT.dog.gaitFps; // 9
const DOG_HYSTERESIS = HOME_ORBIT_CONTRACT.dog.directionHysteresisDeg; // 9
const PERSON_LAG_SECONDS = HOME_ORBIT_CONTRACT.person.lookLagMs / 1000; // 0.11
const PERSON_HYSTERESIS = HOME_ORBIT_CONTRACT.person.directionHysteresisDeg; // 7

// 圆轨道（radiusX = radiusY = 1）：切线速度角 = 位置角 ± 90°，便于把迟滞测试对准精确角度
const CIRCLE_RADIUS = 1;

type DogSpriteCase = {
  angle: number;
  angularVelocity: number;
  lastDirection: number;
  elapsedMovingSeconds: number;
  expectedDirection: number;
  expectedGaitFrame: number;
  expectedMoving: boolean;
};

describe("selectDogSprite", () => {
  // 8 个 cardinal checkpoint：方向 = 切线速度 atan2(vy, vx)（运动方向，非位置角）——
  // 顺时针 右0°→2(下)、下90°→4(左)、左180°→6(上)、上270°→0(右)；逆时针完全反向 6/0/2/4。
  // lastDirection 一律取期望方向的对侧（相隔 4 扇区），确保方向必须由切线计算得出，
  // 原样返回旧方向（lastDirection）的实现会失败
  it("maps the 8 clockwise/counterclockwise cardinal checkpoints to tangent directions", () => {
    const cases: DogSpriteCase[] = [
      { angle: 0 * DEG, angularVelocity: 1, lastDirection: 6, elapsedMovingSeconds: 0, expectedDirection: 2, expectedGaitFrame: 0, expectedMoving: true },
      { angle: 90 * DEG, angularVelocity: 1, lastDirection: 0, elapsedMovingSeconds: 0, expectedDirection: 4, expectedGaitFrame: 0, expectedMoving: true },
      { angle: 180 * DEG, angularVelocity: 1, lastDirection: 2, elapsedMovingSeconds: 0, expectedDirection: 6, expectedGaitFrame: 0, expectedMoving: true },
      { angle: 270 * DEG, angularVelocity: 1, lastDirection: 4, elapsedMovingSeconds: 0, expectedDirection: 0, expectedGaitFrame: 0, expectedMoving: true },
      { angle: 0 * DEG, angularVelocity: -1, lastDirection: 2, elapsedMovingSeconds: 0, expectedDirection: 6, expectedGaitFrame: 0, expectedMoving: true },
      { angle: 90 * DEG, angularVelocity: -1, lastDirection: 4, elapsedMovingSeconds: 0, expectedDirection: 0, expectedGaitFrame: 0, expectedMoving: true },
      { angle: 180 * DEG, angularVelocity: -1, lastDirection: 6, elapsedMovingSeconds: 0, expectedDirection: 2, expectedGaitFrame: 0, expectedMoving: true },
      { angle: 270 * DEG, angularVelocity: -1, lastDirection: 0, elapsedMovingSeconds: 0, expectedDirection: 4, expectedGaitFrame: 0, expectedMoving: true },
    ];

    for (const c of cases) {
      const sprite = selectDogSprite({
        angle: c.angle,
        angularVelocity: c.angularVelocity,
        radiusX: RADIUS_X,
        radiusY: RADIUS_Y,
        elapsedMovingSeconds: c.elapsedMovingSeconds,
        lastDirection: c.lastDirection,
      });
      expect(sprite.direction).toBe(c.expectedDirection);
      expect(sprite.gaitFrame).toBe(c.expectedGaitFrame);
      expect(sprite.moving).toBe(c.expectedMoving);
    }
  });

  // |angularVelocity| < 0.06 停止：即使位置角本会映射到其他方向，也保留 lastDirection，
  // gaitFrame 归零（contact frame）、moving=false；恰为 0.06 不算停止（严格 <）
  it(`stops below ${STOP_VELOCITY} rad/s: keeps lastDirection, resets to the contact frame, moving=false`, () => {
    const stopped = selectDogSprite({ angle: 0, angularVelocity: 0.059, radiusX: RADIUS_X, radiusY: RADIUS_Y, elapsedMovingSeconds: 0.4, lastDirection: 5 });
    expect(stopped.direction).toBe(5);
    expect(stopped.gaitFrame).toBe(0);
    expect(stopped.moving).toBe(false);

    const atRest = selectDogSprite({ angle: 0, angularVelocity: 0, radiusX: RADIUS_X, radiusY: RADIUS_Y, elapsedMovingSeconds: 0.4, lastDirection: 5 });
    expect(atRest.direction).toBe(5);
    expect(atRest.gaitFrame).toBe(0);
    expect(atRest.moving).toBe(false);

    const boundary = selectDogSprite({ angle: 0, angularVelocity: 0.06, radiusX: RADIUS_X, radiusY: RADIUS_Y, elapsedMovingSeconds: 0.23, lastDirection: 5 });
    expect(boundary.moving).toBe(true); // vy = 90*cos(0)*0.06 = 5.4 > 0 → 向下
    expect(boundary.direction).toBe(2);
    expect(boundary.gaitFrame).toBe(2); // floor(0.23*9) % 4 = 2
  });

  // 迟滞带：当前方向扇区边界 ±22.5°，须再越过 9°（±31.5°）才切换；回落同理（±13.5°）。
  // 圆轨道 w=+1：切线速度角 = 位置角 + 90°
  it(`keeps the previous direction inside the ${DOG_HYSTERESIS}° hysteresis band and switches beyond it`, () => {
    const moving = (velocityDeg: number, lastDirection: number) =>
      selectDogSprite({ angle: (velocityDeg - 90) * DEG, angularVelocity: 1, radiusX: CIRCLE_RADIUS, radiusY: CIRCLE_RADIUS, elapsedMovingSeconds: 0, lastDirection });

    expect(moving(30, 0).direction).toBe(0); // 30° < 22.5°+9° = 31.5° → 仍在扇区 0
    expect(moving(32, 0).direction).toBe(1); // 32° > 31.5° → 切到扇区 1
    expect(moving(20, 1).direction).toBe(1); // 回落 20° > 22.5°-9° = 13.5° → 保持扇区 1
    expect(moving(12, 1).direction).toBe(0); // 12° < 13.5° → 切回扇区 0
  });

  // 9fps 四帧步态：gaitFrame = floor(elapsedMovingSeconds*9) % 4，1/9s 一帧、4/9s 回绕；
  // 恰在 1/9s 边界用 ±1e-9 区分，避免浮点 floor(0.9999999999...) 的歧义
  it(`advances the ${GAIT_FPS}fps four-frame gait cycle from accumulated moving time`, () => {
    const gait = (seconds: number) =>
      selectDogSprite({ angle: 0, angularVelocity: 1, radiusX: RADIUS_X, radiusY: RADIUS_Y, elapsedMovingSeconds: seconds, lastDirection: 2 }).gaitFrame;

    expect(gait(0)).toBe(0);
    expect(gait(1 / GAIT_FPS - 1e-9)).toBe(0); // 1/9s 边界前仍是首帧
    expect(gait(1 / GAIT_FPS + 1e-9)).toBe(1);
    expect(gait(2 / GAIT_FPS + 1e-9)).toBe(2);
    expect(gait(3 / GAIT_FPS + 1e-9)).toBe(3);
    expect(gait(4 / GAIT_FPS + 1e-9)).toBe(0); // 四帧循环回绕
    expect(gait(5 / GAIT_FPS + 1e-9)).toBe(1);
  });
});

type PersonGazeCase = {
  dogX: number;
  dogY: number;
  filteredAngle: number;
  dtSeconds: number;
  lastDirection: number;
  expectedDirection: number;
  expectedFilteredAngle: number;
};

describe("selectPersonGaze", () => {
  // gaze 目标 = atan2(renderedDogY, renderedDogX)——渲染后的狗偏移，而非轨道 targetAngle / 指针。
  // filteredAngle 输入与目标相差 180°、lastDirection 取期望扇区对侧（相隔 6 扇区）：
  // 大 dtSeconds 下低通收敛到 atan2 坐标角，方向必须由坐标推导——原样返回输入
  // filteredAngle/lastDirection 的实现会在方向与收敛角上双双失败
  it("selects the gaze from the rendered dog offset via atan2", () => {
    const cases: PersonGazeCase[] = [
      { dogX: 100, dogY: 0, filteredAngle: 180 * DEG, dtSeconds: 5, lastDirection: 6, expectedDirection: 0, expectedFilteredAngle: 0 }, // 右
      { dogX: 0, dogY: 100, filteredAngle: 270 * DEG, dtSeconds: 5, lastDirection: 9, expectedDirection: 3, expectedFilteredAngle: 90 * DEG }, // 下
      { dogX: -100, dogY: 0, filteredAngle: 0, dtSeconds: 5, lastDirection: 0, expectedDirection: 6, expectedFilteredAngle: 180 * DEG }, // 左
      { dogX: 0, dogY: -100, filteredAngle: 90 * DEG, dtSeconds: 5, lastDirection: 3, expectedDirection: 9, expectedFilteredAngle: 270 * DEG }, // 上
      { dogX: Math.cos(30 * DEG) * 100, dogY: Math.sin(30 * DEG) * 100, filteredAngle: 210 * DEG, dtSeconds: 5, lastDirection: 7, expectedDirection: 1, expectedFilteredAngle: 30 * DEG },
      { dogX: 100, dogY: -100 * Math.tan(30 * DEG), filteredAngle: 150 * DEG, dtSeconds: 5, lastDirection: 5, expectedDirection: 11, expectedFilteredAngle: 330 * DEG }, // atan2 负角回绕 330°
    ];

    for (const c of cases) {
      const gaze = selectPersonGaze({ dogX: c.dogX, dogY: c.dogY, filteredAngle: c.filteredAngle, dtSeconds: c.dtSeconds, lastDirection: c.lastDirection });
      expect(gaze.direction).toBe(c.expectedDirection);
      expect(gaze.filteredAngle).toBeCloseTo(c.expectedFilteredAngle, 5);
    }
  });

  // 110ms 一阶低通：alpha = 1 - exp(-dtSeconds/0.11)；0s 完全不动、0.11s 走 63.2%、长时间收敛到目标；
  // 回绕：prev=350°、target=10° 走最短弧 +20°（经 0°），0.11s 后 filtered = 350°+20°*0.63212 = 362.64° → 回绕 2.64°；
  // 直线差值实现会在长路径上得到 135° 而失败
  it(`applies the ${HOME_ORBIT_CONTRACT.person.lookLagMs}ms low-pass: no change at 0s, 63.2% at 0.11s, wrap through 0°`, () => {
    const unchanged = selectPersonGaze({ dogX: Math.cos(2 * DEG) * 100, dogY: Math.sin(2 * DEG) * 100, filteredAngle: 1, dtSeconds: 0, lastDirection: 0 });
    expect(unchanged.filteredAngle).toBe(1); // dtSeconds = 0 → 输出原样

    const oneTau = selectPersonGaze({ dogX: Math.cos(1) * 100, dogY: Math.sin(1) * 100, filteredAngle: 0, dtSeconds: PERSON_LAG_SECONDS, lastDirection: 0 });
    expect(oneTau.filteredAngle).toBeCloseTo(1 - Math.exp(-1), 5); // target=1rad，0.11s 走 0.6321205588

    const converged = selectPersonGaze({ dogX: Math.cos(1) * 100, dogY: Math.sin(1) * 100, filteredAngle: 0, dtSeconds: 5, lastDirection: 0 });
    expect(converged.filteredAngle).toBeCloseTo(1, 5);

    const wrap = selectPersonGaze({ dogX: Math.cos(10 * DEG) * 100, dogY: Math.sin(10 * DEG) * 100, filteredAngle: 350 * DEG, dtSeconds: PERSON_LAG_SECONDS, lastDirection: 0 });
    expect(wrap.filteredAngle).toBeCloseTo(2.6424 * DEG, 5); // 0.0461188 rad
  });

  // 7° 迟滞：方向扇区边界 ±15°，须越过 15°+7°=22° 才切换，回落须低于 15°-7°=8°；
  // 收敛态（dtSeconds=5、filteredAngle=目标角）下 filtered 即目标角
  it(`keeps the direction inside the ${PERSON_HYSTERESIS}° hysteresis band and switches beyond it`, () => {
    const gaze = (angleDeg: number, lastDirection: number) =>
      selectPersonGaze({ dogX: Math.cos(angleDeg * DEG) * 100, dogY: Math.sin(angleDeg * DEG) * 100, filteredAngle: angleDeg * DEG, dtSeconds: 5, lastDirection });

    expect(gaze(21, 0).direction).toBe(0); // 21° < 22° → 保持扇区 0
    expect(gaze(23, 0).direction).toBe(1); // 23° > 22° → 切到扇区 1
    expect(gaze(10, 1).direction).toBe(1); // 回落 10° > 8° → 保持扇区 1
    expect(gaze(7, 1).direction).toBe(0); // 7° < 8° → 切回扇区 0
  });
});
