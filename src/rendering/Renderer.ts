/** Canvas abstraction for common draw operations */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  width: number = 0;
  height: number = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /** Resize canvas to fill viewport */
  resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  /** Get the raw canvas context */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /** Get the canvas element */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /** Clear the entire canvas */
  clear(color: string = '#000000'): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}
