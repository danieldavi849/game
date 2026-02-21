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
  private shieldBar: ProgressBar;
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
    this.shieldBar = new ProgressBar(
      this.padding, 0,
      this.barWidth, this.barHeight,
      '#44aaff', '#222222', 'SHD',
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

    // Reposition & resize bars
    this.evolutionBar.setPosition(padding, this.evoBarY());
    this.evolutionBar.setSize(barWidth, barHeight);
    this.evolutionBar.setFgColor(evoBarColor);

    this.energyBar.setPosition(padding, this.energyBarY());
    this.energyBar.setSize(barWidth, barHeight);
    this.energyBar.setFgColor(energyBarColor);

    this.shieldBar.setSize(barWidth, barHeight);

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

    // Stats panel
    this.renderStatsPanel(ctx, ctrl);

    // Minimap
    this.minimap.render(ctx, world, screenWidth, screenHeight);
  }

  /** Render the full player stats panel below the main bars */
  private renderStatsPanel(ctx: CanvasRenderingContext2D, ctrl: PlayerControlled): void {
    let y = this.statsStartY();
    const col2 = this.padding + Math.floor(this.barWidth / 2) + 4;

    // ── Section divider ──────────────────────────────────────────────────────
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.textAlign = 'left';
    ctx.fillText('── STATS ──────────────', this.padding, y);
    y += 14;

    ctx.font = '11px monospace';

    // Row: SPD | LEVEL
    const effectiveSpeed = Math.floor(ctrl.speed * ctrl.relicSpeedMult);
    ctx.fillStyle = ctrl.relicSpeedMult > 1 ? '#aaffaa' : '#cccccc';
    ctx.fillText(`SPD  ${effectiveSpeed}`, this.padding, y);
    ctx.fillStyle = '#cccccc';
    ctx.fillText(`LVL  ${ctrl.level}`, col2, y);
    y += 14;

    // Row: MASS GAIN | NRG DRAIN
    ctx.fillStyle = ctrl.relicMassGainMult > 1 ? '#aaffaa' : ctrl.relicMassGainMult < 1 ? '#ffaaaa' : '#cccccc';
    ctx.fillText(`GAIN ×${ctrl.relicMassGainMult.toFixed(1)}`, this.padding, y);
    ctx.fillStyle = ctrl.relicEnergyDrainMult < 1 ? '#aaffaa' : ctrl.relicEnergyDrainMult > 1 ? '#ffaaaa' : '#cccccc';
    ctx.fillText(`DRNS ×${ctrl.relicEnergyDrainMult.toFixed(1)}`, col2, y);
    y += 14;

    // Row: CP GAIN | ATTRACT (or placeholder)
    ctx.fillStyle = ctrl.relicCpGainMult > 1 ? '#ffdd44' : '#cccccc';
    ctx.fillText(`CPGN ×${ctrl.relicCpGainMult.toFixed(1)}`, this.padding, y);
    if (ctrl.relicAttractRadius > 0) {
      ctx.fillStyle = '#44ddff';
      ctx.fillText(`ATTR ${ctrl.relicAttractRadius}`, col2, y);
    } else if (ctrl.relicBonusEnergyOnEat > 0) {
      ctx.fillStyle = '#44ff88';
      ctx.fillText(`EAT +${ctrl.relicBonusEnergyOnEat}`, col2, y);
    }
    y += 14;

    // Row: MUTATIONS | CATALYSTS
    const mutColor = ctrl.mutations.length >= 5 ? '#ff8844' : ctrl.mutations.length > 0 ? '#cc88ff' : '#666666';
    ctx.fillStyle = mutColor;
    ctx.fillText(`MUT  ${ctrl.mutations.length}/5`, this.padding, y);
    const catColor = ctrl.catalysts.length >= 3 ? '#ff8844' : ctrl.catalysts.length > 0 ? '#ff8844' : '#666666';
    ctx.fillStyle = catColor;
    ctx.fillText(`CAT  ${ctrl.catalysts.length}/3`, col2, y);
    y += 14;

    // Row: CHAIN | POISON (only if > 0)
    const hasChain = ctrl.relicChainConsumeChance > 0;
    const hasPoison = ctrl.relicPoisonChance > 0;
    if (hasChain || hasPoison) {
      if (hasChain) {
        ctx.fillStyle = '#ffaa44';
        ctx.fillText(`CHN  ${Math.floor(ctrl.relicChainConsumeChance * 100)}%`, this.padding, y);
      }
      if (hasPoison) {
        ctx.fillStyle = '#88ff44';
        ctx.fillText(`PSN  ${Math.floor(ctrl.relicPoisonChance * 100)}%`, col2, y);
      }
      y += 14;
    }

    // Devil energy penalty indicator
    if (ctrl.devilEnergyPenalty > 0) {
      ctx.fillStyle = '#ff4444';
      ctx.fillText(`CURSE -${ctrl.devilEnergyPenalty} NRG`, this.padding, y);
      y += 14;
    }

    // Invincibility flash
    if (ctrl.invincibilityTimer > 0) {
      const flash = Math.sin(Date.now() * 0.02) > 0;
      ctx.fillStyle = flash ? '#ffffff' : '#aaaaff';
      ctx.fillText('!! INVINCIBLE !!', this.padding, y);
      y += 14;
    }

    y += 4;

    // ── Shield bar (Atomic tier) ──────────────────────────────────────────────
    if (ctrl.maxShieldHP > 0) {
      this.shieldBar.setPosition(this.padding, y);
      this.shieldBar.render(ctx, ctrl.shieldHP, ctrl.maxShieldHP);
      y += this.barHeight + 6;
    }

    // ── Active ability cooldown ───────────────────────────────────────────────
    if (ctrl.activeAbility !== null) {
      // Ability name label
      ctx.font = '10px monospace';
      ctx.fillStyle = '#ff8844';
      ctx.textAlign = 'left';
      const ablLabel = `ABL: ${ctrl.activeAbility.toUpperCase()}`;
      ctx.fillText(ablLabel, this.padding, y + 10);
      y += 13;

      // Cooldown bar (fills up as ability becomes ready)
      const readyFraction = ctrl.activeMaxCooldown > 0
        ? 1 - (ctrl.activeCooldown / ctrl.activeMaxCooldown)
        : 1;
      this.renderCooldownBar(ctx, this.padding, y, readyFraction);
      y += this.barHeight + 4;
    }
  }

  /** Render a minimal cooldown bar with READY indicator */
  private renderCooldownBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    readyFraction: number,
  ): void {
    const w = this.barWidth;
    const h = this.barHeight;
    const isReady = readyFraction >= 1;
    const fgColor = isReady ? '#44ff88' : '#ff8844';

    // Background
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();

    // Foreground
    const fillW = w * Math.min(1, readyFraction);
    if (fillW > 0) {
      ctx.fillStyle = fgColor;
      ctx.beginPath();
      ctx.roundRect(x, y, fillW, h, 4);
      ctx.fill();
    }

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.stroke();

    // Text
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(isReady ? 'READY' : `${Math.floor(readyFraction * 100)}%`, x + w / 2, y + h - 3);
    ctx.textAlign = 'left';
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

  /** Y where the stats panel begins */
  private statsStartY(): number {
    return this.cpY() + 20;
  }
}
