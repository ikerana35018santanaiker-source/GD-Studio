import { decryptGdLevelString } from "./gd-crypto.js";
import { resolveGdObjectId } from "./gd-object-ids.js";
import { gdYToCanvas, isTriggerId } from "./coordinates.js";
import { createObject } from "./object-registry.js";
import { GROUND_Y, LEVEL_LENGTH_DEFAULT } from "./level-model.js";

/**
 * Parsea la cadena interna de nivel GD (descifrada o en texto plano)
 */
export function parseGdLevelString(raw, options = {}) {
  const decrypted = decryptGdLevelString(raw);
  const { ignoreTriggers = true } = options;

  const objects = [];
  const chunks = decrypted.split(";");

  for (const chunk of chunks) {
    const line = chunk.trim();
    if (!line || line.startsWith("kS") || line.startsWith("kA") || line.startsWith("kP")) continue;

    const parts = line.split(",");
    if (parts.length < 3) continue;

    const objectId = parseInt(parts[0], 10);
    if (Number.isNaN(objectId) || objectId <= 0) continue;
    if (ignoreTriggers && isTriggerId(objectId)) continue;

    const gdX = parseFloat(parts[1]);
    const gdY = parseFloat(parts[2]);
    if (Number.isNaN(gdX) || Number.isNaN(gdY)) continue;

    const meta = resolveGdObjectId(objectId);
    if (meta.trigger) continue;

    const rotation = parseInt(parts[4], 10) || 0;
    const scale = parseFloat(parts[35]) || parseFloat(parts[20]) || 1;
    const w = Math.max(8, Math.round((meta.w || 30) * (scale > 0 ? scale : 1)));
    const h = Math.max(8, Math.round((meta.h || 30) * (scale > 0 ? scale : 1)));
    const canvasY = gdYToCanvas(gdY) - h;

    objects.push(
      createObject(meta.type, gdX, canvasY, {
        objectId,
        width: w,
        height: h,
        rotation,
        gdX,
        gdY,
        layer: parseInt(parts[8], 10) || 1,
        groupId: parseInt(parts[9], 10) || 0
      })
    );
  }

  const settings = parseLevelSettings(decrypted);

  return { objects, settings };
}

function parseLevelSettings(text) {
  const settings = { gamemode: "cube", mini: false, dual: false, speed: 1 };
  const speedMatch = text.match(/kA4,(\d+)/);
  if (speedMatch) {
    const speeds = [0.7, 0.9, 1, 1.2, 1.4, 1.6];
    settings.speed = speeds[parseInt(speedMatch[1], 10)] || 1;
  }
  const gmMatch = text.match(/kA2,(\d+)/);
  if (gmMatch) {
    const modes = ["cube", "ship", "ball", "ufo", "wave", "robot", "spider"];
    settings.gamemode = modes[parseInt(gmMatch[1], 10)] || "cube";
  }
  if (/kA3,1/.test(text)) settings.mini = true;
  if (/kA8,1/.test(text)) settings.dual = true;
  return settings;
}

export function buildLevelFromGdString(raw, meta = {}) {
  const { objects, settings } = parseGdLevelString(raw);
  const maxX = objects.reduce((m, o) => Math.max(m, o.x + (o.width || 30)), 0);

  return {
    version: 2,
    name: meta.name || "Importado",
    difficulty: meta.difficulty || "normal",
    newgroundsId: meta.newgroundsId || "",
    length: maxX + 500 || LEVEL_LENGTH_DEFAULT,
    speed: settings.speed || 1,
    background: meta.background || { r: 0, g: 40, b: 80 },
    groundY: GROUND_Y,
    objects: objects.length
      ? objects
      : [createObject("block", 0, GROUND_Y - 30, { width: 400, height: 30 })],
    settings,
    meta: { imported: true, gdStudio: true, fromGd: true }
  };
}
