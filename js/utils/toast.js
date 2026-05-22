import { $ } from "./helpers.js";

let container;

function getContainer() {
  if (!container) container = $("#toast-container");
  return container;
}

export function showToast(message, type = "info", duration = 3500) {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  getContainer()?.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.3s";
    setTimeout(() => el.remove(), 300);
  }, duration);
}
