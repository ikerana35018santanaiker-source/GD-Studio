// js/auth/auth-register.js
import { auth } from '../config/firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { DatabaseService } from '../database/database-service.js';

export class AuthRegister {
  constructor() {
    this.form = document.getElementById('registerForm');
    this.setupListeners();
  }

  setupListeners() {
    this.form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleRegister();
    });
  }

  async handleRegister() {
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
      this.showError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      this.showError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      window.location.href = 'dashboard.html';
    } catch (error) {
      this.showError(this.getErrorMessage(error.code));
    }
  }

  showError(message) {
    const errorContainer = document.getElementById('registerError');
    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.style.display = 'block';
    }
  }

  getErrorMessage(code) {
    const errors = {
      'auth/email-already-in-use': 'Este correo ya está registrado',
      'auth/invalid-email': 'Correo electrónico inválido',
      'auth/weak-password': 'La contraseña es muy débil'
    };
    return errors[code] || 'Error al registrarse';
  }
}
