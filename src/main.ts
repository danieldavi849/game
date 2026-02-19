import { Game } from './Game.ts';

/** Entry point — boots the game */
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

new Game(canvas);
