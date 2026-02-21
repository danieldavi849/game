import { GameLoop } from './core/GameLoop.ts';
import { EventBus } from './core/EventBus.ts';
import { Camera } from './core/Camera.ts';
import { InputManager } from './core/InputManager.ts';
import { World } from './ecs/World.ts';
import { Renderer } from './rendering/Renderer.ts';
import { Background } from './rendering/Background.ts';
import { InputSystem } from './systems/InputSystem.ts';
import { PhysicsSystem } from './systems/PhysicsSystem.ts';
import { CollisionSystem } from './systems/CollisionSystem.ts';
import { ConsumptionSystem } from './systems/ConsumptionSystem.ts';
import { AISystem } from './systems/AISystem.ts';
import { EnergySystem } from './systems/EnergySystem.ts';
import { EvolutionSystem } from './systems/EvolutionSystem.ts';
import { ParticleSystem } from './systems/ParticleSystem.ts';
import { CameraSystem } from './systems/CameraSystem.ts';
import { RenderSystem } from './systems/RenderSystem.ts';
import { RelicSystem } from './systems/RelicSystem.ts';
import { TierManager } from './tiers/TierManager.ts';
import { HUD } from './ui/HUD.ts';
import { DeathScreen } from './ui/DeathScreen.ts';
import { EvolutionScreen } from './ui/EvolutionScreen.ts';
import { WinScreen } from './ui/WinScreen.ts';
import { UpgradeScreen } from './ui/UpgradeScreen.ts';
import { MenuScreen } from './ui/MenuScreen.ts';
import { GuideScreen } from './ui/GuideScreen.ts';
import { DebugOverlay } from './ui/DebugOverlay.ts';
import { DealScreen, DealChoice } from './ui/DealScreen.ts';
import { RelicHUD } from './ui/RelicHUD.ts';
import { ItemShopScreen } from './ui/ItemShopScreen.ts';
import { Transform } from './components/Transform.ts';
import { Physics } from './components/Physics.ts';
import { Renderable } from './components/Renderable.ts';
import { Collider } from './components/Collider.ts';
import { PlayerControlled } from './components/PlayerControlled.ts';
import { Consumable } from './components/Consumable.ts';
import { Hazard } from './components/Hazard.ts';
import { Vec2 } from './utils/Vec2.ts';
import { RelicDef } from './relics/RelicDefs.ts';
import { GameEvents, GameState, CollisionLayer, EntityType } from './types/index.ts';
import { CONFIG } from './utils/Constants.ts';
import { preloadSprites } from './rendering/SpriteManager.ts';

/** Top-level game class: owns loop, state, systems, and coordinates everything */
export class Game {
  private loop!: GameLoop;
  private eventBus!: EventBus;
  private camera!: Camera;
  private inputManager!: InputManager;
  private world!: World;
  private renderer: Renderer;
  private uiCtx!: CanvasRenderingContext2D;
  private background!: Background;

  // Systems
  private inputSystem!: InputSystem;
  private physicsSystem!: PhysicsSystem;
  private collisionSystem!: CollisionSystem;
  private consumptionSystem!: ConsumptionSystem;
  private aiSystem!: AISystem;
  private energySystem!: EnergySystem;
  private evolutionSystem!: EvolutionSystem;
  private particleSystem!: ParticleSystem;
  private cameraSystem!: CameraSystem;
  private renderSystem!: RenderSystem;
  private relicSystem!: RelicSystem;

  // Tier
  private tierManager!: TierManager;

  // UI
  private hud!: HUD;
  private deathScreen!: DeathScreen;
  private evolutionScreen!: EvolutionScreen;
  private winScreen!: WinScreen;
  private upgradeScreen!: UpgradeScreen;
  private menuScreen!: MenuScreen;
  private guideScreen!: GuideScreen;
  private debugOverlay!: DebugOverlay;
  private dealScreen!: DealScreen;
  private relicHUD!: RelicHUD;
  private itemShopScreen!: ItemShopScreen;

  private gameState: GameState = GameState.Menu;
  private evolutionTimer = 0;
  private pendingMassBonus = 0;
  private debugMode = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
  }

  async init(): Promise<void> {
    await this.renderer.init();

    // Preload PixelLab-generated pixel-art sprites (non-blocking — falls back to
    // vector graphics for any sprites that haven't been generated yet)
    preloadSprites();

    this.eventBus = new EventBus();
    this.camera = new Camera();
    this.camera.setViewport(this.renderer.width, this.renderer.height);
    this.inputManager = new InputManager(this.renderer.getCanvas());
    this.world = new World();
    this.background = new Background();
    this.background.init(this.renderer.getApp().stage);
    this.loop = new GameLoop();

    // Systems
    this.inputSystem = new InputSystem(this.inputManager, this.camera, this.eventBus);
    this.physicsSystem = new PhysicsSystem();
    this.collisionSystem = new CollisionSystem(this.eventBus);
    this.consumptionSystem = new ConsumptionSystem(this.eventBus);
    this.aiSystem = new AISystem();
    this.energySystem = new EnergySystem(this.eventBus);
    this.evolutionSystem = new EvolutionSystem(this.eventBus);
    this.particleSystem = new ParticleSystem();
    this.cameraSystem = new CameraSystem(this.camera, this.eventBus);
    this.relicSystem = new RelicSystem();

    this.tierManager = new TierManager(this.world, this.eventBus);

    // Create an overlay canvas for traditional 2D rendering (so PIXI handles background/sprites, Canvas handles UI)
    const uiCanvas = document.createElement('canvas');
    uiCanvas.width = this.renderer.width;
    uiCanvas.height = this.renderer.height;
    uiCanvas.style.position = 'absolute';
    uiCanvas.style.top = '0';
    uiCanvas.style.left = '0';
    uiCanvas.style.pointerEvents = 'none'; // let clicks pass through to PIXI canvas
    this.renderer.getCanvas().parentElement?.appendChild(uiCanvas);

    const ctx = uiCanvas.getContext('2d') as CanvasRenderingContext2D;
    this.uiCtx = ctx;

    // Initialize systems that still need the 2D context
    // RenderSystem now takes the PIXI stage
    this.renderSystem = new RenderSystem(this.renderer.getApp().stage, this.camera);

    // UI
    this.hud = new HUD();
    this.deathScreen = new DeathScreen(this.eventBus);
    this.evolutionScreen = new EvolutionScreen();
    this.winScreen = new WinScreen(this.eventBus);
    this.upgradeScreen = new UpgradeScreen();
    this.menuScreen = new MenuScreen();
    this.guideScreen = new GuideScreen();
    this.debugOverlay = new DebugOverlay();
    this.dealScreen = new DealScreen();
    this.relicHUD = new RelicHUD();
    this.itemShopScreen = new ItemShopScreen();

    this.registerEvents();

    // Show menu first
    this.gameState = GameState.Menu;
    this.menuScreen.show();

    // Start the render loop
    this.loop.start(
      (dt) => this.update(dt),
      () => this.render(),
    );

    // Handle resize
    window.addEventListener('resize', () => {
      this.renderer.resize();
      this.camera.setViewport(this.renderer.width, this.renderer.height);
      uiCanvas.width = this.renderer.width;
      uiCanvas.height = this.renderer.height;
    });

    // Click handler for UI buttons
    this.renderer.getCanvas().addEventListener('click', (e) => {
      this.handleClick(e.clientX, e.clientY);
    });

    // Mousemove for screen hover states
    this.renderer.getCanvas().addEventListener('mousemove', (e) => {
      this.upgradeScreen.handleMouseMove(e.clientX, e.clientY);
      this.menuScreen.handleMouseMove(e.clientX, e.clientY);
      this.guideScreen.handleMouseMove(e.clientX, e.clientY);
      this.dealScreen.handleMouseMove(e.clientX, e.clientY);
      this.relicHUD.handleMouseMove(
        e.clientX, e.clientY,
        this.renderer.width, this.renderer.height,
        this.world,
      );
    });

    // Keyboard shortcuts (Tab for shop, Debug tools)
    window.addEventListener('keydown', (e) => {
      // Prevent default Tab behavior (focus cycling)
      if (e.key === 'Tab') {
        e.preventDefault();
        this.toggleItemShop();
        return;
      }

      if (!this.debugMode) return;
      this.handleDebugKey(e.key);
    });
  }

  private registerEvents(): void {
    this.eventBus.on(GameEvents.PLAYER_DIED, () => {
      if (this.gameState !== GameState.Playing) return;
      this.gameState = GameState.Dead;
      this.deathScreen.show();
      this.loop.setTimeScale(0.3);
    });

    this.eventBus.on(GameEvents.EVOLUTION_READY, (data: any) => {
      if (this.gameState !== GameState.Playing) return;
      this.gameState = GameState.Evolving;
      this.evolutionSystem.setEvolving(true);

      const level = data?.level || 1;
      const isPhaseChange = level % 10 === 0;

      // Slow-mo effect
      this.loop.setTimeScale(CONFIG.EVOLUTION_SLOWMO_FACTOR);
      this.camera.setTargetZoom(CONFIG.CAMERA_MIN_ZOOM);
      this.eventBus.emit(GameEvents.SCREEN_SHAKE, { intensity: CONFIG.SHAKE_INTENSITY_EVOLVE });

      const currentTier = this.tierManager.getCurrentTier();
      const nextTierIndex = this.tierManager.getTierIndex() + 1;

      setTimeout(() => {
        if (this.tierManager.isLastTier() && isPhaseChange) {
          // Win!
          this.loop.setTimeScale(1);
          this.gameState = GameState.Won;
          this.winScreen.show();
          return;
        }

        const nextTier = this.tierManager.getTierAt(nextTierIndex);
        const nextName = nextTier?.displayName ?? 'Unknown';
        const nextColor = nextTier?.displayColor ?? '#ffffff';

        const onEvolutionComplete = () => {
          // Force-hide evolution screen before showing deal/upgrade
          this.evolutionScreen.forceHide();

          // Switch to Upgrading state — game systems frozen, UI updates run
          this.gameState = GameState.Upgrading;
          this.loop.setTimeScale(1);

          const players = this.world.query('PlayerControlled');
          const ctrl = players.length > 0
            ? players[0].getComponent<PlayerControlled>('PlayerControlled')!
            : null;

          const advanceTier = () => {
            if (isPhaseChange) {
              this.tierManager.advanceToNextTier();
            }
            const newTier = this.tierManager.getCurrentTier();

            if (ctrl) {
              ctrl.level += 1;
              ctrl.evolutionMass = 0;
            }

            this.evolutionSystem.setEvolving(false);
            this.energySystem.setTierIndex(this.tierManager.getTierIndex());
            this.background.setConfig(newTier.background);
            this.hud.setTier(newTier.displayName, newTier.displayColor);
            this.updateHudThreshold();

            if (this.pendingMassBonus > 0 && players.length > 0 && ctrl) {
              ctrl.evolutionMass += this.pendingMassBonus;
              const physics = players[0].getComponent<Physics>('Physics');
              if (physics) physics.mass += this.pendingMassBonus;
              this.pendingMassBonus = 0;
            }

            this.loop.setTimeScale(1);
            this.gameState = GameState.Playing;
          };

          const showRelicShop = () => {
            const cp = ctrl?.cp ?? 0;
            const ownedIds = ctrl?.mutations ?? [];
            this.upgradeScreen.show(cp, ownedIds, (relic: RelicDef | null) => {
              if (relic && ctrl) {
                ctrl.mutations.push(relic.id);
                ctrl.cp -= relic.cost;
                // Grant active ability if relic provides one and player has none yet
                if (relic.grantsActive && !ctrl.activeAbility) {
                  ctrl.activeAbility = relic.grantsActive.id;
                  ctrl.activeMaxCooldown = relic.grantsActive.cooldown;
                  ctrl.activeCooldown = 0;
                }
              }
              advanceTier();
            });
          };

          // Show Devil/Angel deal screen first, then relic shop
          this.dealScreen.show(ctrl?.mutations ?? [], (deal: DealChoice) => {
            if (ctrl && deal.type !== 'skip') {
              if (deal.relic) {
                ctrl.mutations.push(deal.relic.id);
                if (deal.energyCost > 0) {
                  ctrl.devilEnergyPenalty += deal.energyCost;
                  const newMax = CONFIG.ENERGY_MAX + ctrl.relicEnergyMaxBonus - ctrl.devilEnergyPenalty;
                  if (ctrl.energy > newMax) ctrl.energy = Math.max(0, newMax);
                }
              }
              if (deal.ability && !ctrl.activeAbility) {
                ctrl.activeAbility = deal.ability.id;
                ctrl.activeMaxCooldown = deal.ability.cooldown;
                ctrl.activeCooldown = 0;
              }
            }
            showRelicShop();
          });
        };

        if (isPhaseChange) {
          this.evolutionScreen.show(
            currentTier.displayName,
            nextName,
            nextColor,
            onEvolutionComplete
          );
        } else {
          onEvolutionComplete();
        }
      }, isPhaseChange ? 150 : 50);
    });

    this.eventBus.on(GameEvents.GAME_RESTART, () => {
      this.restart();
    });

    this.eventBus.on(GameEvents.GAME_WON, () => {
      this.gameState = GameState.Won;
      this.winScreen.show();
    });

    this.eventBus.on(GameEvents.PLAYER_DAMAGED, (data: unknown) => {
      const { playerId, damage } = data as { playerId?: number; damage: number; knockbackForce: number; position: Vec2 };

      // Find the damaged player by ID, or fall back to first player
      let player;
      if (playerId !== undefined) {
        player = this.world.getEntity(playerId);
      }
      if (!player) {
        const players = this.world.query('PlayerControlled');
        if (players.length === 0) return;
        player = players[0];
      }
      const ctrl = player.getComponent<PlayerControlled>('PlayerControlled');
      if (!ctrl) return;

      // God mode: ignore all damage
      if (this.debugMode && this.debugOverlay.isGodMode()) return;

      // Relic invincibility (after eating, etc.)
      if (ctrl.invincibilityTimer > 0) return;

      // Shield absorbs damage
      if (ctrl.shieldHP > 0) {
        ctrl.shieldHP = Math.max(0, ctrl.shieldHP - 1);
        return;
      }

      // Super Shield (from CP item): absorbs 3 instances of damage, recharges when eating
      if (ctrl.items.includes('bulwark') && (ctrl as any).superShieldHP === undefined) {
        (ctrl as any).superShieldHP = 3;
      }
      if (ctrl.items.includes('bulwark') && (ctrl as any).superShieldHP > 0) {
        (ctrl as any).superShieldHP--;
        return;
      }

      // Otherwise lose energy
      ctrl.energy = Math.max(0, ctrl.energy - damage);
      this.eventBus.emit(GameEvents.ENERGY_CHANGED, { playerId: player.id, energy: ctrl.energy });

      // Hit-stop (Juice)
      this.loop.setTimeScale(0.05); // Freeze frame
      setTimeout(() => {
        if (this.gameState === GameState.Playing) {
          this.loop.setTimeScale(1.0);
        }
      }, 60);

      this.eventBus.emit(GameEvents.SCREEN_SHAKE, { intensity: CONFIG.SHAKE_INTENSITY_EAT * 3 }); // Increased shake
    });

    // ── Active ability effects ───────────────────────────────
    this.eventBus.on(GameEvents.ACTIVE_ABILITY_USED, (data: unknown) => {
      const { playerId, abilityId } = data as { playerId: number; abilityId: string };
      const player = this.world.getEntity(playerId);
      if (!player) return;
      const transform = player.getComponent<Transform>('Transform');
      const physics = player.getComponent<Physics>('Physics');
      const ctrl = player.getComponent<PlayerControlled>('PlayerControlled');
      if (!ctrl) return;

      switch (abilityId) {
        case 'dash': {
          if (physics && transform) {
            // Dash in the direction of current movement, fallback to facing direction if still
            let dashDir: Vec2;
            if (physics.velocity.magSq() > 10) {
              dashDir = physics.velocity.normalize();
            } else {
              const angle = transform.rotation;
              dashDir = new Vec2(Math.cos(angle), Math.sin(angle));
            }

            // Increased force for a much further dash (from 1800 to 2000)
            physics.velocity = physics.velocity.add(dashDir.mul(800));
          }
          break;
        }
        case 'pulse': {
          // Push all nearby entities outward
          if (transform) {
            const nearbyEntities = this.world.query('Physics', 'Transform');
            for (const e of nearbyEntities) {
              if (e.id === playerId) continue;
              const et = e.getComponent<Transform>('Transform')!;
              const ep = e.getComponent<Physics>('Physics')!;
              const dx = et.position.x - transform.position.x;
              const dy = et.position.y - transform.position.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 200 && dist > 0) {
                ep.velocity = ep.velocity.add(
                  new Vec2(dx / dist, dy / dist).mul(600 / (dist * 0.15 + 1)),
                );
              }
            }
            this.eventBus.emit(GameEvents.SCREEN_SHAKE, { intensity: 10 });
          }
          break;
        }
        case 'drain': {
          // Restore energy (simulate draining the environment)
          const energyMax = CONFIG.ENERGY_MAX + ctrl.relicEnergyMaxBonus - ctrl.devilEnergyPenalty;
          ctrl.energy = Math.min(ctrl.energy + 35, energyMax);
          this.eventBus.emit(GameEvents.ENERGY_CHANGED, { playerId, energy: ctrl.energy });
          break;
        }
        case 'warp': {
          // Teleport to mouse cursor position
          if (transform) {
            const mousePos = this.inputManager.getMousePosition();
            const worldPos = this.camera.screenToWorld(mousePos);
            transform.position.copyFrom(worldPos);
            if (physics) physics.velocity = new Vec2(0, 0);
          }
          break;
        }
      }
      this.eventBus.emit(GameEvents.SCREEN_SHAKE, { intensity: 4 });
    });
  }

  private startGame(): void {
    this.world.clear();
    this.spawnPlayer();

    const firstTier = this.tierManager.getCurrentTier();
    this.tierManager.startFirstTier();
    this.background.setConfig(firstTier.background);
    this.hud.setTier(firstTier.displayName, firstTier.displayColor);
    this.updateHudThreshold();

    this.gameState = GameState.Playing;
    this.loop.setTimeScale(1);
  }

  private spawnPlayer(): void {
    const player = this.world.createEntity();
    const cfg = this.tierManager.getCurrentTier().playerConfig;

    player.addComponent(new Transform(new Vec2(CONFIG.WORLD_WIDTH / 2, CONFIG.WORLD_HEIGHT / 2)));

    const phys = new Physics(CONFIG.PLAYER_INITIAL_MASS, cfg.speed);
    phys.friction = 0.88;
    player.addComponent(phys);

    const playerRenderable = new Renderable(
      cfg.baseRadius,
      cfg.color,
      cfg.glowColor,
      cfg.glowRadius,
      1,
      0,
      'circle',
    );
    // Use tier-specific pixel-art sprite when available
    playerRenderable.spriteKey = `player_${this.tierManager.getCurrentTier().id}`;
    player.addComponent(playerRenderable);

    player.addComponent(new Collider(cfg.baseRadius, CollisionLayer.Player, false));

    const ctrl = new PlayerControlled();
    ctrl.speed = cfg.speed;
    ctrl.energy = CONFIG.ENERGY_MAX;
    player.addComponent(ctrl);

    // PvP: players are consumable by larger players (high mass value as reward)
    player.addComponent(new Consumable(EntityType.Player, 20, 30, 5, false));

    // Camera starts on player
    this.camera.position.copyFrom(new Vec2(CONFIG.WORLD_WIDTH / 2, CONFIG.WORLD_HEIGHT / 2));
  }

  private update(dt: number): void {
    // Menu state — only update menu UI
    if (this.gameState === GameState.Menu) {
      this.menuScreen.update(dt);
      this.guideScreen.update(dt);
      this.background.update(dt);
      return;
    }

    if (this.gameState === GameState.Dead) {
      this.deathScreen.update(dt);
      return;
    }
    if (this.gameState === GameState.Won) {
      this.winScreen.update(dt);
      return;
    }

    // Upgrading state — only update UI screens, freeze game
    if (this.gameState === GameState.Upgrading) {
      this.dealScreen.update(dt);
      this.upgradeScreen.update(dt);
      return;
    }

    // Shopping state (Tab menu)
    if (this.gameState === GameState.Shopping) {
      this.itemShopScreen.update(dt);
      return;
    }

    this.evolutionScreen.update(dt);

    const isEvolving = this.gameState === GameState.Evolving;

    // God mode: keep energy full
    if (this.debugMode && this.debugOverlay.isGodMode()) {
      const players = this.world.query('PlayerControlled');
      if (players.length > 0) {
        players[0].getComponent<PlayerControlled>('PlayerControlled')!.energy = CONFIG.ENERGY_MAX;
      }
    }

    // Always run these even during evolution (slowed down)
    this.relicSystem.update(this.world, dt);  // must run before InputSystem uses speed mults
    this.inputSystem.update(this.world, dt);
    this.aiSystem.update(this.world, dt);
    this.physicsSystem.update(this.world, dt);
    this.collisionSystem.update(this.world, dt);
    this.consumptionSystem.update(this.world, dt);
    this.particleSystem.update(this.world, dt);
    this.cameraSystem.update(this.world, dt);

    if (!isEvolving) {
      this.energySystem.update(this.world, dt);
      this.evolutionSystem.update(this.world, dt);
      this.applyUniqueItemEffects(dt);
    }

    this.tierManager.update(dt);
    this.background.update(dt);

    this.world.flush();
  }

  private render(): void {
    const ctx = this.uiCtx;
    // Clear UI canvas
    const w = this.renderer.width;
    const h = this.renderer.height;
    ctx.clearRect(0, 0, w, h);

    // Menu screen
    if (this.gameState === GameState.Menu) {
      this.menuScreen.render(ctx, w, h);
      this.guideScreen.render(ctx, w, h);
      return;
    }

    // Background
    this.background.render(this.camera, w, h);

    // Mechanic renders (e.g. UV zones, proton rings)
    this.tierManager.render(ctx, this.camera);

    // World entities
    // RenderSystem manipulates PIXI objects directly, doesn't need Canvas 2D ctx
    this.renderSystem.render(this.world);

    // HUD (always on top during gameplay)
    if (this.gameState !== GameState.Dead && this.gameState !== GameState.Won) {
      this.hud.render(ctx, this.world, w, h);
      this.relicHUD.render(ctx, this.world, w, h);
      this.renderTips(ctx);
    }

    // Debug overlay
    if (this.debugMode) {
      this.debugOverlay.render(ctx, this.world, this.tierManager, w, h);
    }

    // Evolution overlay
    if (this.evolutionScreen.isVisible()) {
      this.evolutionScreen.render(ctx, w, h);
    }

    // Deal screen (shown before relic shop)
    if (this.dealScreen.isVisible()) {
      this.dealScreen.render(ctx, w, h);
    }

    // Relic shop (upgrade screen)
    if (this.upgradeScreen.isVisible()) {
      this.upgradeScreen.render(ctx, w, h);
    }

    // Item Shop (Tab menu)
    if (this.itemShopScreen.isVisible()) {
      this.itemShopScreen.render(ctx, w, h);
    }

    // Death / win screens
    if (this.gameState === GameState.Dead) {
      this.deathScreen.render(ctx, w, h);
    }
    if (this.gameState === GameState.Won) {
      this.winScreen.render(ctx, w, h);
    }
  }

  private renderTips(ctx: CanvasRenderingContext2D): void {
    const players = this.world.query('PlayerControlled');
    const hasAbility = players.length > 0
      && !!players[0].getComponent<PlayerControlled>('PlayerControlled')!.activeAbility;

    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(150,150,150,0.5)';
    ctx.textAlign = 'left';
    const tips = this.debugMode
      ? 'WASD: move | Mouse: aim | SPC: ability | N: skip | G: god | M: +mass | B: dash | C: +CP | T: restart'
      : hasAbility
        ? 'WASD: move | Mouse: aim | SPC: ability'
        : 'WASD: move | Mouse: aim';
    ctx.fillText(tips, CONFIG.HUD_PADDING, this.renderer.height - 12);
  }

  private handleClick(x: number, y: number): void {
    const w = this.renderer.width;
    const h = this.renderer.height;

    if (this.guideScreen.isVisible()) {
      if (this.guideScreen.handleClick(x, y)) return;
      return; // block other clicks while guide is open
    }

    if (this.gameState === GameState.Menu) {
      const result = this.menuScreen.handleClick(x, y, w, h);
      if (result) {
        if (result.guide) {
          this.menuScreen.hide();
          this.guideScreen.show(() => {
            this.guideScreen.hide();
            this.menuScreen.show();
          });
          return;
        }

        if (result.debug !== undefined) {
          this.debugMode = result.debug;
          this.menuScreen.hide();
          this.startGame();
        }
      }
      return;
    }

    if (this.gameState === GameState.Shopping) {
      if (this.itemShopScreen.handleClick(x, y)) {
        if (!this.itemShopScreen.isVisible()) {
          // Closed shop
          this.gameState = GameState.Playing;
          this.loop.setTimeScale(1);
        }
      }
      return;
    }

    if (this.evolutionScreen.isVisible() && this.evolutionScreen.handleClick(x, y)) return;
    if (this.dealScreen.handleClick(x, y)) return;
    if (this.upgradeScreen.handleClick(x, y, w, h)) return;
    this.deathScreen.handleClick(x, y, w, h);
    this.winScreen.handleClick(x, y, w, h);
  }

  private handleDebugKey(key: string): void {
    if (this.gameState !== GameState.Playing) return;

    switch (key.toLowerCase()) {
      case 'n': {
        // Skip to next tier
        const players = this.world.query('PlayerControlled');
        if (players.length > 0) {
          const ctrl = players[0].getComponent<PlayerControlled>('PlayerControlled')!;
          const tier = this.tierManager.getCurrentTier();
          ctrl.evolutionMass = tier.evolutionThreshold;
        }
        break;
      }
      case 'g':
        // Toggle god mode
        this.debugOverlay.toggleGodMode();
        break;
      case 'm': {
        // Add mass
        const players = this.world.query('PlayerControlled');
        if (players.length > 0) {
          const ctrl = players[0].getComponent<PlayerControlled>('PlayerControlled')!;
          const physics = players[0].getComponent<Physics>('Physics');
          ctrl.evolutionMass += 50;
          if (physics) physics.mass += 50;
        }
        break;
      }
      case 'e': {
        // Refill energy
        const players = this.world.query('PlayerControlled');
        if (players.length > 0) {
          players[0].getComponent<PlayerControlled>('PlayerControlled')!.energy = CONFIG.ENERGY_MAX;
        }
        break;
      }
      case 'c': {
        // Add CP
        const players = this.world.query('PlayerControlled');
        if (players.length > 0) {
          players[0].getComponent<PlayerControlled>('PlayerControlled')!.cp += 10;
        }
        break;
      }
      case 'r': {
        // Give a random relic (debug)
        const players = this.world.query('PlayerControlled');
        if (players.length > 0) {
          const ctrl = players[0].getComponent<PlayerControlled>('PlayerControlled')!;
          ctrl.cp += 15;
        }
        break;
      }
      case 'b': {
        // Toggle dash ability (debug)
        const players = this.world.query('PlayerControlled');
        if (players.length > 0) {
          const ctrl = players[0].getComponent<PlayerControlled>('PlayerControlled')!;
          if (ctrl.activeAbility === 'dash') {
            ctrl.activeAbility = null;
          } else {
            ctrl.activeAbility = 'dash';
            ctrl.activeMaxCooldown = 2; // from RelicDefs dash cooldown
            ctrl.activeCooldown = 0;
          }
        }
        break;
      }
      case 't': {
        this.restart();
        break;
      }
    }
  }

  private restart(): void {
    this.world.clear();
    // Do not clear the eventBus, otherwise one-time systems (like Consumption) lose their listeners completely
    this.gameState = GameState.Playing;
    this.loop.setTimeScale(1);
    this.deathScreen.hide();
    this.winScreen.hide();
    this.upgradeScreen.hide();
    this.dealScreen.hide();
    this.itemShopScreen.hide();
    this.evolutionSystem.setEvolving(false);
    this.pendingMassBonus = 0;

    // Re-create tier manager with fresh world
    this.tierManager = new TierManager(this.world, this.eventBus);

    this.startGame();
  }

  private updateHudThreshold(): void {
    const players = this.world.query('PlayerControlled');
    if (players.length > 0) {
      const dynamicThreshold = this.evolutionSystem.getDynamicThreshold(players[0]);
      this.hud.setEvolutionThreshold(dynamicThreshold);
    } else {
      const tier = this.tierManager.getCurrentTier();
      this.hud.setEvolutionThreshold(tier.evolutionThreshold);
    }
  }

  private toggleItemShop(): void {
    if (this.gameState === GameState.Menu || this.gameState === GameState.Dead || this.gameState === GameState.Won || this.gameState === GameState.Evolving || this.gameState === GameState.Upgrading) {
      return;
    }

    if (this.gameState === GameState.Shopping) {
      this.itemShopScreen.hide();
      this.gameState = GameState.Playing;
      this.loop.setTimeScale(1);
    } else if (this.gameState === GameState.Playing) {
      const players = this.world.query('PlayerControlled');
      if (players.length > 0) {
        const ctrl = players[0].getComponent<PlayerControlled>('PlayerControlled')!;
        this.gameState = GameState.Shopping;
        this.loop.setTimeScale(1);
        this.itemShopScreen.show(ctrl.cp, ctrl.items, (itemId, cost, consumed) => {
          ctrl.cp -= cost;
          for (const c of consumed) {
            const idx = ctrl.items.indexOf(c);
            if (idx !== -1) ctrl.items.splice(idx, 1);
          }
          ctrl.items.push(itemId);

          // Re-evaluate physics stats locally if necessary
          // Note: Full physics logic will be handled by RelicSystem or similar update loop.
        });
      }
    }
  }

  // Timer for chain lightning
  private lightningTimer = 0;

  private applyUniqueItemEffects(dt: number): void {
    const players = this.world.query('PlayerControlled', 'Transform', 'Physics');
    if (players.length === 0) return;

    const player = players[0];
    const ctrl = player.getComponent<PlayerControlled>('PlayerControlled')!;
    const transform = player.getComponent<Transform>('Transform')!;
    const physics = player.getComponent<Physics>('Physics')!;

    // cosmic_striders: fire_trail
    if (ctrl.items.includes('cosmic_striders') && physics.velocity.magSq() > 500) {
      // Use particle system to spawn hazardous fire trail entities occasionally
      if (Math.random() < dt * 10) {
        const fire = this.world.createEntity();
        fire.addComponent(new Transform(transform.position.clone()));
        const firePhys = new Physics(0, 0);
        firePhys.velocity = new Vec2(Math.random() - 0.5, Math.random() - 0.5).mul(20);
        fire.addComponent(firePhys);
        fire.addComponent(new Renderable(15, '#ff5522', '#ff8800', 20, 0.8, 0, 'circle'));
        // Add Hazard component so it damages enemies (and not player)
        fire.addComponent(new Hazard(15, 5, 0));
        // Needs a lifetime component or similar to die off
        setTimeout(() => this.world.removeEntity(fire.id), 2000);
      }
    }

    // storm_bringer: chain_lightning
    if (ctrl.items.includes('storm_bringer')) {
      this.lightningTimer += dt;
      if (this.lightningTimer > 1.5) {
        this.lightningTimer = 0;
        this.fireChainLightning(transform.position, 150);
      }
    }
  }

  private fireChainLightning(startPos: Vec2, radius: number): void {
    const enemies = this.world.query('Transform', 'Hazard');
    for (const enemy of enemies) {
      const et = enemy.getComponent<Transform>('Transform')!;
      if (et.position.distSq(startPos) < radius * radius) {
        // "Damage" the enemy - for hazards, we can just push them or destroy them.
        const ep = enemy.getComponent<Physics>('Physics');
        if (ep) {
          ep.velocity = ep.velocity.add(et.position.sub(startPos).normalize().mul(300));
        }
        // Visual effect
        this.particleSystem.spawnBurst(this.world, et.position, '#ccccff', 5, 12);
        this.eventBus.emit(GameEvents.SCREEN_SHAKE, { intensity: 2 });
        break; // Only strike one nearby for now
      }
    }
  }
}

