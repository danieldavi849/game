import { hexToRgba } from '../utils/Color.ts';

/** Reusable progress bar renderer */
export class ProgressBar {
  constructor(
    private x: number,
    private y: number,
    private width: number,
    private height: number,
    private fgColor: string = '#44ff44',
    private bgColor: string = '#222222',
    private label: string = '',
  ) {}

  /** Render the progress bar */
  render(ctx: CanvasRenderingContext2D, value: number, max: number): void {
    const ratio = Math.max(0, Math.min(1, value / max));

    // Background
    ctx.fillStyle = this.bgColor;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 4);
    ctx.fill();

    // Foreground
    if (ratio > 0) {
      ctx.fillStyle = this.fgColor;
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.width * ratio, this.height, 4);
      ctx.fill();

      // Shine
      const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
      grad.addColorStop(0, 'rgba(255,255,255,0.15)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.width * ratio, this.height, 4);
      ctx.fill();
    }

    // Border
    ctx.strokeStyle = hexToRgba('#ffffff', 0.2);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 4);
    ctx.stroke();

    // Label
    if (this.label) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(this.label, this.x + 4, this.y + this.height - 3);
    }

    // Value text
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.floor(value)}/${Math.floor(max)}`, this.x + this.width - 4, this.y + this.height - 3);
  }

  /** Update position */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /** Update bar dimensions */
  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  /** Update foreground color */
  setFgColor(color: string): void {
    this.fgColor = color;
  }

  /** Update background color */
  setBgColor(color: string): void {
    this.bgColor = color;
  }
}
