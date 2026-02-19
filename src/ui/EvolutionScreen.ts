import { easeOutCubic, easeInCubic } from '../utils/MathUtils.ts';

/** Dramatic evolution transition overlay */
export class EvolutionScreen {
  private visible = false;
  private phase: 'in' | 'hold' | 'out' = 'in';
  private timer = 0;
  private tierName: string = '';
  private tierColor: string = '#ffffff';
  private fromName: string = '';
  private onComplete: (() => void) | null = null;

  private readonly PHASE_IN = 0.6;
  private readonly PHASE_HOLD = 1.2;
  private readonly PHASE_OUT = 0.7;

  /** Start evolution transition */
  show(fromName: string, toName: string, color: string, onComplete: () => void): void {
    this.visible = true;
    this.phase = 'in';
    this.timer = 0;
    this.fromName = fromName;
    this.tierName = toName;
    this.tierColor = color;
    this.onComplete = onComplete;
  }

  /** Whether the screen is showing */
  isVisible(): boolean {
    return this.visible;
  }

  /** Update animation */
  update(dt: number): void {
    if (!this.visible) return;

    this.timer += dt;

    switch (this.phase) {
      case 'in':
        if (this.timer >= this.PHASE_IN) {
          this.phase = 'hold';
          this.timer = 0;
        }
        break;
      case 'hold':
        if (this.timer >= this.PHASE_HOLD) {
          this.phase = 'out';
          this.timer = 0;
          this.onComplete?.();
        }
        break;
      case 'out':
        if (this.timer >= this.PHASE_OUT) {
          this.visible = false;
        }
        break;
    }
  }

  /** Render the evolution overlay */
  render(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
    if (!this.visible) return;

    let overlayAlpha = 0;
    let textAlpha = 0;

    switch (this.phase) {
      case 'in':
        overlayAlpha = easeOutCubic(this.timer / this.PHASE_IN);
        textAlpha = easeOutCubic(this.timer / this.PHASE_IN);
        break;
      case 'hold':
        overlayAlpha = 1;
        textAlpha = 1;
        break;
      case 'out':
        overlayAlpha = 1 - easeInCubic(this.timer / this.PHASE_OUT);
        textAlpha = 1 - easeInCubic(this.timer / this.PHASE_OUT);
        break;
    }

    // Flash overlay
    ctx.fillStyle = `rgba(255,255,255,${overlayAlpha * 0.3})`;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    // Dark overlay
    ctx.fillStyle = `rgba(0,0,0,${overlayAlpha * 0.5})`;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    // Text
    ctx.save();
    ctx.globalAlpha = textAlpha;

    // "EVOLUTION" title
    ctx.font = 'bold 56px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.tierColor;
    ctx.shadowColor = this.tierColor;
    ctx.shadowBlur = 20;
    ctx.fillText('EVOLUTION', screenWidth / 2, screenHeight / 2 - 30);

    // Tier transition text
    ctx.shadowBlur = 0;
    ctx.font = '20px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(
      `${this.fromName}  →  ${this.tierName}`,
      screenWidth / 2,
      screenHeight / 2 + 20,
    );

    ctx.restore();
  }
}
