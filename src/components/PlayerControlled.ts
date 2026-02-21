import { Component } from '../ecs/Component.ts';

/** Marker component for the player entity */
export class PlayerControlled implements Component {
  readonly type = 'PlayerControlled';
  /** Current player level (advances phase every 10 levels) */
  level: number = 1;
  /** Current evolution mass accumulated */
  evolutionMass: number = 0;
  /** Current energy level */
  energy: number = 100;
  /** Complexity points */
  cp: number = 0;
  /** Player speed multiplier */
  speed: number = 300;
  /** Electron shield HP (for atomic tier) */
  shieldHP: number = 0;
  /** Max shield HP */
  maxShieldHP: number = 0;

  // --- Relic system ---
  mutations: string[] = []; // Max 5 constraints handled by UI/Shop
  catalysts: string[] = []; // Max 3 single-use items
  items: string[] = [];
  transformations: string[] = [];

  // Computed stat modifiers (recalculated by RelicSystem)
  relicSpeedMult: number = 1;
  relicMassGainMult: number = 1;
  relicEnergyDrainMult: number = 1;
  relicEnergyMaxBonus: number = 0;
  relicConsumeRatioBonus: number = 0;
  relicShieldBonus: number = 0;
  relicCpGainMult: number = 1;
  relicAttractRadius: number = 0;
  relicBonusEnergyOnEat: number = 0;
  relicChainConsumeChance: number = 0;
  relicEnergyFloor: number = 0;
  relicMassDecay: number = 0;
  relicPoisonChance: number = 0;
  relicEatInvincibility: number = 0;
  invincibilityTimer: number = 0;
  /** Permanent max-energy reduction from devil deals */
  devilEnergyPenalty: number = 0;

  // Baseline Dodge/Dash
  dashTimer: number = 0;
  dashCooldown: number = 0;

  // Active ability (Overrides dash if set)
  activeAbility: string | null = null;
  activeCooldown: number = 0;
  activeMaxCooldown: number = 0;
}
