import {
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  sendPasswordReset,
  logout,
  mapAuthError
} from "./auth-service.js";
import {
  renderRecaptcha,
  getRecaptchaResponse,
  resetRecaptcha,
  verifyRecaptchaToken,
  waitForRecaptcha
} from "./recaptcha.js";
import { $, $$ } from "../utils/helpers.js";
import { showToast } from "../utils/toast.js";

let recaptchaLogin = null;
let recaptchaRegister = null;
let recaptchaReset = null;

export async function initAuthUI(onAuthenticated) {
  await waitForRecaptcha();
  recaptchaLogin = await renderRecaptcha("recaptcha-login");
  recaptchaRegister = await renderRecaptcha("recaptcha-register");
  recaptchaReset = await renderRecaptcha("recaptcha-reset");

  $$("[data-auth-show]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showAuthPanel(link.dataset.authShow);
    });
  });

  $("#form-login")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleLogin();
  });

  $("#form-register")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleRegister();
  });

  $("#form-reset")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleReset();
  });

  $("#btn-google-login")?.addEventListener("click", () => handleGoogle(false));
  $("#btn-google-register")?.addEventListener("click", () => handleGoogle(true));
  $("#btn-logout")?.addEventListener("click", async () => {
    await logout();
    showToast("Sesión cerrada", "info");
    onAuthenticated?.(null);
  });

  showAuthPanel("login");
}

export function showAuthPanel(panel) {
  $$(".auth-form").forEach((f) => f.classList.add("hidden"));
  const form = $(`#form-${panel}`);
  form?.classList.remove("hidden");
  $$(".auth-error, .auth-success").forEach((el) => {
    el.textContent = "";
    el.classList.add("hidden");
  });
}

async function handleLogin() {
  const errEl = $("#login-error");
  errEl.textContent = "";
  const email = $("#login-email").value.trim();
  const password = $("#login-password").value;
  const token = getRecaptchaResponse(recaptchaLogin);

  try {
    await verifyRecaptchaToken(token);
    await loginWithEmail(email, password);
    showToast("¡Bienvenido de nuevo!", "success");
  } catch (err) {
    errEl.textContent = mapAuthError(err);
    resetRecaptcha(recaptchaLogin);
  }
}

async function handleRegister() {
  const errEl = $("#register-error");
  errEl.textContent = "";
  const name = $("#register-name").value.trim();
  const email = $("#register-email").value.trim();
  const pass = $("#register-password").value;
  const pass2 = $("#register-password2").value;
  const token = getRecaptchaResponse(recaptchaRegister);

  if (pass !== pass2) {
    errEl.textContent = "Las contraseñas no coinciden.";
    return;
  }

  try {
    await verifyRecaptchaToken(token);
    await registerWithEmail(email, pass, name);
    showToast("Cuenta creada correctamente", "success");
    showAuthPanel("login");
  } catch (err) {
    errEl.textContent = mapAuthError(err);
    resetRecaptcha(recaptchaRegister);
  }
}

async function handleReset() {
  const errEl = $("#reset-error");
  const okEl = $("#reset-success");
  errEl.textContent = "";
  okEl.classList.add("hidden");
  const email = $("#reset-email").value.trim();
  const token = getRecaptchaResponse(recaptchaReset);

  try {
    await verifyRecaptchaToken(token);
    await sendPasswordReset(email);
    okEl.textContent = "Enlace enviado. Revisa tu bandeja de entrada (y spam).";
    okEl.classList.remove("hidden");
    showToast("Correo de recuperación enviado", "success");
  } catch (err) {
    errEl.textContent = mapAuthError(err);
    resetRecaptcha(recaptchaReset);
  }
}

async function handleGoogle() {
  try {
    await loginWithGoogle();
    showToast("Sesión iniciada con Google", "success");
  } catch (err) {
    showToast(mapAuthError(err), "error");
  }
}
