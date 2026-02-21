import { World } from '../ecs/World.ts';
import { Transform } from '../components/Transform.ts';
import { Renderable } from '../components/Renderable.ts';
import { PlayerControlled } from '../components/PlayerControlled.ts';
import { CONFIG } from '../utils/Constants.ts';
import { hexToRgba } from '../utils/Color.ts';

/** Corner minimap showing entity positions */
export class Minimap {
  private size: number;
  private x: number = 0;
  private y: number = 0;

  constructor(size: number = CONFIG.MINIMAP_SIZE) {
    this.size = size;
  }

  /** Update minimap size */
  setSize(size: number): void {
    this.size = size;
  }

  /** Render the minimap */
  render(ctx: CanvasRenderingContext2D, world: World, screenWidth: number, screenHeight: number): void {
    this.x = screenWidth - this.size - CONFIG.MINIMAP_PADDING;
    this.y = screenHeight - this.size - CONFIG.MINIMAP_PADDING;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.size, this.size, 4);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.size, this.size, 4);
    ctx.stroke();

    const scaleX = this.size / CONFIG.WORLD_WIDTH;
    const scaleY = this.size / CONFIG.WORLD_HEIGHT;

    // Draw entities as dots
    const entities = world.query('Transform', 'Renderable');
    for (const entity of entities) {
      if (entity.hasComponent('Particle')) continue;
      const t = entity.getComponent<Transform>('Transform')!;
      const r = entity.getComponent<Renderable>('Renderable')!;
      const isPlayer = entity.hasComponent('PlayerControlled');

      const dotX = this.x + t.position.x * scaleX;
      const dotY = this.y + t.position.y * scaleY;
      const dotR = isPlayer ? 3 : 1;

      ctx.fillStyle = isPlayer ? '#ffffff' : hexToRgba(r.color, 0.6);
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
