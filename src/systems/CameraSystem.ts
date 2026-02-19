import { System } from '../ecs/System.ts';
import { World } from '../ecs/World.ts';
import { Camera } from '../core/Camera.ts';
import { EventBus } from '../core/EventBus.ts';
import { Transform } from '../components/Transform.ts';
import { Renderable } from '../components/Renderable.ts';
import { GameEvents } from '../types/index.ts';
import { clamp, mapRange } from '../utils/MathUtils.ts';
import { CONFIG } from '../utils/Constants.ts';

/** Follows player, adjusts zoom based on size, handles shake */
export class CameraSystem implements System {
  readonly priority = 45;

  constructor(
    private camera: Camera,
    private eventBus: EventBus,
  ) {
    this.eventBus.on(GameEvents.SCREEN_SHAKE, (data: unknown) => {
      const { intensity } = data as { intensity: number };
      this.camera.shake(intensity);
    });
  }

  update(world: World, dt: number): void {
    const players = world.query('PlayerControlled', 'Transform', 'Renderable');
    if (players.length === 0) return;

    const transform = players[0].getComponent<Transform>('Transform')!;
    const renderable = players[0].getComponent<Renderable>('Renderable')!;

    // Follow player
    this.camera.follow(transform.position, dt);

    // Zoom out as player grows
    const zoomTarget = clamp(
      mapRange(
        renderable.radius,
        CONFIG.PLAYER_MIN_RADIUS,
        CONFIG.PLAYER_MAX_RADIUS,
        1.2,
        0.6,
      ),
      CONFIG.CAMERA_MIN_ZOOM,
      CONFIG.CAMERA_MAX_ZOOM,
    );
    this.camera.setTargetZoom(zoomTarget);

    this.camera.updateZoom();
    this.camera.updateShake();
  }
}
