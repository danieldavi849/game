import { System } from '../ecs/System.ts';
import { World } from '../ecs/World.ts';
import { Transform } from '../components/Transform.ts';
import { Physics } from '../components/Physics.ts';
import { CONFIG } from '../utils/Constants.ts';

/** Integrates velocity, applies friction, clamps to world boundaries */
export class PhysicsSystem implements System {
  readonly priority = 10;

  update(world: World, dt: number): void {
    const entities = world.query('Transform', 'Physics');
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const transform = entity.getComponent<Transform>('Transform')!;
      const physics = entity.getComponent<Physics>('Physics')!;

      // Apply acceleration
      physics.velocity.addMut(physics.acceleration.mul(dt));

      // Clamp speed
      const speed = physics.velocity.mag();
      if (speed > physics.maxSpeed) {
        physics.velocity = physics.velocity.normalize().mul(physics.maxSpeed);
      }

      // Apply friction
      physics.velocity.mulMut(physics.friction);

      // Integrate position
      transform.position.x += physics.velocity.x * dt;
      transform.position.y += physics.velocity.y * dt;

      // Clear acceleration
      physics.acceleration.set(0, 0);

      // World boundary clamping
      const pad = CONFIG.BOUNDARY_PADDING;
      if (transform.position.x < pad) {
        transform.position.x = pad;
        physics.velocity.x *= -0.5;
      }
      if (transform.position.x > CONFIG.WORLD_WIDTH - pad) {
        transform.position.x = CONFIG.WORLD_WIDTH - pad;
        physics.velocity.x *= -0.5;
      }
      if (transform.position.y < pad) {
        transform.position.y = pad;
        physics.velocity.y *= -0.5;
      }
      if (transform.position.y > CONFIG.WORLD_HEIGHT - pad) {
        transform.position.y = CONFIG.WORLD_HEIGHT - pad;
        physics.velocity.y *= -0.5;
      }
    }
  }
}
