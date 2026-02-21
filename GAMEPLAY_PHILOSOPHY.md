# Ascension: Core Gameplay Philosophy

*Ascension* is a game about growth, evolution, and scale. You start as a minuscule subatomic particle and consume your way up through the building blocks of the universe. 

This document outlines the core pillars that guide all mechanics, pacing, and design decisions in the game.

---

## 1. The Power Fantasy of Scale (The "Katamari" Effect)
**Pillar:** The player must constantly feel the tangible impact of getting bigger.
* **Visual Evolution:** Moving from Subatomic (Quarks, Protons) to Atomic (Electrons, Ions) to Molecular (Amino Acids, Lipids) should carry a distinct visual shift. 
* **Prey Becomes Predator:** What was once a massive, terrifying hazard in Tier 1 should eventually become bite-sized food in Tier 3.
* **Pacing:** Growth should feel earned but inevitable. The pacing must balance the struggle of survival with the catharsis of outgrowing your enemies.

## 2. Roguelite Risk vs. Reward
**Pillar:** Every choice should have a trade-off. Growth shouldn't just be about eating; it should be about *how* you build your entity.
* **Devil Deals & Traits:** Offering players immense power at a permanent cost (e.g., sacrificing max energy for a massive speed boost) creates memorable, wildly different runs.
* **The Item Shop & Relics:** Giving players an economy (Complexity Points / CP) rewards skilled play (eating high CP targets, surviving hazards) and allows for diverse build-crafting (speed builds, tank builds, dash-heavy builds).

## 3. "Juice" and Visceral Feedback
**Pillar:** The game is fundamentally about bumping circles together. Therefore, the *feel* of those collisions must be incredibly satisfying.
* **Hit-Stop & Freeze Frames:** Heavy collisions (taking damage or eating massive targets) should literally pause the engine for a few milliseconds to emphasize impact.
* **Screen Shake:** Movement abilities (Dashing) and heavy impacts need dynamic camera shake.
* **Visual Feedback:** Trails, glowing auras, and particle explosions when consuming enemies are not optional; they are core to the dopamine loop.

## 4. Ecosystems, Not Just "Enemies"
**Pillar:** The world should feel alive, regardless of the player's presence.
* **Dynamic AI:** Entities shouldn't just wander or chase. They should exhibit lifelike behaviors:
  * **Flocking (Boids):** Smaller food items grouping together in schools.
  * **Predators:** Hazards that actively hunt specifically when the player becomes too large or greedy.
  * **Environmental Hazards:** Zones (like UV Radiation) or gravity wells (Protons) that influence both the player *and* the AI.

## 5. Flow State Survival
**Pillar:** Movement is survival.
* **The Energy Drain:** Players are constantly losing energy/mass. Remaining stationary means death. This forces aggressive, forward momentum.
* **Universal Dash:** Giving the player baseline dodges (with i-frames) turns survival into a dance. It allows for skill expression—dodging *through* a hazard to eat the food behind it represents mastery of the mechanics.

---

## 6. The "Balatro" Build Slots (Core Functionalities)
**Pillar:** Build variety requires constrained, combinable slots. To make *Ascension* a strategic roguelike where runs feel distinct, we constrain the player to specific "Equipment Slots" that define their build each run. 

Just like *Balatro* has 5 Jokers (passives), Consumables (Tarots), and a Deck... *Ascension* uses the following core slots:

### A. The 5 "Mutations" (Passive Synergies)
* **What it is:** The equivalent of Balatro's Jokers. You have exactly **5 Mutation Slots**.
* **Mechanic:** Mutations provide run-defining passive effects (e.g., "Gain +2x Mass when eating while Dashing", "Radiate a damaging aura based on your current Energy", "Gain CP when taking damage"). 
* **Strategy:** Because you only have 5 slots, you must eventually sell or replace early-game Mutations for high-synergy, late-game engine builders.

### B. The 1 "Active Ability" (The Core Move)
* **What it is:** Your Spacebar/Shift ability. You can only hold **1 Active Ability** at a time.
* **Mechanic:** Replaces or augments the Universal Dash. (e.g., "Black Hole: Pull all entities toward you", "Phase Shift: Immune to hazards but cannot eat for 3s", "Dash now leaves a trail of toxic radiation").
* **Strategy:** Dictates your moment-to-moment combat loop. Do you use it defensively to survive hazards, or offensively to herd food?

### C. The 3 "Catalysts" (Single-Use Consumables)
* **What it is:** The equivalent of Tarot/Planet cards. You have a small inventory of **3 Catalyst Slots**.
* **Mechanic:** Powerful, single-use items triggered via number keys (1, 2, 3). (e.g., "Instantly double your current Energy", "Turn all nearby hazards into Food", "Spawn a massive CP orb").
* **Strategy:** Saved for emergency survival or perfectly timed for a massive growth spike right before a tier transition.

### D. The "Origin Core" (Starting Deck)
* **What it is:** Selected before the run begins.
* **Mechanic:** Defines your starting stats and intrinsic rule changes for that run. (e.g., "Glutton Core: Mass requirements are doubled, but enemies spawn twice as fast", "Glass Core: Max Energy is capped at 50, but Base Speed is +50%").

---

### Designing for the Future
Whenever proposing a new feature, mechanic, or tier, ask:
1. Does this make the player feel the scale of their evolution?
2. Does it offer a meaningful choice or trade-off for their 5 Mutation slots?
3. Does it feel sufficiently *juicy* to execute?
4. Does it make the microscopic world feel more alive?
