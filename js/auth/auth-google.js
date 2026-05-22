// js/auth/auth-google.js
import { auth } from '../config/firebase-config.js';
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export class AuthGoogle {
  constructor() {
    this.googleButtons = document.querySelectorAll('.google-auth-btn');
    this.provider = new GoogleAuthProvider();
    this.setupListeners();
  }

  setupListeners() {
    this.googleButtons.forEach(button => {
      button.addEventListener('click', () => this.handleGoogleAuth());
    });
  }

  async handleGoogleAuth() {
    try {
      const result = await signInWithPopup(auth, this.provider);
      const user = result.user;
      console.log('Usuario autenticado:', user.email);
      window.location.href = 'dashboard.html';
    } catch (error) {
      console.error('Error con Google Auth:', error);
      alert('Error al iniciar sesión con Google');
    }
  }
}
