import { System } from '../ecs/System.ts';
import { World } from '../ecs/World.ts';
import { EventBus } from '../core/EventBus.ts';
import { PlayerControlled } from '../components/PlayerControlled.ts';
import { Renderable } from '../components/Renderable.ts';
import { Collider } from '../components/Collider.ts';
import { Physics } from '../components/Physics.ts';
import { GameEvents } from '../types/index.ts';
import { CONFIG } from '../utils/Constants.ts';
import { clamp, lerp } from '../utils/MathUtils.ts';

interface ConsumeEvent {
  consumerId: number;
  consumedId: number;
  massValue: number;
  energyValue: number;
  cpValue: number;
  entityType: string;
  position: { x: number; y: number };
  respawns: boolean;
}

/** Handles consumption logic: mass transfer, size growth, event emission */
export class ConsumptionSystem implements System {
  readonly priority = 25;
  private pendingConsumptions: ConsumeEvent[] = [];

  constructor(private eventBus: EventBus) {
    this.eventBus.on(GameEvents.ENTITY_CONSUMED, (event: unknown) => {
      this.pendingConsumptions.push(event as ConsumeEvent);
    });
  }

  update(world: World, dt: number): void {
    if (this.pendingConsumptions.length === 0) return;

    for (const event of this.pendingConsumptions) {
      const consumed = world.getEntity(event.consumedId);
      if (!consumed || !consumed.active) continue;

      // Find the consuming player by entity ID (multiplayer-ready)
      const player = world.getEntity(event.consumerId);
      if (!player || !player.active) continue;

      const playerCtrl = player.getComponent<PlayerControlled>('PlayerControlled');
      if (!playerCtrl) continue;

      const renderable = player.getComponent<Renderable>('Renderable');
      const collider = player.getComponent<Collider>('Collider');
      const physics = player.getComponent<Physics>('Physics');

      // PvP: if the consumed entity is another player, emit their death
      const consumedCtrl = consumed.getComponent<PlayerControlled>('PlayerControlled');
      if (consumedCtrl) {
        this.eventBus.emit(GameEvents.PLAYER_DIED, { playerId: event.consumedId, killedBy: event.consumerId });
      }

      // Remove consumed entity
      world.removeEntity(event.consumedId);

      // PvP bonus: absorb a portion of the consumed player's mass
      const bonusMass = consumedCtrl ? consumedCtrl.evolutionMass * 0.5 : 0;

      // Add mass (includes PvP bonus from eaten player's accumulated mass)
      const massGain = event.massValue * CONFIG.CONSUME_MASS_TRANSFER + bonusMass;
      playerCtrl.evolutionMass += massGain;

      // Add energy
      playerCtrl.energy = clamp(
        playerCtrl.energy + event.energyValue,
        0,
        CONFIG.ENERGY_MAX,
      );

      // Add CP
      if (event.cpValue > 0) {
        playerCtrl.cp += event.cpValue;
        this.eventBus.emit(GameEvents.CP_GAINED, { playerId: player.id, amount: event.cpValue, total: playerCtrl.cp });
      }

      // Grow player size
      if (physics && renderable && collider) {
        physics.mass += massGain;
        const targetRadius = clamp(
          CONFIG.PLAYER_MIN_RADIUS + physics.mass * CONFIG.PLAYER_MASS_TO_RADIUS_FACTOR,
          CONFIG.PLAYER_MIN_RADIUS,
          CONFIG.PLAYER_MAX_RADIUS,
        );
        renderable.radius = lerp(renderable.radius, targetRadius, 0.3);
        collider.radius = renderable.radius;
      }

      // Emit events
      this.eventBus.emit(GameEvents.MASS_CHANGED, {
        playerId: player.id,
        mass: playerCtrl.evolutionMass,
        totalMass: physics?.mass ?? 0,
      });
      this.eventBus.emit(GameEvents.ENERGY_CHANGED, { playerId: player.id, energy: playerCtrl.energy });

      // Screen shake on eat
      this.eventBus.emit(GameEvents.SCREEN_SHAKE, { intensity: CONFIG.SHAKE_INTENSITY_EAT });
    }

    this.pendingConsumptions.length = 0;
  }
}
