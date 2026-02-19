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
import { TierManager } from './tiers/TierManager.ts';
import { HUD } from './ui/HUD.ts';
import { DeathScreen } from './ui/DeathScreen.ts';
import { EvolutionScreen } from './ui/EvolutionScreen.ts';
import { WinScreen } from './ui/WinScreen.ts';
import { UpgradeScreen } from './ui/UpgradeScreen.ts';
import { MenuScreen } from './ui/MenuScreen.ts';
import { DebugOverlay } from './ui/DebugOverlay.ts';
import { Transform } from './components/Transform.ts';
import { Physics } from './components/Physics.ts';
import { Renderable } from './components/Renderable.ts';
import { Collider } from './components/Collider.ts';
import { PlayerControlled } from './components/PlayerControlled.ts';
import { Consumable } from './components/Consumable.ts';
import { Vec2 } from './utils/Vec2.ts';
import { GameEvents, GameState, CollisionLayer, EntityType, UpgradeDef } from './types/index.ts';
import { CONFIG } from './utils/Constants.ts';

/** Top-level game class: owns loop, state, systems, and coordinates everything */
export class Game {
  private loop: GameLoop;
  private eventBus: EventBus;
  private camera: Camera;
  private inputManager: InputManager;
  private world: World;
  private renderer: Renderer;
  private background: Background;

  // Systems
  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private collisionSystem: CollisionSystem;
  private consumptionSystem: ConsumptionSystem;
  private aiSystem: AISystem;
  private energySystem: EnergySystem;
  private evolutionSystem: EvolutionSystem;
  private particleSystem: ParticleSystem;
  private cameraSystem: CameraSystem;
  private renderSystem: RenderSystem;

  // Tier
  private tierManager: TierManager;

  // UI
  private hud: HUD;
  private deathScreen: DeathScreen;
  private evolutionScreen: EvolutionScreen;
  private winScreen: WinScreen;
  private upgradeScreen: UpgradeScreen;
  private menuScreen: MenuScreen;
  private debugOverlay: DebugOverlay;

  private gameState: GameState = GameState.Menu;
  private evolutionTimer = 0;
  private pendingMassBonus = 0;
  private debugMode = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    const ctx = this.renderer.getContext();

    this.eventBus = new EventBus();
    this.camera = new Camera();
    this.camera.setViewport(this.renderer.width, this.renderer.height);
    this.inputManager = new InputManager(canvas);
    this.world = new World();
    this.background = new Background();
    this.loop = new GameLoop();

    // Systems
    this.inputSystem = new InputSystem(this.inputManager, this.camera);
    this.physicsSystem = new PhysicsSystem();
    this.collisionSystem = new CollisionSystem(this.eventBus);
    this.consumptionSystem = new ConsumptionSystem(this.eventBus);
    this.aiSystem = new AISystem();
    this.energySystem = new EnergySystem(this.eventBus);
    this.evolutionSystem = new EvolutionSystem(this.eventBus);
    this.particleSystem = new ParticleSystem();
    this.cameraSystem = new CameraSystem(this.camera, this.eventBus);
    this.renderSystem = new RenderSystem(ctx, this.camera);

    this.tierManager = new TierManager(this.world, this.eventBus);

    // UI
    this.hud = new HUD();
    this.deathScreen = new DeathScreen(this.eventBus);
    this.evolutionScreen = new EvolutionScreen();
    this.winScreen = new WinScreen(this.eventBus);
    this.upgradeScreen = new UpgradeScreen();
    this.menuScreen = new MenuScreen();
    this.debugOverlay = new DebugOverlay();

    // Show menu first
    this.gameState = GameState.Menu;
    this.menuScreen.show();

    // Start the render loop (menu needs it)
    this.loop.start(
      (dt) => this.update(dt),
      () => this.render(),
    );

    // Handle resize
    window.addEventListener('resize', () => {
      this.renderer.resize();
      this.camera.setViewport(this.renderer.width, this.renderer.height);
    });

    // Click handler for UI buttons
    canvas.addEventListener('click', (e) => {
      this.handleClick(e.clientX, e.clientY);
    });

    // Mousemove for upgrade/menu screen hover
    canvas.addEventListener('mousemove', (e) => {
      this.upgradeScreen.handleMouseMove(e.clientX, e.clientY);
      this.menuScreen.handleMouseMove(e.clientX, e.clientY);
    });

    // Debug mode keyboard shortcuts
    window.addEventListener('keydown', (e) => {
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

    this.eventBus.on(GameEvents.EVOLUTION_READY, () => {
      if (this.gameState !== GameState.Playing) return;
      this.gameState = GameState.Evolving;
      this.evolutionSystem.setEvolving(true);

      // Slow-mo effect
      this.loop.setTimeScale(CONFIG.EVOLUTION_SLOWMO_FACTOR);
      this.camera.setTargetZoom(CONFIG.CAMERA_MIN_ZOOM);
      this.eventBus.emit(GameEvents.SCREEN_SHAKE, { intensity: CONFIG.SHAKE_INTENSITY_EVOLVE });

      const currentTier = this.tierManager.getCurrentTier();
      const nextTierIndex = this.tierManager.getTierIndex() + 1;

      setTimeout(() => {
        if (this.tierManager.isLastTier()) {
          // Win!
          this.loop.setTimeScale(1);
          this.gameState = GameState.Won;
          this.winScreen.show();
          return;
        }

        const nextTier = this.tierManager.getTierAt(nextTierIndex);
        const nextName = nextTier?.displayName ?? 'Unknown';
        const nextColor = nextTier?.displayColor ?? '#ffffff';

        this.evolutionScreen.show(
          currentTier.displayName,
          nextName,
          nextColor,
          () => {
            // Force-hide evolution screen before showing upgrade
            this.evolutionScreen.forceHide();

            // Switch to Upgrading state — game systems frozen, UI updates run
            this.gameState = GameState.Upgrading;
            this.loop.setTimeScale(1);

            const players = this.world.query('PlayerControlled');
            const playerCp = players.length > 0
              ? players[0].getComponent<PlayerControlled>('PlayerControlled')!.cp
              : 0;

            this.upgradeScreen.show(playerCp, (chosen: UpgradeDef | null) => {
              // Apply the upgrade
              if (chosen && players.length > 0) {
                const ctrl = players[0].getComponent<PlayerControlled>('PlayerControlled')!;
                ctrl.cp -= chosen.cost;

                // Special case: mass primer gives bonus mass after tier reset
                if (chosen.id === 'mass_head_start') {
                  this.pendingMassBonus = 30;
                } else {
                  chosen.apply(ctrl);
                }

                this.eventBus.emit(GameEvents.UPGRADE_CHOSEN, { upgradeId: chosen.id });
              }

              // Now advance the tier
              this.tierManager.advanceToNextTier();
              const newTier = this.tierManager.getCurrentTier();
              this.evolutionSystem.setThreshold(newTier.evolutionThreshold);
              this.evolutionSystem.setEvolving(false);
              this.energySystem.setTierIndex(this.tierManager.getTierIndex());
              this.background.setConfig(newTier.background);
              this.hud.setTier(newTier.displayName, newTier.displayColor);
              this.updateHudThreshold();

              // Apply pending mass bonus after tier reset
              if (this.pendingMassBonus > 0 && players.length > 0) {
                const ctrl = players[0].getComponent<PlayerControlled>('PlayerControlled')!;
                ctrl.evolutionMass += this.pendingMassBonus;
                const physics = players[0].getComponent<Physics>('Physics');
                if (physics) physics.mass += this.pendingMassBonus;
                this.pendingMassBonus = 0;
              }

              this.loop.setTimeScale(1);
              this.gameState = GameState.Playing;
            });
          },
        );
      }, 600);
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

      // Shield absorbs damage
      if (ctrl.shieldHP > 0) {
        ctrl.shieldHP = Math.max(0, ctrl.shieldHP - 1);
        return;
      }

      // Otherwise lose energy
      ctrl.energy = Math.max(0, ctrl.energy - damage);
      this.eventBus.emit(GameEvents.ENERGY_CHANGED, { playerId: player.id, energy: ctrl.energy });
      this.eventBus.emit(GameEvents.SCREEN_SHAKE, { intensity: CONFIG.SHAKE_INTENSITY_EAT * 2 });
    });
  }

  private startGame(): void {
    this.world.clear();
    this.spawnPlayer();

    const firstTier = this.tierManager.getCurrentTier();
    this.tierManager.startFirstTier();
    this.background.setConfig(firstTier.background);
    this.evolutionSystem.setThreshold(firstTier.evolutionThreshold);
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

    player.addComponent(new Renderable(
      cfg.baseRadius,
      cfg.color,
      cfg.glowColor,
      cfg.glowRadius,
      1,
      0,
      'circle',
    ));

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

    // Upgrading state — only update upgrade UI, freeze game
    if (this.gameState === GameState.Upgrading) {
      this.upgradeScreen.update(dt);
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
    }

    this.tierManager.update(dt);
    this.background.update(dt);

    this.world.flush();
  }

  private render(): void {
    const ctx = this.renderer.getContext();
    const w = this.renderer.width;
    const h = this.renderer.height;

    // Menu screen
    if (this.gameState === GameState.Menu) {
      this.menuScreen.render(ctx, w, h);
      return;
    }

    // Background
    this.background.render(ctx, this.camera, w, h);

    // Mechanic renders (e.g. UV zones, proton rings)
    this.tierManager.render(ctx, this.camera);

    // World entities
    this.renderSystem.render(this.world, ctx);

    // HUD (always on top)
    if (this.gameState !== GameState.Dead && this.gameState !== GameState.Won) {
      this.hud.render(ctx, this.world, w, h);
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

    // Upgrade screen
    if (this.upgradeScreen.isVisible()) {
      this.upgradeScreen.render(ctx, w, h);
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
    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(150,150,150,0.5)';
    ctx.textAlign = 'left';
    const tips = this.debugMode
      ? 'WASD: move | Mouse: aim | N: next tier | G: god mode | M: +50 mass'
      : 'WASD: move | Mouse: aim';
    ctx.fillText(tips, CONFIG.HUD_PADDING, this.renderer.height - 12);
  }

  private handleClick(x: number, y: number): void {
    const w = this.renderer.width;
    const h = this.renderer.height;

    if (this.gameState === GameState.Menu) {
      const result = this.menuScreen.handleClick(x, y, w, h);
      if (result) {
        this.debugMode = result.debug;
        this.debugOverlay.setEnabled(this.debugMode);
        this.menuScreen.hide();
        this.registerEvents();
        this.startGame();
      }
      return;
    }

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
    }
  }

  private restart(): void {
    this.world.clear();
    this.eventBus.clear();
    this.gameState = GameState.Playing;
    this.loop.setTimeScale(1);
    this.deathScreen.hide();
    this.winScreen.hide();
    this.upgradeScreen.hide();
    this.evolutionSystem.setEvolving(false);
    this.pendingMassBonus = 0;

    // Re-create tier manager with fresh world
    this.tierManager = new TierManager(this.world, this.eventBus);

    this.registerEvents();
    this.startGame();
  }

  /** Update HUD and EvolutionSystem with current tier's threshold */
  private updateHudThreshold(): void {
    const tier = this.tierManager.getCurrentTier();
    this.evolutionSystem.setThreshold(tier.evolutionThreshold);
    this.hud.setEvolutionThreshold(tier.evolutionThreshold);
  }
}
