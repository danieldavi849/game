import { World } from '../ecs/World.ts';
import { PlayerControlled } from '../components/PlayerControlled.ts';
import { getRelicById, getAbilityById, RARITY_COLORS, TRANSFORMATIONS } from '../relics/RelicDefs.ts';

const ICON_SIZE = 28;
const ICON_GAP = 4;
const BADGE_SIZE = 22;

/** In-game HUD layer showing collected relics, active ability, and transformation badges */
export class RelicHUD {
  private tooltipIndex = -1;

  /** Update hover state for tooltip */
  handleMouseMove(x: number, y: number, screenWidth: number, screenHeight: number, world: World): void {
    const players = world.query('PlayerControlled');
    if (players.length === 0) { this.tooltipIndex = -1; return; }
    const ctrl = players[0].getComponent<PlayerControlled>('PlayerControlled')!;
    if (ctrl.mutations.length === 0) { this.tooltipIndex = -1; return; }

    const stripY = screenHeight - 50;
    const stripStartX = this.getStripStartX(screenWidth, 5); // 5 max slots
    this.tooltipIndex = -1;
    for (let i = 0; i < ctrl.mutations.length; i++) {
      const ix = stripStartX + i * (ICON_SIZE + ICON_GAP);
      if (x >= ix && x <= ix + ICON_SIZE && y >= stripY && y <= stripY + ICON_SIZE) {
        this.tooltipIndex = i;
        break;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, world: World, screenWidth: number, screenHeight: number): void {
    const players = world.query('PlayerControlled');
    if (players.length === 0) return;
    const ctrl = players[0].getComponent<PlayerControlled>('PlayerControlled')!;

    this.renderRelicStrip(ctx, ctrl, screenWidth, screenHeight);
    this.renderCatalystStrip(ctx, ctrl, screenWidth, screenHeight);
    this.renderActiveAbility(ctx, ctrl, screenWidth, screenHeight);
    this.renderTransformationBadges(ctx, ctrl, screenHeight);
    this.renderTooltip(ctx, ctrl, screenWidth, screenHeight);
  }

  private getStripStartX(screenWidth: number, count: number): number {
    const totalW = count * (ICON_SIZE + ICON_GAP) - ICON_GAP;
    return Math.max(16, (screenWidth - totalW) / 2);
  }

  private renderRelicStrip(ctx: CanvasRenderingContext2D, ctrl: PlayerControlled, screenWidth: number, screenHeight: number): void {
    const maxSlots = 5;
    const stripY = screenHeight - 50;
    const startX = this.getStripStartX(screenWidth, maxSlots);

    for (let i = 0; i < maxSlots; i++) {
      const ix = startX + i * (ICON_SIZE + ICON_GAP);

      if (i < ctrl.mutations.length) {
        // Draw owned mutation
        const relic = getRelicById(ctrl.mutations[i]);
        if (!relic) continue;
        const rarityColor = RARITY_COLORS[relic.rarity];

        ctx.fillStyle = 'rgba(10,10,18,0.85)';
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = this.tooltipIndex === i ? 2.5 : 1;
        ctx.beginPath();
        ctx.roundRect(ix, stripY, ICON_SIZE, ICON_SIZE, 4);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = rarityColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(relic.name[0].toUpperCase(), ix + ICON_SIZE / 2, stripY + ICON_SIZE / 2);
        ctx.textBaseline = 'alphabetic';
      } else {
        // Draw empty slot
        ctx.fillStyle = 'rgba(10,10,18,0.3)';
        ctx.strokeStyle = 'rgba(80,80,100,0.3)';
        ctx.setLineDash([2, 2]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(ix, stripY, ICON_SIZE, ICON_SIZE, 4);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]); // Reset
      }
    }
  }

  private renderCatalystStrip(ctx: CanvasRenderingContext2D, ctrl: PlayerControlled, screenWidth: number, screenHeight: number): void {
    const maxSlots = 3;
    const stripY = screenHeight - 65;
    const totalW = maxSlots * (ICON_SIZE + ICON_GAP) - ICON_GAP;
    // Align to bottom right
    const startX = screenWidth - totalW - 16;

    for (let i = 0; i < maxSlots; i++) {
      const ix = startX + i * (ICON_SIZE + ICON_GAP);

      if (i < ctrl.catalysts.length) {
        // Draw owned catalyst (Currently just a placeholder color until we build the items system)
        ctx.fillStyle = 'rgba(40,15,10,0.85)';
        ctx.strokeStyle = '#ff8844';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(ix, stripY, ICON_SIZE, ICON_SIZE, 4);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#ff8844';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('C', ix + ICON_SIZE / 2, stripY + ICON_SIZE / 2);
        ctx.textBaseline = 'alphabetic';
      } else {
        // Draw empty slot
        ctx.fillStyle = 'rgba(20,10,5,0.3)';
        ctx.strokeStyle = 'rgba(100,60,40,0.3)';
        ctx.setLineDash([2, 2]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(ix, stripY, ICON_SIZE, ICON_SIZE, 4);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]); // Reset
      }

      // Draw hotkey number indicator [1], [2], [3] above the box
      ctx.font = '10px monospace';
      ctx.fillStyle = '#888888';
      ctx.textAlign = 'center';
      ctx.fillText(`[${i + 1}]`, ix + ICON_SIZE / 2, stripY - 6);
    }
  }

  private renderActiveAbility(ctx: CanvasRenderingContext2D, ctrl: PlayerControlled, screenWidth: number, screenHeight: number): void {
    if (!ctrl.activeAbility) return;
    const ability = getAbilityById(ctrl.activeAbility);
    if (!ability) return;

    const bx = screenWidth / 2 - 40;
    const by = screenHeight - 88;
    const bw = 80;
    const bh = 28;

    const ready = ctrl.activeCooldown <= 0;
    const progress = ready ? 1 : 1 - ctrl.activeCooldown / ctrl.activeMaxCooldown;

    // Background
    ctx.fillStyle = 'rgba(10,10,18,0.85)';
    ctx.strokeStyle = ready ? ability.color : '#444444';
    ctx.lineWidth = ready ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 5);
    ctx.fill();
    ctx.stroke();

    // Cooldown fill
    if (!ready) {
      ctx.fillStyle = `${ability.color}22`;
      ctx.beginPath();
      ctx.roundRect(bx + 1, by + 1, (bw - 2) * progress, bh - 2, 4);
      ctx.fill();
    }

    // Label
    ctx.font = ready ? 'bold 11px monospace' : '10px monospace';
    ctx.fillStyle = ready ? ability.color : '#888888';
    ctx.textAlign = 'center';
    ctx.fillText(
      ready ? `[SPC] ${ability.name}` : `${ability.name} ${ctrl.activeCooldown.toFixed(1)}s`,
      screenWidth / 2,
      by + bh / 2 + 4,
    );
  }

  private renderTransformationBadges(ctx: CanvasRenderingContext2D, ctrl: PlayerControlled, screenHeight: number): void {
    if (ctrl.transformations.length === 0) return;

    const startY = screenHeight - 86;
    for (let i = 0; i < ctrl.transformations.length; i++) {
      const t = TRANSFORMATIONS.find(x => x.id === ctrl.transformations[i]);
      if (!t) continue;

      const bx = 16 + i * (BADGE_SIZE + 4);
      const by = startY;

      // Badge bg
      ctx.fillStyle = 'rgba(10,10,18,0.9)';
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, BADGE_SIZE, BADGE_SIZE, 4);
      ctx.fill();
      ctx.stroke();

      // Star symbol for transformation
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = t.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', bx + BADGE_SIZE / 2, by + BADGE_SIZE / 2);
      ctx.textBaseline = 'alphabetic';

      // Tooltip on hover - just name below badge
      ctx.font = '8px monospace';
      ctx.fillStyle = t.color;
      ctx.fillText(t.name, bx + BADGE_SIZE / 2, by + BADGE_SIZE + 9);
    }
  }

  private renderTooltip(ctx: CanvasRenderingContext2D, ctrl: PlayerControlled, screenWidth: number, screenHeight: number): void {
    if (this.tooltipIndex < 0 || this.tooltipIndex >= ctrl.mutations.length) return;
    const relic = getRelicById(ctrl.mutations[this.tooltipIndex]);
    if (!relic) return;

    const ttW = 200;
    const ttH = 90;
    const stripY = screenHeight - 50;
    const startX = this.getStripStartX(screenWidth, 5); // 5 max slots
    const iconX = startX + this.tooltipIndex * (ICON_SIZE + ICON_GAP);
    let ttX = iconX - ttW / 2 + ICON_SIZE / 2;
    ttX = Math.max(8, Math.min(screenWidth - ttW - 8, ttX));
    const ttY = stripY - ttH - 8;

    ctx.fillStyle = 'rgba(8,8,16,0.95)';
    ctx.strokeStyle = RARITY_COLORS[relic.rarity];
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(ttX, ttY, ttW, ttH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = RARITY_COLORS[relic.rarity];
    ctx.fillText(relic.name, ttX + 10, ttY + 18);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#cccccc';
    // Word-wrap description
    const words = relic.description.split(' ');
    let line = '';
    let lineY = ttY + 36;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > ttW - 20) {
        ctx.fillText(line.trim(), ttX + 10, lineY);
        line = word + ' ';
        lineY += 14;
      } else {
        line = test;
      }
    }
    if (line.trim()) ctx.fillText(line.trim(), ttX + 10, lineY);

    ctx.font = '9px monospace';
    ctx.fillStyle = '#888888';
    ctx.fillText(relic.tags.map(t => `[${t}]`).join(' '), ttX + 10, ttY + ttH - 10);
  }
}
