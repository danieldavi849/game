import { Component } from '../ecs/Component.ts';

/** Marks an entity as a hazard that damages the player */
export class Hazard implements Component {
  readonly type = 'Hazard';

  constructor(
    public damage: number = 10,
    public damageInterval: number = 0.5,
    public knockbackForce: number = 200,
  ) {}

  /** Timer tracking last damage tick */
  lastDamageTime: number = 0;
}
