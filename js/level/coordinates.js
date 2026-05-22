import { GROUND_Y } from "./level-model.js";

/** GD usa Y hacia arriba; el canvas usa Y hacia abajo */
export const GD_GROUND = 15;

export function gdYToCanvas(gdY) {
  return GROUND_Y - Number(gdY);
}

export function canvasYToGd(canvasY) {
  return GROUND_Y - Number(canvasY);
}

export function isTriggerId(id) {
  const n = parseInt(id, 10);
  return n >= 1700 && n < 2000;
}
