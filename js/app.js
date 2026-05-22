// js/app.js
import { AuthLogin } from './auth/auth-login.js';
import { AuthRegister } from './auth/auth-register.js';
import { AuthGoogle } from './auth/auth-google.js';
import { Dashboard } from './dashboard/dashboard.js';

class App {
  constructor() {
    this.init();
  }

  init() {
    // Detectar página actual
    const currentPage = this.getCurrentPage();
    
    switch (currentPage) {
      case 'login':
      case 'index':
        new AuthLogin();
        new AuthGoogle();
        break;
      case 'register':
        new AuthRegister();
        new AuthGoogle();
        break;
      case 'dashboard':
        new Dashboard();
        break;
      case 'editor':
        // Editor se inicializa en editor-main.js
        break;
    }

    this.setupGlobalListeners();
  }

  getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('register')) return 'register';
    if (path.includes('dashboard')) return 'dashboard';
    if (path.includes('editor')) return 'editor';
    if (path.includes('tester')) return 'tester';
    return 'index';
  }

  setupGlobalListeners() {
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      const { auth } = await import('./config/firebase-config.js');
      const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
      await signOut(auth);
      window.location.href = 'index.html';
    });

    // Navigation
    document.getElementById('dashboardLink')?.addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  }
}

// Iniciar app
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
