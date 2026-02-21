import { RelicStatMods } from '../relics/RelicDefs.ts';

/**
 * Defines the League of Legends style item shop.
 * Small "components" build into larger "completed" items.
 */

export interface ItemDef {
    id: string;
    name: string;
    description: string;
    /** Full CP cost if bought outright */
    cost: number;
    /** 
     * IDs of component items required to build this. 
     * Empty array if it's a basic item.
     */
    components: string[];
    /** Passive statistical boosts */
    stats: RelicStatMods;
    /** 
     * A unique passive ability or effect granted only by completed items.
     * This string defines the logic flag checked in the engine.
     */
    uniqueEffect?: 'fire_trail' | 'chain_lightning' | 'super_shield' | null;
    uniqueDescription?: string;
}

// ─── UTILS ──────────────────────────────────────────────────

/** 
 * Calculate cost to build an item, discounting components already owned.
 * Does NOT mutate the owned array.
 */
export function calculateBuildCost(item: ItemDef, ownedItems: string[]): {
    cost: number;
    consumed: string[];
} {
    let cost = item.cost;
    const consumed: string[] = [];
    const tempOwned = [...ownedItems];

    for (const compId of item.components) {
        const idx = tempOwned.indexOf(compId);
        if (idx !== -1) {
            // We own this component, consume it and discount it
            tempOwned.splice(idx, 1);
            consumed.push(compId);
            const compDef = getItemById(compId);
            if (compDef) {
                cost -= compDef.cost;
            }
        }
    }

    return { cost: Math.max(0, cost), consumed };
}

export function getItemById(id: string): ItemDef | undefined {
    return ALL_ITEMS.find(i => i.id === id);
}

// ─── BASIC COMPONENTS ───────────────────────────────────────

export const BASIC_ITEMS: ItemDef[] = [
    {
        id: 'boots',
        name: 'Boots of Haste',
        description: '+10% Speed',
        cost: 5,
        components: [],
        stats: { speedMult: 1.10 }
    },
    {
        id: 'ruby',
        name: 'Energy Crystal',
        description: '+25 Max Energy',
        cost: 5,
        components: [],
        stats: { energyMaxBonus: 25 }
    },
    {
        id: 'magnet',
        name: 'Lodestone',
        description: '+60 Magnet Radius',
        cost: 5,
        components: [],
        stats: { attractRadius: 60 }
    },
    {
        id: 'mass_core',
        name: 'Dense Core',
        description: '+15% Mass Gain',
        cost: 6,
        components: [],
        stats: { massGainMult: 1.15 }
    }
];

// ─── COMPLETED ITEMS ────────────────────────────────────────

export const COMPLETED_ITEMS: ItemDef[] = [
    {
        id: 'cosmic_striders',
        name: 'Cosmic Striders',
        description: '+25% Speed, +25 Max Energy',
        cost: 15,
        components: ['boots', 'ruby'],
        stats: { speedMult: 1.25, energyMaxBonus: 25 },
        uniqueEffect: 'fire_trail',
        uniqueDescription: 'Leave a trail of harmful cosmic flame behind you as you move.'
    },
    {
        id: 'storm_bringer',
        name: 'Storm Bringer',
        description: '+25% Speed, +15% Mass Gain',
        cost: 18,
        components: ['boots', 'mass_core'],
        stats: { speedMult: 1.25, massGainMult: 1.15 },
        uniqueEffect: 'chain_lightning',
        uniqueDescription: 'Periodically strike nearby entities with chain lightning.'
    },
    {
        id: 'bulwark',
        name: 'Bulwark of the Void',
        description: '+50 Max Energy, +60 Magnet Radius',
        cost: 16,
        components: ['ruby', 'magnet'],
        stats: { energyMaxBonus: 50, attractRadius: 60 },
        uniqueEffect: 'super_shield',
        uniqueDescription: 'Gain a recharging shield that absorbs 3 instances of damage.'
    }
];

export const ALL_ITEMS: ItemDef[] = [...BASIC_ITEMS, ...COMPLETED_ITEMS];
