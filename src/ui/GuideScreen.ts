import { easeOutCubic } from '../utils/MathUtils.ts';

/** Glossary/Guide overlay explaining game mechanics */
export class GuideScreen {
    private visible = false;
    private fadeIn = 0;
    private backRect = { x: 0, y: 0, w: 0, h: 0 };
    private hoverBack = false;

    private onBack?: () => void;

    /** Show the guide and set callback for returning to menu */
    show(onBack: () => void): void {
        this.visible = true;
        this.fadeIn = 0;
        this.onBack = onBack;
    }

    hide(): void {
        this.visible = false;
    }

    isVisible(): boolean {
        return this.visible;
    }

    update(dt: number): void {
        if (!this.visible) return;
        this.fadeIn = Math.min(this.fadeIn + dt * 2, 1);
    }

    handleMouseMove(x: number, y: number): void {
        if (!this.visible) return;
        this.hoverBack = this.hitTest(x, y, this.backRect);
    }

    handleClick(x: number, y: number): boolean {
        if (!this.visible) return false;
        if (this.hitTest(x, y, this.backRect)) {
            if (this.onBack) this.onBack();
            return true;
        }
        return false;
    }

    private hitTest(x: number, y: number, rect: { x: number; y: number; w: number; h: number }): boolean {
        return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
    }

    render(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
        if (!this.visible) return;

        const alpha = easeOutCubic(this.fadeIn);

        // Dark overlay
        ctx.fillStyle = `rgba(5, 5, 10, ${alpha * 0.95})`;
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        ctx.save();
        ctx.globalAlpha = alpha;

        // Header
        const titleY = 80;
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#44ffaa';
        ctx.fillText('ASCENSION: SURVIVAL GUIDE', screenWidth / 2, titleY);

        // Panel background
        const panelW = Math.min(800, screenWidth - 100);
        const panelH = screenHeight - 200;
        const panelX = (screenWidth - panelW) / 2;
        const panelY = 120;

        ctx.fillStyle = 'rgba(20, 20, 30, 0.8)';
        ctx.strokeStyle = '#334466';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 12);
        ctx.fill();
        ctx.stroke();

        // Content columns
        const col1X = panelX + 30;
        const col2X = panelX + panelW / 2 + 10;
        let textY = panelY + 40;

        // Left Column: Mechanics
        ctx.textAlign = 'left';
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = '#ffaa33';
        ctx.fillText('CORE MECHANICS', col1X, textY);
        textY += 30;

        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#888888';
        const drawLine = (text: string, x: number, y: number, color = '#cccccc') => {
            ctx.fillStyle = color;
            ctx.fillText(text, x, y);
            return y + 22;
        };

        textY = drawLine('1. CONSUME TO GROW', col1X, textY, '#ffffff');
        ctx.font = '12px monospace';
        textY = drawLine('Eat smaller entities to gain Mass and Energy.', col1X, textY);
        textY = drawLine('If you run out of Energy, you dissolve.', col1X, textY);
        textY += 15;

        ctx.font = 'bold 14px monospace';
        textY = drawLine('2. UNIVERSAL DASH [Space / Shift]', col1X, textY, '#ffffff');
        ctx.font = '12px monospace';
        textY = drawLine('Dash through hazards to gain brief invincibility.', col1X, textY);
        textY = drawLine('Has a 2-second cooldown.', col1X, textY);
        textY += 15;

        ctx.font = 'bold 14px monospace';
        textY = drawLine('3. COMPLEXITY POINTS (CP)', col1X, textY, '#ffffff');
        ctx.font = '12px monospace';
        textY = drawLine('Rare entities and surviving tiers grants CP.', col1X, textY);
        textY = drawLine('Use CP in the shop between tiers for upgrades.', col1X, textY);
        textY += 15;

        ctx.font = 'bold 14px monospace';
        textY = drawLine('4. EVOLUTION TIERS', col1X, textY, '#ffffff');
        ctx.font = '12px monospace';
        textY = drawLine('Subatomic -> Atomic -> Molecular.', col1X, textY);
        textY = drawLine('Each tier features completely new ecosystems,', col1X, textY);
        textY = drawLine('hazards, movement physics, and AI behaviors.', col1X, textY);

        // Right Column: Build Slots (Balatro Style)
        textY = panelY + 40;
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = '#cc44ff';
        ctx.fillText('EVOLUTION SLOTS', col2X, textY);
        textY += 30;

        ctx.font = 'bold 14px monospace';
        textY = drawLine('[5] MUTATION SLOTS (Passives)', col2X, textY, '#aa88ff');
        ctx.font = '12px monospace';
        textY = drawLine('You can hold exactly 5 Mutations. These provide', col2X, textY);
        textY = drawLine('run-defining passive synergies. If full, you', col2X, textY);
        textY = drawLine('must replace one to equip another.', col2X, textY);
        textY += 15;

        ctx.font = 'bold 14px monospace';
        textY = drawLine('[1] ACTIVE ABILITY (Override Dash)', col2X, textY, '#44aaff');
        ctx.font = '12px monospace';
        textY = drawLine('Replaces your basic dash with a powerful skill', col2X, textY);
        textY = drawLine('(e.g. Black Hole, Toxic Trail). Max 1.', col2X, textY);
        textY += 15;

        ctx.font = 'bold 14px monospace';
        textY = drawLine('[3] CATALYST SLOTS (Consumables)', col2X, textY, '#ffaa44');
        ctx.font = '12px monospace';
        textY = drawLine('Single-use items triggered via keys 1, 2, 3.', col2X, textY);
        textY = drawLine('Used for emergency survival or mass spikes.', col2X, textY);

        // Back Button
        const btnW = 160;
        const btnH = 46;
        const btnX = (screenWidth - btnW) / 2;
        const btnY = panelY + panelH + 20;
        this.backRect = { x: btnX, y: btnY, w: btnW, h: btnH };

        ctx.fillStyle = this.hoverBack ? 'rgba(80, 200, 150, 0.25)' : 'rgba(80, 200, 150, 0.1)';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 8);
        ctx.fill();
        ctx.strokeStyle = this.hoverBack ? '#44ffaa' : '#228855';
        ctx.lineWidth = this.hoverBack ? 3 : 1.5;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 8);
        ctx.stroke();

        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('BACK TO MENU', screenWidth / 2, btnY + 28);

        ctx.restore();
    }
}
