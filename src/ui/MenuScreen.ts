import { easeOutCubic } from '../utils/MathUtils.ts';

/** Main menu screen shown on launch */
export class MenuScreen {
  private visible = false;
  private fadeIn = 0;
  private debugEnabled = false;
  private hoverIndex = -1;
  private particleTimer = 0;
  private particles: Array<{ x: number; y: number; vx: number; vy: number; r: number; color: string; life: number }> = [];

  // Button rects for hit testing
  private startRect = { x: 0, y: 0, w: 0, h: 0 };
  private guideRect = { x: 0, y: 0, w: 0, h: 0 };
  private debugRect = { x: 0, y: 0, w: 0, h: 0 };

  show(): void {
    this.visible = true;
    this.fadeIn = 0;
    this.debugEnabled = false;
    this.particles = [];
  }

  hide(): void {
    this.visible = false;
  }

  isVisible(): boolean {
    return this.visible;
  }

  update(dt: number): void {
    if (!this.visible) return;
    this.fadeIn = Math.min(this.fadeIn + dt * 1.5, 1);

    // Ambient particles
    this.particleTimer += dt;
    if (this.particleTimer > 0.08) {
      this.particleTimer = 0;
      const colors = ['#cc44ff', '#4488ff', '#44ffaa', '#ff6644', '#ffff44'];
      this.particles.push({
        x: Math.random() * 2000,
        y: Math.random() * 1200,
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        r: Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
      });
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 0.3;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  handleMouseMove(x: number, y: number): void {
    if (!this.visible) return;
    this.hoverIndex = -1;
    if (this.hitTest(x, y, this.startRect)) this.hoverIndex = 0;
    if (this.hitTest(x, y, this.guideRect)) this.hoverIndex = 1;
    if (this.hitTest(x, y, this.debugRect)) this.hoverIndex = 2;
  }

  handleClick(x: number, y: number, _w: number, _h: number): { debug?: boolean, guide?: boolean } | null {
    if (!this.visible || this.fadeIn < 0.5) return null;

    if (this.hitTest(x, y, this.startRect)) {
      return { debug: this.debugEnabled };
    }

    if (this.hitTest(x, y, this.guideRect)) {
      return { guide: true };
    }

    if (this.hitTest(x, y, this.debugRect)) {
      this.debugEnabled = !this.debugEnabled;
      return null; // Toggle only, don't start
    }

    return null;
  }

  private hitTest(x: number, y: number, rect: { x: number; y: number; w: number; h: number }): boolean {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  render(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
    if (!this.visible) return;

    const alpha = easeOutCubic(this.fadeIn);

    // Background
    ctx.fillStyle = '#020408';
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    // Ambient particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life * 0.4 * alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(
        (p.x / 2000) * screenWidth,
        (p.y / 1200) * screenHeight,
        p.r,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Title
    const titleY = screenHeight * 0.25;
    ctx.font = 'bold 64px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#cc44ff';
    ctx.shadowColor = '#cc44ff';
    ctx.shadowBlur = 30;
    ctx.fillText('ASCENSION', screenWidth / 2, titleY);

    ctx.shadowBlur = 0;
    ctx.font = '16px monospace';
    ctx.fillStyle = '#8866aa';
    ctx.fillText('From particle to molecule', screenWidth / 2, titleY + 35);

    // Start button
    const btnW = 240;
    const btnH = 56;
    const startX = (screenWidth - btnW) / 2;
    const startY = screenHeight * 0.48;
    this.startRect = { x: startX, y: startY, w: btnW, h: btnH };

    const startHover = this.hoverIndex === 0;
    ctx.fillStyle = startHover ? 'rgba(200,68,255,0.25)' : 'rgba(200,68,255,0.1)';
    ctx.beginPath();
    ctx.roundRect(startX, startY, btnW, btnH, 8);
    ctx.fill();
    ctx.strokeStyle = startHover ? '#cc44ff' : '#8844aa';
    ctx.lineWidth = startHover ? 3 : 1.5;
    ctx.beginPath();
    ctx.roundRect(startX, startY, btnW, btnH, 8);
    ctx.stroke();

    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('START GAME', screenWidth / 2, startY + 36);

    // Guide/Glossary button
    const gBtnW = 240;
    const gBtnH = 44;
    const gBtnX = (screenWidth - gBtnW) / 2;
    const gBtnY = startY + btnH + 15;
    this.guideRect = { x: gBtnX, y: gBtnY, w: gBtnW, h: gBtnH };

    const gHover = this.hoverIndex === 1;
    ctx.fillStyle = gHover ? 'rgba(68, 255, 170, 0.25)' : 'rgba(68, 255, 170, 0.1)';
    ctx.beginPath();
    ctx.roundRect(gBtnX, gBtnY, gBtnW, gBtnH, 8);
    ctx.fill();
    ctx.strokeStyle = gHover ? '#44ffaa' : '#228855';
    ctx.lineWidth = gHover ? 2 : 1.5;
    ctx.beginPath();
    ctx.roundRect(gBtnX, gBtnY, gBtnW, gBtnH, 8);
    ctx.stroke();

    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('GLOSSARY / GUIDE', screenWidth / 2, gBtnY + 28);

    // Debug mode toggle
    const dbgW = 240;
    const dbgH = 44;
    const dbgX = (screenWidth - dbgW) / 2;
    const dbgY = gBtnY + gBtnH + 15;
    this.debugRect = { x: dbgX, y: dbgY, w: dbgW, h: dbgH };

    const dbgHover = this.hoverIndex === 2;
    ctx.fillStyle = this.debugEnabled
      ? 'rgba(255,180,50,0.2)'
      : dbgHover ? 'rgba(100,100,100,0.15)' : 'rgba(50,50,50,0.1)';
    ctx.beginPath();
    ctx.roundRect(dbgX, dbgY, dbgW, dbgH, 6);
    ctx.fill();
    ctx.strokeStyle = this.debugEnabled ? '#ffaa33' : '#555555';
    ctx.lineWidth = this.debugEnabled ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(dbgX, dbgY, dbgW, dbgH, 6);
    ctx.stroke();

    // Checkbox indicator
    const cbSize = 16;
    const cbX = dbgX + 16;
    const cbY = dbgY + (dbgH - cbSize) / 2;
    ctx.strokeStyle = this.debugEnabled ? '#ffaa33' : '#666666';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cbX, cbY, cbSize, cbSize);
    if (this.debugEnabled) {
      ctx.fillStyle = '#ffaa33';
      ctx.fillRect(cbX + 3, cbY + 3, cbSize - 6, cbSize - 6);
    }

    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = this.debugEnabled ? '#ffaa33' : '#888888';
    ctx.fillText('Debug Mode', cbX + cbSize + 10, dbgY + 28);

    // Debug description
    if (this.debugEnabled) {
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#997744';
      ctx.fillText('N: skip tier | G: god mode | M: +mass | E: refill | C: +CP', screenWidth / 2, dbgY + dbgH + 20);
    }

    // Version
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#333344';
    ctx.fillText('v0.2.0 — multiplayer roguelike preview', screenWidth / 2, screenHeight - 20);

    ctx.restore();
  }
}
