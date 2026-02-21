import { TierDefinition, TierMechanic } from '../TierConfig.ts';
import { World } from '../../ecs/World.ts';
import { EventBus } from '../../core/EventBus.ts';
import { Camera } from '../../core/Camera.ts';
import { Transform } from '../../components/Transform.ts';
import { Physics } from '../../components/Physics.ts';
import { Renderable } from '../../components/Renderable.ts';
import { Collider } from '../../components/Collider.ts';
import { AIBehavior } from '../../components/AIBehavior.ts';
import { Consumable } from '../../components/Consumable.ts';
import { Hazard } from '../../components/Hazard.ts';
import { Vec2 } from '../../utils/Vec2.ts';
import { randomRange } from '../../utils/MathUtils.ts';
import {
  EntityType, BehaviorType, CollisionLayer,
  BackgroundConfig, PlayerConfig, EntitySpawnConfig, HazardSpawnConfig,
} from '../../types/index.ts';
import { CONFIG } from '../../utils/Constants.ts';
import { hexToRgba } from '../../utils/Color.ts';
import { PlayerControlled } from '../../components/PlayerControlled.ts';

/** Proton gravity-well mechanic for subatomic tier */
class ChargeAttractionMechanic implements TierMechanic {
  id = 'chargeAttraction';
  private activeWorld: World | null = null;

  activate(world: World, _eventBus: EventBus): void {
    this.activeWorld = world;
  }

  deactivate(): void {
    this.activeWorld = null;
  }

  update(dt: number, world: World): void {
    const players = world.query('PlayerControlled', 'Transform', 'Physics');
    if (players.length === 0) return;

    const hazards = world.query('Hazard', 'Transform');
    // Apply gravity pull to ALL players
    for (let p = 0; p < players.length; p++) {
      const playerTransform = players[p].getComponent<Transform>('Transform')!;
      const playerPhysics = players[p].getComponent<Physics>('Physics')!;

      for (const h of hazards) {
        const t = h.getComponent<Transform>('Transform')!;
        const diff = t.position.sub(playerTransform.position);
        const dist = diff.mag();
        if (dist < 350 && dist > 35) {
          const force = (20000 / (dist * dist + 1)) * dt;
          playerPhysics.acceleration = playerPhysics.acceleration.add(diff.normalize().mul(force * 60));
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (!this.activeWorld) return;
    const hazards = this.activeWorld.query('Hazard', 'Transform');
    for (const h of hazards) {
      const t = h.getComponent<Transform>('Transform')!;
      const screenPos = camera.worldToScreen(t.position);
      for (let i = 1; i <= 3; i++) {
        const r = camera.worldToScreenScale(i * 45);
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba('#ff4444', 0.07 / i);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
}

/** Electron shield mechanic for atomic tier */
class ElectronShieldMechanic implements TierMechanic {
  id = 'electronShield';
  private regenTimer = 0;

  activate(_world: World, _eventBus: EventBus): void {
    this.regenTimer = 0;
  }

  deactivate(): void { }

  update(dt: number, world: World): void {
    this.regenTimer += dt;
    if (this.regenTimer < 3) return;
    this.regenTimer = 0;

    // Regen shield for ALL players
    const players = world.query('PlayerControlled');
    for (let i = 0; i < players.length; i++) {
      const ctrl = players[i].getComponent<PlayerControlled>('PlayerControlled')!;
      if (ctrl.maxShieldHP === 0) continue;
      ctrl.shieldHP = Math.min(ctrl.shieldHP + 1, ctrl.maxShieldHP);
    }
  }
}

/** UV radiation zone mechanic for molecular tier */
class UVZoneMechanic implements TierMechanic {
  id = 'uvZone';
  private zones: Array<{ x: number; y: number; radius: number; timer: number }> = [];
  private spawnTimer = 0;

  activate(_world: World, _eventBus: EventBus): void {
    this.zones = [];
    this.spawnTimer = 0;
    for (let i = 0; i < 5; i++) this.spawnZone();
  }

  deactivate(): void {
    this.zones = [];
  }

  private spawnZone(): void {
    this.zones.push({
      x: randomRange(200, CONFIG.WORLD_WIDTH - 200),
      y: randomRange(200, CONFIG.WORLD_HEIGHT - 200),
      radius: randomRange(90, 200),
      timer: randomRange(10, 25),
    });
  }

  update(dt: number, world: World): void {
    this.spawnTimer += dt;
    if (this.spawnTimer >= 18) {
      this.spawnTimer = 0;
      if (this.zones.length < 8) this.spawnZone();
    }

    for (let i = this.zones.length - 1; i >= 0; i--) {
      this.zones[i].timer -= dt;
      if (this.zones[i].timer <= 0) {
        this.zones.splice(i, 1);
        continue;
      }

      // Drain energy if player inside zone
      const z = this.zones[i];
      const players = world.query('PlayerControlled', 'Transform');
      for (const p of players) {
        const t = p.getComponent<Transform>('Transform')!;
        const dx = t.position.x - z.x;
        const dy = t.position.y - z.y;
        if (dx * dx + dy * dy < z.radius * z.radius) {
          const ctrl = p.getComponent<PlayerControlled>('PlayerControlled')!;
          ctrl.energy = Math.max(0, ctrl.energy - 12 * dt);
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const pulse = Math.sin(Date.now() * 0.002) * 0.04 + 0.08;
    for (const z of this.zones) {
      const screenPos = camera.worldToScreen(new Vec2(z.x, z.y));
      const screenR = camera.worldToScreenScale(z.radius);

      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, screenR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,80,255,${pulse})`;
      ctx.fill();

      ctx.strokeStyle = `rgba(180,80,255,0.35)`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(200,120,255,0.5)';
      ctx.font = `${Math.max(10, screenR * 0.18)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('UV', screenPos.x, screenPos.y);
    }
  }
}

/** ─── SUBATOMIC TIER ─── */
export class SubatomicTier implements TierDefinition {
  id = 'subatomic';
  name = 'Subatomic';
  displayName = 'Subatomic';
  displayColor = '#cc44ff';
  evolutionThreshold = 150;

  background: BackgroundConfig = {
    baseColor: '#040408',
    gridColor: '#0a0a1a',
    gridSpacing: 60,
    particleDensity: 80,
    particleColor: '#223355',
  };

  playerConfig: PlayerConfig = {
    speed: 320,
    baseRadius: 10,
    color: '#cc44ff',
    glowColor: '#cc44ff',
    glowRadius: 15,
    trailLength: 8,
  };

  entitySpawns: EntitySpawnConfig[] = [
    {
      type: EntityType.Quark,
      count: 90,
      minRadius: 4, maxRadius: 8,
      color: '#ff6644', glowColor: '#ff6644',
      behavior: BehaviorType.Wander,
      speed: 65,
      massValue: 2, energyValue: 8, cpValue: 0,
      collisionLayer: CollisionLayer.Food, respawn: true,
    },
    {
      type: EntityType.Neutrino,
      count: 35,
      minRadius: 3, maxRadius: 5,
      color: '#44ffff', glowColor: '#44ffff',
      behavior: BehaviorType.ZipAcross,
      speed: 420,
      massValue: 1, energyValue: 18, cpValue: 1,
      collisionLayer: CollisionLayer.Bonus, respawn: true,
    },
    {
      type: EntityType.Photon,
      count: 18,
      minRadius: 5, maxRadius: 7,
      color: '#ffff44', glowColor: '#ffff44',
      behavior: BehaviorType.ZipAcross,
      speed: 520,
      massValue: 4, energyValue: 28, cpValue: 2,
      collisionLayer: CollisionLayer.Bonus, respawn: true,
    },
  ];

  hazardSpawns: HazardSpawnConfig[] = [
    {
      type: EntityType.Proton,
      count: 12,
      radius: 14,
      color: '#ff4444',
      behavior: BehaviorType.Orbit,
      speed: 80,
      damage: 15,
      collisionLayer: CollisionLayer.Hazard,
    },
  ];

  mechanics: TierMechanic[] = [new ChargeAttractionMechanic()];

  onEnter(world: World, _eventBus: EventBus): void {
    for (const cfg of this.entitySpawns)
      for (let i = 0; i < cfg.count; i++) spawnFoodEntity(world, cfg);
    for (const cfg of this.hazardSpawns)
      for (let i = 0; i < cfg.count; i++) spawnHazardEntity(world, cfg);
  }

  onExit(_world: World): void { }
}

/** ─── ATOMIC TIER ─── */
export class AtomicTier implements TierDefinition {
  id = 'atomic';
  name = 'Atomic';
  displayName = 'Atomic';
  displayColor = '#4488ff';
  evolutionThreshold = 400;

  background: BackgroundConfig = {
    baseColor: '#020612',
    gridColor: '#051025',
    gridSpacing: 80,
    particleDensity: 60,
    particleColor: '#113366',
  };

  playerConfig: PlayerConfig = {
    speed: 240,
    baseRadius: 16,
    color: '#4488ff',
    glowColor: '#4488ff',
    glowRadius: 18,
    trailLength: 6,
  };

  entitySpawns: EntitySpawnConfig[] = [
    {
      type: EntityType.Electron,
      count: 65,
      minRadius: 5, maxRadius: 9,
      color: '#66aaff', glowColor: '#66aaff',
      behavior: BehaviorType.Wander,
      speed: 90,
      massValue: 4, energyValue: 12, cpValue: 0,
      collisionLayer: CollisionLayer.Food, respawn: true,
    },
    {
      type: EntityType.NoblGas,
      count: 28,
      minRadius: 9, maxRadius: 15,
      color: '#44ffcc', glowColor: '#44ffcc',
      behavior: BehaviorType.Wander,
      speed: 50,
      massValue: 9, energyValue: 22, cpValue: 1,
      collisionLayer: CollisionLayer.Food, respawn: true,
    },
    {
      type: EntityType.Ion,
      count: 38,
      minRadius: 6, maxRadius: 10,
      color: '#ff8844', glowColor: '#ff8844',
      behavior: BehaviorType.Chase,
      speed: 190,
      massValue: 3, energyValue: 5, cpValue: 2,
      collisionLayer: CollisionLayer.Food, respawn: true,
    },
  ];

  hazardSpawns: HazardSpawnConfig[] = [
    {
      type: EntityType.RadiactiveIsotope,
      count: 8,
      radius: 18,
      color: '#aaff00',
      behavior: BehaviorType.Patrol,
      speed: 110,
      damage: 20,
      collisionLayer: CollisionLayer.Hazard,
    },
  ];

  mechanics: TierMechanic[] = [new ElectronShieldMechanic()];

  onEnter(world: World, _eventBus: EventBus): void {
    // Award electron shield to ALL players
    const players = world.query('PlayerControlled');
    for (let i = 0; i < players.length; i++) {
      const ctrl = players[i].getComponent<PlayerControlled>('PlayerControlled')!;
      ctrl.maxShieldHP = 5;
      ctrl.shieldHP = 5;
    }
    for (const cfg of this.entitySpawns)
      for (let i = 0; i < cfg.count; i++) spawnFoodEntity(world, cfg);
    for (const cfg of this.hazardSpawns)
      for (let i = 0; i < cfg.count; i++) spawnHazardEntity(world, cfg);
  }

  onExit(_world: World): void { }
}

/** ─── MOLECULAR TIER ─── */
export class MolecularTier implements TierDefinition {
  id = 'molecular';
  name = 'Molecular';
  displayName = 'Molecular';
  displayColor = '#44ffaa';
  evolutionThreshold = 900;

  background: BackgroundConfig = {
    baseColor: '#020a06',
    gridColor: '#051508',
    gridSpacing: 100,
    particleDensity: 50,
    particleColor: '#0a3318',
  };

  playerConfig: PlayerConfig = {
    speed: 180,
    baseRadius: 22,
    color: '#44ffaa',
    glowColor: '#44ffaa',
    glowRadius: 22,
    trailLength: 5,
  };

  entitySpawns: EntitySpawnConfig[] = [
    {
      type: EntityType.AminoAcid,
      count: 55,
      minRadius: 8, maxRadius: 13,
      color: '#55ee88', glowColor: '#55ee88',
      behavior: BehaviorType.Flock, // Now they school together!
      speed: 60,
      massValue: 9, energyValue: 20, cpValue: 1,
      collisionLayer: CollisionLayer.Food, respawn: true,
    },
    {
      type: EntityType.Lipid,
      count: 40,
      minRadius: 11, maxRadius: 19,
      color: '#ffcc44', glowColor: '#ffcc44',
      behavior: BehaviorType.Wander,
      speed: 40,
      massValue: 16, energyValue: 38, cpValue: 2,
      collisionLayer: CollisionLayer.Food, respawn: true,
    },
    {
      type: EntityType.FreeRadical,
      count: 28,
      minRadius: 6, maxRadius: 10,
      color: '#ff5544', glowColor: '#ff5544',
      behavior: BehaviorType.Chase,
      speed: 140,
      massValue: 5, energyValue: 5, cpValue: 3,
      collisionLayer: CollisionLayer.Food, respawn: true,
    },
  ];

  hazardSpawns: HazardSpawnConfig[] = [];

  mechanics: TierMechanic[] = [new UVZoneMechanic()];

  onEnter(world: World, _eventBus: EventBus): void {
    for (const cfg of this.entitySpawns)
      for (let i = 0; i < cfg.count; i++) spawnFoodEntity(world, cfg);
  }

  onExit(_world: World): void { }
}

/** ─── Shared spawn helpers ─── */

export function spawnFoodEntity(world: World, cfg: EntitySpawnConfig, nearX?: number, nearY?: number): void {
  const entity = world.createEntity();
  const radius = randomRange(cfg.minRadius, cfg.maxRadius);
  let x: number, y: number;

  if (nearX !== undefined && nearY !== undefined) {
    const angle = Math.random() * Math.PI * 2;
    const dist = randomRange(CONFIG.SPAWN_MARGIN * 0.4, CONFIG.SPAWN_MARGIN);
    x = Math.max(60, Math.min(CONFIG.WORLD_WIDTH - 60, nearX + Math.cos(angle) * dist));
    y = Math.max(60, Math.min(CONFIG.WORLD_HEIGHT - 60, nearY + Math.sin(angle) * dist));
  } else {
    x = randomRange(100, CONFIG.WORLD_WIDTH - 100);
    y = randomRange(100, CONFIG.WORLD_HEIGHT - 100);
  }

  entity.addComponent(new Transform(new Vec2(x, y)));

  const phys = new Physics(radius * 0.5, cfg.speed);
  phys.friction = 0.94;
  entity.addComponent(phys);

  const isZipper = cfg.behavior === BehaviorType.ZipAcross;
  const foodRenderable = new Renderable(
    radius,
    cfg.color,
    cfg.glowColor ?? '',
    cfg.glowColor ? radius * 0.9 : 0,
    1,
    0,
    'circle',
    isZipper ? 0 : 2.5,
    isZipper ? 0 : radius * 0.08,
  );
  // Assign sprite key so RenderSystem uses the PixelLab-generated sprite when available
  foodRenderable.spriteKey = cfg.type;
  entity.addComponent(foodRenderable);

  entity.addComponent(new Collider(radius, cfg.collisionLayer, false));
  entity.addComponent(new AIBehavior(cfg.behavior, cfg.speed, CONFIG.AI_PERCEPTION_RADIUS, CONFIG.AI_FLEE_DISTANCE));
  entity.addComponent(new Consumable(cfg.type, cfg.massValue, cfg.energyValue, cfg.cpValue, cfg.respawn));
}

export function spawnHazardEntity(world: World, cfg: HazardSpawnConfig): void {
  const entity = world.createEntity();
  const x = randomRange(150, CONFIG.WORLD_WIDTH - 150);
  const y = randomRange(150, CONFIG.WORLD_HEIGHT - 150);

  entity.addComponent(new Transform(new Vec2(x, y)));

  const phys = new Physics(cfg.radius * 0.8, cfg.speed);
  phys.friction = 0.96;
  entity.addComponent(phys);

  const hazardRenderable = new Renderable(
    cfg.radius,
    cfg.color,
    cfg.color,
    cfg.radius * 0.7,
    1,
    0,
    'circle',
    3.5,
    cfg.radius * 0.12,
  );
  // Assign sprite key so RenderSystem uses the PixelLab-generated sprite when available
  hazardRenderable.spriteKey = cfg.type;
  entity.addComponent(hazardRenderable);

  entity.addComponent(new Collider(cfg.radius, cfg.collisionLayer, true));
  entity.addComponent(new AIBehavior(cfg.behavior, cfg.speed, CONFIG.AI_PERCEPTION_RADIUS * 1.5));
  entity.addComponent(new Hazard(cfg.damage, 0.5, 300));
}
