import { System } from '../ecs/System.ts';
import { World } from '../ecs/World.ts';
import { EventBus } from '../core/EventBus.ts';
import { InputManager } from '../core/InputManager.ts';
import { Camera } from '../core/Camera.ts';
import { Transform } from '../components/Transform.ts';
import { Physics } from '../components/Physics.ts';
import { PlayerControlled } from '../components/PlayerControlled.ts';
import { GameEvents } from '../types/index.ts';
import { Vec2 } from '../utils/Vec2.ts';

/** Reads InputManager and applies movement to PlayerControlled entities */
export class InputSystem implements System {
  readonly priority = 0;
  private dashButtonWasDown = false;

  constructor(
    private input: InputManager,
    private camera: Camera,
    private eventBus: EventBus,
  ) { }

  update(world: World, dt: number): void {
    const players = world.query('PlayerControlled', 'Transform', 'Physics');
    if (players.length === 0) return;

    const entity = players[0];
    const transform = entity.getComponent<Transform>('Transform')!;
    const physics = entity.getComponent<Physics>('Physics')!;
    const player = entity.getComponent<PlayerControlled>('PlayerControlled')!;

    // Movement from WASD
    let moveDir = this.input.getMovementVector();

    // If dashing, override moveDir to be the dash direction and ignore WASD
    if (player.dashTimer > 0) {
      if (physics.velocity.magSq() > 0.1) {
        moveDir = physics.velocity.normalize();
      } else {
        const angle = transform.rotation;
        moveDir = new Vec2(Math.cos(angle), Math.sin(angle));
      }
      physics.acceleration = moveDir.mul(player.speed * player.relicSpeedMult * 15);
    } else {
      physics.acceleration = moveDir.mul(player.speed * player.relicSpeedMult * 5);
    }

    // Face toward mouse cursor
    const mouseScreen = this.input.getMousePosition();
    const mouseWorld = this.camera.screenToWorld(mouseScreen);
    const toMouse = mouseWorld.sub(transform.position);
    if (toMouse.magSq() > 1) {
      transform.rotation = toMouse.angle();
    }

    // Spacebar/Shift → fire active ability or dash
    const dashButtonDown = this.input.isKeyDown(' ') || this.input.isKeyDown('Shift');

    if (dashButtonDown && !this.dashButtonWasDown) {
      if (player.activeAbility && player.activeCooldown <= 0) {
        this.eventBus.emit(GameEvents.ACTIVE_ABILITY_USED, {
          playerId: entity.id,
          abilityId: player.activeAbility,
        });
        player.activeCooldown = player.activeMaxCooldown;
      } else if (!player.activeAbility && player.dashCooldown <= 0 && player.dashTimer <= 0) {
        // Universal Dash
        player.dashTimer = 0.15; // 150ms of dash
        player.dashCooldown = 2.0; // 2s cooldown

        // Grant i-frames
        player.invincibilityTimer = Math.max(player.invincibilityTimer, 0.25);

        this.eventBus.emit(GameEvents.SCREEN_SHAKE, { intensity: 3 });
      }
    }
    this.dashButtonWasDown = dashButtonDown;

    // Update timers
    if (player.dashTimer > 0) player.dashTimer = Math.max(0, player.dashTimer - dt);
    if (player.dashCooldown > 0) player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  }
}
