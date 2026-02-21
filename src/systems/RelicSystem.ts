import { System } from '../ecs/System.ts';
import { World } from '../ecs/World.ts';
import { Entity } from '../ecs/Entity.ts';
import { PlayerControlled } from '../components/PlayerControlled.ts';
import { Transform } from '../components/Transform.ts';
import { Physics } from '../components/Physics.ts';
import { Consumable } from '../components/Consumable.ts';
import {
  getRelicById, getTransformationForTag,
  SynergyTag, RelicStatMods, TRANSFORMATIONS,
} from '../relics/RelicDefs.ts';
import { getItemById } from '../items/ItemDefs.ts';

/** Recomputes relic stat modifiers and applies per-frame effects */
export class RelicSystem implements System {
  readonly priority = 1; // Run very early, before input uses speed

  update(world: World, dt: number): void {
    const players = world.query('PlayerControlled');

    for (let i = 0; i < players.length; i++) {
      const ctrl = players[i].getComponent<PlayerControlled>('PlayerControlled')!;

      // Reset computed stats
      this.resetMods(ctrl);

      // Accumulate relic stat mods
      for (const relicId of ctrl.mutations) {
        const relic = getRelicById(relicId);
        if (relic) this.applyMods(ctrl, relic.stats);
      }

      // Accumulate CP item stat mods
      for (const itemId of ctrl.items) {
        const item = getItemById(itemId);
        if (item && item.stats) this.applyMods(ctrl, item.stats);
      }

      // Check for new transformations
      this.checkTransformations(ctrl);

      // Apply transformation stat mods
      for (const tId of ctrl.transformations) {
        const t = TRANSFORMATIONS.find(x => x.id === tId);
        if (t) this.applyMods(ctrl, t.stats);
      }

      // Per-frame effects
      this.applyPerFrame(ctrl, dt);

      // Food attraction
      if (ctrl.relicAttractRadius > 0) {
        this.attractFood(world, players[i], ctrl);
      }

      // Tick active ability cooldown
      if (ctrl.activeCooldown > 0) {
        ctrl.activeCooldown = Math.max(0, ctrl.activeCooldown - dt);
      }

      // Tick invincibility
      if (ctrl.invincibilityTimer > 0) {
        ctrl.invincibilityTimer = Math.max(0, ctrl.invincibilityTimer - dt);
      }
    }
  }

  private resetMods(ctrl: PlayerControlled): void {
    ctrl.relicSpeedMult = 1;
    ctrl.relicMassGainMult = 1;
    ctrl.relicEnergyDrainMult = 1;
    ctrl.relicEnergyMaxBonus = 0;
    ctrl.relicConsumeRatioBonus = 0;
    ctrl.relicShieldBonus = 0;
    ctrl.relicCpGainMult = 1;
    ctrl.relicAttractRadius = 0;
    ctrl.relicBonusEnergyOnEat = 0;
    ctrl.relicChainConsumeChance = 0;
    ctrl.relicEnergyFloor = 0;
    ctrl.relicMassDecay = 0;
    ctrl.relicPoisonChance = 0;
    ctrl.relicEatInvincibility = 0;
  }

  private applyMods(ctrl: PlayerControlled, s: RelicStatMods): void {
    if (s.speedMult) ctrl.relicSpeedMult *= s.speedMult;
    if (s.massGainMult) ctrl.relicMassGainMult *= s.massGainMult;
    if (s.energyDrainMult) ctrl.relicEnergyDrainMult *= s.energyDrainMult;
    if (s.energyMaxBonus) ctrl.relicEnergyMaxBonus += s.energyMaxBonus;
    if (s.consumeRatioBonus) ctrl.relicConsumeRatioBonus += s.consumeRatioBonus;
    if (s.shieldBonus) ctrl.relicShieldBonus += s.shieldBonus;
    if (s.cpGainMult) ctrl.relicCpGainMult *= s.cpGainMult;
    if (s.attractRadius) ctrl.relicAttractRadius += s.attractRadius;
    if (s.bonusEnergyOnEat) ctrl.relicBonusEnergyOnEat += s.bonusEnergyOnEat;
    if (s.chainConsumeChance) ctrl.relicChainConsumeChance += s.chainConsumeChance;
    if (s.energyFloor) ctrl.relicEnergyFloor = Math.max(ctrl.relicEnergyFloor, s.energyFloor);
    if (s.massDecay) ctrl.relicMassDecay += s.massDecay;
    if (s.poisonChance) ctrl.relicPoisonChance += s.poisonChance;
    if (s.eatInvincibility) ctrl.relicEatInvincibility = Math.max(ctrl.relicEatInvincibility, s.eatInvincibility);
  }

  private checkTransformations(ctrl: PlayerControlled): void {
    // Count tags across all relics
    const tagCounts = new Map<SynergyTag, number>();
    for (const relicId of ctrl.mutations) {
      const relic = getRelicById(relicId);
      if (!relic) continue;
      for (const tag of relic.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    // Grant transformations for any tag with 3+ relics
    for (const [tag, count] of tagCounts) {
      if (count >= 3) {
        const t = getTransformationForTag(tag);
        if (t && !ctrl.transformations.includes(t.id)) {
          ctrl.transformations.push(t.id);
        }
      }
    }
  }

  private applyPerFrame(ctrl: PlayerControlled, dt: number): void {
    // Cursed mass decay
    if (ctrl.relicMassDecay > 0) {
      ctrl.evolutionMass -= ctrl.relicMassDecay * dt;
    }
  }

  private attractFood(world: World, playerEntity: Entity, ctrl: PlayerControlled): void {
    const playerTransform = playerEntity.getComponent<Transform>('Transform');
    if (!playerTransform) return;

    const consumables = world.query('Consumable', 'Transform', 'Physics');
    const radius = ctrl.relicAttractRadius;
    const radiusSq = radius * radius;

    for (let i = 0; i < consumables.length; i++) {
      const e = consumables[i];
      if (e.id === playerEntity.id) continue;
      if (e.hasComponent('PlayerControlled')) continue;

      const t = e.getComponent<Transform>('Transform')!;
      const diff = playerTransform.position.sub(t.position);
      const distSq = diff.magSq();

      if (distSq < radiusSq && distSq > 100) {
        const physics = e.getComponent<Physics>('Physics');
        if (physics) {
          const force = diff.normalize().mul(80 / (Math.sqrt(distSq) + 1));
          physics.velocity = physics.velocity.add(force);
        }
      }
    }
  }
}
