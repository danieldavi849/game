import * as PIXI from 'pixi.js';

/** Abstract wrapper around PIXI.Application */
export class Renderer {
  public app: PIXI.Application;

  constructor(private canvas: HTMLCanvasElement) {
    this.app = new PIXI.Application();
  }

  async init() {
    await this.app.init({
      canvas: this.canvas,
      resizeTo: window,
      backgroundColor: 0x050510,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true
    });
  }

  /** Get the PIXI Application instance */
  getApp(): PIXI.Application {
    return this.app;
  }

  /** Get the raw canvas element */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  get width(): number {
    return this.app.screen.width;
  }

  get height(): number {
    return this.app.screen.height;
  }

  resize(): void {
    this.app.resize();
  }

  /** Update the PIXI WebGL background clear color */
  setBackgroundColor(hex: string): void {
    const num = parseInt(hex.replace('#', ''), 16);
    (this.app.renderer as any).background.color = num;
  }
}
