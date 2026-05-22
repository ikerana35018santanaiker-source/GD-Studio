// js/auth/auth-login.js
import { auth } from '../config/firebase-config.js';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export class AuthLogin {
  constructor() {
    this.form = document.getElementById('loginForm');
    this.emailInput = document.getElementById('loginEmail');
    this.passwordInput = document.getElementById('loginPassword');
    this.errorContainer = document.getElementById('loginError');
    this.setupListeners();
  }

  setupListeners() {
    this.form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLogin();
    });

    document.getElementById('forgotPassword')?.addEventListener('click', async () => {
      const email = prompt("Ingresa tu correo para recuperar contraseña:");
      if (email) {
        try {
          await sendPasswordResetEmail(auth, email);
          alert("¡Enlace de recuperación enviado! Revisa tu correo.");
        } catch (error) {
          this.showError("Error al enviar recuperación: " + error.message);
        }
      }
    });
  }

  async handleLogin() {
    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      window.location.href = 'dashboard.html';
    } catch (error) {
      this.showError(this.getErrorMessage(error.code));
    }
  }

  showError(message) {
    if (this.errorContainer) {
      this.errorContainer.textContent = message;
      this.errorContainer.style.display = 'block';
      setTimeout(() => {
        this.errorContainer.style.display = 'none';
      }, 5000);
    }
  }

  getErrorMessage(code) {
    const errors = {
      'auth/invalid-email': 'Correo electrónico inválido',
      'auth/user-disabled': 'Usuario deshabilitado',
      'auth/user-not-found': 'Usuario no encontrado',
      'auth/wrong-password': 'Contraseña incorrecta',
      'auth/invalid-credential': 'Credenciales inválidas'
    };
    return errors[code] || 'Error al iniciar sesión';
  }
}
