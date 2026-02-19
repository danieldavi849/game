import { System } from '../ecs/System.ts';
import { World } from '../ecs/World.ts';
import { EventBus } from '../core/EventBus.ts';
import { PlayerControlled } from '../components/PlayerControlled.ts';
import { GameEvents } from '../types/index.ts';

/** Monitors mass threshold and triggers tier transitions */
export class EvolutionSystem implements System {
  readonly priority = 35;
  private threshold: number = 100;
  private evolving: boolean = false;

  constructor(private eventBus: EventBus) {}

  /** Set the mass threshold for the current tier */
  setThreshold(threshold: number): void {
    this.threshold = threshold;
  }

  /** Whether currently in an evolution transition */
  isEvolving(): boolean {
    return this.evolving;
  }

  /** Set evolving state */
  setEvolving(state: boolean): void {
    this.evolving = state;
  }

  update(world: World, dt: number): void {
    if (this.evolving) return;

    const players = world.query('PlayerControlled');
    if (players.length === 0) return;

    const ctrl = players[0].getComponent<PlayerControlled>('PlayerControlled')!;

    if (ctrl.evolutionMass >= this.threshold) {
      this.evolving = true;
      this.eventBus.emit(GameEvents.EVOLUTION_READY, {
        mass: ctrl.evolutionMass,
        threshold: this.threshold,
      });
    }
  }

  /** Get progress toward evolution (0-1) */
  getProgress(world: World): number {
    const players = world.query('PlayerControlled');
    if (players.length === 0) return 0;
    const ctrl = players[0].getComponent<PlayerControlled>('PlayerControlled')!;
    return Math.min(ctrl.evolutionMass / this.threshold, 1);
  }
}
