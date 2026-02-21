/**
 * Pixel art sprite generator using PixelLab API.
 *
 * Usage:
 *   PIXELLAB_SECRET=your_key npm run generate-sprites
 *
 * Sprites are saved to public/sprites/ and loaded at runtime by SpriteManager.
 * Re-running skips already-generated files; delete a file to regenerate it.
 */

import { PixelLabClient } from '@pixellab-code/pixellab';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPRITES_DIR = path.join(__dirname, '..', 'public', 'sprites');

/** All sprites to generate, keyed by the name used in SpriteManager */
const SPRITE_DEFINITIONS = [
  // ── Subatomic tier ──────────────────────────────────────────────────────────
  {
    key: 'quark',
    description: 'tiny subatomic quark particle, glowing orange energy orb, physics game sprite',
    size: { width: 32, height: 32 },
  },
  {
    key: 'neutrino',
    description: 'neutrino subatomic particle, glowing cyan streak, fast energy particle, physics game sprite',
    size: { width: 32, height: 32 },
  },
  {
    key: 'photon',
    description: 'photon light particle, bright yellow glowing orb with light rays, physics game sprite',
    size: { width: 32, height: 32 },
  },
  {
    key: 'proton',
    description: 'proton atomic nucleus particle, dangerous red glowing core with energy field, hazard physics game sprite',
    size: { width: 32, height: 32 },
  },

  // ── Atomic tier ─────────────────────────────────────────────────────────────
  {
    key: 'electron',
    description: 'electron particle orbiting atom, small blue glowing orb with trailing arc, physics game sprite',
    size: { width: 32, height: 32 },
  },
  {
    key: 'ion',
    description: 'charged ion particle, orange energy orb with electric charge symbol, physics game sprite',
    size: { width: 32, height: 32 },
  },
  {
    key: 'nobleGas',
    description: 'noble gas atom bubble, glowing teal translucent sphere, peaceful inert gas, physics game sprite',
    size: { width: 32, height: 32 },
  },
  {
    key: 'radioactiveIsotope',
    description: 'radioactive isotope atom, glowing green nucleus with radioactive hazard symbol, dangerous game sprite',
    size: { width: 32, height: 32 },
  },

  // ── Molecular tier ───────────────────────────────────────────────────────────
  {
    key: 'aminoAcid',
    description: 'amino acid molecule, green organic chain structure with amino and carboxyl groups, biology game sprite',
    size: { width: 32, height: 32 },
  },
  {
    key: 'lipid',
    description: 'lipid fat molecule, round yellow bubble with wavy fatty acid chains, biology game sprite',
    size: { width: 32, height: 32 },
  },
  {
    key: 'freeRadical',
    description: 'free radical molecule, unstable red reactive particle with spiky electron, dangerous biology game sprite',
    size: { width: 32, height: 32 },
  },

  // ── Player sprites (one per tier) ───────────────────────────────────────────
  {
    key: 'player_subatomic',
    description: 'player controlled energy core, glowing purple orb with inner bright nucleus, hero subatomic scale game sprite',
    size: { width: 48, height: 48 },
  },
  {
    key: 'player_atomic',
    description: 'player controlled atom core, glowing blue energy sphere with orbiting electrons, hero atomic scale game sprite',
    size: { width: 48, height: 48 },
  },
  {
    key: 'player_molecular',
    description: 'player controlled cell core, glowing green organic nucleus with membrane, hero molecular scale game sprite',
    size: { width: 48, height: 48 },
  },
];

async function main() {
  if (!process.env.PIXELLAB_SECRET) {
    console.error('Error: PIXELLAB_SECRET environment variable is not set.');
    console.error('Usage: PIXELLAB_SECRET=your_key npm run generate-sprites');
    process.exit(1);
  }

  const client = PixelLabClient.fromEnv();

  await mkdir(SPRITES_DIR, { recursive: true });

  let generated = 0;
  let skipped = 0;

  for (const def of SPRITE_DEFINITIONS) {
    const outPath = path.join(SPRITES_DIR, `${def.key}.png`);

    if (existsSync(outPath)) {
      console.log(`  skip  ${def.key}.png (already exists)`);
      skipped++;
      continue;
    }

    process.stdout.write(`  gen   ${def.key}.png ... `);

    try {
      const response = await client.generateImagePixflux({
        description: def.description,
        imageSize: def.size,
        noBackground: true,
        outline: 'single color black outline',
        shading: 'basic shading',
        detail: 'medium detail',
      });

      await response.image.saveToFile(outPath);
      console.log(`done  ($${response.usage.usd.toFixed(4)})`);
      generated++;

      // Brief pause between requests to avoid hitting rate limits
      await new Promise((r) => setTimeout(r, 800));
    } catch (err) {
      console.log('FAILED');
      console.error(`    ${err.message}`);
    }
  }

  console.log(`\nDone. Generated: ${generated}, Skipped: ${skipped}`);
  console.log(`Sprites saved to: ${SPRITES_DIR}`);
}

main();
