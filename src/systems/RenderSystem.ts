import { System } from '../ecs/System.ts';
import { World } from '../ecs/World.ts';
import { Camera } from '../core/Camera.ts';
import { Transform } from '../components/Transform.ts';
import { Renderable } from '../components/Renderable.ts';
import { PlayerControlled } from '../components/PlayerControlled.ts';
import { hexToRgba } from '../utils/Color.ts';

/** Renders all Renderable entities to the canvas */
export class RenderSystem implements System {
  readonly priority = 100;
  private gameTime: number = 0;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private camera: Camera,
  ) {}

  update(world: World, dt: number): void {
    this.gameTime += dt;
  }

  render(world: World, ctx: CanvasRenderingContext2D): void {
    const viewBounds = this.camera.getViewBounds();
    const entities = world.query('Transform', 'Renderable');

    // Sort by radius so smaller entities render on top
    entities.sort((a, b) => {
      const ra = a.getComponent<Renderable>('Renderable')!.radius;
      const rb = b.getComponent<Renderable>('Renderable')!.radius;
      return rb - ra;
    });

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const transform = entity.getComponent<Transform>('Transform')!;
      const renderable = entity.getComponent<Renderable>('Renderable')!;
      const isPlayer = entity.hasComponent('PlayerControlled');

      // Frustum culling
      const margin = renderable.radius + (renderable.glowRadius || 0) + 50;
      if (
        transform.position.x + margin < viewBounds.left ||
        transform.position.x - margin > viewBounds.right ||
        transform.position.y + margin < viewBounds.top ||
        transform.position.y - margin > viewBounds.bottom
      ) {
        continue;
      }

      const screenPos = this.camera.worldToScreen(transform.position);
      const screenRadius = this.camera.worldToScreenScale(renderable.radius);

      if (screenRadius < 0.5) continue;

      ctx.save();
      ctx.globalAlpha = renderable.opacity;

      // Glow effect
      if (renderable.glowColor && renderable.glowRadius > 0) {
        const glowScreenR = this.camera.worldToScreenScale(renderable.glowRadius);
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(
          screenPos.x, screenPos.y, screenRadius * 0.3,
          screenPos.x, screenPos.y, screenRadius + glowScreenR,
        );
        gradient.addColorStop(0, hexToRgba(renderable.glowColor, 0.4));
        gradient.addColorStop(1, hexToRgba(renderable.glowColor, 0));
        ctx.fillStyle = gradient;
        ctx.arc(screenPos.x, screenPos.y, screenRadius + glowScreenR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pulse effect
      let drawRadius = screenRadius;
      if (renderable.pulseSpeed > 0) {
        const pulse = Math.sin(this.gameTime * renderable.pulseSpeed) * renderable.pulseAmount;
        drawRadius += this.camera.worldToScreenScale(pulse);
      }

      // Draw shape
      ctx.beginPath();
      switch (renderable.shape) {
        case 'circle':
          ctx.arc(screenPos.x, screenPos.y, drawRadius, 0, Math.PI * 2);
          ctx.fillStyle = renderable.color;
          ctx.fill();
          break;
        case 'triangle':
          this.drawTriangle(ctx, screenPos.x, screenPos.y, drawRadius, transform.rotation);
          ctx.fillStyle = renderable.color;
          ctx.fill();
          break;
        case 'diamond':
          this.drawDiamond(ctx, screenPos.x, screenPos.y, drawRadius, transform.rotation);
          ctx.fillStyle = renderable.color;
          ctx.fill();
          break;
        case 'ring':
          ctx.arc(screenPos.x, screenPos.y, drawRadius, 0, Math.PI * 2);
          ctx.strokeStyle = renderable.color;
          ctx.lineWidth = Math.max(1, drawRadius * 0.2);
          ctx.stroke();
          break;
      }

      // Player-specific: inner glow + direction indicator
      if (isPlayer) {
        const player = entity.getComponent<PlayerControlled>('PlayerControlled')!;

        // Inner radial gradient for player body
        const innerGrad = ctx.createRadialGradient(
          screenPos.x, screenPos.y, 0,
          screenPos.x, screenPos.y, drawRadius,
        );
        innerGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
        innerGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, drawRadius, 0, Math.PI * 2);
        ctx.fillStyle = innerGrad;
        ctx.fill();

        // Shield ring (atomic tier)
        if (player.maxShieldHP > 0) {
          const shieldRatio = player.shieldHP / player.maxShieldHP;
          ctx.beginPath();
          ctx.arc(screenPos.x, screenPos.y, drawRadius + 6, 0, Math.PI * 2 * shieldRatio);
          ctx.strokeStyle = hexToRgba('#44aaff', 0.7);
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Direction indicator
        const dirX = Math.cos(transform.rotation) * (drawRadius + 5);
        const dirY = Math.sin(transform.rotation) * (drawRadius + 5);
        ctx.beginPath();
        ctx.arc(screenPos.x + dirX, screenPos.y + dirY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawTriangle(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, r: number, angle: number,
  ): void {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = angle + (Math.PI * 2 * i) / 3 - Math.PI / 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  private drawDiamond(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, r: number, angle: number,
  ): void {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = angle + (Math.PI * 2 * i) / 4;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
}
