import { createObject } from "./object-registry.js";
import { resolveGdObjectId } from "./gd-object-ids.js";
import { gdYToCanvas, canvasYToGd } from "./coordinates.js";
import { parseGdLevelString } from "./gd-level-parser.js";

export const GRID_CELL = 30;
export const LEVEL_LENGTH_DEFAULT = 12000;
export const GROUND_Y = 270;

/**
 * Estructura interna del nivel (JSON en Realtime Database)
 */
export function createEmptyLevel(meta = {}) {
  return {
    version: 2,
    name: meta.name || "Nuevo nivel",
    difficulty: meta.difficulty || "normal",
    newgroundsId: meta.newgroundsId || "",
    audioBase64: meta.audioBase64 || "",
    audioMime: meta.audioMime || "",
    length: LEVEL_LENGTH_DEFAULT,
    speed: 1,
    background: { r: 0, g: 40, b: 80 },
    groundY: GROUND_Y,
    objects: [
      createObject("block", 0, GROUND_Y - 30, { width: 600, height: 30 })
    ],
    settings: {
      gamemode: "cube",
      mini: false,
      dual: false
    },
    meta: {
      createdWith: meta.createdWith || "manual",
      gdStudio: true
    }
  };
}

export function serializeLevel(level) {
  return JSON.parse(JSON.stringify(level));
}

export function computeLevelStats(level) {
  const objects = level?.objects || [];
  const maxX = objects.reduce((m, o) => Math.max(m, o.x + (o.width || 30)), 0);
  const speed = level?.speed ?? 1;
  const durationSec = maxX > 0 ? maxX / (300 * speed) : 0;

  return {
    objectCount: objects.length,
    duration: Math.round(durationSec * 10) / 10,
    length: maxX || level?.length || 0
  };
}

export function normalizeImportedLevel(data, fallbackName = "Importado") {
  if (!data || typeof data !== "object") {
    throw new Error("Formato de nivel no válido.");
  }

  const level = {
    version: data.version ?? 2,
    name: data.name || data.k3 || fallbackName,
    difficulty: data.difficulty || "normal",
    newgroundsId: String(data.newgroundsId ?? data.k8 ?? ""),
    audioBase64: data.audioBase64 || "",
    audioMime: data.audioMime || "audio/mpeg",
    length: data.length ?? data.k1 ?? LEVEL_LENGTH_DEFAULT,
    speed: data.speed ?? 1,
    background: data.background || { r: 0, g: 40, b: 80 },
    groundY: data.groundY ?? GROUND_Y,
    objects: [],
    settings: data.settings || { gamemode: "cube", mini: false, dual: false },
    meta: { ...(data.meta || {}), imported: true, gdStudio: true }
  };

  if (Array.isArray(data.objects)) {
    level.objects = data.objects.map(normalizeObject);
  } else if (typeof data.k4 === "string" && data.k4.length > 0) {
    try {
      const parsed = parseGdLevelString(data.k4);
      level.objects = parsed.objects;
      level.settings = { ...level.settings, ...parsed.settings };
    } catch {
      level.objects = parseLegacyObjectString(data.k4);
    }
  } else {
    level.objects = [createObject("block", 0, GROUND_Y - 30, { width: 400, height: 30 })];
  }

  return level;
}

function normalizeObject(raw, index) {
  if (typeof raw === "string") {
    return parseObjectToken(raw, index);
  }
  const oid = raw.objectId ?? raw.id ?? 1;
  const meta = resolveGdObjectId(oid);
  return {
    uid: raw.uid || `imp_${index}_${Date.now()}`,
    type: raw.type || meta.type || "block",
    objectId: oid,
    x: Number(raw.x) || 0,
    y: Number(raw.y) || 0,
    width: Number(raw.width) || 30,
    height: Number(raw.height) || 30,
    rotation: Number(raw.rotation) || 0,
    layer: Number(raw.layer) || 1,
    groupId: Number(raw.groupId) || 0
  };
}

/**
 * Parser simplificado de cadena de objetos estilo GD (id,x,y,...)
 */
function parseLegacyObjectString(str) {
  try {
    return parseGdLevelString(str).objects;
  } catch {
    const objects = [];
    str.split(";").forEach((chunk, i) => {
      if (!chunk.trim() || chunk.startsWith("kS")) return;
      const nums = chunk.split(",").map(Number);
      if (nums.length < 3) return;
      const [objectId, gdX, gdY] = nums;
      const meta = resolveGdObjectId(objectId);
      const h = meta.h || 30;
      objects.push(
        createObject(meta.type, gdX, gdYToCanvas(gdY) - h, {
          objectId,
          width: meta.w || 30,
          height: h
        })
      );
    });
    if (!objects.length) {
      objects.push(createObject("block", 0, GROUND_Y - 30, { width: 300, height: 30 }));
    }
    return objects;
  }
}

function parseObjectToken(token, index) {
  const nums = token.split(",").map(Number);
  const [objectId, gdX, gdY] = nums;
  const meta = resolveGdObjectId(objectId);
  const h = meta.h || 30;
  return createObject(meta.type, gdX, gdYToCanvas(gdY) - h, {
    objectId,
    uid: `tok_${index}`,
    width: meta.w || 30,
    height: h
  });
}

export { canvasYToGd, gdYToCanvas };
