import { getTypeByKey } from "../level/object-registry.js";

/**
 * Genera miniatura en base64 para tarjetas del dashboard
 */
export function renderThumbnail(level, width = 320, height = 200) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const bg = level.background || { r: 0, g: 40, b: 80 };
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, `rgb(${bg.r * 0.4},${bg.g * 0.4},${bg.b * 0.6})`);
  grad.addColorStop(1, `rgb(${bg.r},${bg.g},${bg.b})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const groundY = level.groundY ?? 270;
  const scaleY = height / 400;
  const scaleX = 0.15;
  const offsetY = height - groundY * scaleY - 20;

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, height - 24, width, 24);

  const objects = (level.objects || []).slice(0, 80);
  for (const obj of objects) {
    const def = getTypeByKey(obj.type);
    const x = obj.x * scaleX;
    const y = offsetY + obj.y * scaleY;
    const w = (obj.width || 30) * scaleX;
    const h = (obj.height || 30) * scaleY;

    if (x > width + 20) continue;

    ctx.fillStyle = def.color || "#4ade80";
    if (def.hazard) {
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
      ctx.fill();
    } else if (def.orb) {
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, Math.max(w, 4), Math.max(h, 4));
    }
  }

  ctx.fillStyle = "#00d4ff";
  ctx.fillRect(12, offsetY + (groundY - 30) * scaleY, 14, 14);

  return canvas.toDataURL("image/jpeg", 0.7);
}
