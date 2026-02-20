import * as PIXI from 'pixi.js';
import { Camera } from '../core/Camera.ts';
import { BackgroundConfig } from '../types/index.ts';
import { CONFIG } from '../utils/Constants.ts';
import { Vec2 } from '../utils/Vec2.ts';

interface AmbientParticle {
  x: number;
  y: number;
  radius: number;
  speed: number;
  angle: number;
  alpha: number;
  graphics?: PIXI.Graphics;
}

/** Per-tier background using PIXI.js */
export class Background {
  private config: BackgroundConfig = {
    baseColor: '#050510',
    gridColor: '#111133',
    gridSpacing: 80,
    particleDensity: 60,
    particleColor: '#334466',
  };
  private particles: AmbientParticle[] = [];

  private stage?: PIXI.Container;
  private gridGraphics?: PIXI.Graphics;
  private boundsGraphics?: PIXI.Graphics;

  /** Initialize PIXI elements */
  init(stage: PIXI.Container): void {
    this.stage = stage;
    this.gridGraphics = new PIXI.Graphics();
    this.gridGraphics.zIndex = -10; // Behind entities
    this.boundsGraphics = new PIXI.Graphics();
    this.boundsGraphics.zIndex = -5;

    this.stage.addChild(this.gridGraphics);
    this.stage.addChild(this.boundsGraphics);

    this.initParticles();
  }

  /** Set background configuration (on tier change) */
  setConfig(config: BackgroundConfig): void {
    this.config = config;

    // Update renderer background color if we have access to the app, 
    // but PIXI app handles it. We'll leave the base color handling to the Renderer init 
    // or update it elsewhere if needed.

    this.initParticles();
  }

  private initParticles(): void {
    if (!this.stage) return;

    // Cleanup old particle graphics
    for (const p of this.particles) {
      if (p.graphics && p.graphics.parent) {
        p.graphics.parent.removeChild(p.graphics);
        p.graphics.destroy();
      }
    }

    this.particles = [];
    const colorNum = parseInt(this.config.particleColor.replace('#', ''), 16);

    for (let i = 0; i < this.config.particleDensity; i++) {
      const radius = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.3 + 0.1;

      const gfx = new PIXI.Graphics();
      gfx.circle(0, 0, radius);
      gfx.fill({ color: colorNum, alpha });
      gfx.zIndex = -8;
      this.stage.addChild(gfx);

      this.particles.push({
        x: Math.random() * CONFIG.WORLD_WIDTH,
        y: Math.random() * CONFIG.WORLD_HEIGHT,
        radius,
        speed: Math.random() * 10 + 5,
        angle: Math.random() * Math.PI * 2,
        alpha,
        graphics: gfx
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

  /** Render the background via PIXI graphics updates */
  render(camera: Camera, screenWidth: number, screenHeight: number): void {
    if (!this.gridGraphics || !this.boundsGraphics) return;

    const viewBounds = camera.getViewBounds();

    // 1. Update Grid
    this.gridGraphics.clear();
    const gridColorNum = parseInt(this.config.gridColor.replace('#', ''), 16);
    this.gridGraphics.setStrokeStyle({ color: gridColorNum, width: 0.5 });

    const spacing = this.config.gridSpacing;
    const startX = Math.floor(viewBounds.left / spacing) * spacing;
    const startY = Math.floor(viewBounds.top / spacing) * spacing;

    for (let x = startX; x <= viewBounds.right; x += spacing) {
      const screenX = camera.worldToScreen(new Vec2(x, 0)).x;
      this.gridGraphics.moveTo(screenX, 0);
      this.gridGraphics.lineTo(screenX, screenHeight);
    }
    for (let y = startY; y <= viewBounds.bottom; y += spacing) {
      const screenY = camera.worldToScreen(new Vec2(0, y)).y;
      this.gridGraphics.moveTo(0, screenY);
      this.gridGraphics.lineTo(screenWidth, screenY);
    }
    this.gridGraphics.stroke();

    // 2. Update Ambient Particles
    const baseScale = camera.worldToScreenScale(1);
    for (const p of this.particles) {
      if (!p.graphics) continue;

      if (
        p.x < viewBounds.left - 10 || p.x > viewBounds.right + 10 ||
        p.y < viewBounds.top - 10 || p.y > viewBounds.bottom + 10
      ) {
        p.graphics.visible = false;
        continue;
      }

      p.graphics.visible = true;
      const screenPos = camera.worldToScreen(new Vec2(p.x, p.y));
      p.graphics.x = screenPos.x;
      p.graphics.y = screenPos.y;
      p.graphics.scale.set(baseScale);
    }

    // 3. Update World Boundary
    this.boundsGraphics.clear();
    const tl = camera.worldToScreen(new Vec2(0, 0));
    const br = camera.worldToScreen(new Vec2(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT));

    // Draw boundary rectangle
    this.boundsGraphics.rect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    this.boundsGraphics.stroke({ color: 0xff3333, alpha: 0.3, width: 2 });
  }
}
