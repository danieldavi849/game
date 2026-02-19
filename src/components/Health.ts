import { Component } from '../ecs/Component.ts';

/** Health / hitpoints for entities */
export class Health implements Component {
  readonly type = 'Health';
  current: number;

  constructor(
    public max: number = 100,
    public regenRate: number = 0,
  ) {
    this.current = max;
  }
}
