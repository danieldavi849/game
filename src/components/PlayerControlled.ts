import { Component } from '../ecs/Component.ts';

/** Marker component for the player entity */
export class PlayerControlled implements Component {
  readonly type = 'PlayerControlled';
  /** Current evolution mass accumulated */
  evolutionMass: number = 0;
  /** Current energy level */
  energy: number = 100;
  /** Complexity points */
  cp: number = 0;
  /** Player speed multiplier */
  speed: number = 300;
  /** Electron shield HP (for atomic tier) */
  shieldHP: number = 0;
  /** Max shield HP */
  maxShieldHP: number = 0;
}
