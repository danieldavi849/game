import { Vec2 } from './Vec2.ts';

/** Clamp value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Linear interpolation between a and b */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Random float in range [min, max) */
export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Random integer in range [min, max] inclusive */
export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

/** Random point within a circle of given radius */
export function randomInCircle(radius: number): Vec2 {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * radius;
  return new Vec2(Math.cos(angle) * r, Math.sin(angle) * r);
}

/** Random point on the edge of a circle */
export function randomOnCircle(radius: number): Vec2 {
  const angle = Math.random() * Math.PI * 2;
  return new Vec2(Math.cos(angle) * radius, Math.sin(angle) * radius);
}

/** Smooth step (ease in/out) */
export function smoothStep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Ease out cubic */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Ease in cubic */
export function easeInCubic(t: number): number {
  return t * t * t;
}

/** Map value from one range to another */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}
