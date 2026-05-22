/**
 * GD Studio — Punto de entrada principal
 */
import { firebaseConfig } from "./config/firebase-config.js";
import { initFirebase, onAuthStateChanged } from "./auth/auth-service.js";
import { initAuthUI } from "./auth/auth-ui.js";
import { DatabaseService } from "./db/database-service.js";
import { Dashboard } from "./dashboard/dashboard.js";
import { LevelEditor } from "./editor/editor.js";
import { ModalsController } from "./ui/modals.js";
import { showView, hideLoader, $ } from "./utils/helpers.js";
import { showToast } from "./utils/toast.js";

function isFirebaseConfigured() {
  return (
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "TU_API_KEY" &&
    firebaseConfig.databaseURL &&
    !firebaseConfig.databaseURL.includes("tu-proyecto")
  );
}

class GDStudioApp {
  constructor() {
    this.db = null;
    this.dashboard = null;
    this.editor = null;
    this.modals = null;
  }

  async init() {
    if (typeof firebase === "undefined") {
      hideLoader();
      showToast("Firebase SDK no cargado", "error", 6000);
      return;
    }

    if (!isFirebaseConfigured()) {
      console.warn(
        "[GD Studio] Configura js/config/firebase-config.js con tus credenciales de Firebase."
      );
    }

    initFirebase();
    this.db = new DatabaseService();
    this.editor = new LevelEditor(this.db);
    this.dashboard = new Dashboard(this.db, this.editor);
    this.modals = new ModalsController(this.db, this.editor);

    await initAuthUI();

    onAuthStateChanged((user) => this.onUserChanged(user));

    window.addEventListener("gdstudio:editor-closed", () => {
      /* dashboard se actualiza por listener RTDB */
    });

    hideLoader();
  }

  onUserChanged(user) {
    if (user) {
      this.dashboard.start(user);
      showView("view-dashboard");
    } else {
      this.dashboard.stop();
      showView("view-auth");
    }
  }
}

const app = new GDStudioApp();
app.init().catch((err) => {
  console.error(err);
  hideLoader();
  showToast("Error al iniciar GD Studio", "error", 5000);
});
