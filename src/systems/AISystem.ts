import { System } from '../ecs/System.ts';
import { World } from '../ecs/World.ts';
import { Transform } from '../components/Transform.ts';
import { Physics } from '../components/Physics.ts';
import { AIBehavior } from '../components/AIBehavior.ts';
import { Renderable } from '../components/Renderable.ts';
import { BehaviorType } from '../types/index.ts';
import { Vec2 } from '../utils/Vec2.ts';
import { CONFIG } from '../utils/Constants.ts';
import { randomRange } from '../utils/MathUtils.ts';

/** Drives AI behaviors: wandering, fleeing, chasing, zipping */
export class AISystem implements System {
  readonly priority = 5;
  private playerPos: Vec2 = new Vec2(0, 0);
  private playerRadius: number = 10;
  private playerPositions: Array<{ pos: Vec2; radius: number }> = [];

  update(world: World, dt: number): void {
    // Cache all player positions (multiplayer-ready)
    const players = world.query('PlayerControlled', 'Transform', 'Renderable');
    this.playerPositions.length = 0;
    for (let p = 0; p < players.length; p++) {
      const pt = players[p].getComponent<Transform>('Transform')!;
      const pr = players[p].getComponent<Renderable>('Renderable')!;
      this.playerPositions.push({ pos: pt.position, radius: pr.radius });
    }
    // Default to first player for backward compat
    if (this.playerPositions.length > 0) {
      this.playerPos.copyFrom(this.playerPositions[0].pos);
      this.playerRadius = this.playerPositions[0].radius;
    }

    const entities = world.query('AIBehavior', 'Transform', 'Physics');

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const ai = entity.getComponent<AIBehavior>('AIBehavior')!;
      const transform = entity.getComponent<Transform>('Transform')!;
      const physics = entity.getComponent<Physics>('Physics')!;

      // Target nearest player for this AI entity
      this.selectNearestPlayer(transform.position);

      switch (ai.behavior) {
        case BehaviorType.Wander:
          this.wander(ai, transform, physics, dt);
          break;
        case BehaviorType.Flee:
          this.flee(ai, transform, physics, dt);
          break;
        case BehaviorType.Chase:
          this.chase(ai, transform, physics, dt);
          break;
        case BehaviorType.Orbit:
          this.orbit(ai, transform, physics, dt);
          break;
        case BehaviorType.ZipAcross:
          this.zipAcross(ai, transform, physics, dt);
          break;
        case BehaviorType.Patrol:
          this.wander(ai, transform, physics, dt);
          break;
        case BehaviorType.Flock:
          this.flock(entity.id, ai, transform, physics, entities, dt);
          break;
      }

      // Face direction of movement
      if (physics.velocity.magSq() > 1) {
        transform.rotation = physics.velocity.angle();
      }
    }
  }

  private selectNearestPlayer(entityPos: Vec2): void {
    if (this.playerPositions.length <= 1) return;
    let bestDist = Infinity;
    for (let i = 0; i < this.playerPositions.length; i++) {
      const d = entityPos.distSq(this.playerPositions[i].pos);
      if (d < bestDist) {
        bestDist = d;
        this.playerPos.copyFrom(this.playerPositions[i].pos);
        this.playerRadius = this.playerPositions[i].radius;
      }
    }
  }

  private wander(ai: AIBehavior, transform: Transform, physics: Physics, dt: number): void {
    ai.wanderTimer -= dt;
    if (ai.wanderTimer <= 0) {
      ai.wanderTarget = new Vec2(
        randomRange(CONFIG.BOUNDARY_PADDING, CONFIG.WORLD_WIDTH - CONFIG.BOUNDARY_PADDING),
        randomRange(CONFIG.BOUNDARY_PADDING, CONFIG.WORLD_HEIGHT - CONFIG.BOUNDARY_PADDING),
      );
      ai.wanderTimer = randomRange(1, CONFIG.AI_WANDER_CHANGE_INTERVAL * 2);
    }

    const toTarget = ai.wanderTarget.sub(transform.position);
    if (toTarget.magSq() > 100) {
      physics.acceleration = toTarget.normalize().mul(ai.speed * 3);
    }
  }

  private flee(ai: AIBehavior, transform: Transform, physics: Physics, dt: number): void {
    const toPlayer = this.playerPos.sub(transform.position);
    const dist = toPlayer.mag();

    if (dist < ai.fleeRadius) {
      // Flee away from player
      const fleeDir = transform.position.sub(this.playerPos).normalize();
      physics.acceleration = fleeDir.mul(ai.speed * 5);
    } else {
      // Wander when player is far
      this.wander(ai, transform, physics, dt);
    }
  }

  private chase(ai: AIBehavior, transform: Transform, physics: Physics, dt: number): void {
    const toPlayer = this.playerPos.sub(transform.position);
    const dist = toPlayer.mag();
    const renderable = transform as unknown as { radius?: number };

    if (dist < ai.perceptionRadius) {
      // Chase the player
      physics.acceleration = toPlayer.normalize().mul(ai.speed * 4);
    } else {
      this.wander(ai, transform, physics, dt);
    }
  }

  private orbit(ai: AIBehavior, transform: Transform, physics: Physics, dt: number): void {
    const toPlayer = this.playerPos.sub(transform.position);
    const dist = toPlayer.mag();
    const desiredDist = 150;

    if (dist < ai.perceptionRadius * 2) {
      // Orbit around the player
      const tangent = new Vec2(-toPlayer.y, toPlayer.x).normalize();
      const radial = toPlayer.normalize().mul((dist - desiredDist) * 2);
      physics.acceleration = tangent.mul(ai.speed * 3).add(radial);
    } else {
      this.wander(ai, transform, physics, dt);
    }
  }

  private zipAcross(ai: AIBehavior, transform: Transform, physics: Physics, dt: number): void {
    if (!ai.zipping) {
      // Idle, slow wander
      ai.wanderTimer -= dt;
      if (ai.wanderTimer <= 0) {
        // Start a zip!
        ai.zipping = true;
        ai.zipDirection = Vec2.random();
        ai.wanderTimer = randomRange(0.3, 0.8); // zip duration
      } else {
        physics.acceleration = physics.acceleration.mul(0.1);
      }
    } else {
      // Zipping fast
      physics.acceleration = ai.zipDirection.mul(ai.speed * 10);
      ai.wanderTimer -= dt;
      if (ai.wanderTimer <= 0) {
        ai.zipping = false;
        ai.wanderTimer = randomRange(1.5, 4); // cooldown before next zip
      }
    }
  }

  private flock(
    id: number,
    ai: AIBehavior,
    transform: Transform,
    physics: Physics,
    allEntities: import('../ecs/Entity.ts').Entity[],
    dt: number
  ): void {
    // Escape behavior if near player
    const toPlayer = this.playerPos.sub(transform.position);
    if (toPlayer.magSq() < ai.fleeRadius * ai.fleeRadius) {
      physics.acceleration = transform.position.sub(this.playerPos).normalize().mul(ai.speed * 4);
      return;
    }

    const separationDistSq = 900; // 30px
    const neighborDistSq = 6400; // 80px

    let count = 0;
    const separate = new Vec2(0, 0);
    const align = new Vec2(0, 0);
    const cohere = new Vec2(0, 0);

    for (let i = 0; i < allEntities.length; i++) {
      const other = allEntities[i];
      if (other.id === id) continue;

      const otherAi = other.getComponent<AIBehavior>('AIBehavior');
      if (!otherAi || otherAi.behavior !== BehaviorType.Flock) continue;

      const otherTransform = other.getComponent<Transform>('Transform');
      const otherPhysics = other.getComponent<Physics>('Physics');
      if (!otherTransform || !otherPhysics) continue;

      const diff = transform.position.sub(otherTransform.position);
      const distSq = diff.magSq();

      if (distSq > 0 && distSq < neighborDistSq) {
        // Separation (push away from too close)
        if (distSq < separationDistSq) {
          separate.addMut(diff.normalize().div(Math.sqrt(distSq)));
        }
        // Alignment (match velocity)
        align.addMut(otherPhysics.velocity);
        // Cohesion (move toward center of mass)
        cohere.addMut(otherTransform.position);
        count++;
      }
    }

    if (count > 0) {
      separate.divMut(count).normalizeMut().mulMut(ai.speed * 2);
      align.divMut(count).normalizeMut().mulMut(ai.speed);
      cohere.divMut(count).subMut(transform.position).normalizeMut().mulMut(ai.speed * 0.8);

      const flockForce = separate.add(align).add(cohere);
      physics.acceleration = flockForce.mul(2);
    } else {
      // If no neighbors, just wander
      this.wander(ai, transform, physics, dt);
    }
  }
}
