import { System } from '../ecs/System.ts';
import { World } from '../ecs/World.ts';
import { EventBus } from '../core/EventBus.ts';
import { PlayerControlled } from '../components/PlayerControlled.ts';
import { Physics } from '../components/Physics.ts';
import { Renderable } from '../components/Renderable.ts';
import { Collider } from '../components/Collider.ts';
import { GameEvents } from '../types/index.ts';
import { CONFIG } from '../utils/Constants.ts';
import { clamp } from '../utils/MathUtils.ts';

/** Passive energy drain, starvation mass loss, death */
export class EnergySystem implements System {
  readonly priority = 30;
  private tierIndex: number = 0;

  constructor(private eventBus: EventBus) {}

  /** Set current tier index for drain scaling */
  setTierIndex(index: number): void {
    this.tierIndex = index;
  }

  update(world: World, dt: number): void {
    const players = world.query('PlayerControlled');
    if (players.length === 0) return;

    const drainRate = CONFIG.ENERGY_DRAIN_BASE + this.tierIndex * CONFIG.ENERGY_DRAIN_PER_TIER;

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const ctrl = player.getComponent<PlayerControlled>('PlayerControlled')!;
      const physics = player.getComponent<Physics>('Physics');

      // Passive drain
      ctrl.energy -= drainRate * dt;
      ctrl.energy = clamp(ctrl.energy, 0, CONFIG.ENERGY_MAX);

      this.eventBus.emit(GameEvents.ENERGY_CHANGED, { playerId: player.id, energy: ctrl.energy });

      // Starvation: lose mass when energy is 0
      if (ctrl.energy <= 0) {
        ctrl.evolutionMass -= CONFIG.ENERGY_STARVATION_MASS_LOSS * dt;
        if (physics) {
          physics.mass -= CONFIG.ENERGY_STARVATION_MASS_LOSS * dt;
          if (physics.mass < 1) physics.mass = 1;

          // Shrink player
          const renderable = player.getComponent<Renderable>('Renderable');
          const collider = player.getComponent<Collider>('Collider');
          if (renderable && collider) {
            const targetRadius = clamp(
              CONFIG.PLAYER_MIN_RADIUS + physics.mass * CONFIG.PLAYER_MASS_TO_RADIUS_FACTOR,
              CONFIG.PLAYER_MIN_RADIUS,
              CONFIG.PLAYER_MAX_RADIUS,
            );
            renderable.radius = targetRadius;
            collider.radius = targetRadius;
          }
        }

        // Die if mass drops too low
        if (ctrl.evolutionMass <= 0) {
          this.eventBus.emit(GameEvents.PLAYER_DIED, { playerId: player.id });
        }
      }
    }
  }
}
