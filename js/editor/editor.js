import { EditorCanvas } from "./editor-canvas.js";
import { TestRunner } from "./test-runner.js";
import { paletteEntries, PALETTE_CATEGORIES } from "../level/object-registry.js";
import { renderThumbnail } from "./thumbnail-renderer.js";
import { downloadGmd } from "../level/gmd-export.js";
import { $, $$, showView, debounce } from "../utils/helpers.js";
import { showToast } from "../utils/toast.js";

/**
 * Controlador del editor de niveles
 */
export class LevelEditor {
  constructor(db) {
    this.db = db;
    this.project = null;
    this.canvas = new EditorCanvas($("#editor-canvas"), {
      onSelect: (obj) => this._onObjectSelect(obj),
      onChange: () => this._scheduleSave()
    });
    this.testRunner = new TestRunner($("#test-canvas"));
    this._saveDebounced = debounce(() => this.save(true), 1500);
    this._bindUI();
    this._buildPalette();
  }

  _bindUI() {
    $("#btn-editor-back")?.addEventListener("click", () => this.close());
    $("#btn-editor-save")?.addEventListener("click", () => this.save(false));
    $("#btn-editor-export")?.addEventListener("click", () => this.exportGmd());
    $("#btn-editor-test")?.addEventListener("click", () => this.openTest());
    $("#btn-test-back")?.addEventListener("click", () => this.closeTest());
    $("#btn-test-restart")?.addEventListener("click", () => this.testRunner.restart());

    $("#editor-title")?.addEventListener("change", () => {
      if (this.project) {
        this.project.name = $("#editor-title").value.trim();
        this._scheduleSave();
      }
    });

    $("#btn-delete-object")?.addEventListener("click", () => {
      this.canvas.deleteSelected();
      $("#btn-delete-object").disabled = true;
      $("#btn-duplicate-object").disabled = true;
    });

    $("#btn-duplicate-object")?.addEventListener("click", () => this.canvas.duplicateSelected());

    $("#btn-zoom-in")?.addEventListener("click", () => {
      const z = this.canvas.setZoom(this.canvas.zoom + 0.15);
      $("#zoom-label").textContent = `${Math.round(z * 100)}%`;
    });

    $("#btn-zoom-out")?.addEventListener("click", () => {
      const z = this.canvas.setZoom(this.canvas.zoom - 0.15);
      $("#zoom-label").textContent = `${Math.round(z * 100)}%`;
    });

    const jump = () => this.testRunner.jump();
    window.addEventListener("keydown", (e) => {
      if ($("#view-test").classList.contains("hidden")) return;
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
      if (e.code === "KeyR") this.testRunner.restart();
    });
    $("#test-canvas")?.addEventListener("pointerdown", jump);
  }

  _buildPalette() {
    const tabs = $("#palette-tabs");
    const palette = $("#object-palette");
    if (!tabs || !palette) return;

    let activeCat = PALETTE_CATEGORIES[0].id;

    const renderItems = () => {
      palette.innerHTML = "";
      paletteEntries(activeCat).forEach((item) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "palette-item";
        btn.dataset.type = item.key;
        btn.title = item.label;
        btn.innerHTML = `<span class="palette-dot" style="background:${item.color}"></span><span>${item.label}</span>`;
        btn.addEventListener("click", () => {
          $$(".palette-item").forEach((p) => p.classList.remove("active"));
          btn.classList.add("active");
          this.canvas.setActiveTool(item.key);
        });
        palette.appendChild(btn);
      });
    };

    PALETTE_CATEGORIES.forEach((cat) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = `palette-tab${cat.id === activeCat ? " active" : ""}`;
      tab.innerHTML = `<i class="fa-solid ${cat.icon}"></i><span>${cat.label}</span>`;
      tab.addEventListener("click", () => {
        activeCat = cat.id;
        $$(".palette-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        renderItems();
      });
      tabs.appendChild(tab);
    });

    renderItems();
  }

  async open(project) {
    this.project = { ...project };
    const level = JSON.parse(JSON.stringify(project.level));
    $("#editor-title").value = project.name || level.name;
    this.canvas.setLevel(level);
    this.canvas.setZoom(1);
    $("#zoom-label").textContent = "100%";
    showView("view-editor");
  }

  close() {
    this.save(true);
    showView("view-dashboard");
    window.dispatchEvent(new CustomEvent("gdstudio:editor-closed"));
  }

  _onObjectSelect(obj) {
    const props = $("#object-properties");
    const delBtn = $("#btn-delete-object");
    const dupBtn = $("#btn-duplicate-object");

    if (!obj) {
      props.innerHTML = '<p class="props-empty">Selecciona un objeto</p>';
      delBtn.disabled = true;
      dupBtn.disabled = true;
      return;
    }

    delBtn.disabled = false;
    dupBtn.disabled = false;
    props.innerHTML = `
      <div class="props-grid">
        <div class="field">
          <label>Tipo</label>
          <input type="text" value="${obj.type}" disabled />
        </div>
        <div class="field">
          <label>X</label>
          <input type="number" id="prop-x" value="${obj.x}" />
        </div>
        <div class="field">
          <label>Y</label>
          <input type="number" id="prop-y" value="${obj.y}" />
        </div>
        <div class="field">
          <label>Ancho</label>
          <input type="number" id="prop-w" value="${obj.width || 30}" min="10" />
        </div>
        <div class="field">
          <label>Alto</label>
          <input type="number" id="prop-h" value="${obj.height || 30}" min="10" />
        </div>
      </div>
    `;

    ["prop-x", "prop-y", "prop-w", "prop-h"].forEach((id) => {
      $(`#${id}`)?.addEventListener("change", () => {
        this.canvas.updateSelected({
          x: Number($("#prop-x").value),
          y: Number($("#prop-y").value),
          width: Number($("#prop-w").value),
          height: Number($("#prop-h").value)
        });
      });
    });
  }

  _scheduleSave() {
    this._saveDebounced();
  }

  async save(silent = false) {
    if (!this.project) return;
    const level = this.canvas.getLevel();
    if (!level) return;

    level.name = $("#editor-title").value.trim() || this.project.name;
    const thumb = renderThumbnail(level);

    try {
      await this.db.saveLevel(this.project.id, level, {
        name: level.name,
        thumbnail: thumb
      });
      this.project.level = level;
      this.project.name = level.name;
      this.project.thumbnail = thumb;
      if (!silent) showToast("Nivel guardado", "success");
    } catch (err) {
      showToast(err.message || "Error al guardar", "error");
    }
  }

  exportGmd() {
    if (!this.project) return;
    const level = this.canvas.getLevel();
    downloadGmd({ ...this.project, level, name: $("#editor-title").value.trim() });
    showToast("Archivo .gmd descargado", "success");
  }

  openTest() {
    const level = this.canvas.getLevel();
    if (!level) return;
    this.save(true);
    showView("view-test");
    this.testRunner.start(level, {
      onProgress: (p) => {
        $("#test-progress").textContent = `${p}%`;
      },
      onDeath: () => {
        const el = $("#test-death-msg");
        if (el) {
          el.classList.remove("hidden");
          setTimeout(() => el.classList.add("hidden"), 900);
        }
      },
      onFinish: () => showToast("¡Nivel completado!", "success")
    });
  }

  closeTest() {
    this.testRunner.stop();
    showView("view-editor");
  }
}
