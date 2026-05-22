// js/editor/editor-main.js
import { auth } from '../config/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { DatabaseService } from '../database/database-service.js';
import { EditorCanvas } from './editor-canvas.js';
import { EditorPhysics } from './editor-physics.js';
import { EditorObjects } from './editor-objects.js';

export class Editor {
  constructor(projectId) {
    this.projectId = projectId;
    this.dbService = null;
    this.projectData = null;
    this.canvas = null;
    this.physics = null;
    this.objects = null;
    this.isPlaying = false;
    this.selectedObject = null;
    this.currentTool = 'select';
    
    this.init();
  }

  async init() {
    await this.setupAuth();
    await this.loadProject();
    this.initializeEditor();
    this.setupToolbar();
    this.setupObjectPalette();
    this.startGameLoop();
  }

  setupAuth() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          this.dbService = new DatabaseService(user.uid);
          resolve();
        } else {
          window.location.href = 'index.html';
        }
      });
    });
  }

  async loadProject() {
    const projects = await this.dbService.getProjects();
    this.projectData = projects.find(p => p.id === this.projectId);
    
    if (!this.projectData) {
      alert("Proyecto no encontrado");
      window.location.href = 'dashboard.html';
    }

    document.getElementById('projectTitle').textContent = this.projectData.title;
  }

  initializeEditor() {
    const canvasElement = document.getElementById('editorCanvas');
    this.canvas = new EditorCanvas(canvasElement, this.projectData.gameData);
    this.physics = new EditorPhysics(this.projectData.gameData);
    this.objects = new EditorObjects(this.projectData.objects || [], this.canvas, this.physics);
    
    this.canvas.render(this.objects.getObjects());
  }

  setupToolbar() {
    const tools = {
      'selectTool': 'select',
      'moveTool': 'move',
      'blockTool': 'block',
      'spikeTool': 'spike',
      'orbTool': 'orb',
      'portalTool': 'portal',
      'eraseTool': 'erase'
    };

    Object.entries(tools).forEach(([elementId, tool]) => {
      document.getElementById(elementId)?.addEventListener('click', () => {
        this.currentTool = tool;
        this.updateToolSelection(elementId);
      });
    });

    document.getElementById('testLevelBtn')?.addEventListener('click', () => this.toggleTestMode());
    document.getElementById('saveBtn')?.addEventListener('click', () => this.saveProject());
    document.getElementById('undoBtn')?.addEventListener('click', () => this.objects.undo());
    document.getElementById('redoBtn')?.addEventListener('click', () => this.objects.redo());
  }

  setupObjectPalette() {
    const paletteItems = document.querySelectorAll('.object-palette-item');
    paletteItems.forEach(item => {
      item.addEventListener('click', () => {
        const objectType = item.dataset.type;
        this.currentTool = 'place';
        this.selectedObjectType = objectType;
      });
    });
  }

  startGameLoop() {
    const loop = (timestamp) => {
      if (this.isPlaying) {
        this.physics.update();
        this.objects.updatePhysics();
        this.canvas.camera.follow(this.objects.getPlayer());
      }
      
      this.canvas.render(this.objects.getObjects());
      requestAnimationFrame(loop);
    };
    
    requestAnimationFrame(loop);
  }

  toggleTestMode() {
    this.isPlaying = !this.isPlaying;
    
    if (this.isPlaying) {
      document.getElementById('testLevelBtn').innerHTML = '<i class="fas fa-stop"></i> Detener';
      this.objects.createPlayer();
      this.canvas.camera.reset();
    } else {
      document.getElementById('testLevelBtn').innerHTML = '<i class="fas fa-play"></i> Testear';
      this.objects.removePlayer();
      this.physics.reset();
    }
  }

  async saveProject() {
    const objectData = this.objects.exportData();
    
    await this.dbService.updateProject(this.projectId, {
      objects: objectData,
      gameData: this.canvas.exportGameData(),
      'metadata/objectsCount': objectData.length,
      'metadata/updatedAt': new Date().toISOString()
    });

    this.showNotification("Proyecto guardado");
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'save-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  }

  updateToolSelection(activeId) {
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(activeId)?.classList.add('active');
  }
}

// Inicializar editor
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('id');
if (projectId) {
  new Editor(projectId);
}
