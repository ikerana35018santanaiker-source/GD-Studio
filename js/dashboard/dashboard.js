import { $, formatDuration, difficultyLabel } from "../utils/helpers.js";
import { showToast } from "../utils/toast.js";

/**
 * Panel principal: grid de proyectos del usuario
 */
export class Dashboard {
  constructor(db, editor) {
    this.db = db;
    this.editor = editor;
    this.projects = [];
    this.unsubscribe = null;
  }

  start(user) {
    $("#dash-user-name").textContent = user.displayName || user.email || "Usuario";
    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = this.db.subscribeProjects((list) => {
      this.projects = list;
      this.render();
    });
  }

  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  render() {
    const grid = $("#projects-grid");
    const empty = $("#projects-empty");
    if (!grid) return;

    grid.innerHTML = "";

    if (!this.projects.length) {
      empty?.classList.remove("hidden");
      return;
    }
    empty?.classList.add("hidden");

    for (const p of this.projects) {
      const card = document.createElement("article");
      card.className = "project-card";
      card.setAttribute("role", "listitem");
      card.tabIndex = 0;

      const thumbSrc = p.thumbnail || "";
      const thumbHtml = thumbSrc
        ? `<img src="${thumbSrc}" alt="" loading="lazy" />`
        : `<div class="project-thumb-placeholder"><i class="fa-solid fa-layer-group"></i></div>`;

      card.innerHTML = `
        <div class="project-thumb">${thumbHtml}</div>
        <div class="project-card-menu">
          <button type="button" class="btn btn-icon btn-delete" title="Eliminar" data-id="${p.id}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
        <div class="project-info">
          <h3 class="project-title">${escapeHtml(p.name)}</h3>
          <div class="project-meta">
            <span>${p.objectCount ?? 0} objetos</span>
            <span>Duración: ${formatDuration(p.duration ?? 0)}</span>
          </div>
          <span class="project-difficulty difficulty-${p.difficulty || "normal"}">${difficultyLabel(p.difficulty)}</span>
        </div>
      `;

      card.addEventListener("click", (e) => {
        if (e.target.closest(".btn-delete")) return;
        this.openProject(p.id);
      });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.openProject(p.id);
      });

      card.querySelector(".btn-delete")?.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm(`¿Eliminar "${p.name}"?`)) return;
        try {
          await this.db.deleteProject(p.id);
          showToast("Proyecto eliminado", "info");
        } catch (err) {
          showToast(err.message, "error");
        }
      });

      grid.appendChild(card);
    }
  }

  async openProject(id) {
    try {
      const project = await this.db.getProject(id);
      await this.editor.open(project);
    } catch (err) {
      showToast(err.message || "No se pudo abrir el nivel", "error");
    }
  }
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
