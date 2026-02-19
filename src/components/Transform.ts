import { Component } from '../ecs/Component.ts';
import { Vec2 } from '../utils/Vec2.ts';

/** Position and rotation in world space */
export class Transform implements Component {
  readonly type = 'Transform';

  constructor(
    public position: Vec2 = new Vec2(0, 0),
    public rotation: number = 0,
  ) {}
}
