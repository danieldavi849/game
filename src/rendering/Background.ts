import { Camera } from '../core/Camera.ts';
import { BackgroundConfig } from '../types/index.ts';
import { hexToRgba } from '../utils/Color.ts';
import { CONFIG } from '../utils/Constants.ts';
import { Vec2 } from '../utils/Vec2.ts';

interface AmbientParticle {
  x: number;
  y: number;
  radius: number;
  speed: number;
  angle: number;
  alpha: number;
}

/** Per-tier background: scrolling grid, ambient particles, color palette */
export class Background {
  private config: BackgroundConfig = {
    baseColor: '#050510',
    gridColor: '#111133',
    gridSpacing: 80,
    particleDensity: 60,
    particleColor: '#334466',
  };
  private particles: AmbientParticle[] = [];

  /** Set background configuration (on tier change) */
  setConfig(config: BackgroundConfig): void {
    this.config = config;
    this.initParticles();
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.config.particleDensity; i++) {
      this.particles.push({
        x: Math.random() * CONFIG.WORLD_WIDTH,
        y: Math.random() * CONFIG.WORLD_HEIGHT,
        radius: Math.random() * 2 + 0.5,
        speed: Math.random() * 10 + 5,
        angle: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.3 + 0.1,
      });
    }
  }

  /** Update ambient particle positions */
  update(dt: number): void {
    for (const p of this.particles) {
      p.x += Math.cos(p.angle) * p.speed * dt;
      p.y += Math.sin(p.angle) * p.speed * dt;
      // Wrap around world
      if (p.x < 0) p.x += CONFIG.WORLD_WIDTH;
      if (p.x > CONFIG.WORLD_WIDTH) p.x -= CONFIG.WORLD_WIDTH;
      if (p.y < 0) p.y += CONFIG.WORLD_HEIGHT;
      if (p.y > CONFIG.WORLD_HEIGHT) p.y -= CONFIG.WORLD_HEIGHT;
    }
  }

  /** Render the background */
  render(ctx: CanvasRenderingContext2D, camera: Camera, screenWidth: number, screenHeight: number): void {
    // Base color
    ctx.fillStyle = this.config.baseColor;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    const viewBounds = camera.getViewBounds();

    // Grid
    ctx.strokeStyle = this.config.gridColor;
    ctx.lineWidth = 0.5;

    const spacing = this.config.gridSpacing;
    const startX = Math.floor(viewBounds.left / spacing) * spacing;
    const startY = Math.floor(viewBounds.top / spacing) * spacing;

    ctx.beginPath();
    for (let x = startX; x <= viewBounds.right; x += spacing) {
      const screenX = camera.worldToScreen(new Vec2(x, 0)).x;
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, screenHeight);
    }
    for (let y = startY; y <= viewBounds.bottom; y += spacing) {
      const screenY = camera.worldToScreen(new Vec2(0, y)).y;
      ctx.moveTo(0, screenY);
      ctx.lineTo(screenWidth, screenY);
    }
    ctx.stroke();

    // Ambient particles
    for (const p of this.particles) {
      if (
        p.x < viewBounds.left - 10 || p.x > viewBounds.right + 10 ||
        p.y < viewBounds.top - 10 || p.y > viewBounds.bottom + 10
      ) continue;

      const screenPos = camera.worldToScreen(new Vec2(p.x, p.y));
      const screenR = camera.worldToScreenScale(p.radius);
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, screenR, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(this.config.particleColor, p.alpha);
      ctx.fill();
    }

    // World boundary
    const tl = camera.worldToScreen(new Vec2(0, 0));
    const br = camera.worldToScreen(new Vec2(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT));
    ctx.strokeStyle = hexToRgba('#ff3333', 0.3);
    ctx.lineWidth = 2;
    ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  }
}
