import { getTypeByKey } from "../level/object-registry.js";

const SPRITE_BASE =
  "https://cdn.jsdelivr.net/gh/HTJoel/GD-Level-Editor-assets@main/sprites/";

const spriteCache = new Map();
let spritesReady = false;

/** Carga sprites comunitarios (estilo GD); fallback procedural si falla */
export async function preloadGdSprites() {
  const names = [
    "block_01.png",
    "spike_01.png",
    "orb_01.png",
    "pad_01.png",
    "portal_01.png"
  ];
  await Promise.allSettled(
    names.map((name) => loadSprite(SPRITE_BASE + name, name))
  );
  spritesReady = spriteCache.size > 0;
}

function loadSprite(url, key) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      spriteCache.set(key, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function getSpriteKey(type) {
  if (type.includes("spike")) return "spike_01.png";
  if (type.includes("orb")) return "orb_01.png";
  if (type.includes("pad")) return "pad_01.png";
  if (type.includes("portal")) return "portal_01.png";
  if (type.includes("coin")) return null;
  return "block_01.png";
}

/**
 * Dibuja un objeto en canvas (editor / test / miniatura)
 */
export function drawObject(ctx, obj, options = {}) {
  const def = getTypeByKey(obj.type);
  const x = obj.x;
  const y = obj.y;
  const w = obj.width || def.width || 30;
  const h = obj.height || def.height || 30;
  const selected = options.selected;
  const cameraX = options.cameraX || 0;
  const sx = x - cameraX;

  if (sx < -120 || sx > (options.viewW || 2000) + 120) return;

  ctx.save();
  if (selected) {
    ctx.shadowColor = "#00e5ff";
    ctx.shadowBlur = 14;
  }

  const spriteKey = getSpriteKey(obj.type);
  const sprite = spritesReady ? spriteCache.get(spriteKey) : null;

  if (sprite && !def.hazard && !def.portal) {
    try {
      ctx.drawImage(sprite, sx, y, w, h);
    } catch {
      drawProcedural(ctx, obj, def, sx, y, w, h);
    }
  } else {
    drawProcedural(ctx, obj, def, sx, y, w, h);
  }

  if (selected) {
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(sx - 2, y - 2, w + 4, h + 4);
  }
  ctx.restore();
}

function drawProcedural(ctx, obj, def, x, y, w, h) {
  const color = def.color || "#4ade80";

  if (def.hazard) {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, "#ff6b6b");
    grad.addColorStop(1, "#c92a2a");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#7f1d1d";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    return;
  }

  if (def.orb) {
    const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, w / 2);
    g.addColorStop(0, "#fff");
    g.addColorStop(0.35, color);
    g.addColorStop(1, shade(color, -40));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }

  if (def.pad) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y + h * 0.35, w, h * 0.3);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillRect(x + 4, y + h * 0.4, w - 8, 3);
    return;
  }

  if (def.portal) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, "#c084fc");
    g.addColorStop(0.5, "#7c3aed");
    g.addColorStop(1, "#4c1d95");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(x + 6, y + 10, w - 12, h - 20);
    ctx.strokeStyle = "#e9d5ff";
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    return;
  }

  if (def.coin) {
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b45309";
    ctx.font = "bold 11px Rajdhani";
    ctx.textAlign = "center";
    ctx.fillText("¢", x + w / 2, y + h / 2 + 4);
    return;
  }

  if (def.deco) {
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    return;
  }

  // Bloque estilo GD
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, shade(color, 30));
  g.addColorStop(0.15, color);
  g.addColorStop(1, shade(color, -35));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.strokeRect(x + 2, y + 2, w - 4, 4);
}

export function drawPlayer(ctx, p, cameraX, dead = false) {
  const x = p.x - cameraX;
  const y = p.y;
  const w = p.width;
  const h = p.height;

  ctx.save();
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  if (dead) {
    g.addColorStop(0, "#f87171");
    g.addColorStop(1, "#dc2626");
  } else {
    g.addColorStop(0, "#67e8f9");
    g.addColorStop(0.5, "#00d4ff");
    g.addColorStop(1, "#0891b2");
  }
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  // Cara cubo
  ctx.fillStyle = "#0a0e17";
  ctx.fillRect(x + 6, y + 8, 5, 5);
  ctx.fillRect(x + w - 11, y + 8, 5, 5);
  ctx.restore();
}

function shade(hex, amount) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}
