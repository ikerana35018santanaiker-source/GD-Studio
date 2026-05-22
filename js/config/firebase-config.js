// js/config/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCYV0CPNjkzJKwG3tn7kaVSucMnWdXRD1A",
  authDomain: "gd-studio-d5fe1.firebaseapp.com",
  projectId: "gd-studio-d5fe1",
  storageBucket: "gd-studio-d5fe1.firebasestorage.app",
  messagingSenderId: "1030771979655",
  appId: "1:1030771979655:web:f175405cbe11fe741c0f22"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);
