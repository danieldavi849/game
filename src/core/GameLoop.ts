/** Manages the main game loop with fixed timestep delta and pause/resume */
export class GameLoop {
  private running = false;
  private rafId = 0;
  private lastTime = 0;
  private timeScale = 1.0;
  private updateFn: ((dt: number) => void) | null = null;
  private renderFn: (() => void) | null = null;

  /** Start the game loop */
  start(update: (dt: number) => void, render: () => void): void {
    this.updateFn = update;
    this.renderFn = render;
    this.running = true;
    this.lastTime = performance.now();
    this.tick(this.lastTime);
  }

  /** Stop the game loop */
  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  /** Pause (keeps loop alive but dt = 0) */
  pause(): void {
    this.running = false;
  }

  /** Resume after pause */
  resume(): void {
    this.running = true;
    this.lastTime = performance.now();
  }

  /** Set time scale (for slow-mo effects) */
  setTimeScale(scale: number): void {
    this.timeScale = scale;
  }

  /** Get current time scale */
  getTimeScale(): number {
    return this.timeScale;
  }

  private tick = (now: number): void => {
    this.rafId = requestAnimationFrame(this.tick);

    if (!this.running) {
      this.lastTime = now;
      this.renderFn?.();
      return;
    }

    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Clamp delta to avoid spiral of death
    if (dt > 0.1) dt = 0.1;

    dt *= this.timeScale;

    this.updateFn?.(dt);
    this.renderFn?.();
  };
}
