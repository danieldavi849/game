import { System } from '../ecs/System.ts';
import { World } from '../ecs/World.ts';
import { SpatialGrid } from '../core/SpatialGrid.ts';
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

/** Broadphase (SpatialGrid) + narrowphase (circle-circle) collision detection */
export class CollisionSystem implements System {
  readonly priority = 20;
  private grid: SpatialGrid;

  constructor(private eventBus: EventBus) {
    this.grid = new SpatialGrid(CONFIG.SPATIAL_GRID_CELL_SIZE);
  }

  update(world: World, dt: number): void {
    this.grid.clear();

    const collidables = world.query('Transform', 'Collider');

    // Broadphase: insert all into spatial grid
    for (let i = 0; i < collidables.length; i++) {
      const e = collidables[i];
      const t = e.getComponent<Transform>('Transform')!;
      const c = e.getComponent<Collider>('Collider')!;
      this.grid.insert(e.id, t.position.x, t.position.y, c.radius);
    }

    // Check player collisions specifically
    const players = world.query('PlayerControlled', 'Transform', 'Collider');
    if (players.length === 0) return;

    const player = players[0];
    const playerTransform = player.getComponent<Transform>('Transform')!;
    const playerCollider = player.getComponent<Collider>('Collider')!;
    const playerPhysics = player.getComponent<Physics>('Physics');
    const playerRenderable = player.getComponent<Renderable>('Renderable');
    const playerCtrl = player.getComponent<PlayerControlled>('PlayerControlled')!;

    const nearby = this.grid.query(
      playerTransform.position.x,
      playerTransform.position.y,
      playerCollider.radius + 100,
    );

    for (let i = 0; i < nearby.length; i++) {
      const otherId = nearby[i];
      if (otherId === player.id) continue;

      const other = world.getEntity(otherId);
      if (!other || !other.active) continue;

      const otherTransform = other.getComponent<Transform>('Transform')!;
      const otherCollider = other.getComponent<Collider>('Collider');
      if (!otherCollider) continue;

      // Circle-circle test
      const dist = playerTransform.position.dist(otherTransform.position);
      const minDist = playerCollider.radius + otherCollider.radius;

      if (dist < minDist) {
        // Consumable collision
        const consumable = other.getComponent<Consumable>('Consumable');
        if (consumable) {
          const playerRadius = playerRenderable ? playerRenderable.radius : playerCollider.radius;
          const otherRenderable = other.getComponent<Renderable>('Renderable');
          const otherRadius = otherRenderable ? otherRenderable.radius : otherCollider.radius;

          // Can only eat entities smaller than us (or within ratio)
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
          this.eventBus.emit(GameEvents.PLAYER_DAMAGED, {
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
