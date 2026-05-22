import { createObject } from "../level/object-registry.js";
import { GROUND_Y, LEVEL_LENGTH_DEFAULT } from "../level/level-model.js";

/**
 * Generador procedural de niveles según dificultad (base para edición / IA)
 */
const DIFFICULTY_PROFILES = {
  easy: { length: 4000, spikeRate: 0.08, gapMax: 90, orbRate: 0.05 },
  normal: { length: 6000, spikeRate: 0.12, gapMax: 120, orbRate: 0.08 },
  hard: { length: 8000, spikeRate: 0.18, gapMax: 150, orbRate: 0.1 },
  harder: { length: 10000, spikeRate: 0.22, gapMax: 180, orbRate: 0.12 },
  insane: { length: 12000, spikeRate: 0.28, gapMax: 210, orbRate: 0.15 },
  demon: { length: 14000, spikeRate: 0.35, gapMax: 240, orbRate: 0.18 }
};

export function generateLevelWithAI(meta) {
  const profile = DIFFICULTY_PROFILES[meta.difficulty] || DIFFICULTY_PROFILES.normal;
  const objects = [];
  const groundY = GROUND_Y;
  let x = 0;
  const length = profile.length;

  objects.push(createObject("block", 0, groundY, { width: 360, height: 30 }));

  x = 360;
  let seed = hashString(meta.name + meta.difficulty);
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  while (x < length) {
    const segment = pickSegment(rand, profile);
    x = applySegment(objects, x, groundY, segment, profile, rand);
    x += 30 + Math.floor(rand() * 60);
  }

  objects.push(createObject("block", x, groundY, { width: 200, height: 30 }));

  if (rand() < profile.orbRate) {
    objects.push(createObject("orb_yellow", x - 120, groundY - 90));
  }

  return {
    version: 2,
    name: meta.name,
    difficulty: meta.difficulty,
    newgroundsId: meta.newgroundsId || "",
    audioBase64: meta.audioBase64 || "",
    audioMime: meta.audioMime || "",
    length: x + 200,
    speed: meta.difficulty === "demon" ? 1.2 : 1,
    background: pickBackground(meta.difficulty),
    groundY,
    objects,
    settings: { gamemode: "cube", mini: false, dual: false },
    meta: { createdWith: "ai", gdStudio: true, generatedAt: Date.now() }
  };
}

function pickSegment(rand, profile) {
  const r = rand();
  if (r < profile.spikeRate) return "spikes";
  if (r < profile.spikeRate + 0.12) return "gap";
  if (r < profile.spikeRate + 0.2) return "stairs";
  return "flat";
}

function applySegment(objects, x, groundY, type, profile, rand) {
  switch (type) {
    case "gap": {
      const gap = 60 + Math.floor(rand() * profile.gapMax);
      x += gap;
      objects.push(createObject("block", x, groundY, { width: 120 + rand() * 180, height: 30 }));
      x += 120;
      break;
    }
    case "spikes": {
      const count = 1 + Math.floor(rand() * 3);
      for (let i = 0; i < count; i++) {
        objects.push(createObject("spike", x + i * 35, groundY - 28));
      }
      objects.push(createObject("block", x - 30, groundY, { width: count * 35 + 60, height: 30 }));
      x += count * 35 + 30;
      break;
    }
    case "stairs": {
      for (let s = 0; s < 4; s++) {
        objects.push(createObject("block", x + s * 40, groundY - s * 30, { width: 50, height: 30 }));
      }
      x += 200;
      break;
    }
    default:
      objects.push(createObject("block", x, groundY, { width: 90 + rand() * 120, height: 30 }));
      x += 90;
  }
  return x;
}

function pickBackground(diff) {
  const palettes = {
    easy: { r: 20, g: 80, b: 120 },
    normal: { r: 0, g: 60, b: 100 },
    hard: { r: 80, g: 20, b: 60 },
    harder: { r: 100, g: 40, b: 0 },
    insane: { r: 120, g: 0, b: 0 },
    demon: { r: 40, g: 0, b: 80 }
  };
  return palettes[diff] || palettes.normal;
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) + 1;
}
