import { System } from '../ecs/System.ts';
import { World } from '../ecs/World.ts';
import { EventBus } from '../core/EventBus.ts';
import { InputManager } from '../core/InputManager.ts';
import { Camera } from '../core/Camera.ts';
import { Transform } from '../components/Transform.ts';
import { Physics } from '../components/Physics.ts';
import { PlayerControlled } from '../components/PlayerControlled.ts';
import { GameEvents } from '../types/index.ts';

/** Reads InputManager and applies movement to PlayerControlled entities */
export class InputSystem implements System {
  readonly priority = 0;
  private spaceWasDown = false;

  constructor(
    private input: InputManager,
    private camera: Camera,
    private eventBus: EventBus,
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
    physics.acceleration = moveDir.mul(player.speed * player.relicSpeedMult * 5);

    // Face toward mouse cursor
    const mouseScreen = this.input.getMousePosition();
    const mouseWorld = this.camera.screenToWorld(mouseScreen);
    const toMouse = mouseWorld.sub(transform.position);
    if (toMouse.magSq() > 1) {
      transform.rotation = toMouse.angle();
    }

    // Spacebar → fire active ability (detect just-pressed)
    const spaceDown = this.input.isKeyDown(' ');
    if (spaceDown && !this.spaceWasDown) {
      if (player.activeAbility && player.activeCooldown <= 0) {
        this.eventBus.emit(GameEvents.ACTIVE_ABILITY_USED, {
          playerId: entity.id,
          abilityId: player.activeAbility,
        });
        player.activeCooldown = player.activeMaxCooldown;
      }
    }
    this.spaceWasDown = spaceDown;

    void dt;
  }
}
