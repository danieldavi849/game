/** Synergy tags — collecting 3 relics with the same tag triggers a Transformation */
export enum SynergyTag {
  Energy = 'energy',
  Mass = 'mass',
  Speed = 'speed',
  Defense = 'defense',
  Void = 'void',
  Cosmic = 'cosmic',
}

export type RelicRarity = 'common' | 'rare' | 'legendary' | 'cursed';

/** Stat modifier deltas applied by a single relic */
export interface RelicStatMods {
  speedMult?: number;
  massGainMult?: number;
  energyDrainMult?: number;
  energyMaxBonus?: number;
  consumeRatioBonus?: number;
  shieldBonus?: number;
  cpGainMult?: number;
  attractRadius?: number;
  bonusEnergyOnEat?: number;
  chainConsumeChance?: number;
  energyFloor?: number;
  massDecay?: number;
  poisonChance?: number;
  eatInvincibility?: number;
}

export interface RelicDef {
  id: string;
  name: string;
  description: string;
  rarity: RelicRarity;
  tags: SynergyTag[];
  cost: number;
  stats: RelicStatMods;
  /** Grants an active ability when picked up */
  grantsActive?: { id: string; name: string; cooldown: number };
}

/** Color per rarity */
export const RARITY_COLORS: Record<RelicRarity, string> = {
  common: '#bbbbbb',
  rare: '#4488ff',
  legendary: '#ffaa33',
  cursed: '#cc44cc',
};

export const RARITY_BG: Record<RelicRarity, string> = {
  common: 'rgba(180,180,180,0.08)',
  rare: 'rgba(68,136,255,0.1)',
  legendary: 'rgba(255,170,51,0.12)',
  cursed: 'rgba(200,68,200,0.1)',
};

// ─── ALL RELICS ─────────────────────────────────────────────

export const ALL_RELICS: RelicDef[] = [
  // ── COMMON (2-3 CP) ──
  {
    id: 'quark_magnet',
    name: 'Quark Magnet',
    description: 'Nearby food drifts toward you',
    rarity: 'common', tags: [SynergyTag.Mass], cost: 2,
    stats: { attractRadius: 60 },
  },
  {
    id: 'particle_accel',
    name: 'Particle Accelerator',
    description: '+12% movement speed',
    rarity: 'common', tags: [SynergyTag.Speed], cost: 2,
    stats: { speedMult: 1.12 },
  },
  {
    id: 'energy_cell',
    name: 'Energy Cell',
    description: '+20 max energy',
    rarity: 'common', tags: [SynergyTag.Energy], cost: 2,
    stats: { energyMaxBonus: 20 },
  },
  {
    id: 'dense_core',
    name: 'Dense Core',
    description: '+15% mass from food',
    rarity: 'common', tags: [SynergyTag.Mass], cost: 3,
    stats: { massGainMult: 1.15 },
  },
  {
    id: 'reactive_shell',
    name: 'Reactive Shell',
    description: '+1 max shield HP',
    rarity: 'common', tags: [SynergyTag.Defense], cost: 3,
    stats: { shieldBonus: 1 },
  },
  {
    id: 'photon_lens',
    name: 'Photon Lens',
    description: '+20% CP gain',
    rarity: 'common', tags: [SynergyTag.Cosmic], cost: 2,
    stats: { cpGainMult: 1.2 },
  },
  {
    id: 'friction_reducer',
    name: 'Friction Reducer',
    description: '+10% speed, -8 max energy',
    rarity: 'common', tags: [SynergyTag.Speed], cost: 2,
    stats: { speedMult: 1.1, energyMaxBonus: -8 },
  },

  // ── RARE (4-6 CP) ──
  {
    id: 'neutron_star',
    name: 'Neutron Star',
    description: '+25% mass gain, strong magnet',
    rarity: 'rare', tags: [SynergyTag.Mass, SynergyTag.Cosmic], cost: 5,
    stats: { massGainMult: 1.25, attractRadius: 90 },
  },
  {
    id: 'void_siphon',
    name: 'Void Siphon',
    description: '+8 bonus energy per eat',
    rarity: 'rare', tags: [SynergyTag.Energy, SynergyTag.Void], cost: 4,
    stats: { bonusEnergyOnEat: 8 },
  },
  {
    id: 'phase_shifter',
    name: 'Phase Shifter',
    description: '+18% speed, +1 shield',
    rarity: 'rare', tags: [SynergyTag.Speed, SynergyTag.Defense], cost: 5,
    stats: { speedMult: 1.18, shieldBonus: 1 },
  },
  {
    id: 'entropy_shield',
    name: 'Entropy Shield',
    description: '+3 max shield HP',
    rarity: 'rare', tags: [SynergyTag.Defense], cost: 5,
    stats: { shieldBonus: 3 },
  },
  {
    id: 'dark_matter',
    name: 'Dark Matter Core',
    description: '-25% energy drain',
    rarity: 'rare', tags: [SynergyTag.Energy, SynergyTag.Void], cost: 5,
    stats: { energyDrainMult: 0.75 },
  },
  {
    id: 'quantum_tunneler',
    name: 'Quantum Tunneler',
    description: 'Can eat 15% larger entities',
    rarity: 'rare', tags: [SynergyTag.Mass, SynergyTag.Cosmic], cost: 6,
    stats: { consumeRatioBonus: 0.15 },
  },
  {
    id: 'ion_storm',
    name: 'Ion Storm',
    description: '12% chance to chain-eat nearby',
    rarity: 'rare', tags: [SynergyTag.Void], cost: 6,
    stats: { chainConsumeChance: 0.12 },
  },
  {
    id: 'solar_core',
    name: 'Solar Core',
    description: '+30% mass gain, +12 energy/eat',
    rarity: 'rare', tags: [SynergyTag.Mass, SynergyTag.Energy], cost: 6,
    stats: { massGainMult: 1.3, bonusEnergyOnEat: 12 },
  },

  // ── LEGENDARY (8-10 CP) ──
  {
    id: 'singularity_engine',
    name: 'Singularity Engine',
    description: '+50% mass, huge magnet, -15% speed',
    rarity: 'legendary', tags: [SynergyTag.Mass, SynergyTag.Void, SynergyTag.Cosmic], cost: 9,
    stats: { massGainMult: 1.5, attractRadius: 130, speedMult: 0.85 },
  },
  {
    id: 'eternal_flame',
    name: 'Eternal Flame',
    description: 'Energy never drops below 25',
    rarity: 'legendary', tags: [SynergyTag.Energy, SynergyTag.Defense], cost: 8,
    stats: { energyFloor: 25 },
  },
  {
    id: 'event_horizon',
    name: 'Event Horizon',
    description: '+40% mass, eat 20% larger, chain 8%',
    rarity: 'legendary', tags: [SynergyTag.Void, SynergyTag.Mass], cost: 10,
    stats: { massGainMult: 1.4, consumeRatioBonus: 0.2, chainConsumeChance: 0.08 },
  },

  // ── CURSED (free, but with a downside) ──
  {
    id: 'unstable_isotope',
    name: 'Unstable Isotope',
    description: '+40% mass gain, lose 1.5 mass/sec',
    rarity: 'cursed', tags: [SynergyTag.Mass], cost: 0,
    stats: { massGainMult: 1.4, massDecay: 1.5 },
  },
  {
    id: 'glass_cannon',
    name: 'Glass Cannon',
    description: '+30% speed, -30 max energy',
    rarity: 'cursed', tags: [SynergyTag.Speed], cost: 0,
    stats: { speedMult: 1.3, energyMaxBonus: -30 },
  },
  {
    id: 'parasite',
    name: 'Parasite',
    description: '2x CP gain, 8% food is poison',
    rarity: 'cursed', tags: [SynergyTag.Void], cost: 0,
    stats: { cpGainMult: 2.0, poisonChance: 0.08 },
  },
];

// ─── TRANSFORMATIONS ────────────────────────────────────────

export interface TransformationDef {
  id: string;
  tag: SynergyTag;
  name: string;
  description: string;
  color: string;
  stats: RelicStatMods;
}

export const TRANSFORMATIONS: TransformationDef[] = [
  {
    id: 'perpetual_motion', tag: SynergyTag.Energy,
    name: 'Perpetual Motion',
    description: 'Energy drain halved',
    color: '#44ff44',
    stats: { energyDrainMult: 0.5 },
  },
  {
    id: 'singularity', tag: SynergyTag.Mass,
    name: 'Singularity',
    description: 'Can eat 40% larger entities',
    color: '#ff88ff',
    stats: { consumeRatioBonus: 0.4 },
  },
  {
    id: 'lightspeed', tag: SynergyTag.Speed,
    name: 'Lightspeed',
    description: '0.5s invincibility after eating',
    color: '#44ddff',
    stats: { eatInvincibility: 0.5 },
  },
  {
    id: 'fortress', tag: SynergyTag.Defense,
    name: 'Fortress',
    description: '+5 max shield HP',
    color: '#8888ff',
    stats: { shieldBonus: 5 },
  },
  {
    id: 'event_horizon_t', tag: SynergyTag.Void,
    name: 'Event Horizon',
    description: 'Strong food attraction aura',
    color: '#cc44cc',
    stats: { attractRadius: 150 },
  },
  {
    id: 'cosmic_being', tag: SynergyTag.Cosmic,
    name: 'Cosmic Being',
    description: '+30% all gains',
    color: '#ffdd44',
    stats: { massGainMult: 1.3, cpGainMult: 1.3, bonusEnergyOnEat: 5 },
  },
];

// ─── ACTIVE ABILITIES ───────────────────────────────────────

export interface ActiveAbilityDef {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  color: string;
}

export const ACTIVE_ABILITIES: ActiveAbilityDef[] = [
  { id: 'dash', name: 'Dash', description: 'Burst forward', cooldown: 2, color: '#44ddff' },
  { id: 'pulse', name: 'Pulse', description: 'Push nearby entities away', cooldown: 5, color: '#ff8844' },
  { id: 'drain', name: 'Drain', description: 'Steal energy from area', cooldown: 8, color: '#44ff88' },
  { id: 'warp', name: 'Warp', description: 'Teleport to cursor', cooldown: 10, color: '#cc44ff' },
];

// ─── HELPERS ────────────────────────────────────────────────

export function getRelicById(id: string): RelicDef | undefined {
  return ALL_RELICS.find(r => r.id === id);
}

export function getTransformationForTag(tag: SynergyTag): TransformationDef | undefined {
  return TRANSFORMATIONS.find(t => t.tag === tag);
}

export function getAbilityById(id: string): ActiveAbilityDef | undefined {
  return ACTIVE_ABILITIES.find(a => a.id === id);
}
