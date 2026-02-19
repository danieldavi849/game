import { Component } from '../ecs/Component.ts';
import { CollisionLayer } from '../types/index.ts';

/** Circle collider for collision detection */
export class Collider implements Component {
  readonly type = 'Collider';

  constructor(
    public radius: number = 10,
    public layer: CollisionLayer = CollisionLayer.Default,
    public isTrigger: boolean = false,
  ) {}
}
