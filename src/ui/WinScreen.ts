import { EventBus } from '../core/EventBus.ts';
import { GameEvents } from '../types/index.ts';
import { easeOutCubic } from '../utils/MathUtils.ts';

/** Win screen overlay */
export class WinScreen {
  private visible = false;
  private fadeIn = 0;

  constructor(private eventBus: EventBus) {}

  /** Show the win screen */
  show(): void {
    this.visible = true;
    this.fadeIn = 0;
  }

  /** Hide */
  hide(): void {
    this.visible = false;
  }

  /** Whether showing */
  isVisible(): boolean {
    return this.visible;
  }

  /** Update animation */
  update(dt: number): void {
    if (!this.visible) return;
    this.fadeIn = Math.min(1, this.fadeIn + dt);
  }

  /** Handle click for restart */
  handleClick(x: number, y: number, screenWidth: number, screenHeight: number): boolean {
    if (!this.visible) return false;
    const btnW = 200;
    const btnH = 50;
    const btnX = screenWidth / 2 - btnW / 2;
    const btnY = screenHeight / 2 + 80;
    if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
      this.eventBus.emit(GameEvents.GAME_RESTART, {});
      return true;
    }
    return false;
  }

  /** Render win overlay */
  render(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
    if (!this.visible) return;

    const alpha = easeOutCubic(this.fadeIn);

    ctx.fillStyle = `rgba(0,10,20,${0.8 * alpha})`;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.font = 'bold 52px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#44ffaa';
    ctx.shadowColor = '#44ffaa';
    ctx.shadowBlur = 30;
    ctx.fillText('ASCENSION COMPLETE', screenWidth / 2, screenHeight / 2 - 40);

    ctx.shadowBlur = 0;
    ctx.font = '18px monospace';
    ctx.fillStyle = '#88ffcc';
    ctx.fillText('From particle to molecule — you have evolved.', screenWidth / 2, screenHeight / 2 + 10);
    ctx.fillText('The journey to life begins here...', screenWidth / 2, screenHeight / 2 + 40);

    // Play again button
    const btnW = 200;
    const btnH = 50;
    const btnX = screenWidth / 2 - btnW / 2;
    const btnY = screenHeight / 2 + 80;

    ctx.fillStyle = 'rgba(50,255,150,0.2)';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.strokeStyle = '#44ffaa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.stroke();
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('PLAY AGAIN', screenWidth / 2, btnY + 32);

    ctx.restore();
  }
}
