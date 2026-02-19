import { World } from '../ecs/World.ts';
import { EventBus } from '../core/EventBus.ts';
import { Camera } from '../core/Camera.ts';
import {
  BackgroundConfig,
  PlayerConfig,
  EntitySpawnConfig,
  HazardSpawnConfig,
} from '../types/index.ts';

/** Interface for tier-specific mechanics */
export interface TierMechanic {
  id: string;
  activate(world: World, eventBus: EventBus): void;
  deactivate(): void;
  update(dt: number, world: World): void;
  render?(ctx: CanvasRenderingContext2D, camera: Camera): void;
}

/** Interface that each tier must implement */
export interface TierDefinition {
  id: string;
  name: string;
  displayName: string;
  displayColor: string;
  background: BackgroundConfig;
  playerConfig: PlayerConfig;
  evolutionThreshold: number;
  entitySpawns: EntitySpawnConfig[];
  hazardSpawns: HazardSpawnConfig[];
  mechanics: TierMechanic[];
  onEnter(world: World, eventBus: EventBus): void;
  onExit(world: World): void;
}
