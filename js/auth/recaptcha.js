import { RECAPTCHA_SITE_KEY } from "../config/firebase-config.js";

const widgets = new Map();

/**
 * Callback global requerido por el script de reCAPTCHA en index.html
 */
window.onRecaptchaLoad = function onRecaptchaLoad() {
  window.dispatchEvent(new CustomEvent("recaptcha-ready"));
};

export function waitForRecaptcha() {
  if (typeof grecaptcha !== "undefined" && grecaptcha.render) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    window.addEventListener("recaptcha-ready", () => resolve(), { once: true });
    setTimeout(resolve, 8000);
  });
}

export async function renderRecaptcha(containerId) {
  await waitForRecaptcha();
  const el = document.getElementById(containerId);
  if (!el || typeof grecaptcha === "undefined") return null;

  if (widgets.has(containerId)) {
    try {
      grecaptcha.reset(widgets.get(containerId));
    } catch (_) { /* ignore */ }
    return widgets.get(containerId);
  }

  const id = grecaptcha.render(el, {
    sitekey: RECAPTCHA_SITE_KEY,
    theme: "dark"
  });
  widgets.set(containerId, id);
  return id;
}

export function getRecaptchaResponse(widgetId) {
  if (typeof grecaptcha === "undefined" || widgetId == null) return "";
  return grecaptcha.getResponse(widgetId) || "";
}

export function resetRecaptcha(widgetId) {
  if (typeof grecaptcha !== "undefined" && widgetId != null) {
    try {
      grecaptcha.reset(widgetId);
    } catch (_) { /* ignore */ }
  }
}

export async function verifyRecaptchaToken(token) {
  if (!token) {
    throw new Error("Completa el reCAPTCHA antes de continuar.");
  }
  return true;
}
