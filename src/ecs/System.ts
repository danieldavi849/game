import { World } from './World.ts';

/** Base system interface — systems contain all game logic */
export interface System {
  /** System priority (lower = runs first) */
  readonly priority: number;
  /** Update logic called every frame */
  update(world: World, dt: number): void;
  /** Optional render method */
  render?(world: World, ctx: CanvasRenderingContext2D): void;
}
