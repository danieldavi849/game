import { System } from '../ecs/System.ts';
import { World } from '../ecs/World.ts';
import { EventBus } from '../core/EventBus.ts';
import { PlayerControlled } from '../components/PlayerControlled.ts';
import { Renderable } from '../components/Renderable.ts';
import { Collider } from '../components/Collider.ts';
import { Physics } from '../components/Physics.ts';
import { Transform } from '../components/Transform.ts';
import { Consumable } from '../components/Consumable.ts';
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

/** Handles consumption: mass transfer, relic modifiers, chain eats, PvP */
export class ConsumptionSystem implements System {
  readonly priority = 25;
  private pendingConsumptions: ConsumeEvent[] = [];

  constructor(private eventBus: EventBus) {
    this.eventBus.on(GameEvents.ENTITY_CONSUMED, (event: unknown) => {
      this.pendingConsumptions.push(event as ConsumeEvent);
    });
  }

  update(world: World, _dt: number): void {
    if (this.pendingConsumptions.length === 0) return;

    // Work from a snapshot so chain-consumes added mid-loop are handled next frame
    const batch = this.pendingConsumptions.splice(0);

    for (const event of batch) {
      this.processConsumption(world, event);
    }
  }

  private processConsumption(world: World, event: ConsumeEvent): void {
    const consumed = world.getEntity(event.consumedId);
    if (!consumed || !consumed.active) return;

    const player = world.getEntity(event.consumerId);
    if (!player || !player.active) return;

    const playerCtrl = player.getComponent<PlayerControlled>('PlayerControlled');
    if (!playerCtrl) return;

    const renderable = player.getComponent<Renderable>('Renderable');
    const collider = player.getComponent<Collider>('Collider');
    const physics = player.getComponent<Physics>('Physics');

    // ── PvP ──────────────────────────────────────────────────
    const consumedCtrl = consumed.getComponent<PlayerControlled>('PlayerControlled');
    if (consumedCtrl) {
      this.eventBus.emit(GameEvents.PLAYER_DIED, { playerId: event.consumedId, killedBy: event.consumerId });
      world.removeEntity(event.consumedId);
      const bonusMass = consumedCtrl.evolutionMass * 0.5;
      playerCtrl.evolutionMass += bonusMass;
      if (physics) physics.mass += bonusMass;
      return;
    }

    // ── Cursed: poison chance ─────────────────────────────────
    if (playerCtrl.relicPoisonChance > 0 && Math.random() < playerCtrl.relicPoisonChance) {
      // Entity was poison — drain energy instead of gaining it
      playerCtrl.energy = Math.max(0, playerCtrl.energy - 20);
      world.removeEntity(event.consumedId);
      this.eventBus.emit(GameEvents.ENERGY_CHANGED, { playerId: player.id, energy: playerCtrl.energy });
      this.eventBus.emit(GameEvents.SCREEN_SHAKE, { intensity: CONFIG.SHAKE_INTENSITY_EAT * 2 });
      return;
    }

    // ── Remove consumed entity ────────────────────────────────
    world.removeEntity(event.consumedId);

    // ── Mass gain with relic multiplier ──────────────────────
    const massGain = event.massValue * CONFIG.CONSUME_MASS_TRANSFER * playerCtrl.relicMassGainMult;
    playerCtrl.evolutionMass += massGain;

    // ── Energy gain + bonus ───────────────────────────────────
    const energyMax = CONFIG.ENERGY_MAX + playerCtrl.relicEnergyMaxBonus - playerCtrl.devilEnergyPenalty;
    playerCtrl.energy = clamp(
      playerCtrl.energy + event.energyValue + playerCtrl.relicBonusEnergyOnEat,
      0,
      energyMax,
    );

    // ── CP gain with relic multiplier ─────────────────────────
    if (event.cpValue > 0) {
      const cp = Math.round(event.cpValue * playerCtrl.relicCpGainMult);
      playerCtrl.cp += cp;
      this.eventBus.emit(GameEvents.CP_GAINED, { playerId: player.id, amount: cp, total: playerCtrl.cp });
    }

    // ── Grow player size ──────────────────────────────────────
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

    // ── Eat invincibility ─────────────────────────────────────
    if (playerCtrl.relicEatInvincibility > 0) {
      playerCtrl.invincibilityTimer = Math.max(
        playerCtrl.invincibilityTimer,
        playerCtrl.relicEatInvincibility,
      );
    }

    // ── Chain consume ─────────────────────────────────────────
    if (playerCtrl.relicChainConsumeChance > 0 && Math.random() < playerCtrl.relicChainConsumeChance) {
      this.tryChainConsume(world, player.id, playerCtrl, event.position);
    }

    // ── Emit events ───────────────────────────────────────────
    this.eventBus.emit(GameEvents.MASS_CHANGED, {
      playerId: player.id,
      mass: playerCtrl.evolutionMass,
      totalMass: physics?.mass ?? 0,
    });
    this.eventBus.emit(GameEvents.ENERGY_CHANGED, { playerId: player.id, energy: playerCtrl.energy });
    this.eventBus.emit(GameEvents.SCREEN_SHAKE, { intensity: CONFIG.SHAKE_INTENSITY_EAT });
  }

  /** Try to eat one random nearby entity for free (chain effect) */
  private tryChainConsume(
    world: World,
    playerId: number,
    ctrl: PlayerControlled,
    pos: { x: number; y: number },
  ): void {
    const player = world.getEntity(playerId);
    if (!player) return;
    const renderable = player.getComponent<Renderable>('Renderable');
    const playerRadius = renderable?.radius ?? 10;

    const nearby = world.query('Consumable', 'Transform');
    let closest: { id: number; dist: number } | null = null;

    for (const e of nearby) {
      if (e.id === playerId || e.hasComponent('PlayerControlled')) continue;
      const t = e.getComponent<Transform>('Transform')!;
      const er = e.getComponent<Renderable>('Renderable');
      const otherRadius = er?.radius ?? 5;

      // Only chain onto entities we can eat
      if (otherRadius > playerRadius * (1 / (CONFIG.CONSUME_SIZE_RATIO - ctrl.relicConsumeRatioBonus))) continue;

      const dx = t.position.x - pos.x;
      const dy = t.position.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 200 && (!closest || dist < closest.dist)) {
        closest = { id: e.id, dist };
      }
    }

    if (closest) {
      const target = world.getEntity(closest.id);
      if (!target) return;
      const consumable = target.getComponent<Consumable>('Consumable');
      const tt = target.getComponent<Transform>('Transform');
      if (consumable && tt) {
        this.eventBus.emit(GameEvents.ENTITY_CONSUMED, {
          consumerId: playerId,
          consumedId: closest.id,
          massValue: consumable.massValue,
          energyValue: consumable.energyValue,
          cpValue: consumable.cpValue,
          entityType: consumable.entityType,
          position: tt.position.clone(),
          respawns: consumable.respawns,
        });
      }
    }
  }
}
