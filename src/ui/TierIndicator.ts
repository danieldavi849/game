import { TierType } from '../types/index.ts';
import { CONFIG } from '../utils/Constants.ts';

/** Shows current tier name and visual indicator */
export class TierIndicator {
  private tierName: string = 'Subatomic';
  private tierColor: string = '#ff44ff';

  /** Set current tier display info */
  setTier(name: string, color: string): void {
    this.tierName = name;
    this.tierColor = color;
  }

  /** Render the tier indicator */
  render(ctx: CanvasRenderingContext2D, level: number = 1): void {
    const x = CONFIG.HUD_PADDING;
    const y = CONFIG.HUD_PADDING;

    // Tier badge
    ctx.font = 'bold 14px monospace';
    const text = `[ ${this.tierName.toUpperCase()} - LVL ${level} ]`;
    const metrics = ctx.measureText(text);

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(x - 4, y - 4, metrics.width + 12, 24, 4);
    ctx.fill();

    ctx.fillStyle = this.tierColor;
    ctx.textAlign = 'left';
    ctx.fillText(text, x, y + 14);
  }
}
