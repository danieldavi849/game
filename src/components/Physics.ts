import { Component } from '../ecs/Component.ts';
import { Vec2 } from '../utils/Vec2.ts';
import { CONFIG } from '../utils/Constants.ts';

/** Velocity, acceleration, mass, and movement properties */
export class Physics implements Component {
  readonly type = 'Physics';
  velocity: Vec2 = new Vec2(0, 0);
  acceleration: Vec2 = new Vec2(0, 0);
  friction: number = CONFIG.DEFAULT_FRICTION;

  constructor(
    public mass: number = 1,
    public maxSpeed: number = 200,
  ) {}
}
