import { Component } from '../ecs/Component.ts';
import { BehaviorType } from '../types/index.ts';
import { Vec2 } from '../utils/Vec2.ts';

/** AI behavior configuration and state */
export class AIBehavior implements Component {
  readonly type = 'AIBehavior';
  wanderTarget: Vec2 = new Vec2(0, 0);
  wanderTimer: number = 0;
  /** For zip-across behavior: whether currently zipping */
  zipping: boolean = false;
  zipDirection: Vec2 = new Vec2(0, 0);

  constructor(
    public behavior: BehaviorType = BehaviorType.Wander,
    public speed: number = 100,
    public perceptionRadius: number = 300,
    public fleeRadius: number = 250,
  ) {}
}
