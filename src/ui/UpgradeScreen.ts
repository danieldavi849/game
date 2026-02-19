import { UpgradeDef } from '../types/index.ts';
import { easeOutCubic } from '../utils/MathUtils.ts';

/** All possible upgrades the player can be offered between tiers */
const ALL_UPGRADES: UpgradeDef[] = [
  {
    id: 'speed_boost',
    name: 'Velocity Surge',
    description: '+15% movement speed',
    cost: 5,
    color: '#44ddff',
    apply: (ctrl) => { ctrl.speed *= 1.15; },
  },
  {
    id: 'energy_tank',
    name: 'Energy Reservoir',
    description: '+25 max energy',
    cost: 4,
    color: '#44ff44',
    apply: (ctrl) => { ctrl.energy = Math.min(ctrl.energy + 25, 125); },
  },
  {
    id: 'shield_up',
    name: 'Hardened Shell',
    description: '+2 max shield HP',
    cost: 6,
    color: '#8888ff',
    apply: (ctrl) => {
      ctrl.maxShieldHP += 2;
      ctrl.shieldHP += 2;
    },
  },
  {
    id: 'regen_burst',
    name: 'Energy Burst',
    description: 'Restore energy to full',
    cost: 3,
    color: '#ffff44',
    apply: (ctrl) => { ctrl.energy = 100; },
  },
  {
    id: 'mass_head_start',
    name: 'Mass Primer',
    description: 'Start next tier with +30 mass',
    cost: 5,
    color: '#ff88ff',
    apply: (_ctrl) => {
      // Applied specially by Game.ts after tier reset
    },
  },
  {
    id: 'speed_minor',
    name: 'Quick Step',
    description: '+8% movement speed',
    cost: 2,
    color: '#88eeff',
    apply: (ctrl) => { ctrl.speed *= 1.08; },
  },
];

/** Pick N random unique upgrades from the pool */
function pickRandomUpgrades(count: number, availableCp: number): UpgradeDef[] {
  const affordable = ALL_UPGRADES.filter(u => u.cost <= availableCp);
  const shuffled = [...affordable].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** Between-tier upgrade selection screen */
export class UpgradeScreen {
  private visible = false;
  private choices: UpgradeDef[] = [];
  private playerCp = 0;
  private hoverIndex = -1;
  private fadeIn = 0;
  private onSelect: ((upgrade: UpgradeDef | null) => void) | null = null;

  // Cached button rects for click detection
  private buttonRects: Array<{ x: number; y: number; w: number; h: number }> = [];
  private skipRect = { x: 0, y: 0, w: 0, h: 0 };

  show(cp: number, onSelect: (upgrade: UpgradeDef | null) => void): void {
    this.visible = true;
    this.playerCp = cp;
    this.choices = pickRandomUpgrades(3, cp);
    this.onSelect = onSelect;
    this.fadeIn = 0;
    this.hoverIndex = -1;
  }

  hide(): void {
    this.visible = false;
    this.onSelect = null;
  }

  isVisible(): boolean {
    return this.visible;
  }

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

    // Skip button
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

    // Dark overlay
    ctx.fillStyle = `rgba(0,0,0,${alpha * 0.75})`;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    ctx.save();
    ctx.globalAlpha = alpha;

    // Title
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffdd44';
    ctx.shadowColor = '#ffdd44';
    ctx.shadowBlur = 15;
    ctx.fillText('CHOOSE UPGRADE', screenWidth / 2, screenHeight * 0.18);
    ctx.shadowBlur = 0;

    // CP display
    ctx.font = '16px monospace';
    ctx.fillStyle = '#ffdd44';
    ctx.fillText(`CP Available: ${this.playerCp}`, screenWidth / 2, screenHeight * 0.24);

    // Upgrade cards
    const cardW = 180;
    const cardH = 160;
    const gap = 24;
    const totalW = this.choices.length * cardW + (this.choices.length - 1) * gap;
    const startX = (screenWidth - totalW) / 2;
    const cardY = screenHeight * 0.32;

    this.buttonRects.length = 0;

    for (let i = 0; i < this.choices.length; i++) {
      const upgrade = this.choices[i];
      const cx = startX + i * (cardW + gap);
      const canAfford = this.playerCp >= upgrade.cost;
      const isHover = this.hoverIndex === i;

      this.buttonRects.push({ x: cx, y: cardY, w: cardW, h: cardH });

      // Card background
      ctx.fillStyle = isHover && canAfford
        ? `rgba(60,60,80,0.95)`
        : `rgba(30,30,45,0.9)`;
      ctx.strokeStyle = canAfford ? upgrade.color : '#444444';
      ctx.lineWidth = isHover && canAfford ? 3 : 1.5;

      // Rounded rect
      const r = 8;
      ctx.beginPath();
      ctx.moveTo(cx + r, cardY);
      ctx.lineTo(cx + cardW - r, cardY);
      ctx.quadraticCurveTo(cx + cardW, cardY, cx + cardW, cardY + r);
      ctx.lineTo(cx + cardW, cardY + cardH - r);
      ctx.quadraticCurveTo(cx + cardW, cardY + cardH, cx + cardW - r, cardY + cardH);
      ctx.lineTo(cx + r, cardY + cardH);
      ctx.quadraticCurveTo(cx, cardY + cardH, cx, cardY + cardH - r);
      ctx.lineTo(cx, cardY + r);
      ctx.quadraticCurveTo(cx, cardY, cx + r, cardY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const centerX = cx + cardW / 2;

      // Upgrade name
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = canAfford ? upgrade.color : '#666666';
      ctx.textAlign = 'center';
      ctx.fillText(upgrade.name, centerX, cardY + 35);

      // Description
      ctx.font = '12px monospace';
      ctx.fillStyle = canAfford ? '#cccccc' : '#555555';
      ctx.fillText(upgrade.description, centerX, cardY + 65);

      // Cost
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = canAfford ? '#ffdd44' : '#663322';
      ctx.fillText(`${upgrade.cost} CP`, centerX, cardY + 105);

      if (!canAfford) {
        ctx.font = '10px monospace';
        ctx.fillStyle = '#ff4444';
        ctx.fillText('Not enough CP', centerX, cardY + 125);
      }
    }

    // Skip button
    const skipW = 120;
    const skipH = 36;
    const skipX = (screenWidth - skipW) / 2;
    const skipY = cardY + cardH + 30;
    this.skipRect = { x: skipX, y: skipY, w: skipW, h: skipH };

    ctx.fillStyle = 'rgba(40,40,40,0.8)';
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(skipX, skipY, skipW, skipH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = '14px monospace';
    ctx.fillStyle = '#999999';
    ctx.textAlign = 'center';
    ctx.fillText('Skip', screenWidth / 2, skipY + 23);

    ctx.restore();
  }
}
