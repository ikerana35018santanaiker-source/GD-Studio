import { getDatabase, getAuth } from "../auth/auth-service.js";
import { DB_PATHS } from "../config/firebase-config.js";
import { generateId } from "../utils/helpers.js";
import { createEmptyLevel, computeLevelStats, serializeLevel } from "../level/level-model.js";

/**
 * Servicio de Realtime Database para proyectos de GD Studio
 */
export class DatabaseService {
  constructor() {
    this.db = getDatabase();
  }

  _uid() {
    const uid = getAuth()?.currentUser?.uid;
    if (!uid) throw new Error("No hay sesión activa.");
    return uid;
  }

  _projectsRef() {
    return this.db.ref(DB_PATHS.projects(this._uid()));
  }

  _projectRef(id) {
    return this.db.ref(DB_PATHS.project(this._uid(), id));
  }

  /**
   * Escucha en tiempo real la lista de proyectos del usuario
   */
  subscribeProjects(callback) {
    const ref = this._projectsRef();
    const handler = (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([id, project]) => ({ id, ...project }))
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      callback(list);
    };
    ref.on("value", handler);
    return () => ref.off("value", handler);
  }

  async getProject(id) {
    const snap = await this._projectRef(id).once("value");
    if (!snap.exists()) throw new Error("Proyecto no encontrado.");
    return { id, ...snap.val() };
  }

  async createProject(meta, levelData = null) {
    const id = generateId();
    const level = levelData || createEmptyLevel(meta);
    const stats = computeLevelStats(level);
    const now = Date.now();

    const record = {
      name: meta.name || "Sin título",
      difficulty: meta.difficulty || "normal",
      newgroundsId: meta.newgroundsId || "",
      audioBase64: meta.audioBase64 || "",
      audioMime: meta.audioMime || "",
      createdWith: meta.createdWith || "manual",
      createdAt: now,
      updatedAt: now,
      objectCount: stats.objectCount,
      duration: stats.duration,
      thumbnail: "",
      level
    };

    await this._projectRef(id).set(record);
    return { id, ...record };
  }

  async updateProject(id, patch) {
    const ref = this._projectRef(id);
    const snap = await ref.once("value");
    if (!snap.exists()) throw new Error("Proyecto no encontrado.");

    const current = snap.val();
    let level = patch.level ?? current.level;
    const stats = computeLevelStats(level);

    const updated = {
      ...current,
      ...patch,
      level,
      objectCount: stats.objectCount,
      duration: stats.duration,
      updatedAt: Date.now()
    };

    if (patch.thumbnail !== undefined) {
      updated.thumbnail = patch.thumbnail;
    }

    await ref.update({
      name: updated.name,
      difficulty: updated.difficulty,
      newgroundsId: updated.newgroundsId,
      audioBase64: updated.audioBase64,
      audioMime: updated.audioMime,
      objectCount: updated.objectCount,
      duration: updated.duration,
      thumbnail: updated.thumbnail,
      level: updated.level,
      updatedAt: updated.updatedAt
    });

    return { id, ...updated };
  }

  async saveLevel(id, level, extra = {}) {
    const stats = computeLevelStats(level);
    return this.updateProject(id, {
      level: serializeLevel(level),
      objectCount: stats.objectCount,
      duration: stats.duration,
      ...extra
    });
  }

  async deleteProject(id) {
    await this._projectRef(id).remove();
  }

  async importProject(name, levelPayload, meta = {}) {
    return this.createProject(
      {
        name,
        difficulty: meta.difficulty || levelPayload.difficulty || "normal",
        newgroundsId: meta.newgroundsId || levelPayload.newgroundsId || "",
        audioBase64: meta.audioBase64 || levelPayload.audioBase64 || "",
        audioMime: meta.audioMime || levelPayload.audioMime || "",
        createdWith: "import"
      },
      levelPayload
    );
  }
}
