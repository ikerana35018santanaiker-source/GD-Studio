import { $, $$, readFileAsDataURL } from "../utils/helpers.js";
import { parseLevelFile } from "../level/gmd-parser.js";
import { generateLevelWithAI } from "../ai/level-generator.js";
import { createEmptyLevel } from "../level/level-model.js";
import { renderThumbnail } from "../editor/thumbnail-renderer.js";
import { showToast } from "../utils/toast.js";

/**
 * Gestión de modales: crear e importar niveles
 */
export class ModalsController {
  constructor(db, editor) {
    this.db = db;
    this.editor = editor;
    this.importFile = null;
    this._bind();
  }

  _bind() {
    const overlay = $("#modal-overlay");
    const closeBtns = $$("[data-modal-close]");

    closeBtns.forEach((btn) => {
      btn.addEventListener("click", () => this.closeAll());
    });
    overlay?.addEventListener("click", () => this.closeAll());

    $("#btn-create-level")?.addEventListener("click", () => this.open("modal-create"));
    $("#btn-import-level")?.addEventListener("click", () => this.open("modal-import"));

    $$("[data-create-mode]").forEach((card) => {
      card.addEventListener("click", () => {
        const mode = card.dataset.createMode;
        $("#create-mode").value = mode;
        $("#modal-create-form-title").textContent =
          mode === "ai" ? "Nuevo nivel con IA" : "Nuevo nivel manual";
        this.close("modal-create");
        this.open("modal-create-form");
      });
    });

    $("#form-create-level")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleCreate();
    });

    $("#form-import-level")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleImport();
    });

    this._setupImportDropzone();
  }

  open(id) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    $("#modal-overlay")?.classList.remove("hidden");
    dialog.showModal?.() || dialog.setAttribute("open", "");
  }

  close(id) {
    const dialog = document.getElementById(id);
    dialog?.close?.() || dialog?.removeAttribute("open");
  }

  closeAll() {
    $$(".modal").forEach((m) => m.close?.() || m.removeAttribute("open"));
    $("#modal-overlay")?.classList.add("hidden");
  }

  _setupImportDropzone() {
    const zone = $("#import-dropzone");
    const input = $("#import-file");
    const nameEl = $("#import-file-name");

    $("#btn-import-browse")?.addEventListener("click", () => input?.click());

    input?.addEventListener("change", () => {
      if (input.files[0]) {
        this.importFile = input.files[0];
        nameEl.textContent = input.files[0].name;
        if (!$("#import-name").value) {
          $("#import-name").value = input.files[0].name.replace(/\.(gmd|json)$/i, "");
        }
      }
    });

    zone?.addEventListener("click", (e) => {
      if (e.target.closest("#btn-import-browse")) return;
      input?.click();
    });

    zone?.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("dragover");
    });
    zone?.addEventListener("dragleave", () => zone.classList.remove("dragover"));
    zone?.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("dragover");
      const file = e.dataTransfer.files[0];
      if (file) {
        this.importFile = file;
        nameEl.textContent = file.name;
        if (!$("#import-name").value) {
          $("#import-name").value = file.name.replace(/\.(gmd|json)$/i, "");
        }
      }
    });
  }

  async handleCreate() {
    const mode = $("#create-mode").value;
    const name = $("#create-name").value.trim();
    const difficulty = $("#create-difficulty").value;
    const ngId = $("#create-ng-id").value.trim();
    const audioInput = $("#create-audio");

    let audioBase64 = "";
    let audioMime = "";

    if (audioInput?.files[0]) {
      try {
        const dataUrl = await readFileAsDataURL(audioInput.files[0]);
        audioBase64 = dataUrl;
        audioMime = audioInput.files[0].type || "audio/mpeg";
      } catch {
        showToast("No se pudo leer el audio", "error");
        return;
      }
    }

    const meta = {
      name,
      difficulty,
      newgroundsId: ngId,
      audioBase64,
      audioMime,
      createdWith: mode
    };

    try {
      let level;
      if (mode === "ai") {
        level = generateLevelWithAI(meta);
      } else {
        level = createEmptyLevel(meta);
      }

      const thumb = renderThumbnail(level);
      const project = await this.db.createProject(meta, level);
      await this.db.updateProject(project.id, { thumbnail: thumb });

      this.closeAll();
      showToast("Nivel creado", "success");
      await this.editor.open({ ...project, level, thumbnail: thumb });
    } catch (err) {
      showToast(err.message || "Error al crear", "error");
    }
  }

  async handleImport() {
    const errEl = $("#import-error");
    errEl.textContent = "";

    if (!this.importFile) {
      errEl.textContent = "Selecciona un archivo .gmd o .json";
      return;
    }

    const name = $("#import-name").value.trim();
    if (!name) {
      errEl.textContent = "Introduce un nombre para el proyecto";
      return;
    }

    try {
      const level = await parseLevelFile(this.importFile);
      const project = await this.db.importProject(name, level, {
        difficulty: level.difficulty,
        newgroundsId: level.newgroundsId
      });
      const thumb = renderThumbnail(level);
      await this.db.updateProject(project.id, { thumbnail: thumb });

      this.closeAll();
      this.importFile = null;
      $("#import-file-name").textContent = "";
      showToast("Nivel importado", "success");
      await this.editor.open({ ...project, level, thumbnail: thumb });
    } catch (err) {
      errEl.textContent = err.message || "Error al importar";
    }
  }
}
