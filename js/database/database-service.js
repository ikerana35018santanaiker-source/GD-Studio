// js/database/database-service.js
import { database } from '../config/firebase-config.js';
import { ref, set, get, push, update, remove, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

export class DatabaseService {
  constructor(userId) {
    this.userId = userId;
    this.baseRef = `users/${userId}`;
  }

  // Guardar proyecto
  async saveProject(projectData) {
    const projectRef = push(ref(database, `${this.baseRef}/projects`));
    const project = {
      id: projectRef.key,
      title: projectData.title,
      difficulty: projectData.difficulty,
      thumbnail: projectData.thumbnail || null,
      objects: projectData.objects || [],
      duration: projectData.duration || 0,
      audioBase64: projectData.audioBase64 || null,
      newgroundsId: projectData.newgroundsId || null,
      gameData: projectData.gameData || {},
      metadata: {
        objectsCount: projectData.objects?.length || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: "1.0.0",
        isAIGenerated: projectData.isAIGenerated || false
      }
    };

    await set(projectRef, project);
    return project;
  }

  // Actualizar proyecto
  async updateProject(projectId, updates) {
    const projectRef = ref(database, `${this.baseRef}/projects/${projectId}`);
    await update(projectRef, {
      ...updates,
      'metadata/updatedAt': new Date().toISOString()
    });
  }

  // Obtener todos los proyectos
  async getProjects() {
    const projectsRef = ref(database, `${this.baseRef}/projects`);
    const snapshot = await get(projectsRef);
    
    if (snapshot.exists()) {
      const projects = [];
      snapshot.forEach(childSnapshot => {
        projects.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      return projects.sort((a, b) => 
        new Date(b.metadata.updatedAt) - new Date(a.metadata.updatedAt)
      );
    }
    return [];
  }

  // Eliminar proyecto
  async deleteProject(projectId) {
    const projectRef = ref(database, `${this.baseRef}/projects/${projectId}`);
    await remove(projectRef);
  }

  // Exportar proyecto a JSON
  async exportProjectToJSON(projectId) {
    const projectRef = ref(database, `${this.baseRef}/projects/${projectId}`);
    const snapshot = await get(projectRef);
    
    if (snapshot.exists()) {
      const project = snapshot.val();
      return {
        gd_studio_version: "1.0",
        level_data: {
          title: project.title,
          difficulty: project.difficulty,
          objects: project.objects,
          gameData: project.gameData,
          newgroundsId: project.newgroundsId,
          audioBase64: project.audioBase64
        },
        metadata: project.metadata
      };
    }
    throw new Error("Proyecto no encontrado");
  }

  // Importar proyecto desde JSON
  async importProjectFromJSON(jsonData) {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    const project = {
      title: data.level_data?.title || data.title,
      difficulty: data.level_data?.difficulty || data.difficulty,
      objects: data.level_data?.objects || data.objects || [],
      gameData: data.level_data?.gameData || data.gameData || {},
      audioBase64: data.level_data?.audioBase64 || data.audioBase64 || null,
      newgroundsId: data.level_data?.newgroundsId || data.newgroundsId || null,
      thumbnail: data.thumbnail || null,
      duration: data.metadata?.objectsCount ? data.metadata.objectsCount * 0.5 : 0
    };

    return await this.saveProject(project);
  }

  // Recuperar contraseña
  async sendPasswordReset(email) {
    const { auth } = await import('../config/firebase-config.js');
    const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
    return await sendPasswordResetEmail(auth, email);
  }
}
