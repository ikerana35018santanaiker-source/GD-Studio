// js/dashboard/dashboard.js
import { auth } from '../config/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { DatabaseService } from '../database/database-service.js';

export class Dashboard {
  constructor() {
    this.dbService = null;
    this.projects = [];
    this.currentUser = null;
    this.init();
  }

  async init() {
    this.setupAuth();
    this.setupModalListeners();
  }

  setupAuth() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        this.dbService = new DatabaseService(user.uid);
        await this.loadProjects();
        this.updateUI();
      } else {
        window.location.href = 'index.html';
      }
    });
  }

  async loadProjects() {
    try {
      this.projects = await this.dbService.getProjects();
    } catch (error) {
      console.error("Error cargando proyectos:", error);
      this.showNotification("Error al cargar proyectos", "error");
    }
  }

  async createProject(type) {
    const name = document.getElementById('projectName').value.trim();
    const difficulty = document.getElementById('projectDifficulty').value;
    const audioFile = document.getElementById('audioFile').files[0];
    const newgroundsId = document.getElementById('newgroundsId').value.trim();

    if (!name) {
      this.showNotification("Por favor, ingresa un nombre para el proyecto", "error");
      return;
    }

    let audioBase64 = null;
    if (audioFile) {
      audioBase64 = await this.fileToBase64(audioFile);
    }

    const projectData = {
      title: name,
      difficulty: difficulty,
      audioBase64: audioBase64,
      newgroundsId: newgroundsId || null,
      isAIGenerated: type === 'ia',
      objects: type === 'ia' ? [] : [],
      gameData: {
        camera: { x: 0, y: 0, zoom: 1 },
        backgroundColor: '#1a1a2e',
        groundColor: '#16213e',
        gravity: 0.5
      }
    };

    try {
      await this.dbService.saveProject(projectData);
      this.closeModal();
      await this.loadProjects();
      this.showNotification("Proyecto creado exitosamente", "success");
    } catch (error) {
      console.error("Error creando proyecto:", error);
      this.showNotification("Error al crear proyecto", "error");
    }
  }

  async importProject(file) {
    try {
      const content = await this.readFile(file);
      let data;

      if (file.name.endsWith('.json')) {
        data = JSON.parse(content);
        await this.dbService.importProjectFromJSON(data);
      } else if (file.name.endsWith('.gmd')) {
        // Procesar archivo .gmd (formato binario/texto)
        data = this.parseGMDFile(content);
        await this.dbService.importProjectFromJSON(data);
      }

      await this.loadProjects();
      this.showNotification("Proyecto importado exitosamente", "success");
    } catch (error) {
      console.error("Error importando:", error);
      this.showNotification("Error al importar proyecto", "error");
    }
  }

  parseGMDFile(content) {
    try {
      // Asumimos que .gmd es un formato personalizado JSON comprimido
      return JSON.parse(content);
    } catch {
      throw new Error("Formato .gmd no válido");
    }
  }

  async exportProject(projectId) {
    try {
      const projectData = await this.dbService.exportProjectToJSON(projectId);
      this.downloadJSON(projectData, `level_${projectId}.json`);
      this.showNotification("Proyecto exportado exitosamente", "success");
    } catch (error) {
      console.error("Error exportando:", error);
      this.showNotification("Error al exportar proyecto", "error");
    }
  }

  async deleteProject(projectId) {
    if (!confirm("¿Estás seguro de eliminar este proyecto?")) return;
    
    try {
      await this.dbService.deleteProject(projectId);
      await this.loadProjects();
      this.showNotification("Proyecto eliminado", "success");
    } catch (error) {
      console.error("Error eliminando:", error);
      this.showNotification("Error al eliminar proyecto", "error");
    }
  }

  openProject(projectId) {
    window.location.href = `editor.html?id=${projectId}`;
  }

  updateUI() {
    const container = document.getElementById('projectsGrid');
    if (!container) return;

    if (this.projects.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-folder-open"></i>
          <h3>No hay proyectos aún</h3>
          <p>Crea tu primer nivel o importa uno existente</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.projects.map(project => this.createProjectCard(project)).join('');
    this.attachCardListeners();
  }

  createProjectCard(project) {
    const thumbnailSrc = project.thumbnail || 'assets/images/default-thumbnail.png';
    const objectsCount = project.metadata?.objectsCount || 0;
    const duration = project.duration || objectsCount * 0.5;

    return `
      <div class="project-card" data-id="${project.id}">
        <div class="project-thumbnail" style="background-image: url('${thumbnailSrc}')">
          ${project.metadata?.isAIGenerated ? '<span class="ai-badge">🤖 IA</span>' : ''}
        </div>
        <div class="project-info">
          <h3 class="project-title">${this.escapeHtml(project.title)}</h3>
          <p class="project-stats">
            <span><i class="fas fa-cube"></i> ${objectsCount} objetos</span>
            <span><i class="fas fa-clock"></i> Duración: ${duration.toFixed(1)}s</span>
          </p>
        </div>
        <div class="project-actions">
          <button class="btn-icon edit-btn" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-icon export-btn" title="Exportar">
            <i class="fas fa-download"></i>
          </button>
          <button class="btn-icon delete-btn" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
          <button class="btn-icon test-btn" title="Testear">
            <i class="fas fa-play"></i>
          </button>
        </div>
      </div>
    `;
  }

  attachCardListeners() {
    document.querySelectorAll('.project-card').forEach(card => {
      const projectId = card.dataset.id;
      card.querySelector('.project-thumbnail')?.addEventListener('click', () => this.openProject(projectId));
      card.querySelector('.edit-btn')?.addEventListener('click', () => this.openProject(projectId));
      card.querySelector('.export-btn')?.addEventListener('click', (e) => { e.stopPropagation(); this.exportProject(projectId); });
      card.querySelector('.delete-btn')?.addEventListener('click', (e) => { e.stopPropagation(); this.deleteProject(projectId); });
      card.querySelector('.test-btn')?.addEventListener('click', (e) => { e.stopPropagation(); this.testLevel(projectId); });
    });
  }

  testLevel(projectId) {
    window.open(`tester.html?id=${projectId}`, '_blank');
  }

  setupModalListeners() {
    document.getElementById('createProjectBtn')?.addEventListener('click', () => {
      document.getElementById('createModal').style.display = 'block';
    });

    document.getElementById('importProjectBtn')?.addEventListener('click', () => {
      document.getElementById('importFileInput')?.click();
    });

    document.getElementById('importFileInput')?.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        this.importProject(e.target.files[0]);
      }
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => this.closeModal());
    });

    document.getElementById('createManualBtn')?.addEventListener('click', () => {
      this.createProject('manual');
    });

    document.getElementById('createIABtn')?.addEventListener('click', () => {
      this.createProject('ia');
    });
  }

  closeModal() {
    document.getElementById('createModal').style.display = 'none';
    document.getElementById('projectName').value = '';
    document.getElementById('audioFile').value = '';
    document.getElementById('newgroundsId').value = '';
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      ${message}
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Inicializar dashboard
if (document.getElementById('projectsGrid')) {
  new Dashboard();
}
