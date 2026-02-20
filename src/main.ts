import { Game } from './Game.ts';

/** Entry point — boots the game */
async function boot() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  const game = new Game(canvas);
  await game.init();
}

boot();
