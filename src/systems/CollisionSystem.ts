import { System } from '../ecs/System.ts';
import { World } from '../ecs/World.ts';
import { Quadtree, QuadtreeEntity } from '../utils/Quadtree.ts';
import { EventBus } from '../core/EventBus.ts';
import { Transform } from '../components/Transform.ts';
import { Collider } from '../components/Collider.ts';
import { Physics } from '../components/Physics.ts';
import { Renderable } from '../components/Renderable.ts';
import { PlayerControlled } from '../components/PlayerControlled.ts';
import { Consumable } from '../components/Consumable.ts';
import { Hazard } from '../components/Hazard.ts';
import { GameEvents, CollisionLayer } from '../types/index.ts';
import { CONFIG } from '../utils/Constants.ts';

/** Broadphase (Quadtree) + narrowphase (circle-circle) collision detection */
export class CollisionSystem implements System {
  readonly priority = 20;

  constructor(private eventBus: EventBus) { }

  update(world: World, dt: number): void {
    const collidables = world.query('Transform', 'Collider');

    // Quadtree needs to encompass the entire bounds of our active simulation space
    const boundsSize = Math.max(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
    const qt = new Quadtree(0, 0, boundsSize, boundsSize, 5);

    // Broadphase: insert all into Quadtree
    for (let i = 0; i < collidables.length; i++) {
      const e = collidables[i];
      const t = e.getComponent<Transform>('Transform')!;
      const c = e.getComponent<Collider>('Collider')!;
      qt.insert({
        id: e.id,
        position: t.position.clone(),
        radius: c.radius,
        entity: e
      });
    }

    // Check collisions for ALL players (multiplayer-ready)
    const players = world.query('PlayerControlled', 'Transform', 'Collider');
    if (players.length === 0) return;

    for (let p = 0; p < players.length; p++) {
      const player = players[p];
      const playerTransform = player.getComponent<Transform>('Transform')!;
      const playerCollider = player.getComponent<Collider>('Collider')!;
      const playerPhysics = player.getComponent<Physics>('Physics');
      const playerRenderable = player.getComponent<Renderable>('Renderable');

      const searchRadius = playerCollider.radius + 100;
      const nearby = qt.queryRange(
        playerTransform.position.x,
        playerTransform.position.y,
        searchRadius,
      );

      for (let i = 0; i < nearby.length; i++) {
        const otherQtEntity = nearby[i];
        if (otherQtEntity.id === player.id) continue;

        const other = otherQtEntity.entity;
        if (!other || !other.active) continue;

        const otherTransform = other.getComponent<Transform>('Transform')!;
        const otherCollider = other.getComponent<Collider>('Collider');
        if (!otherCollider) continue;

        // Circle-circle test
        const distSq = playerTransform.position.distSq(otherTransform.position);
        const minDist = playerCollider.radius + otherCollider.radius;

        if (distSq < minDist * minDist) {
          // Consumable collision (food OR other players with Consumable)
          const consumable = other.getComponent<Consumable>('Consumable');
          if (consumable) {
            const playerRadius = playerRenderable ? playerRenderable.radius : playerCollider.radius;
            const otherRenderable = other.getComponent<Renderable>('Renderable');
            const otherRadius = otherRenderable ? otherRenderable.radius : otherCollider.radius;

            // Can only eat entities smaller than us (within size ratio)
            if (otherRadius <= playerRadius * (1 / CONFIG.CONSUME_SIZE_RATIO)) {
              this.eventBus.emit(GameEvents.ENTITY_CONSUMED, {
                consumerId: player.id,
                consumedId: other.id,
                massValue: consumable.massValue,
                energyValue: consumable.energyValue,
                cpValue: consumable.cpValue,
                entityType: consumable.entityType,
                position: otherTransform.position.clone(),
                respawns: consumable.respawns,
              });
            }
          }

          // Hazard collision
          const hazard = other.getComponent<Hazard>('Hazard');
          if (hazard) {
            // Check invincibility timer (from dashing or recent hits)
            const isInvincible = player.getComponent<PlayerControlled>('PlayerControlled')?.invincibilityTimer ?? 0;

            if (isInvincible <= 0) {
              this.eventBus.emit(GameEvents.PLAYER_DAMAGED, {
                playerId: player.id,
                damage: hazard.damage,
                knockbackForce: hazard.knockbackForce,
                position: otherTransform.position.clone(),
              });

              // Knockback
              if (playerPhysics) {
                const pushDir = playerTransform.position.sub(otherTransform.position).normalize();
                playerPhysics.velocity = pushDir.mul(hazard.knockbackForce);
              }
            }
          }
        }
      }
    }
  }
}
