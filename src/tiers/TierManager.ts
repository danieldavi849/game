import { World } from '../ecs/World.ts';
import { EventBus } from '../core/EventBus.ts';
import { Camera } from '../core/Camera.ts';
import { TierDefinition } from './TierConfig.ts';
import { SubatomicTier, AtomicTier, MolecularTier, spawnFoodEntity } from './tiers/AllTiers.ts';
import { Transform } from '../components/Transform.ts';
import { Renderable } from '../components/Renderable.ts';
import { Collider } from '../components/Collider.ts';
import { Physics } from '../components/Physics.ts';
import { PlayerControlled } from '../components/PlayerControlled.ts';
import { Consumable } from '../components/Consumable.ts';
import { Vec2 } from '../utils/Vec2.ts';
import { GameEvents } from '../types/index.ts';
import { CONFIG } from '../utils/Constants.ts';

/** Manages tier state, transitions, and world regeneration */
export class TierManager {
  private tiers: TierDefinition[] = [
    new SubatomicTier(),
    new AtomicTier(),
    new MolecularTier(),
  ];
  private currentTierIndex = 0;
  private respawnTimer = 0;

  constructor(
    private world: World,
    private eventBus: EventBus,
  ) {}

  /** Get the current tier definition */
  getCurrentTier(): TierDefinition {
    return this.tiers[this.currentTierIndex];
  }

  /** Get current tier index (0-based) */
  getTierIndex(): number {
    return this.currentTierIndex;
  }

  /** Whether there is a next tier to advance to */
  hasNextTier(): boolean {
    return this.currentTierIndex < this.tiers.length - 1;
  }

  /** Whether the player has completed all tiers */
  isLastTier(): boolean {
    return this.currentTierIndex === this.tiers.length - 1;
  }

  /** Get a tier by index (or undefined) */
  getTierAt(index: number): TierDefinition | undefined {
    return this.tiers[index];
  }

  /** Initialize the first tier */
  startFirstTier(): void {
    this.currentTierIndex = 0;
    this.enterTier(0);
  }

  /** Advance to the next tier */
  advanceToNextTier(): void {
    if (!this.hasNextTier()) {
      this.eventBus.emit(GameEvents.GAME_WON, {});
      return;
    }

    const prevTier = this.tiers[this.currentTierIndex];
    prevTier.onExit(this.world);

    // Deactivate old mechanics
    for (const mechanic of prevTier.mechanics) {
      mechanic.deactivate();
    }

    // Remove all non-player entities
    this.clearNonPlayerEntities();

    this.currentTierIndex++;
    this.enterTier(this.currentTierIndex);
  }

  private enterTier(index: number): void {
    const tier = this.tiers[index];

    // Reset player for new tier
    this.setupPlayerForTier(tier);

    // Activate mechanics
    for (const mechanic of tier.mechanics) {
      mechanic.activate(this.world, this.eventBus);
    }

    tier.onEnter(this.world, this.eventBus);

    this.eventBus.emit(GameEvents.TIER_ENTER, { tierId: tier.id, tierName: tier.displayName });
  }

  private setupPlayerForTier(tier: TierDefinition): void {
    const players = this.world.query('PlayerControlled');
    if (players.length === 0) return;

    const player = players[0];
    const ctrl = player.getComponent<PlayerControlled>('PlayerControlled')!;
    const renderable = player.getComponent<Renderable>('Renderable');
    const collider = player.getComponent<Collider>('Collider');
    const physics = player.getComponent<Physics>('Physics');
    const transform = player.getComponent<Transform>('Transform');

    // Reposition player to center
    if (transform) {
      transform.position = new Vec2(CONFIG.WORLD_WIDTH / 2, CONFIG.WORLD_HEIGHT / 2);
    }

    // Reset evolution mass, keep accumulated CP and energy
    ctrl.evolutionMass = 0;
    ctrl.energy = CONFIG.ENERGY_MAX;
    ctrl.speed = tier.playerConfig.speed;
    ctrl.shieldHP = 0;
    ctrl.maxShieldHP = 0;

    if (renderable) {
      renderable.color = tier.playerConfig.color;
      renderable.glowColor = tier.playerConfig.glowColor;
      renderable.glowRadius = tier.playerConfig.glowRadius;
      renderable.radius = tier.playerConfig.baseRadius;
    }
    if (collider) {
      collider.radius = tier.playerConfig.baseRadius;
    }
    if (physics) {
      physics.mass = CONFIG.PLAYER_INITIAL_MASS;
      physics.maxSpeed = tier.playerConfig.speed;
      physics.velocity = new Vec2(0, 0);
    }
  }

  private clearNonPlayerEntities(): void {
    const all = this.world.getAll();
    for (const entity of all) {
      if (!entity.hasComponent('PlayerControlled')) {
        this.world.removeEntity(entity.id);
      }
    }
    this.world.flush();
  }

  /** Update mechanics and handle respawning */
  update(dt: number): void {
    const tier = this.getCurrentTier();

    // Update active mechanics
    for (const mechanic of tier.mechanics) {
      mechanic.update(dt, this.world);
    }

    // Periodic respawning
    this.respawnTimer += dt;
    if (this.respawnTimer >= CONFIG.RESPAWN_CHECK_INTERVAL) {
      this.respawnTimer = 0;
      this.checkRespawns(tier);
    }
  }

  /** Render mechanics that have render hooks */
  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const tier = this.getCurrentTier();
    for (const mechanic of tier.mechanics) {
      mechanic.render?.(ctx, camera);
    }
  }

  private checkRespawns(tier: TierDefinition): void {
    // Count current food entities
    const foodEntities = this.world.query('Consumable');
    const currentCount = foodEntities.length;
    const targetCount = tier.entitySpawns.reduce((sum, cfg) => sum + cfg.count, 0);

    if (currentCount < targetCount * 0.6) {
      // Respawn missing food near player
      const players = this.world.query('PlayerControlled', 'Transform');
      const playerPos = players.length > 0
        ? players[0].getComponent<Transform>('Transform')!.position
        : new Vec2(CONFIG.WORLD_WIDTH / 2, CONFIG.WORLD_HEIGHT / 2);

      const needed = Math.ceil((targetCount - currentCount) * 0.3);
      for (let i = 0; i < needed; i++) {
        const cfg = tier.entitySpawns[Math.floor(Math.random() * tier.entitySpawns.length)];
        spawnFoodEntity(this.world, cfg, playerPos.x, playerPos.y);
      }
    }
  }
}
