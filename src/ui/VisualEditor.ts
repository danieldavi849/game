import { BackgroundConfig } from '../types/index.ts';

/** The full visual theme that the editor can override */
export interface VisualTheme {
  background: BackgroundConfig & { pixiBaseColor: string };
  hud: {
    evoBarColor: string;
    energyBarColor: string;
    barWidth: number;
    barHeight: number;
    padding: number;
    minimapSize: number;
  };
  player: {
    color: string;
    glowColor: string;
    glowRadius: number;
    baseRadius: number;
  };
}

const STORAGE_KEY = 'ascension_visual_theme';

export const VISUAL_DEFAULTS: VisualTheme = {
  background: {
    pixiBaseColor: '#050510',
    baseColor: '#040408',
    gridColor: '#0a0a1a',
    gridSpacing: 60,
    particleDensity: 80,
    particleColor: '#223355',
  },
  hud: {
    evoBarColor: '#aa44ff',
    energyBarColor: '#44ff44',
    barWidth: 200,
    barHeight: 14,
    padding: 16,
    minimapSize: 140,
  },
  player: {
    color: '#cc44ff',
    glowColor: '#cc44ff',
    glowRadius: 15,
    baseRadius: 10,
  },
};

/**
 * In-game visual editor — an HTML overlay panel toggled with F2.
 * Lets you edit background colors, grid, HUD sizing/colors, and player visuals.
 * Changes are persisted to localStorage.
 */
export class VisualEditor {
  private visible = false;
  private panel!: HTMLDivElement;
  private theme: VisualTheme;
  private onApply: (theme: VisualTheme) => void;

  // Drag state
  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private panelX = 20;
  private panelY = 60;

  constructor(onApply: (theme: VisualTheme) => void) {
    this.onApply = onApply;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<VisualTheme>;
        this.theme = {
          background: { ...VISUAL_DEFAULTS.background, ...parsed.background },
          hud: { ...VISUAL_DEFAULTS.hud, ...parsed.hud },
          player: { ...VISUAL_DEFAULTS.player, ...parsed.player },
        };
      } catch {
        this.theme = this.cloneDefaults();
      }
    } else {
      this.theme = this.cloneDefaults();
    }

    this.buildPanel();
  }

  /** Returns a deep copy of the current theme */
  getCurrentTheme(): VisualTheme {
    return JSON.parse(JSON.stringify(this.theme)) as VisualTheme;
  }

  /** Show or hide the editor panel */
  toggle(): void {
    this.visible = !this.visible;
    this.panel.style.display = this.visible ? 'flex' : 'none';
    if (this.visible) this.syncInputsToTheme();
  }

  isVisible(): boolean {
    return this.visible;
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private cloneDefaults(): VisualTheme {
    return JSON.parse(JSON.stringify(VISUAL_DEFAULTS)) as VisualTheme;
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.theme));
  }

  private applyAndSave(): void {
    this.save();
    this.onApply(this.getCurrentTheme());
  }

  // ─── Panel construction ──────────────────────────────────────────────────────

  private buildPanel(): void {
    this.panel = document.createElement('div');
    this.applyPanelStyles(this.panel);

    this.panel.appendChild(this.buildHeader());

    const content = document.createElement('div');
    Object.assign(content.style, {
      padding: '10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      overflowY: 'auto',
      maxHeight: 'calc(80vh - 40px)',
    });

    content.appendChild(this.buildSection('BACKGROUND', [
      this.colorRow('PIXI Base Color', 'background.pixiBaseColor'),
      this.colorRow('Grid Color', 'background.gridColor'),
      this.colorRow('Particle Color', 'background.particleColor'),
      this.sliderRow('Grid Spacing', 'background.gridSpacing', 20, 200, 5),
      this.sliderRow('Particle Density', 'background.particleDensity', 0, 200, 1),
    ]));

    content.appendChild(this.buildSection('HUD', [
      this.colorRow('Evo Bar Color', 'hud.evoBarColor'),
      this.colorRow('Energy Bar Color', 'hud.energyBarColor'),
      this.sliderRow('Bar Width', 'hud.barWidth', 60, 420, 4),
      this.sliderRow('Bar Height', 'hud.barHeight', 6, 30, 2),
      this.sliderRow('HUD Padding', 'hud.padding', 4, 60, 2),
      this.sliderRow('Minimap Size', 'hud.minimapSize', 60, 300, 4),
    ]));

    content.appendChild(this.buildSection('PLAYER', [
      this.colorRow('Color', 'player.color'),
      this.colorRow('Glow Color', 'player.glowColor'),
      this.sliderRow('Glow Radius', 'player.glowRadius', 0, 80, 1),
      this.sliderRow('Base Radius', 'player.baseRadius', 4, 50, 1),
    ]));

    content.appendChild(this.buildFooter());
    this.panel.appendChild(content);

    document.body.appendChild(this.panel);
  }

  private applyPanelStyles(el: HTMLDivElement): void {
    Object.assign(el.style, {
      position: 'fixed',
      top: `${this.panelY}px`,
      left: `${this.panelX}px`,
      width: '290px',
      backgroundColor: 'rgba(8, 8, 22, 0.96)',
      border: '1px solid #4433aa',
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#cccccc',
      display: 'none',
      flexDirection: 'column',
      zIndex: '99999',
      userSelect: 'none',
      boxShadow: '0 6px 32px rgba(0,0,0,0.9)',
      backdropFilter: 'blur(4px)',
    });
  }

  private buildHeader(): HTMLDivElement {
    const header = document.createElement('div');
    Object.assign(header.style, {
      padding: '8px 12px',
      background: 'linear-gradient(90deg, rgba(80,30,160,0.8), rgba(40,20,100,0.8))',
      borderRadius: '7px 7px 0 0',
      cursor: 'grab',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontWeight: 'bold',
      color: '#cc88ff',
      fontSize: '12px',
      letterSpacing: '2px',
      flexShrink: '0',
    } as CSSStyleDeclaration);

    const title = document.createElement('span');
    title.textContent = '✦ VISUAL EDITOR';

    const hint = document.createElement('span');
    hint.textContent = 'F2';
    Object.assign(hint.style, {
      fontSize: '9px',
      color: '#8866cc',
      marginRight: '8px',
    });

    const closeBtn = document.createElement('span');
    closeBtn.textContent = '✕';
    Object.assign(closeBtn.style, { cursor: 'pointer', color: '#ff6666' });
    closeBtn.addEventListener('click', () => this.toggle());

    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.alignItems = 'center';
    right.style.gap = '6px';
    right.appendChild(hint);
    right.appendChild(closeBtn);

    header.appendChild(title);
    header.appendChild(right);

    // Drag support
    header.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragOffsetX = e.clientX - this.panelX;
      this.dragOffsetY = e.clientY - this.panelY;
      header.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.panelX = e.clientX - this.dragOffsetX;
      this.panelY = e.clientY - this.dragOffsetY;
      this.panel.style.left = `${this.panelX}px`;
      this.panel.style.top = `${this.panelY}px`;
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        header.style.cursor = 'grab';
      }
    });

    return header;
  }

  private buildSection(title: string, rows: HTMLElement[]): HTMLElement {
    const section = document.createElement('div');
    Object.assign(section.style, {
      border: '1px solid rgba(80,50,180,0.35)',
      borderRadius: '5px',
      overflow: 'hidden',
    });

    const titleEl = document.createElement('div');
    Object.assign(titleEl.style, {
      padding: '5px 8px',
      background: 'rgba(60,30,100,0.5)',
      color: '#aa77ff',
      fontWeight: 'bold',
      fontSize: '10px',
      letterSpacing: '1.5px',
    });
    titleEl.textContent = title;

    const body = document.createElement('div');
    Object.assign(body.style, {
      padding: '6px 8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
    });

    for (const row of rows) body.appendChild(row);

    section.appendChild(titleEl);
    section.appendChild(body);
    return section;
  }

  private buildFooter(): HTMLElement {
    const footer = document.createElement('div');
    Object.assign(footer.style, {
      display: 'flex',
      gap: '6px',
      marginTop: '2px',
    });

    const resetBtn = this.makeButton('↺ RESET DEFAULTS', '#ff6655');
    resetBtn.title = 'Revert all values to defaults';
    resetBtn.addEventListener('click', () => {
      this.theme = this.cloneDefaults();
      this.syncInputsToTheme();
      this.applyAndSave();
    });

    const copyBtn = this.makeButton('⎘ COPY JSON', '#44aaff');
    copyBtn.title = 'Copy theme JSON to clipboard';
    copyBtn.addEventListener('click', () => {
      const json = JSON.stringify(this.theme, null, 2);
      navigator.clipboard.writeText(json).catch(() => {
        // Fallback for environments without clipboard API
        const ta = document.createElement('textarea');
        ta.value = json;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      });
    });

    footer.appendChild(resetBtn);
    footer.appendChild(copyBtn);
    return footer;
  }

  private makeButton(label: string, borderColor: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    Object.assign(btn.style, {
      flex: '1',
      padding: '5px 4px',
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${borderColor}`,
      borderRadius: '4px',
      color: borderColor,
      cursor: 'pointer',
      fontFamily: 'monospace',
      fontSize: '10px',
      letterSpacing: '0.5px',
    });
    btn.addEventListener('mouseover', () => {
      btn.style.background = `${borderColor}22`;
    });
    btn.addEventListener('mouseout', () => {
      btn.style.background = 'rgba(255,255,255,0.04)';
    });
    return btn;
  }

  // ─── Row builders ────────────────────────────────────────────────────────────

  private colorRow(label: string, path: string): HTMLElement {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    });

    const lbl = document.createElement('span');
    lbl.textContent = label;
    Object.assign(lbl.style, { color: '#aaaacc', flex: '1' });

    const swatchWrapper = document.createElement('div');
    Object.assign(swatchWrapper.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    });

    const hexDisplay = document.createElement('span');
    hexDisplay.textContent = String(this.getByPath(path));
    Object.assign(hexDisplay.style, {
      color: '#888',
      fontSize: '10px',
      minWidth: '54px',
      textAlign: 'right',
    });

    const input = document.createElement('input');
    input.type = 'color';
    input.dataset.path = path;
    input.value = String(this.getByPath(path));
    Object.assign(input.style, {
      width: '28px',
      height: '22px',
      border: '1px solid #443366',
      borderRadius: '3px',
      padding: '1px',
      cursor: 'pointer',
      background: 'none',
    });

    input.addEventListener('input', () => {
      this.setByPath(path, input.value);
      hexDisplay.textContent = input.value;
      this.applyAndSave();
    });

    swatchWrapper.appendChild(hexDisplay);
    swatchWrapper.appendChild(input);
    row.appendChild(lbl);
    row.appendChild(swatchWrapper);
    return row;
  }

  private sliderRow(label: string, path: string, min: number, max: number, step: number): HTMLElement {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    });

    const lbl = document.createElement('span');
    lbl.textContent = label;
    Object.assign(lbl.style, { color: '#aaaacc', minWidth: '110px', fontSize: '10px' });

    const currentVal = this.getByPath(path) as number;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.dataset.path = path;
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(currentVal);
    Object.assign(slider.style, {
      flex: '1',
      accentColor: '#8844ff',
      cursor: 'pointer',
    });

    const valDisplay = document.createElement('span');
    valDisplay.textContent = String(currentVal);
    Object.assign(valDisplay.style, {
      color: '#ffffff',
      minWidth: '30px',
      textAlign: 'right',
      fontSize: '10px',
    });

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      this.setByPath(path, val);
      valDisplay.textContent = String(val);
      this.applyAndSave();
    });

    row.appendChild(lbl);
    row.appendChild(slider);
    row.appendChild(valDisplay);
    return row;
  }

  // ─── Theme path helpers ──────────────────────────────────────────────────────

  private getByPath(path: string): string | number {
    const [section, key] = path.split('.') as [keyof VisualTheme, string];
    return (this.theme[section] as Record<string, string | number>)[key];
  }

  private setByPath(path: string, value: string | number): void {
    const [section, key] = path.split('.') as [keyof VisualTheme, string];
    (this.theme[section] as Record<string, string | number>)[key] = value;
  }

  /** Sync all input elements to current theme values (e.g. after reset) */
  private syncInputsToTheme(): void {
    const inputs = this.panel.querySelectorAll<HTMLInputElement>('input[data-path]');
    for (const input of inputs) {
      const path = input.dataset.path!;
      const val = this.getByPath(path);
      input.value = String(val);

      if (input.type === 'range') {
        // Update value display sibling
        const display = input.nextElementSibling as HTMLElement | null;
        if (display) display.textContent = String(val);
      } else if (input.type === 'color') {
        // Update hex display sibling (previous element)
        const display = input.previousElementSibling as HTMLElement | null;
        if (display) display.textContent = String(val);
      }
    }
  }
}
