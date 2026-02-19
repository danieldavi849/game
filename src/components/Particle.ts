import { Component } from '../ecs/Component.ts';

/** Particle effect data — lifetime, fading */
export class ParticleComponent implements Component {
  readonly type = 'Particle';
  age: number = 0;

  constructor(
    public lifetime: number = 1,
    public fadeRate: number = 1,
    public shrinkRate: number = 0.5,
  ) {}
}
