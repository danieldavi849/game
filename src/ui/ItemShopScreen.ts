import { easeOutCubic } from '../utils/MathUtils.ts';
import { ALL_ITEMS, BASIC_ITEMS, COMPLETED_ITEMS, ItemDef, calculateBuildCost, getItemById } from '../items/ItemDefs.ts';

export class ItemShopScreen {
    private visible = false;
    private playerCp = 0;
    private ownedItemIds: string[] = [];
    private onBuy: ((itemId: string, cost: number, consumed: string[]) => void) | null = null;
    private fadeIn = 0;

    // UI state
    private selectedItem: ItemDef | null = null;
    private hoverIndex = -1;
    private basicRects: Array<{ id: string; x: number; y: number; w: number; h: number }> = [];
    private completedRects: Array<{ id: string; x: number; y: number; w: number; h: number }> = [];
    private buyRect = { x: 0, y: 0, w: 0, h: 0 };
    private closeRect = { x: 0, y: 0, w: 0, h: 0 };

    show(cp: number, ownedItemIds: string[], onBuy: (itemId: string, cost: number, consumed: string[]) => void): void {
        this.visible = true;
        this.playerCp = cp;
        this.ownedItemIds = [...ownedItemIds];
        this.onBuy = onBuy;
        this.fadeIn = 0;
        this.hoverIndex = -1;
        this.selectedItem = null;
    }

    hide(): void {
        this.visible = false;
        this.onBuy = null;
    }

    isVisible(): boolean {
        return this.visible;
    }

    update(dt: number): void {
        if (!this.visible) return;
        this.fadeIn = Math.min(this.fadeIn + dt * 4, 1);
    }

    handleMouseMove(x: number, y: number): void {
        if (!this.visible) return;
        this.hoverIndex = -1;

        let index = 0;
        for (const r of this.basicRects) {
            if (this.hitTest(x, y, r)) { this.hoverIndex = index; return; }
            index++;
        }
        for (const r of this.completedRects) {
            if (this.hitTest(x, y, r)) { this.hoverIndex = index; return; }
            index++;
        }
    }

    handleClick(x: number, y: number): boolean {
        if (!this.visible || this.fadeIn < 0.8) return false;

        // Close button
        if (this.hitTest(x, y, this.closeRect)) {
            this.hide();
            return true;
        }

        // Buy button
        if (this.selectedItem && this.hitTest(x, y, this.buyRect)) {
            const { cost, consumed } = calculateBuildCost(this.selectedItem, this.ownedItemIds);
            if (this.playerCp >= cost) {
                this.onBuy?.(this.selectedItem.id, cost, consumed);

                // Optimistic UI update so we can keep buying without closing
                this.playerCp -= cost;
                for (const c of consumed) {
                    const idx = this.ownedItemIds.indexOf(c);
                    if (idx !== -1) this.ownedItemIds.splice(idx, 1);
                }
                this.ownedItemIds.push(this.selectedItem.id);
            }
            return true;
        }

        // Item selection
        for (const r of this.basicRects) {
            if (this.hitTest(x, y, r)) {
                this.selectedItem = ALL_ITEMS.find(i => i.id === r.id)!;
                return true;
            }
        }
        for (const r of this.completedRects) {
            if (this.hitTest(x, y, r)) {
                this.selectedItem = ALL_ITEMS.find(i => i.id === r.id)!;
                return true;
            }
        }

        return true; // Clicked on background
    }

    private hitTest(x: number, y: number, r: { x: number; y: number; w: number; h: number }): boolean {
        return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    }

    render(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
        if (!this.visible) return;

        const alpha = easeOutCubic(this.fadeIn);
        ctx.globalAlpha = alpha;

        // Dim background
        ctx.fillStyle = `rgba(0, 0, 0, ${0.85 * alpha})`;
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        // Layout margins
        const margin = 40;
        const panelY = margin + 40;
        const panelH = screenHeight - panelY - margin;

        // ─── LEFT: INVENTORY ───
        const leftW = screenWidth * 0.2;
        this.renderInventoryPanel(ctx, margin, panelY, leftW, panelH);

        // ─── CENTER: SHOP ITEMS ───
        const centerW = screenWidth * 0.45;
        const centerX = margin + leftW + 20;
        this.renderShopPanel(ctx, centerX, panelY, centerW, panelH);

        // ─── RIGHT: BUILD PATH / DETAILS ───
        const rightX = centerX + centerW + 20;
        const rightW = screenWidth - rightX - margin;
        this.renderDetailsPanel(ctx, rightX, panelY, rightW, panelH);

        // Top Title
        ctx.font = 'bold 32px monospace';
        ctx.fillStyle = '#ffdd44';
        ctx.textAlign = 'left';
        ctx.fillText('ITEM SHOP', margin, margin + 20);

        // Close Instruction
        ctx.font = '14px monospace';
        ctx.fillStyle = '#888888';
        ctx.textAlign = 'right';
        ctx.fillText('Press [TAB] or click X to resume', screenWidth - margin, margin + 20);

        // Close Button X
        const cw = 30, ch = 30;
        this.closeRect = { x: screenWidth - margin - cw, y: margin - 5, w: cw, h: ch };
        ctx.fillStyle = 'rgba(255,50,50,0.2)';
        ctx.fillRect(this.closeRect.x, this.closeRect.y, cw, ch);
        ctx.fillStyle = '#ffaa33';
        ctx.textAlign = 'center';
        ctx.fillText('X', this.closeRect.x + cw / 2, this.closeRect.y + 20);

        ctx.globalAlpha = 1;
    }

    private renderInventoryPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
        this.drawPanel(ctx, x, y, w, h);

        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = '#ffaa33';
        ctx.textAlign = 'left';
        ctx.fillText(`YOUR CP: ${this.playerCp}`, x + 15, y + 25);

        ctx.fillStyle = '#cccccc';
        ctx.font = '14px monospace';
        ctx.fillText('INVENTORY', x + 15, y + 60);

        let drawY = y + 85;
        if (this.ownedItemIds.length === 0) {
            ctx.fillStyle = '#666666';
            ctx.fillText('(Empty)', x + 15, drawY);
        } else {
            for (const id of this.ownedItemIds) {
                const item = ALL_ITEMS.find(i => i.id === id);
                if (!item) continue;

                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(x + 15, drawY - 15, w - 30, 24);

                ctx.fillStyle = item.components.length > 0 ? '#ffaa33' : '#aaddff';
                ctx.fillText(item.name, x + 25, drawY);
                drawY += 30;
            }
        }
    }

    private renderShopPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
        this.drawPanel(ctx, x, y, w, h);
        this.basicRects = [];
        this.completedRects = [];

        // Basic Items
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = '#aaddff';
        ctx.textAlign = 'left';
        ctx.fillText('BASIC ITEMS', x + 15, y + 25);

        let drawX = x + 15;
        let drawY = y + 45;
        const btnW = (w - 50) / 2;
        const btnH = 40;

        let idx = 0;
        for (const item of BASIC_ITEMS) {
            if (idx % 2 === 0 && idx > 0) {
                drawX = x + 15;
                drawY += btnH + 10;
            }
            this.drawShopItemButton(ctx, item, drawX, drawY, btnW, btnH, this.basicRects);
            drawX += btnW + 10;
            idx++;
        }

        // Completed Items
        drawY += btnH + 30;
        drawX = x + 15;

        ctx.fillStyle = '#ffaa33';
        ctx.fillText('COMPLETED ITEMS', x + 15, drawY);
        drawY += 20;

        idx = 0;
        for (const item of COMPLETED_ITEMS) {
            if (idx % 2 === 0 && idx > 0) {
                drawX = x + 15;
                drawY += btnH + 10;
            }
            this.drawShopItemButton(ctx, item, drawX, drawY, btnW, btnH, this.completedRects);
            drawX += btnW + 10;
            idx++;
        }
    }

    private drawShopItemButton(
        ctx: CanvasRenderingContext2D,
        item: ItemDef,
        x: number, y: number, w: number, h: number,
        rectArray: any[]
    ) {
        rectArray.push({ id: item.id, x, y, w, h });

        // Is selected?
        const isSelected = this.selectedItem?.id === item.id;
        // Is owned?
        const isOwned = this.ownedItemIds.includes(item.id);

        ctx.fillStyle = isSelected
            ? 'rgba(255,170,51,0.2)'
            : isOwned
                ? 'rgba(50,255,50,0.1)'
                : 'rgba(255,255,255,0.05)';

        ctx.strokeStyle = isSelected ? '#ffaa33' : '#444444';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 4);
        ctx.fill();
        ctx.stroke();

        ctx.font = '12px monospace';
        ctx.fillStyle = isOwned ? '#88ff88' : '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(item.name, x + 8, y + h / 2 + 4);

        const { cost } = calculateBuildCost(item, this.ownedItemIds);
        ctx.fillStyle = '#ffaa33';
        ctx.textAlign = 'right';
        ctx.fillText(cost.toString(), x + w - 8, y + h / 2 + 4);
    }

    private renderDetailsPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
        this.drawPanel(ctx, x, y, w, h);

        if (!this.selectedItem) {
            ctx.font = '14px monospace';
            ctx.fillStyle = '#666666';
            ctx.textAlign = 'center';
            ctx.fillText('Select an item to view details', x + w / 2, y + h / 2);
            return;
        }

        const item = this.selectedItem;

        // Header
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = item.components.length > 0 ? '#ffaa33' : '#aaddff';
        ctx.textAlign = 'left';
        ctx.fillText(item.name, x + 15, y + 30);

        ctx.font = '12px monospace';
        ctx.fillStyle = '#cccccc';
        this.wrapText(ctx, item.description, x + 15, y + 55, w - 30, 16);

        // Stats
        let sy = y + 100;
        ctx.fillStyle = '#88ff88';
        if (item.stats.speedMult) { ctx.fillText(`+${Math.round((item.stats.speedMult - 1) * 100)}% Speed`, x + 15, sy); sy += 16; }
        if (item.stats.massGainMult) { ctx.fillText(`+${Math.round((item.stats.massGainMult - 1) * 100)}% Mass Gain`, x + 15, sy); sy += 16; }
        if (item.stats.energyMaxBonus) { ctx.fillText(`+${item.stats.energyMaxBonus} Max Energy`, x + 15, sy); sy += 16; }
        if (item.stats.attractRadius) { ctx.fillText(`+${item.stats.attractRadius} Magnet Radius`, x + 15, sy); sy += 16; }

        if (item.uniqueDescription) {
            sy += 10;
            ctx.fillStyle = '#ffaa33';
            ctx.fillText('UNIQUE PASSIVE:', x + 15, sy);
            sy += 16;
            ctx.fillStyle = '#ffcc88';
            this.wrapText(ctx, item.uniqueDescription, x + 15, sy, w - 30, 16);
            sy += 32;
        }

        // Build Path Diagram
        sy = y + 220;
        ctx.fillStyle = '#888888';
        ctx.fillText('BUILD PATH', x + 15, sy);
        sy += 20;

        if (item.components.length === 0) {
            ctx.fillStyle = '#555555';
            ctx.fillText('Base item (No components)', x + 15, sy);
        } else {
            // Draw a line
            ctx.strokeStyle = '#555555';
            ctx.beginPath();
            ctx.moveTo(x + 25, sy + 15);
            ctx.lineTo(x + 25, sy + 15 + item.components.length * 30);
            ctx.stroke();

            let cy = sy + 15;
            for (const compId of item.components) {
                const comp = getItemById(compId);
                if (!comp) continue;
                const owned = this.ownedItemIds.includes(compId);

                ctx.fillStyle = owned ? '#44ff44' : '#555555';
                ctx.beginPath();
                ctx.arc(x + 25, cy, 5, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = owned ? '#cccccc' : '#888888';
                ctx.fillText(`${comp.name} ${owned ? '(Owned)' : `(${comp.cost} CP)`}`, x + 40, cy + 4);
                cy += 30;
            }
        }

        // Buy Button
        const { cost } = calculateBuildCost(item, this.ownedItemIds);
        const canAfford = this.playerCp >= cost;

        const bw = w - 40;
        const bh = 50;
        const bx = x + 20;
        const by = y + h - bh - 20;
        this.buyRect = { x: bx, y: by, w: bw, h: bh };

        ctx.fillStyle = canAfford ? 'rgba(255,170,51,0.2)' : 'rgba(100,100,100,0.2)';
        ctx.strokeStyle = canAfford ? '#ffaa33' : '#555555';
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 6);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = canAfford ? '#ffffff' : '#888888';
        ctx.textAlign = 'center';

        if (this.ownedItemIds.includes(item.id)) {
            ctx.fillText('ALREADY OWNED', bx + bw / 2, by + 30);
        } else {
            ctx.fillText(`BUY FOR ${cost} CP`, bx + bw / 2, by + 30);
        }
    }

    private drawPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
        ctx.fillStyle = 'rgba(15, 18, 25, 0.9)';
        ctx.strokeStyle = '#333344';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
        ctx.stroke();
    }

    private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        for (const word of words) {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line !== '') {
                ctx.fillText(line, x, currentY);
                line = word + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
    }
}
