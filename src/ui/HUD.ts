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

  // Visual theme state (can be updated by VisualEditor)
  private padding: number = CONFIG.HUD_PADDING;
  private barWidth: number = CONFIG.HUD_BAR_WIDTH;
  private barHeight: number = CONFIG.HUD_BAR_HEIGHT;
  private baseEnergyColor: string = '#44ff44';

  constructor() {
    this.tierIndicator = new TierIndicator();
    this.evolutionBar = new ProgressBar(
      this.padding, this.evoBarY(),
      this.barWidth, this.barHeight,
      '#aa44ff', '#222222', 'EVO',
    );
    this.energyBar = new ProgressBar(
      this.padding, this.energyBarY(),
      this.barWidth, this.barHeight,
      this.baseEnergyColor, '#222222', 'NRG',
    );
    this.minimap = new Minimap(CONFIG.MINIMAP_SIZE);
  }

  /** Update the displayed evolution threshold */
  setEvolutionThreshold(threshold: number): void {
    this.evolutionThreshold = threshold;
  }

  /** Update tier indicator */
  setTier(name: string, color: string): void {
    this.tierIndicator.setTier(name, color);
  }

  /**
   * Apply a visual theme from the VisualEditor.
   * Updates bar colors, sizes, padding, and minimap size.
   */
  applyVisualTheme(
    evoBarColor: string,
    energyBarColor: string,
    barWidth: number,
    barHeight: number,
    padding: number,
    minimapSize: number,
  ): void {
    this.barWidth = barWidth;
    this.barHeight = barHeight;
    this.padding = padding;
    this.baseEnergyColor = energyBarColor;

    // Update tier indicator padding
    this.tierIndicator.setPadding(padding);

    // Reposition & resize both bars
    this.evolutionBar.setPosition(padding, this.evoBarY());
    this.evolutionBar.setSize(barWidth, barHeight);
    this.evolutionBar.setFgColor(evoBarColor);

    this.energyBar.setPosition(padding, this.energyBarY());
    this.energyBar.setSize(barWidth, barHeight);
    this.energyBar.setFgColor(energyBarColor);

    // Update minimap size
    this.minimap.setSize(minimapSize);
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
      this.energyBar.setFgColor(this.baseEnergyColor);
    }
    this.energyBar.render(ctx, ctrl.energy, CONFIG.ENERGY_MAX);

    // Mass counter
    ctx.font = '12px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.textAlign = 'left';
    ctx.fillText(`MASS: ${Math.floor(physics?.mass ?? 0)}`, this.padding, this.massY());

    // CP counter
    ctx.fillStyle = '#ffdd44';
    ctx.fillText(`CP: ${ctrl.cp}`, this.padding, this.cpY());

    // Minimap
    this.minimap.render(ctx, world, screenWidth, screenHeight);
  }

  // ─── Layout helpers ──────────────────────────────────────────────────────────

  /** Y position of the evo bar (fixed offset below the tier indicator) */
  private evoBarY(): number {
    return this.padding + 24;
  }

  /** Y position of the energy bar */
  private energyBarY(): number {
    return this.evoBarY() + this.barHeight + 6;
  }

  /** Y position of the mass text baseline */
  private massY(): number {
    return this.energyBarY() + this.barHeight + 18;
  }

  /** Y position of the CP text baseline */
  private cpY(): number {
    return this.massY() + 16;
  }
}
