import { Vec2 } from '../utils/Vec2.ts';
import { lerp, clamp } from '../utils/MathUtils.ts';
import { CONFIG } from '../utils/Constants.ts';

/** Camera with position, zoom, smooth follow, and screen shake */
export class Camera {
  position: Vec2 = new Vec2(0, 0);
  zoom: number = CONFIG.CAMERA_BASE_ZOOM;
  targetZoom: number = CONFIG.CAMERA_BASE_ZOOM;
  private shakeIntensity = 0;
  private shakeOffset: Vec2 = new Vec2(0, 0);
  private screenWidth = 0;
  private screenHeight = 0;

  /** Set screen dimensions */
  setViewport(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  /** Smoothly follow a target position */
  follow(target: Vec2, dt: number): void {
    const speed = CONFIG.CAMERA_LERP_SPEED;
    this.position.x = lerp(this.position.x, target.x, speed);
    this.position.y = lerp(this.position.y, target.y, speed);
  }

  /** Update zoom smoothly */
  updateZoom(): void {
    this.zoom = lerp(this.zoom, this.targetZoom, CONFIG.CAMERA_ZOOM_LERP);
  }

  /** Set target zoom level */
  setTargetZoom(z: number): void {
    this.targetZoom = clamp(z, CONFIG.CAMERA_MIN_ZOOM, CONFIG.CAMERA_MAX_ZOOM);
  }

  /** Trigger screen shake */
  shake(intensity: number): void {
    this.shakeIntensity = intensity;
  }

  /** Update shake effect */
  updateShake(): void {
    if (this.shakeIntensity > 0.1) {
      this.shakeOffset.set(
        (Math.random() - 0.5) * 2 * this.shakeIntensity,
        (Math.random() - 0.5) * 2 * this.shakeIntensity,
      );
      this.shakeIntensity *= CONFIG.SHAKE_DECAY;
    } else {
      this.shakeIntensity = 0;
      this.shakeOffset.set(0, 0);
    }
  }

  /** Convert world coordinates to screen coordinates */
  worldToScreen(worldPos: Vec2): Vec2 {
    return new Vec2(
      (worldPos.x - this.position.x) * this.zoom + this.screenWidth / 2 + this.shakeOffset.x,
      (worldPos.y - this.position.y) * this.zoom + this.screenHeight / 2 + this.shakeOffset.y,
    );
  }

  /** Convert screen coordinates to world coordinates */
  screenToWorld(screenPos: Vec2): Vec2 {
    return new Vec2(
      (screenPos.x - this.screenWidth / 2 - this.shakeOffset.x) / this.zoom + this.position.x,
      (screenPos.y - this.screenHeight / 2 - this.shakeOffset.y) / this.zoom + this.position.y,
    );
  }

  /** Scale a world-space radius to screen-space */
  worldToScreenScale(worldSize: number): number {
    return worldSize * this.zoom;
  }

  /** Get visible world bounds */
  getViewBounds(): { left: number; top: number; right: number; bottom: number } {
    const hw = this.screenWidth / 2 / this.zoom;
    const hh = this.screenHeight / 2 / this.zoom;
    return {
      left: this.position.x - hw,
      top: this.position.y - hh,
      right: this.position.x + hw,
      bottom: this.position.y + hh,
    };
  }
}
