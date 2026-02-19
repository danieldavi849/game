import { System } from '../ecs/System.ts';
import { World } from '../ecs/World.ts';
import { InputManager } from '../core/InputManager.ts';
import { Camera } from '../core/Camera.ts';
import { Transform } from '../components/Transform.ts';
import { Physics } from '../components/Physics.ts';
import { PlayerControlled } from '../components/PlayerControlled.ts';

/** Reads InputManager and applies movement to PlayerControlled entities */
export class InputSystem implements System {
  readonly priority = 0;

  constructor(
    private input: InputManager,
    private camera: Camera,
  ) {}

  update(world: World, dt: number): void {
    const players = world.query('PlayerControlled', 'Transform', 'Physics');
    if (players.length === 0) return;

    const entity = players[0];
    const transform = entity.getComponent<Transform>('Transform')!;
    const physics = entity.getComponent<Physics>('Physics')!;
    const player = entity.getComponent<PlayerControlled>('PlayerControlled')!;

    // Movement from WASD
    const moveDir = this.input.getMovementVector();
    physics.acceleration = moveDir.mul(player.speed * 5);

    // Face toward mouse cursor
    const mouseScreen = this.input.getMousePosition();
    const mouseWorld = this.camera.screenToWorld(mouseScreen);
    const toMouse = mouseWorld.sub(transform.position);
    if (toMouse.magSq() > 1) {
      transform.rotation = toMouse.angle();
    }
  }
}
