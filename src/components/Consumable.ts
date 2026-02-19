import { Component } from '../ecs/Component.ts';
import { EntityType } from '../types/index.ts';

/** Marks an entity as consumable with associated values */
export class Consumable implements Component {
  readonly type = 'Consumable';

  constructor(
    public entityType: EntityType = EntityType.Quark,
    public massValue: number = 1,
    public energyValue: number = 5,
    public cpValue: number = 0,
    /** Whether this entity respawns after being consumed */
    public respawns: boolean = true,
  ) {}
}
