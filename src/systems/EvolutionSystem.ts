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

  constructor(private eventBus: EventBus) { }

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
    for (let i = 0; i < players.length; i++) {
      const ctrl = players[i].getComponent<PlayerControlled>('PlayerControlled')!;

      const currentThreshold = this.getThresholdForLevel(ctrl.level);

      if (ctrl.evolutionMass >= currentThreshold) {
        this.evolving = true;
        this.eventBus.emit(GameEvents.EVOLUTION_READY, {
          playerId: players[i].id,
          mass: ctrl.evolutionMass,
          threshold: currentThreshold,
          level: ctrl.level,
        });
        break;
      }
    }
  }

  /** Calculate dynamic threshold based on player level */
  getDynamicThreshold(player: ReturnType<typeof World.prototype.getEntity>): number {
    const ctrl = player?.getComponent<PlayerControlled>('PlayerControlled');
    return ctrl ? this.getThresholdForLevel(ctrl.level) : this.threshold;
  }

  private getThresholdForLevel(level: number): number {
    const levelInTier = (level - 1) % 10;
    return Math.floor(this.threshold * (1 + 0.3 * levelInTier));
  }

  /** Get progress toward evolution for a specific player (0-1). Falls back to first player. */
  getProgress(world: World, playerId?: number): number {
    const players = world.query('PlayerControlled');
    if (players.length === 0) return 0;

    const target = playerId !== undefined
      ? players.find(p => p.id === playerId) ?? players[0]
      : players[0];
    const ctrl = target.getComponent<PlayerControlled>('PlayerControlled')!;
    const currentThreshold = this.getThresholdForLevel(ctrl.level);
    return Math.min(ctrl.evolutionMass / currentThreshold, 1);
  }
}
