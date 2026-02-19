import { World } from '../ecs/World.ts';
import { PlayerControlled } from '../components/PlayerControlled.ts';
import { Physics } from '../components/Physics.ts';
import { Transform } from '../components/Transform.ts';
import { TierManager } from '../tiers/TierManager.ts';
import { CONFIG } from '../utils/Constants.ts';

/** Debug stats overlay shown during gameplay when debug mode is active */
export class DebugOverlay {
  private enabled = false;
  private godMode = false;
  private fps: number[] = [];
  private lastTime = performance.now();

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  isGodMode(): boolean {
    return this.godMode;
  }

  toggleGodMode(): void {
    this.godMode = !this.godMode;
  }

  render(ctx: CanvasRenderingContext2D, world: World, tierManager: TierManager, screenWidth: number, _screenHeight: number): void {
    if (!this.enabled) return;

    // FPS tracking
    const now = performance.now();
    const frameDt = now - this.lastTime;
    this.lastTime = now;
    this.fps.push(1000 / frameDt);
    if (this.fps.length > 60) this.fps.shift();
    const avgFps = Math.round(this.fps.reduce((a, b) => a + b, 0) / this.fps.length);

    const players = world.query('PlayerControlled');
    const entities = world.getAll();
    const foodCount = world.query('Consumable').filter(e => !e.hasComponent('PlayerControlled')).length;
    const hazardCount = world.query('Hazard').length;

    const tier = tierManager.getCurrentTier();
    const tierIdx = tierManager.getTierIndex();

    // Panel background
    const panelX = screenWidth - 220;
    const panelY = 8;
    const panelW = 210;
    const panelH = this.godMode ? 195 : 180;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 6);
    ctx.fill();
    ctx.strokeStyle = '#ffaa33';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 6);
    ctx.stroke();

    // Header
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffaa33';
    ctx.fillText('DEBUG', panelX + 8, panelY + 16);

    ctx.font = '11px monospace';
    ctx.fillStyle = '#cccccc';

    let y = panelY + 32;
    const lineH = 15;
    const drawLine = (label: string, value: string, color = '#cccccc') => {
      ctx.fillStyle = '#888888';
      ctx.fillText(label, panelX + 8, y);
      ctx.fillStyle = color;
      ctx.fillText(value, panelX + 90, y);
      y += lineH;
    };

    drawLine('FPS:', `${avgFps}`, avgFps < 30 ? '#ff4444' : '#44ff44');
    drawLine('Entities:', `${entities.length}`);
    drawLine('Food:', `${foodCount}`);
    drawLine('Hazards:', `${hazardCount}`);
    drawLine('Tier:', `${tierIdx} (${tier.displayName})`, tier.displayColor);
    drawLine('Threshold:', `${tier.evolutionThreshold}`);

    if (players.length > 0) {
      const ctrl = players[0].getComponent<PlayerControlled>('PlayerControlled')!;
      const physics = players[0].getComponent<Physics>('Physics');
      const transform = players[0].getComponent<Transform>('Transform');
      drawLine('Evo Mass:', `${Math.floor(ctrl.evolutionMass)}`);
      drawLine('Speed:', `${Math.floor(ctrl.speed)}`);
      if (physics) {
        drawLine('Velocity:', `${Math.floor(physics.velocity.mag())}`);
      }
    }

    if (this.godMode) {
      ctx.fillStyle = '#ffaa33';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('GOD MODE ON', panelX + 8, y);
    }
  }
}
