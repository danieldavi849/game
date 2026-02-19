import { Entity } from './Entity.ts';

/** Entity manager: create, destroy, query by component */
export class World {
  private entities: Map<number, Entity> = new Map();
  private nextId = 1;
  private toRemove: number[] = [];

  /** Create a new entity */
  createEntity(): Entity {
    const entity = new Entity(this.nextId++);
    this.entities.set(entity.id, entity);
    return entity;
  }

  /** Mark an entity for removal */
  removeEntity(id: number): void {
    const entity = this.entities.get(id);
    if (entity) {
      entity.active = false;
      this.toRemove.push(id);
    }
  }

  /** Get an entity by ID */
  getEntity(id: number): Entity | undefined {
    return this.entities.get(id);
  }

  /** Query all active entities that have all specified component types */
  query(...componentTypes: string[]): Entity[] {
    const result: Entity[] = [];
    for (const entity of this.entities.values()) {
      if (entity.active && entity.hasAll(...componentTypes)) {
        result.push(entity);
      }
    }
    return result;
  }

  /** Get all active entities */
  getAll(): Entity[] {
    const result: Entity[] = [];
    for (const entity of this.entities.values()) {
      if (entity.active) result.push(entity);
    }
    return result;
  }

  /** Process pending removals */
  flush(): void {
    for (const id of this.toRemove) {
      this.entities.delete(id);
    }
    this.toRemove.length = 0;
  }

  /** Remove all entities */
  clear(): void {
    this.entities.clear();
    this.toRemove.length = 0;
  }

  /** Count of active entities */
  get entityCount(): number {
    let count = 0;
    for (const entity of this.entities.values()) {
      if (entity.active) count++;
    }
    return count;
  }
}
