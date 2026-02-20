import { easeOutCubic } from '../utils/MathUtils.ts';
import { RelicDef, ALL_RELICS, RARITY_COLORS, ACTIVE_ABILITIES, ActiveAbilityDef } from '../relics/RelicDefs.ts';

export interface DealChoice {
  type: 'devil' | 'angel' | 'skip';
  relic?: RelicDef;
  ability?: ActiveAbilityDef;
  energyCost: number;
}

/** Devil/Angel deal screen shown before the relic shop */
export class DealScreen {
  private visible = false;
  private fadeIn = 0;
  private hoverIndex = -1;
  private devilDeal: DealChoice | null = null;
  private angelDeal: DealChoice | null = null;
  private onSelect: ((deal: DealChoice) => void) | null = null;
  private buttonRects: Array<{ x: number; y: number; w: number; h: number }> = [];
  private skipRect = { x: 0, y: 0, w: 0, h: 0 };

  show(ownedRelicIds: string[], onSelect: (deal: DealChoice) => void): void {
    this.visible = true;
    this.fadeIn = 0;
    this.hoverIndex = -1;
    this.onSelect = onSelect;

    // Devil deal: powerful relic/ability at HP cost
    const legendaries = ALL_RELICS.filter(r =>
      (r.rarity === 'legendary' || r.rarity === 'rare') && !ownedRelicIds.includes(r.id));
    const cursed = ALL_RELICS.filter(r => r.rarity === 'cursed' && !ownedRelicIds.includes(r.id));
    const devilPool = [...legendaries, ...cursed];

    // 30% chance to offer an active ability instead
    if (Math.random() < 0.3 && ACTIVE_ABILITIES.length > 0) {
      const ability = ACTIVE_ABILITIES[Math.floor(Math.random() * ACTIVE_ABILITIES.length)];
      this.devilDeal = { type: 'devil', ability, energyCost: 25 };
    } else if (devilPool.length > 0) {
      const relic = devilPool[Math.floor(Math.random() * devilPool.length)];
      this.devilDeal = {
        type: 'devil', relic,
        energyCost: relic.rarity === 'cursed' ? 10 : 20,
      };
    } else {
      this.devilDeal = null;
    }

    // Angel deal: free common/rare relic
    const angelPool = ALL_RELICS.filter(r =>
      (r.rarity === 'common' || r.rarity === 'rare') && !ownedRelicIds.includes(r.id));
    if (angelPool.length > 0) {
      const relic = angelPool[Math.floor(Math.random() * angelPool.length)];
      this.angelDeal = { type: 'angel', relic, energyCost: 0 };
    } else {
      this.angelDeal = null;
    }
  }

  hide(): void { this.visible = false; this.onSelect = null; }
  isVisible(): boolean { return this.visible; }

  update(dt: number): void {
    if (!this.visible) return;
    this.fadeIn = Math.min(this.fadeIn + dt * 2.5, 1);
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
    const sr = this.skipRect;
    if (x >= sr.x && x <= sr.x + sr.w && y >= sr.y && y <= sr.y + sr.h) {
      this.hoverIndex = 99;
    }
  }

  handleClick(x: number, y: number): boolean {
    if (!this.visible || this.fadeIn < 0.8) return false;

    for (let i = 0; i < this.buttonRects.length; i++) {
      const r = this.buttonRects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        const deal = i === 0 ? this.devilDeal : this.angelDeal;
        if (deal) {
          this.onSelect?.(deal);
          this.hide();
          return true;
        }
      }
    }
    const sr = this.skipRect;
    if (x >= sr.x && x <= sr.x + sr.w && y >= sr.y && y <= sr.y + sr.h) {
      this.onSelect?.({ type: 'skip', energyCost: 0 });
      this.hide();
      return true;
    }
    return false;
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (!this.visible) return;
    const alpha = easeOutCubic(this.fadeIn);

    ctx.fillStyle = `rgba(0,0,0,${alpha * 0.8})`;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = alpha;

    // Title
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#dddddd';
    ctx.fillText('A PRESENCE OFFERS A DEAL...', w / 2, h * 0.14);

    this.buttonRects.length = 0;
    const cardW = 220;
    const cardH = 200;
    const gap = 40;
    const deals = [this.devilDeal, this.angelDeal].filter(Boolean) as DealChoice[];
    const totalW = deals.length * cardW + (deals.length - 1) * gap;
    const startX = (w - totalW) / 2;
    const cardY = h * 0.24;

    for (let i = 0; i < deals.length; i++) {
      const deal = deals[i];
      const cx = startX + i * (cardW + gap);
      const isHover = this.hoverIndex === i;
      this.buttonRects.push({ x: cx, y: cardY, w: cardW, h: cardH });

      const isDevil = deal.type === 'devil';
      const borderColor = isDevil ? '#ff4444' : '#44ddff';
      const bgColor = isHover
        ? (isDevil ? 'rgba(80,20,20,0.95)' : 'rgba(20,40,80,0.95)')
        : (isDevil ? 'rgba(40,10,10,0.9)' : 'rgba(10,20,50,0.9)');

      ctx.fillStyle = bgColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = isHover ? 3 : 1.5;
      ctx.beginPath();
      ctx.roundRect(cx, cardY, cardW, cardH, 10);
      ctx.fill();
      ctx.stroke();

      const centerX = cx + cardW / 2;

      // Deal type label
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = borderColor;
      ctx.fillText(isDevil ? 'DEVIL DEAL' : 'ANGEL DEAL', centerX, cardY + 25);

      // Relic or ability name
      const name = deal.relic?.name ?? deal.ability?.name ?? '???';
      ctx.font = 'bold 16px monospace';
      const relicColor = deal.relic ? RARITY_COLORS[deal.relic.rarity] : deal.ability?.color ?? '#ffffff';
      ctx.fillStyle = relicColor;
      ctx.fillText(name, centerX, cardY + 55);

      // Description
      ctx.font = '11px monospace';
      ctx.fillStyle = '#bbbbbb';
      const desc = deal.relic?.description ?? deal.ability?.description ?? '';
      ctx.fillText(desc, centerX, cardY + 80);

      // Tags
      if (deal.relic?.tags.length) {
        ctx.font = '10px monospace';
        ctx.fillStyle = '#777777';
        ctx.fillText(deal.relic.tags.join(' + '), centerX, cardY + 100);
      }

      // Rarity badge
      if (deal.relic) {
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = RARITY_COLORS[deal.relic.rarity];
        ctx.fillText(deal.relic.rarity.toUpperCase(), centerX, cardY + 120);
      }
      if (deal.ability) {
        ctx.font = '10px monospace';
        ctx.fillStyle = '#888888';
        ctx.fillText(`Cooldown: ${deal.ability.cooldown}s`, centerX, cardY + 120);
      }

      // Cost
      ctx.font = 'bold 14px monospace';
      if (deal.energyCost > 0) {
        ctx.fillStyle = '#ff6666';
        ctx.fillText(`-${deal.energyCost} MAX ENERGY`, centerX, cardY + 155);
      } else {
        ctx.fillStyle = '#66ff66';
        ctx.fillText('FREE', centerX, cardY + 155);
      }

      // Active ability badge
      if (deal.ability) {
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#ffaa33';
        ctx.fillText('ACTIVE ABILITY', centerX, cardY + 175);
      }
    }

    // Skip button
    const skipW = 160;
    const skipH = 36;
    const skipX = (w - skipW) / 2;
    const skipY = cardY + cardH + 25;
    this.skipRect = { x: skipX, y: skipY, w: skipW, h: skipH };

    ctx.fillStyle = this.hoverIndex === 99 ? 'rgba(60,60,60,0.8)' : 'rgba(30,30,30,0.7)';
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(skipX, skipY, skipW, skipH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.font = '13px monospace';
    ctx.fillStyle = '#888888';
    ctx.fillText('Decline all offers', w / 2, skipY + 23);

    ctx.restore();
  }
}
