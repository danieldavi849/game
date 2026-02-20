import { easeOutCubic } from '../utils/MathUtils.ts';
import { RelicDef, ALL_RELICS, RARITY_COLORS, RARITY_BG } from '../relics/RelicDefs.ts';

/** Weight-randomise shop offerings — common most likely, legendary rare */
function pickShopRelics(count: number, availableCp: number, ownedIds: string[]): RelicDef[] {
  const pool = ALL_RELICS.filter(r => r.cost > 0 && !ownedIds.includes(r.id));
  const weighted: RelicDef[] = [];
  for (const r of pool) {
    const w = r.rarity === 'common' ? 5 : r.rarity === 'rare' ? 3 : 1;
    for (let i = 0; i < w; i++) weighted.push(r);
  }
  const shuffled = [...weighted].sort(() => Math.random() - 0.5);
  const seen = new Set<string>();
  const result: RelicDef[] = [];
  for (const r of shuffled) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      result.push(r);
      if (result.length >= count) break;
    }
  }
  return result;
}

/** Relic Shop — shown after the Deal screen, between tiers */
export class UpgradeScreen {
  private visible = false;
  private choices: RelicDef[] = [];
  private playerCp = 0;
  private ownedRelicIds: string[] = [];
  private hoverIndex = -1;
  private fadeIn = 0;
  private onSelect: ((relic: RelicDef | null) => void) | null = null;
  private buttonRects: Array<{ x: number; y: number; w: number; h: number }> = [];
  private skipRect = { x: 0, y: 0, w: 0, h: 0 };

  show(cp: number, ownedIds: string[], onSelect: (relic: RelicDef | null) => void): void {
    this.visible = true;
    this.playerCp = cp;
    this.ownedRelicIds = ownedIds;
    this.choices = pickShopRelics(3, cp, ownedIds);
    this.onSelect = onSelect;
    this.fadeIn = 0;
    this.hoverIndex = -1;
  }

  hide(): void { this.visible = false; this.onSelect = null; }
  isVisible(): boolean { return this.visible; }

  update(dt: number): void {
    if (!this.visible) return;
    this.fadeIn = Math.min(this.fadeIn + dt * 2.5, 1);
  }

  handleClick(x: number, y: number, _w: number, _h: number): boolean {
    if (!this.visible || this.fadeIn < 0.8) return false;

    for (let i = 0; i < this.buttonRects.length; i++) {
      const r = this.buttonRects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        const chosen = this.choices[i];
        if (chosen && this.playerCp >= chosen.cost) {
          this.onSelect?.(chosen);
          this.hide();
          return true;
        }
      }
    }
    const sr = this.skipRect;
    if (x >= sr.x && x <= sr.x + sr.w && y >= sr.y && y <= sr.y + sr.h) {
      this.onSelect?.(null);
      this.hide();
      return true;
    }
    return false;
  }

  handleMouseMove(x: number, y: number): void {
    if (!this.visible) return;
    this.hoverIndex = -1;
    for (let i = 0; i < this.buttonRects.length; i++) {
      const r = this.buttonRects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        this.hoverIndex = i;
        break;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
    if (!this.visible) return;
    const alpha = easeOutCubic(this.fadeIn);

    ctx.fillStyle = `rgba(0,0,0,${alpha * 0.78})`;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    ctx.save();
    ctx.globalAlpha = alpha;

    // Title
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffdd44';
    ctx.shadowColor = '#ffdd44';
    ctx.shadowBlur = 12;
    ctx.fillText('RELIC SHOP', screenWidth / 2, screenHeight * 0.13);
    ctx.shadowBlur = 0;

    ctx.font = '14px monospace';
    ctx.fillStyle = '#ffdd44';
    ctx.fillText(`CP: ${this.playerCp}`, screenWidth / 2, screenHeight * 0.19);

    // Relics collected badge
    ctx.font = '11px monospace';
    ctx.fillStyle = '#888888';
    ctx.fillText(
      `Relics owned: ${this.ownedRelicIds.length}`,
      screenWidth / 2,
      screenHeight * 0.23,
    );

    const cardW = 190;
    const cardH = 200;
    const gap = 20;
    const totalW = this.choices.length * cardW + (this.choices.length - 1) * gap;
    const startX = (screenWidth - totalW) / 2;
    const cardY = screenHeight * 0.27;

    this.buttonRects.length = 0;

    for (let i = 0; i < this.choices.length; i++) {
      const relic = this.choices[i];
      const cx = startX + i * (cardW + gap);
      const canAfford = this.playerCp >= relic.cost;
      const isHover = this.hoverIndex === i;
      this.buttonRects.push({ x: cx, y: cardY, w: cardW, h: cardH });

      const rarityColor = RARITY_COLORS[relic.rarity];

      // Card
      ctx.fillStyle = isHover && canAfford ? 'rgba(55,55,75,0.97)' : RARITY_BG[relic.rarity];
      ctx.strokeStyle = canAfford ? rarityColor : '#333333';
      ctx.lineWidth = isHover && canAfford ? 3 : 1.5;
      ctx.beginPath();
      ctx.roundRect(cx, cardY, cardW, cardH, 10);
      ctx.fill();
      ctx.stroke();

      const centerX = cx + cardW / 2;

      // Rarity badge
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = canAfford ? rarityColor : '#555555';
      ctx.textAlign = 'center';
      ctx.fillText(relic.rarity.toUpperCase(), centerX, cardY + 18);

      // Name
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = canAfford ? rarityColor : '#555555';
      ctx.fillText(relic.name, centerX, cardY + 40);

      // Description (word-wrap)
      ctx.font = '11px monospace';
      ctx.fillStyle = canAfford ? '#cccccc' : '#555555';
      const words = relic.description.split(' ');
      let line = '';
      let lineY = cardY + 62;
      for (const word of words) {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > cardW - 20) {
          ctx.fillText(line.trim(), centerX, lineY);
          line = word + ' ';
          lineY += 14;
        } else {
          line = test;
        }
      }
      if (line.trim()) ctx.fillText(line.trim(), centerX, lineY);

      // Synergy tags
      if (relic.tags.length > 0) {
        ctx.font = '9px monospace';
        ctx.fillStyle = canAfford ? '#888888' : '#444444';
        ctx.fillText(relic.tags.map(t => `[${t}]`).join(' '), centerX, cardY + 118);
      }

      // Key stat preview
      const s = relic.stats;
      const previews: string[] = [];
      if (s.speedMult && s.speedMult !== 1) previews.push(`SPD ${s.speedMult > 1 ? '+' : ''}${Math.round((s.speedMult - 1) * 100)}%`);
      if (s.massGainMult && s.massGainMult !== 1) previews.push(`MASS ${s.massGainMult > 1 ? '+' : ''}${Math.round((s.massGainMult - 1) * 100)}%`);
      if (s.energyDrainMult && s.energyDrainMult !== 1) previews.push(`DRAIN ${Math.round((s.energyDrainMult - 1) * 100)}%`);
      if (s.shieldBonus) previews.push(`SHLD +${s.shieldBonus}`);
      if (s.attractRadius) previews.push(`MAG +${s.attractRadius}`);
      if (s.bonusEnergyOnEat) previews.push(`EAT +${s.bonusEnergyOnEat}E`);
      if (s.chainConsumeChance) previews.push(`CHAIN ${Math.round(s.chainConsumeChance * 100)}%`);
      if (s.energyFloor) previews.push(`FLOOR ${s.energyFloor}`);
      if (s.massDecay) previews.push(`DECAY -${s.massDecay}/s`);
      if (previews.length > 0) {
        ctx.font = '9px monospace';
        ctx.fillStyle = canAfford ? (relic.rarity === 'cursed' ? '#dd8888' : '#aaddaa') : '#445544';
        // Split into up to 2 lines
        const half = Math.ceil(previews.length / 2);
        ctx.fillText(previews.slice(0, half).join(' | '), centerX, cardY + 138);
        if (previews.length > half) {
          ctx.fillText(previews.slice(half).join(' | '), centerX, cardY + 150);
        }
      }

      // Cost
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = canAfford ? '#ffdd44' : '#553322';
      ctx.fillText(`${relic.cost} CP`, centerX, cardY + 172);

      if (!canAfford) {
        ctx.font = '9px monospace';
        ctx.fillStyle = '#ff4444';
        ctx.fillText('Not enough CP', centerX, cardY + 187);
      }
    }

    // Skip button
    const skipW = 130;
    const skipH = 34;
    const skipX = (screenWidth - skipW) / 2;
    const skipY = cardY + cardH + 18;
    this.skipRect = { x: skipX, y: skipY, w: skipW, h: skipH };

    ctx.fillStyle = 'rgba(40,40,40,0.8)';
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(skipX, skipY, skipW, skipH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = '13px monospace';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.fillText('Skip shop', screenWidth / 2, skipY + 22);

    ctx.restore();
  }
}
