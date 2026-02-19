import { Component } from './Component.ts';

/** Base entity: an ID with a map of components */
export class Entity {
  /** Whether this entity is active (will be removed when false) */
  active = true;
  /** Components stored by type */
  private components: Map<string, Component> = new Map();

  constructor(public readonly id: number) {}

  /** Add a component to this entity */
  addComponent<T extends Component>(component: T): this {
    this.components.set(component.type, component);
    return this;
  }

  /** Get a component by type */
  getComponent<T extends Component>(type: string): T | undefined {
    return this.components.get(type) as T | undefined;
  }

  /** Check if entity has a component */
  hasComponent(type: string): boolean {
    return this.components.has(type);
  }

  /** Remove a component by type */
  removeComponent(type: string): void {
    this.components.delete(type);
  }

  /** Check if entity has all specified component types */
  hasAll(...types: string[]): boolean {
    for (let i = 0; i < types.length; i++) {
      if (!this.components.has(types[i])) return false;
    }
    return true;
  }
}
