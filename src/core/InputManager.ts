import { Vec2 } from '../utils/Vec2.ts';

/** Manages keyboard and mouse input state */
export class InputManager {
  private keys: Set<string> = new Set();
  private mousePos: Vec2 = new Vec2(0, 0);
  private mouseDown = false;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    canvas.addEventListener('mousemove', (e) => {
      this.mousePos.set(e.clientX, e.clientY);
    });
    canvas.addEventListener('mousedown', () => {
      this.mouseDown = true;
    });
    canvas.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });
    // Prevent context menu on right click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Check if a key is currently held */
  isKeyDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  /** Get current mouse position in screen coordinates */
  getMousePosition(): Vec2 {
    return this.mousePos;
  }

  /** Check if mouse button is held */
  isMouseDown(): boolean {
    return this.mouseDown;
  }

  /** Get WASD/arrow movement vector (normalized) */
  getMovementVector(): Vec2 {
    let x = 0;
    let y = 0;
    if (this.isKeyDown('w') || this.isKeyDown('arrowup')) y -= 1;
    if (this.isKeyDown('s') || this.isKeyDown('arrowdown')) y += 1;
    if (this.isKeyDown('a') || this.isKeyDown('arrowleft')) x -= 1;
    if (this.isKeyDown('d') || this.isKeyDown('arrowright')) x += 1;
    const v = new Vec2(x, y);
    if (v.magSq() > 0) return v.normalize();
    return v;
  }
}
