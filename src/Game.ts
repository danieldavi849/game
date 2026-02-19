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
import { Transform } from './components/Transform.ts';
import { Physics } from './components/Physics.ts';
import { Renderable } from './components/Renderable.ts';
import { Collider } from './components/Collider.ts';
import { PlayerControlled } from './components/PlayerControlled.ts';
import { Vec2 } from './utils/Vec2.ts';
import { GameEvents, GameState, CollisionLayer } from './types/index.ts';
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

  private gameState: GameState = GameState.Playing;
  private evolutionTimer = 0;

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

    this.registerEvents();
    this.startGame();

    // Handle resize
    window.addEventListener('resize', () => {
      this.renderer.resize();
      this.camera.setViewport(this.renderer.width, this.renderer.height);
    });

    // Click handler for UI buttons
    canvas.addEventListener('click', (e) => {
      this.handleClick(e.clientX, e.clientY);
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
            this.tierManager.advanceToNextTier();
            const newTier = this.tierManager.getCurrentTier();
            this.evolutionSystem.setThreshold(newTier.evolutionThreshold);
            this.evolutionSystem.setEvolving(false);
            this.energySystem.setTierIndex(this.tierManager.getTierIndex());
            this.background.setConfig(newTier.background);
            this.hud.setTier(newTier.displayName, newTier.displayColor);
            this.updateHudThreshold();
            this.loop.setTimeScale(1);
            this.gameState = GameState.Playing;
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
      const { damage } = data as { damage: number; knockbackForce: number; position: Vec2 };
      const players = this.world.query('PlayerControlled');
      if (players.length === 0) return;
      const ctrl = players[0].getComponent<PlayerControlled>('PlayerControlled')!;

      // Shield absorbs damage
      if (ctrl.shieldHP > 0) {
        ctrl.shieldHP = Math.max(0, ctrl.shieldHP - 1);
        return;
      }

      // Otherwise lose energy
      ctrl.energy = Math.max(0, ctrl.energy - damage);
      this.eventBus.emit(GameEvents.ENERGY_CHANGED, { energy: ctrl.energy });
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

    this.loop.start(
      (dt) => this.update(dt),
      () => this.render(),
    );
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

    // Camera starts on player
    this.camera.position.copyFrom(new Vec2(CONFIG.WORLD_WIDTH / 2, CONFIG.WORLD_HEIGHT / 2));
  }

  private update(dt: number): void {
    if (this.gameState === GameState.Dead) {
      this.deathScreen.update(dt);
      return;
    }
    if (this.gameState === GameState.Won) {
      this.winScreen.update(dt);
      return;
    }

    this.evolutionScreen.update(dt);

    const isEvolving = this.gameState === GameState.Evolving;

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

    // Evolution overlay
    if (this.evolutionScreen.isVisible()) {
      this.evolutionScreen.render(ctx, w, h);
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
    ctx.fillText('WASD: move | Mouse: aim', CONFIG.HUD_PADDING, this.renderer.height - 12);
  }

  private handleClick(x: number, y: number): void {
    const w = this.renderer.width;
    const h = this.renderer.height;
    this.deathScreen.handleClick(x, y, w, h);
    this.winScreen.handleClick(x, y, w, h);
  }

  private restart(): void {
    this.world.clear();
    this.eventBus.clear();
    this.gameState = GameState.Playing;
    this.loop.setTimeScale(1);
    this.deathScreen.hide();
    this.winScreen.hide();
    this.evolutionSystem.setEvolving(false);

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
