/**
 * Utilidades generales de GD Studio
 */

export function $(selector, root = document) {
  return root.querySelector(selector);
}

export function $$(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

export function generateId() {
  return `lvl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}

export function difficultyLabel(key) {
  const map = {
    easy: "Fácil",
    normal: "Normal",
    hard: "Difícil",
    harder: "Más difícil",
    insane: "Insane",
    demon: "Demon"
  };
  return map[key] || key;
}

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function showView(viewId) {
  $$(".view").forEach((v) => v.classList.add("hidden"));
  const el = $(`#${viewId}`);
  if (el) el.classList.remove("hidden");
}

export function hideLoader() {
  const loader = $("#app-loader");
  if (loader) {
    loader.classList.add("fade-out");
    setTimeout(() => loader.remove(), 500);
  }
}

export async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export async function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function downloadBlob(filename, content, mime = "application/octet-stream") {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function snapToGrid(value, cell = 30) {
  return Math.round(value / cell) * cell;
}

export function parseFirebaseError(code) {
  const messages = {
    "auth/email-already-in-use": "Este correo ya está registrado.",
    "auth/invalid-email": "Correo electrónico no válido.",
    "auth/operation-not-allowed": "Operación no permitida en Firebase.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/user-disabled": "Esta cuenta está deshabilitada.",
    "auth/user-not-found": "No existe una cuenta con este correo.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/invalid-credential": "Credenciales incorrectas.",
    "auth/too-many-requests": "Demasiados intentos. Espera un momento.",
    "auth/popup-closed-by-user": "Ventana de Google cerrada.",
    "auth/network-request-failed": "Error de red. Comprueba tu conexión.",
    "auth/missing-password": "Introduce una contraseña.",
    "auth/invalid-login-credentials": "Correo o contraseña incorrectos."
  };
  return messages[code] || code || "Error desconocido";
}
