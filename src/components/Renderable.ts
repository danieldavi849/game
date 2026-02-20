import { Component } from '../ecs/Component.ts';
import * as PIXI from 'pixi.js';

/** Visual properties for rendering */
export class Renderable implements Component {
  readonly type = 'Renderable';
  public graphics?: PIXI.Container;

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
