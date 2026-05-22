/**
 * Catálogo completo de objetos GD Studio (IDs oficiales Geometry Dash)
 */

const C = {
  block: "#4ade80",
  spike: "#ef4444",
  orbY: "#facc15",
  orbP: "#f472b6",
  orbR: "#f87171",
  orbB: "#60a5fa",
  orbG: "#4ade80",
  orbBk: "#94a3b8",
  padY: "#eab308",
  padP: "#ec4899",
  padR: "#ef4444",
  padB: "#3b82f6",
  padG: "#22c55e",
  portal: "#a78bfa",
  coin: "#fbbf24",
  deco: "#64748b"
};

function def(id, key, label, opts = {}) {
  return {
    id,
    key,
    label,
    category: opts.category || "blocks",
    icon: opts.icon || "fa-square",
    width: opts.w ?? 30,
    height: opts.h ?? 30,
    solid: opts.solid ?? false,
    hazard: opts.hazard ?? false,
    orb: opts.orb ?? false,
    pad: opts.pad ?? false,
    portal: opts.portal ?? false,
    deco: opts.deco ?? false,
    coin: opts.coin ?? false,
    trigger: opts.trigger ?? false,
    color: opts.color || C.block,
    portalEffect: opts.portalEffect,
    orbType: opts.orbType,
    padType: opts.padType
  };
}

/** Lista plana: key → definición */
export const OBJECT_TYPES = {};

const entries = [
  def(1, "block", "Bloque", { category: "blocks", solid: true, color: C.block }),
  def(2, "block_slope", "Pendiente", { category: "blocks", solid: true, icon: "fa-play", color: "#34d399" }),
  ...range(6, 34, (i) => def(i, `block_${i}`, `Bloque ${i}`, { category: "blocks", solid: true, color: C.block })),
  def(3, "spike", "Pincho", { category: "hazards", hazard: true, icon: "fa-caret-up", h: 28, color: C.spike }),
  ...range(4, 5, (i) => def(i, `spike_${i}`, `Pincho ${i}`, { category: "hazards", hazard: true, h: 28, color: C.spike })),
  ...range(67, 100, (i) => def(i, `spike_${i}`, `Pincho ${i}`, { category: "hazards", hazard: true, h: 28, color: C.spike })),
  def(35, "pad_yellow", "Pad amarillo", { category: "pads", pad: true, padType: "yellow", w: 40, h: 12, icon: "fa-minus", color: C.padY }),
  def(43, "pad_pink", "Pad rosa", { category: "pads", pad: true, padType: "pink", w: 40, h: 12, color: C.padP }),
  def(44, "pad_red", "Pad rojo", { category: "pads", pad: true, padType: "red", w: 40, h: 12, color: C.padR }),
  def(45, "pad_blue", "Pad azul", { category: "pads", pad: true, padType: "blue", w: 40, h: 12, color: C.padB }),
  def(46, "pad_green", "Pad verde", { category: "pads", pad: true, padType: "green", w: 40, h: 12, color: C.padG }),
  def(47, "pad_black", "Pad negro", { category: "pads", pad: true, padType: "black", w: 40, h: 12, color: "#334155" }),
  def(36, "orb_yellow", "Orbe amarillo", { category: "orbs", orb: true, orbType: "yellow", w: 26, h: 26, icon: "fa-circle", color: C.orbY }),
  def(37, "orb_pink", "Orbe rosa", { category: "orbs", orb: true, orbType: "pink", w: 26, h: 26, color: C.orbP }),
  def(38, "orb_red", "Orbe rojo", { category: "orbs", orb: true, orbType: "red", w: 26, h: 26, color: C.orbR }),
  def(39, "orb_blue", "Orbe azul", { category: "orbs", orb: true, orbType: "blue", w: 26, h: 26, color: C.orbB }),
  def(40, "orb_green", "Orbe verde", { category: "orbs", orb: true, orbType: "green", w: 26, h: 26, color: C.orbG }),
  def(41, "orb_black", "Orbe negro", { category: "orbs", orb: true, orbType: "black", w: 26, h: 26, color: C.orbBk }),
  def(101, "portal_gravity_up", "Gravedad ↑", { category: "portals", portal: true, portalEffect: "flipGravity", w: 34, h: 50, icon: "fa-rotate", color: C.portal }),
  def(102, "portal_gravity_down", "Gravedad ↓", { category: "portals", portal: true, portalEffect: "flipGravity", w: 34, h: 50, color: "#7c3aed" }),
  def(103, "portal_cube", "Cubo", { category: "portals", portal: true, portalEffect: "gamemode", w: 34, h: 50, icon: "fa-cube", color: "#38bdf8" }),
  def(104, "portal_ship", "Nave", { category: "portals", portal: true, portalEffect: "gamemode", w: 34, h: 50, icon: "fa-rocket", color: "#f97316" }),
  def(105, "portal_ball", "Pelota", { category: "portals", portal: true, portalEffect: "gamemode", w: 34, h: 50, color: "#a3e635" }),
  def(106, "portal_ufo", "UFO", { category: "portals", portal: true, portalEffect: "gamemode", w: 34, h: 50, color: "#2dd4bf" }),
  def(107, "portal_wave", "Wave", { category: "portals", portal: true, portalEffect: "gamemode", w: 34, h: 50, color: "#22d3ee" }),
  def(108, "portal_robot", "Robot", { category: "portals", portal: true, portalEffect: "gamemode", w: 34, h: 50, color: "#94a3b8" }),
  def(109, "portal_spider", "Spider", { category: "portals", portal: true, portalEffect: "gamemode", w: 34, h: 50, color: "#e879f9" }),
  def(111, "portal_mini_on", "Mini ON", { category: "portals", portal: true, portalEffect: "mini", w: 34, h: 50, color: "#f472b6" }),
  def(112, "portal_mini_off", "Mini OFF", { category: "portals", portal: true, portalEffect: "mini", w: 34, h: 50, color: "#fb7185" }),
  def(113, "portal_speed_slow", "Lento", { category: "portals", portal: true, portalEffect: "speed", w: 34, h: 50, color: "#60a5fa" }),
  def(114, "portal_speed_fast", "Rápido", { category: "portals", portal: true, portalEffect: "speed", w: 34, h: 50, color: "#fbbf24" }),
  def(115, "portal_speed_faster", "Más rápido", { category: "portals", portal: true, portalEffect: "speed", w: 34, h: 50, color: "#f97316" }),
  def(118, "portal_dual_on", "Dual ON", { category: "portals", portal: true, portalEffect: "dual", w: 34, h: 50, color: "#c084fc" }),
  def(119, "portal_dual_off", "Dual OFF", { category: "portals", portal: true, portalEffect: "dual", w: 34, h: 50, color: "#818cf8" }),
  def(134, "coin", "Moneda", { category: "items", coin: true, w: 20, h: 20, icon: "fa-coins", color: C.coin }),
  ...range(121, 133, (i) => def(i, `deco_${i}`, `Deco ${i}`, { category: "decoration", deco: true, w: 24, h: 24, icon: "fa-star", color: C.deco })),
  ...range(141, 150, (i) => def(i, `block_ex_${i}`, `Bloque+ ${i}`, { category: "blocks", solid: true, color: "#2dd4bf" }))
];

entries.forEach((e) => {
  OBJECT_TYPES[e.key] = e;
});

function range(from, to, fn) {
  const arr = [];
  for (let i = from; i <= to; i++) arr.push(fn(i));
  return arr;
}

export const PALETTE_CATEGORIES = [
  { id: "blocks", label: "Bloques", icon: "fa-square" },
  { id: "hazards", label: "Peligros", icon: "fa-caret-up" },
  { id: "orbs", label: "Orbes", icon: "fa-circle" },
  { id: "pads", label: "Pads", icon: "fa-minus" },
  { id: "portals", label: "Portales", icon: "fa-door-open" },
  { id: "items", label: "Items", icon: "fa-coins" },
  { id: "decoration", label: "Decoración", icon: "fa-star" }
];

export function getTypeByKey(key) {
  return OBJECT_TYPES[key] || OBJECT_TYPES.block;
}

export function getTypeById(id) {
  const found = Object.values(OBJECT_TYPES).find((t) => t.id === id);
  return found || OBJECT_TYPES.block;
}

export function paletteEntries(category = null) {
  return Object.values(OBJECT_TYPES)
    .filter((t) => !category || t.category === category)
    .map((t) => ({ key: t.key, ...t }));
}

export function createObject(typeKey, x, y, overrides = {}) {
  const type = getTypeByKey(typeKey);
  return {
    uid: `obj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: typeKey,
    objectId: overrides.objectId ?? type.id,
    x: Math.round(x),
    y: Math.round(y),
    width: overrides.width ?? type.width,
    height: overrides.height ?? type.height,
    rotation: overrides.rotation ?? 0,
    layer: overrides.layer ?? 1,
    groupId: overrides.groupId ?? 0,
    ...overrides
  };
}
