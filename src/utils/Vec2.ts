/** Immutable-style 2D vector with common math operations */
export class Vec2 {
  constructor(
    public x: number = 0,
    public y: number = 0,
  ) {}

  /** Create a new Vec2 from another */
  static from(v: Vec2): Vec2 {
    return new Vec2(v.x, v.y);
  }

  /** Create a Vec2 from angle and magnitude */
  static fromAngle(angle: number, magnitude: number = 1): Vec2 {
    return new Vec2(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
  }

  /** Zero vector */
  static zero(): Vec2 {
    return new Vec2(0, 0);
  }

  /** Random vector with components in [-1, 1] normalized */
  static random(): Vec2 {
    const angle = Math.random() * Math.PI * 2;
    return new Vec2(Math.cos(angle), Math.sin(angle));
  }

  /** Add two vectors */
  add(v: Vec2): Vec2 {
    return new Vec2(this.x + v.x, this.y + v.y);
  }

  /** Subtract vector */
  sub(v: Vec2): Vec2 {
    return new Vec2(this.x - v.x, this.y - v.y);
  }

  /** Multiply by scalar */
  mul(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s);
  }

  /** Divide by scalar */
  div(s: number): Vec2 {
    if (s === 0) return new Vec2(0, 0);
    return new Vec2(this.x / s, this.y / s);
  }

  /** Magnitude (length) */
  mag(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /** Squared magnitude (avoids sqrt) */
  magSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  /** Normalize to unit vector */
  normalize(): Vec2 {
    const m = this.mag();
    if (m === 0) return new Vec2(0, 0);
    return this.div(m);
  }

  /** Distance to another vector */
  dist(v: Vec2): number {
    return this.sub(v).mag();
  }

  /** Squared distance to another vector */
  distSq(v: Vec2): number {
    return this.sub(v).magSq();
  }

  /** Dot product */
  dot(v: Vec2): number {
    return this.x * v.x + this.y * v.y;
  }

  /** Linear interpolation */
  lerp(v: Vec2, t: number): Vec2 {
    return new Vec2(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t,
    );
  }

  /** Limit magnitude */
  limit(max: number): Vec2 {
    const mSq = this.magSq();
    if (mSq > max * max) {
      return this.normalize().mul(max);
    }
    return new Vec2(this.x, this.y);
  }

  /** Angle in radians */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /** Set values in-place (mutable, for performance-critical paths) */
  set(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /** Copy from another vector in-place */
  copyFrom(v: Vec2): void {
    this.x = v.x;
    this.y = v.y;
  }

  /** Add in-place */
  addMut(v: Vec2): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  /** Multiply scalar in-place */
  mulMut(s: number): this {
    this.x *= s;
    this.y *= s;
    return this;
  }

  /** Clone this vector */
  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }
}
