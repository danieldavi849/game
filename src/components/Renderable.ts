import { Component } from '../ecs/Component.ts';
import * as PIXI from 'pixi.js';

/** Visual properties for rendering */
export class Renderable implements Component {
  readonly type = 'Renderable';
  public graphics?: PIXI.Container;
  /**
   * Optional key into the SpriteManager texture cache.
   * When set and a matching texture is loaded, the entity renders as a
   * pixel-art sprite instead of procedural vector graphics.
   * Keys correspond to filenames under public/sprites/<key>.png.
   */
  public spriteKey?: string;

  constructor(
    public radius: number = 10,
    public color: string = '#ffffff',
    public glowColor: string = '',
    public glowRadius: number = 0,
    public opacity: number = 1,
    public trailLength: number = 0,
    public shape: 'circle' | 'triangle' | 'diamond' | 'ring' = 'circle',
    public pulseSpeed: number = 0,
    public pulseAmount: number = 0,
  ) { }
}
