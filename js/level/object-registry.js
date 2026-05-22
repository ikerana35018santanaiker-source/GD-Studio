/**
 * Catálogo de objetos compatibles con el editor y el motor de físicas
 * IDs alineados con convenciones de Geometry Dash (simplificado)
 */

export const OBJECT_TYPES = {
  block: {
    id: 1,
    label: "Bloque",
    icon: "fa-square",
    swatch: "block",
    width: 30,
    height: 30,
    solid: true,
    hazard: false,
    color: "#4ade80"
  },
  block_slope: {
    id: 2,
    label: "Pendiente",
    icon: "fa-play",
    swatch: "block",
    width: 30,
    height: 30,
    solid: true,
    hazard: false,
    color: "#34d399",
    slope: true
  },
  spike: {
    id: 3,
    label: "Pincho",
    icon: "fa-caret-up",
    swatch: "spike",
    width: 30,
    height: 28,
    solid: false,
    hazard: true,
    color: "#ef4444"
  },
  orb_yellow: {
    id: 36,
    label: "Orbe amarillo",
    icon: "fa-circle",
    swatch: "orb",
    width: 26,
    height: 26,
    solid: false,
    hazard: false,
    orb: true,
    orbType: "yellow",
    color: "#fbbf24"
  },
  pad_yellow: {
    id: 35,
    label: "Pad amarillo",
    icon: "fa-minus",
    swatch: "pad",
    width: 40,
    height: 12,
    solid: false,
    hazard: false,
    pad: true,
    padType: "yellow",
    color: "#facc15"
  },
  portal_gravity_up: {
    id: 10,
    label: "Portal gravedad",
    icon: "fa-rotate",
    swatch: "portal",
    width: 34,
    height: 50,
    solid: false,
    hazard: false,
    portal: true,
    portalEffect: "flipGravity",
    color: "#a78bfa"
  },
  deco: {
    id: 99,
    label: "Decoración",
    icon: "fa-star",
    swatch: "deco",
    width: 24,
    height: 24,
    solid: false,
    hazard: false,
    deco: true,
    color: "#94a3b8"
  }
};

export function getTypeByKey(key) {
  return OBJECT_TYPES[key] || OBJECT_TYPES.block;
}

export function getTypeById(id) {
  return Object.values(OBJECT_TYPES).find((t) => t.id === id) || OBJECT_TYPES.block;
}

export function paletteEntries() {
  return Object.entries(OBJECT_TYPES).map(([key, def]) => ({ key, ...def }));
}

export function createObject(typeKey, x, y, overrides = {}) {
  const type = getTypeByKey(typeKey);
  return {
    uid: `obj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: typeKey,
    objectId: type.id,
    x: Math.round(x),
    y: Math.round(y),
    width: type.width,
    height: type.height,
    rotation: overrides.rotation ?? 0,
    layer: overrides.layer ?? 1,
    groupId: overrides.groupId ?? 0,
    ...overrides
  };
}
