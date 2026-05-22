import { drawObject } from "../render/object-renderer.js";
import { GROUND_Y } from "../level/level-model.js";

export function renderThumbnail(level, width = 320, height = 200) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const bg = level.background || { r: 0, g: 40, b: 80 };
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, `rgb(${bg.r * 0.35},${bg.g * 0.35},${bg.b * 0.55})`);
  grad.addColorStop(1, `rgb(${bg.r},${bg.g},${bg.b})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const groundY = level.groundY ?? GROUND_Y;
  const scale = height / 380;
  const offsetY = height - groundY * scale - 8;

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, height - 18, width, 18);

  const objects = (level.objects || []).slice(0, 120);
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(0, offsetY / scale);

  for (const obj of objects) {
    const sx = obj.x * 0.12;
    if (sx > width / scale) continue;
    drawObject(ctx, { ...obj, x: sx, y: obj.y }, { cameraX: 0, viewW: width });
  }

  ctx.fillStyle = "#00d4ff";
  ctx.fillRect(8, groundY - 32, 14, 14);
  ctx.restore();

  return canvas.toDataURL("image/jpeg", 0.72);
}
