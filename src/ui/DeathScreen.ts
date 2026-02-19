import { EventBus } from '../core/EventBus.ts';
import { GameEvents } from '../types/index.ts';
import { easeOutCubic } from '../utils/MathUtils.ts';

/** Death overlay with restart prompt */
export class DeathScreen {
  private visible = false;
  private fadeIn = 0;

  constructor(private eventBus: EventBus) {}

  /** Show the death screen */
  show(): void {
    this.visible = true;
    this.fadeIn = 0;
  }

  /** Hide the death screen */
  hide(): void {
    this.visible = false;
    this.fadeIn = 0;
  }

  /** Whether the screen is showing */
  isVisible(): boolean {
    return this.visible;
  }

  /** Update animation */
  update(dt: number): void {
    if (!this.visible) return;
    this.fadeIn = Math.min(1, this.fadeIn + dt * 1.5);
  }

  /** Handle click for restart */
  handleClick(x: number, y: number, screenWidth: number, screenHeight: number): boolean {
    if (!this.visible) return false;

    const btnW = 200;
    const btnH = 50;
    const btnX = screenWidth / 2 - btnW / 2;
    const btnY = screenHeight / 2 + 40;

    if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
      this.eventBus.emit(GameEvents.GAME_RESTART, {});
      return true;
    }
    return false;
  }

  /** Render the death overlay */
  render(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
    if (!this.visible) return;

    const alpha = easeOutCubic(this.fadeIn);

    // Overlay
    ctx.fillStyle = `rgba(20,0,0,${0.7 * alpha})`;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    // "DISSOLVED" text
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff3333';
    ctx.fillText('DISSOLVED', screenWidth / 2, screenHeight / 2 - 30);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#ff9999';
    ctx.fillText('Your particles scattered into the void...', screenWidth / 2, screenHeight / 2 + 5);

    // Restart button
    const btnW = 200;
    const btnH = 50;
    const btnX = screenWidth / 2 - btnW / 2;
    const btnY = screenHeight / 2 + 40;

    ctx.fillStyle = 'rgba(255,50,50,0.3)';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fill();

    ctx.strokeStyle = '#ff5555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.stroke();

    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('RESTART', screenWidth / 2, btnY + 32);

    ctx.restore();
  }
}
