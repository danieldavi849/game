/** All tier types in progression order */
export enum TierType {
  Subatomic = 'subatomic',
  Atomic = 'atomic',
  Molecular = 'molecular',
}

/** Entity archetypes for spawning */
export enum EntityType {
  Player = 'player',
  // Subatomic
  Quark = 'quark',
  Photon = 'photon',
  Proton = 'proton',
  Neutrino = 'neutrino',
  // Atomic
  Electron = 'electron',
  Ion = 'ion',
  NoblGas = 'nobleGas',
  RadiactiveIsotope = 'radioactiveIsotope',
  // Molecular
  AminoAcid = 'aminoAcid',
  Lipid = 'lipid',
  UVZone = 'uvZone',
  FreeRadical = 'freeRadical',
}

/** AI behavior modes */
export enum BehaviorType {
  Wander = 'wander',
  Flee = 'flee',
  Chase = 'chase',
  Patrol = 'patrol',
  Orbit = 'orbit',
  ZipAcross = 'zipAcross',
  Flock = 'flock',
}

/** Collision layers for filtering */
export enum CollisionLayer {
  Default = 1,
  Player = 2,
  Food = 4,
  Hazard = 8,
  Bonus = 16,
  Zone = 32,
}

/** Game state */
export enum GameState {
  Menu = 'menu',
  Playing = 'playing',
  Evolving = 'evolving',
  Upgrading = 'upgrading',
  Shopping = 'shopping',
  Dead = 'dead',
  Won = 'won',
  Paused = 'paused',
}

/** Event types for the EventBus */
export const GameEvents = {
  ENTITY_CONSUMED: 'entity:consumed',
  PLAYER_DIED: 'player:died',
  PLAYER_DAMAGED: 'player:damaged',
  EVOLUTION_READY: 'evolution:ready',
  EVOLUTION_START: 'evolution:start',
  EVOLUTION_COMPLETE: 'evolution:complete',
  TIER_ENTER: 'tier:enter',
  TIER_EXIT: 'tier:exit',
  ENERGY_CHANGED: 'energy:changed',
  ENERGY_DEPLETED: 'energy:depleted',
  CP_GAINED: 'cp:gained',
  MASS_CHANGED: 'mass:changed',
  GAME_WON: 'game:won',
  GAME_RESTART: 'game:restart',
  SCREEN_SHAKE: 'screen:shake',
  SLOW_MO: 'effect:slowmo',
  UPGRADE_CHOSEN: 'upgrade:chosen',
  ACTIVE_ABILITY_USED: 'ability:used',
} as const;

/** Upgrade that can be purchased with CP between tiers */
export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  color: string;
  apply: (ctrl: { speed: number; energy: number; maxShieldHP: number; shieldHP: number }) => void;
}

/** Background configuration for a tier */
export interface BackgroundConfig {
  baseColor: string;
  gridColor: string;
  gridSpacing: number;
  particleDensity: number;
  particleColor: string;
}

/** Player configuration for a tier */
export interface PlayerConfig {
  speed: number;
  baseRadius: number;
  color: string;
  glowColor: string;
  glowRadius: number;
  trailLength: number;
}

/** Entity spawn configuration */
export interface EntitySpawnConfig {
  type: EntityType;
  count: number;
  minRadius: number;
  maxRadius: number;
  color: string;
  glowColor?: string;
  behavior: BehaviorType;
  speed: number;
  massValue: number;
  energyValue: number;
  cpValue: number;
  collisionLayer: CollisionLayer;
  respawn: boolean;
}

/** Hazard spawn configuration */
export interface HazardSpawnConfig {
  type: EntityType;
  count: number;
  radius: number;
  color: string;
  behavior: BehaviorType;
  speed: number;
  damage: number;
  collisionLayer: CollisionLayer;
}

/** Mechanic definition for a tier */
export interface MechanicDefinition {
  id: string;
  activate: (world: unknown, eventBus: unknown) => void;
  deactivate: () => void;
  update: (dt: number) => void;
  render?: (ctx: CanvasRenderingContext2D, camera: unknown) => void;
}
