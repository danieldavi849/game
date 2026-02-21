import { World } from '../ecs/World.ts';
import { PlayerControlled } from '../components/PlayerControlled.ts';
import { Physics } from '../components/Physics.ts';
import { ProgressBar } from './ProgressBar.ts';
import { Minimap } from './Minimap.ts';
import { TierIndicator } from './TierIndicator.ts';
import { CONFIG } from '../utils/Constants.ts';

/** Top-level HUD renderer — delegates to sub-elements */
export class HUD {
  private evolutionBar: ProgressBar;
  private energyBar: ProgressBar;
  private minimap: Minimap;
  private tierIndicator: TierIndicator;
  private evolutionThreshold: number = 100;

  constructor() {
    const barX = CONFIG.HUD_PADDING;
    this.tierIndicator = new TierIndicator();
    this.evolutionBar = new ProgressBar(
      barX, 40,
      CONFIG.HUD_BAR_WIDTH, CONFIG.HUD_BAR_HEIGHT,
      '#aa44ff', '#222222', 'EVO',
    );
    this.energyBar = new ProgressBar(
      barX, 60,
      CONFIG.HUD_BAR_WIDTH, CONFIG.HUD_BAR_HEIGHT,
      '#44ff44', '#222222', 'NRG',
    );
    this.minimap = new Minimap();
  }

  /** Update the displayed evolution threshold */
  setEvolutionThreshold(threshold: number): void {
    this.evolutionThreshold = threshold;
  }

  /** Update tier indicator */
  setTier(name: string, color: string): void {
    this.tierIndicator.setTier(name, color);
  }

  /** Render the entire HUD */
  render(ctx: CanvasRenderingContext2D, world: World, screenWidth: number, screenHeight: number): void {
    const players = world.query('PlayerControlled');
    if (players.length === 0) return;

    const ctrl = players[0].getComponent<PlayerControlled>('PlayerControlled')!;
    const physics = players[0].getComponent<Physics>('Physics');

    // Tier indicator
    this.tierIndicator.render(ctx, ctrl.level);

    // Evolution progress bar
    this.evolutionBar.render(ctx, ctrl.evolutionMass, this.evolutionThreshold);

    // Energy bar - flash when critical
    if (ctrl.energy < CONFIG.ENERGY_CRITICAL_THRESHOLD) {
      const flash = Math.sin(Date.now() * 0.01) > 0;
      this.energyBar.setFgColor(flash ? '#ff4444' : '#ff8800');
    } else {
      this.energyBar.setFgColor('#44ff44');
    }
    this.energyBar.render(ctx, ctrl.energy, CONFIG.ENERGY_MAX);

    // Mass counter
    ctx.font = '12px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.textAlign = 'left';
    ctx.fillText(`MASS: ${Math.floor(physics?.mass ?? 0)}`, CONFIG.HUD_PADDING, 92);

    // CP counter
    ctx.fillStyle = '#ffdd44';
    ctx.fillText(`CP: ${ctrl.cp}`, CONFIG.HUD_PADDING, 108);

    // Minimap
    this.minimap.render(ctx, world, screenWidth, screenHeight);
  }
}
