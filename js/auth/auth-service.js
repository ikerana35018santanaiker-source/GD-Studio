import { firebaseConfig } from "../config/firebase-config.js";
import { parseFirebaseError } from "../utils/helpers.js";

let app = null;
let auth = null;
let db = null;

export function initFirebase() {
  if (!firebase?.apps?.length) {
    app = firebase.initializeApp(firebaseConfig);
  } else {
    app = firebase.app();
  }
  auth = firebase.auth();
  db = firebase.database();

  auth.useDeviceLanguage();
  return { app, auth, db };
}

export function getAuth() {
  return auth;
}

export function getDatabase() {
  return db;
}

export function onAuthStateChanged(callback) {
  return auth.onAuthStateChanged(callback);
}

export async function registerWithEmail(email, password, displayName) {
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  if (displayName) {
    await cred.user.updateProfile({ displayName });
  }
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function loginWithEmail(email, password) {
  const cred = await auth.signInWithEmailAndPassword(email, password);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await auth.signInWithPopup(provider);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function sendPasswordReset(email) {
  await auth.sendPasswordResetEmail(email);
}

export async function logout() {
  await auth.signOut();
}

async function ensureUserProfile(user) {
  if (!user || !db) return;
  const ref = db.ref(`users/${user.uid}/profile`);
  const snap = await ref.once("value");
  if (!snap.exists()) {
    await ref.set({
      email: user.email || "",
      displayName: user.displayName || "Jugador",
      photoURL: user.photoURL || "",
      createdAt: Date.now()
    });
  }
}

export function mapAuthError(err) {
  return parseFirebaseError(err?.code || err?.message);
}
