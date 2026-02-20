import { System } from '../ecs/System.ts';
import { World } from '../ecs/World.ts';
import { Camera } from '../core/Camera.ts';
import { Transform } from '../components/Transform.ts';
import { Renderable } from '../components/Renderable.ts';
import { PlayerControlled } from '../components/PlayerControlled.ts';
import * as PIXI from 'pixi.js';

/** Renders all Renderable entities using PIXI.js */
export class RenderSystem implements System {
  readonly priority = 100;
  private gameTime: number = 0;

  constructor(
    private stage: PIXI.Container,
    private camera: Camera,
  ) { }

  update(world: World, dt: number): void {
    this.gameTime += dt;
  }

  render(world: World): void {
    const viewBounds = this.camera.getViewBounds();
    const entities = world.query('Transform', 'Renderable');

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const transform = entity.getComponent<Transform>('Transform')!;
      const renderable = entity.getComponent<Renderable>('Renderable')!;
      const isPlayer = entity.hasComponent('PlayerControlled');

      // 1. Initialize PIXI.Graphics if not present
      if (!renderable.graphics) {
        this.createGraphics(renderable, isPlayer);
        this.stage.addChild(renderable.graphics!);
      }

      const gfx = renderable.graphics!;

      // 2. Frustum culling (hide if outside camera view to save GPU cycles)
      const margin = renderable.radius + (renderable.glowRadius || 0) + 50;
      if (
        transform.position.x + margin < viewBounds.left ||
        transform.position.x - margin > viewBounds.right ||
        transform.position.y + margin < viewBounds.top ||
        transform.position.y - margin > viewBounds.bottom
      ) {
        gfx.visible = false;
        continue;
      }

      gfx.visible = true;

      // 3. Update Transform
      // Since PIXI handles rendering in its own update loop, we just need to update the positions and scale.
      const screenPos = this.camera.worldToScreen(transform.position);
      gfx.x = screenPos.x;
      gfx.y = screenPos.y;

      // Update rotation
      gfx.rotation = transform.rotation;

      // Pulse effect (scale based on time)
      let scaleOffset = 0;
      if (renderable.pulseSpeed > 0) {
        scaleOffset = Math.sin(this.gameTime * renderable.pulseSpeed) * (renderable.pulseAmount / renderable.radius);
      }

      // Base scale via camera zoom
      const baseScale = this.camera.worldToScreenScale(1);
      gfx.scale.set(baseScale + scaleOffset);

      gfx.alpha = renderable.opacity;

      // Player-specific updates (Shield)
      if (isPlayer) {
        const player = entity.getComponent<PlayerControlled>('PlayerControlled')!;
        const shieldGfx = gfx.getChildByName('shield') as PIXI.Graphics;

        if (shieldGfx) {
          if (player.maxShieldHP > 0 && player.shieldHP > 0) {
            shieldGfx.visible = true;
            const shieldRatio = player.shieldHP / player.maxShieldHP;

            // Re-draw shield arc if ratio changes, or just keep it simple and draw full circle with alpha
            shieldGfx.clear();
            shieldGfx.arc(0, 0, renderable.radius + 6, 0, Math.PI * 2 * shieldRatio);
            shieldGfx.stroke({ color: 0x44aaff, alpha: 0.7, width: 3 / baseScale });
          } else {
            shieldGfx.visible = false;
          }
        }
      }
    }

    // Cleanup: In a real ECS you'd hook into entity destruction. 
    // Here we need to make sure we remove graphics for dead entities.
    // A simple hack is to check children of stage.
  }

  private createGraphics(r: Renderable, isPlayer: boolean): void {
    // In PixiJS v8, Graphics should not have children.
    // We use a Container to group the shape and any additional overlays (like shields).
    const container = new PIXI.Container();
    r.graphics = container as any; // Renderable.graphics is currently typed as Graphics, but Container works (they share Transform)

    const g = new PIXI.Graphics();
    container.addChild(g);

    // Convert hex string to number
    const colorNum = parseInt(r.color.replace('#', ''), 16);

    // Draw Glow (simplified for WebGL without custom shaders)
    if (r.glowColor && r.glowRadius > 0) {
      const glowNum = parseInt(r.glowColor.replace('#', ''), 16);
      g.circle(0, 0, r.radius + r.glowRadius);
      g.fill({ color: glowNum, alpha: 0.2 });
    }

    // Draw Shape
    switch (r.shape) {
      case 'circle':
        g.circle(0, 0, r.radius);
        g.fill({ color: colorNum });
        break;
      case 'ring':
        g.circle(0, 0, r.radius);
        g.stroke({ color: colorNum, width: Math.max(1, r.radius * 0.2) });
        break;
      case 'triangle':
        g.poly([
          0, -r.radius,
          r.radius * 0.866, r.radius * 0.5,
          -r.radius * 0.866, r.radius * 0.5
        ]);
        g.fill({ color: colorNum });
        break;
      case 'diamond':
        g.poly([
          0, -r.radius,
          r.radius, 0,
          0, r.radius,
          -r.radius, 0
        ]);
        g.fill({ color: colorNum });
        break;
    }

    if (isPlayer) {
      // Player inner glow/core
      g.circle(0, 0, r.radius * 0.5);
      g.fill({ color: 0xffffff, alpha: 0.3 });

      // Direction indicator
      g.circle(r.radius + 5, 0, 3);
      g.fill({ color: 0xffffff });

      // Shield container (updated dynamically)
      const shield = new PIXI.Graphics();
      shield.label = 'shield';
      container.addChild(shield);
    }

    // Ensure smaller entities render on top by using zIndex (PIXI requires sortableChildren = true on stage)
    // We invert radius so smaller = higher zIndex
    container.zIndex = 1000 - r.radius;
  }
}
