/**
 * GD Studio — Configuración Firebase
 * Sustituye los valores por los de tu proyecto en Firebase Console.
 * https://console.firebase.google.com
 */
export const firebaseConfig = {
  apiKey: "AIzaSyCYV0CPNjkzJKwG3tn7kaVSucMnWdXRD1A",
  authDomain: "gd-studio-d5fe1.firebaseapp.com",
  databaseURL: "https://gd-studio-d5fe1-default-rtdb.firebaseio.com",
  projectId: "gd-studio-d5fe1",
  storageBucket: "gd-studio-d5fe1.firebasestorage.app",
  messagingSenderId: "1030771979655",
  appId: "1:1030771979655:web:f175405cbe11fe741c0f22"
};

/** reCAPTCHA v2 — clave del sitio (pública) */
export const RECAPTCHA_SITE_KEY = "6Lcvg_csAAAAAG04uFPIYKDOk2fmWJCqANM5n7W6";

/** Rutas en Realtime Database */
export const DB_PATHS = {
  users: "users",
  projects: (uid) => `users/${uid}/projects`,
  project: (uid, id) => `users/${uid}/projects/${id}`
};
