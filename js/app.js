class App {
    constructor() {
        this.currentProjectId = null;
        this.init();
    }

    async init() {
        try {
            // Mostrar pantalla de carga
            document.getElementById('loading-screen').classList.remove('hidden');
            document.getElementById('auth-screen').classList.add('hidden');
            document.getElementById('main-screen').classList.add('hidden');
            document.getElementById('editor-screen').classList.add('hidden');
            
            // Esperar a que Firebase se inicialice
            await this.waitForAuth();
            
            // Configurar según estado de autenticación
            if (auth.currentUser) {
                document.getElementById('loading-screen').classList.add('hidden');
                document.getElementById('main-screen').classList.remove('hidden');
                await this.loadUserProjects();
                this.setupRealtimeListeners();
            } else {
                document.getElementById('loading-screen').classList.add('hidden');
                document.getElementById('auth-screen').classList.remove('hidden');
            }

            // Configurar listeners globales
            this.setupGlobalListeners();
            
        } catch (error) {
            console.error('Error initializing app:', error);
            document.getElementById('loading-screen').innerHTML = `
                <div class="loader">
                    <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #ff4444;"></i>
                    <p>Error al cargar la aplicación</p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 10px 20px; background: #00ff88; border: none; border-radius: 5px; cursor: pointer;">
                        Reintentar
                    </button>
                </div>
            `;
        }
    }

    waitForAuth() {
        return new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });
        });
    }

    async loadUserProjects() {
        if (!auth.currentUser) return;
        
        try {
            const projects = await databaseManager.getAllProjects(auth.currentUser.uid);
            uiManager.displayProjects(projects);
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    setupRealtimeListeners() {
        if (!auth.currentUser) return;
        
        // Escuchar cambios en proyectos
        databaseManager.listenToProjectChanges(auth.currentUser.uid, (projects) => {
            uiManager.displayProjects(projects);
        });
    }

    setupGlobalListeners() {
        // Escuchar cambios en autenticación
        auth.onAuthStateChanged((user) => {
            if (user) {
                document.getElementById('auth-screen').classList.add('hidden');
                document.getElementById('main-screen').classList.remove('hidden');
                document.getElementById('editor-screen').classList.add('hidden');
                this.loadUserProjects();
                this.setupRealtimeListeners();
            } else {
                document.getElementById('auth-screen').classList.remove('hidden');
                document.getElementById('main-screen').classList.add('hidden');
                document.getElementById('editor-screen').classList.add('hidden');
            }
        });

        // Botón para volver a proyectos
        document.getElementById('back-to-projects').addEventListener('click', () => {
            this.showMainScreen();
        });

        // Botón para testear nivel
        document.getElementById('test-level-btn').addEventListener('click', () => {
            this.testLevel();
        });

        // Botón para guardar nivel
        document.getElementById('save-level-btn').addEventListener('click', () => {
            this.saveCurrentLevel();
        });

        // Botón para exportar nivel
        document.getElementById('export-level-btn').addEventListener('click', () => {
            this.exportCurrentLevel();
        });

        // Botón para detener test
        document.getElementById('stop-test-btn').addEventListener('click', () => {
            player.stopLevel();
        });
    }

    async createNewLevel(levelData) {
        try {
            if (!auth.currentUser) {
                uiManager.showNotification('Debes iniciar sesión primero', 'error');
                return;
            }

            // Validar datos
            if (!levelData.name) {
                uiManager.showNotification('El nombre del nivel es requerido', 'error');
                return;
            }

            const userId = auth.currentUser.uid;
            
            // Crear nivel con IA si es necesario
            if (levelData.createdWith === 'ai') {
                const aiLevel = aiGenerator.generateLevel(levelData.difficulty);
                levelData.objects = aiLevel.objects;
                levelData.settings = aiLevel.settings;
            } else {
                levelData.objects = [];
                levelData.settings = {};
            }

            // Guardar en base de datos
            const project = await databaseManager.saveProject(userId, levelData);
            
            // Guardar referencia al proyecto actual
            this.currentProjectId = project.id;
            
            // Cargar en el editor
            editor.loadLevel(project.objects || [], project.name);
            editor.currentLevelName = project.name;
            
            // Cambiar a la pantalla del editor
            this.showEditor();
            
            uiManager.showNotification(`Nivel "${project.name}" creado correctamente`, 'success');
            
            // Recargar lista de proyectos
            await this.loadUserProjects();
            
        } catch (error) {
            console.error('Error creating level:', error);
            uiManager.showNotification('Error al crear el nivel: ' + error.message, 'error');
        }
    }

    async importLevel(levelData) {
        try {
            if (!auth.currentUser) {
                uiManager.showNotification('Debes iniciar sesión primero', 'error');
                return;
            }

            const userId = auth.currentUser.uid;
            
            // Guardar nivel importado
            const project = await databaseManager.saveProject(userId, {
                name: levelData.name || 'Nivel Importado',
                difficulty: levelData.difficulty || 'normal',
                objects: levelData.objects || [],
                settings: levelData.settings || {},
                audioBase64: levelData.audioBase64 || null,
                newgroundsId: levelData.newgroundsId || null
            });
            
            // Guardar referencia
            this.currentProjectId = project.id;
            
            // Cargar en editor
            editor.loadLevel(project.objects, project.name);
            editor.currentLevelName = project.name;
            
            // Mostrar editor
            this.showEditor();
            
            uiManager.showNotification('Nivel importado correctamente', 'success');
            
            // Recargar proyectos
            await this.loadUserProjects();
            
        } catch (error) {
            console.error('Error importing level:', error);
            uiManager.showNotification('Error al importar el nivel: ' + error.message, 'error');
        }
    }

    async openProject(projectId) {
        try {
            if (!auth.currentUser) return;
            
            const userId = auth.currentUser.uid;
            const project = await databaseManager.getProject(userId, projectId);
            
            if (project) {
                this.currentProjectId = projectId;
                editor.loadLevel(project.objects || [], project.name);
                editor.currentLevelName = project.name;
                this.showEditor();
            }
        } catch (error) {
            console.error('Error opening project:', error);
            uiManager.showNotification('Error al abrir el proyecto', 'error');
        }
    }

    async saveCurrentLevel() {
        try {
            if (!this.currentProjectId || !auth.currentUser) {
                uiManager.showNotification('No hay un proyecto activo para guardar', 'error');
                return;
            }

            const levelData = editor.getLevelData();
            const duration = editor.calculateDuration();
            
            await databaseManager.updateProject(
                auth.currentUser.uid,
                this.currentProjectId,
                {
                    objects: levelData.objects,
                    settings: levelData.settings,
                    duration: duration,
                    objectCount: levelData.objects.length,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                }
            );

            uiManager.showNotification('Nivel guardado correctamente', 'success');
            
            // Actualizar lista de proyectos
            await this.loadUserProjects();
            
        } catch (error) {
            console.error('Error saving level:', error);
            uiManager.showNotification('Error al guardar el nivel', 'error');
        }
    }

    testLevel() {
        const levelData = editor.getLevelData();
        if (levelData.objects && levelData.objects.length > 0) {
            player.startLevel(levelData.objects);
        } else {
            uiManager.showNotification('Agrega objetos al nivel antes de testear', 'warning');
        }
    }

    exportCurrentLevel() {
        const levelData = editor.getLevelData();
        const levelName = editor.currentLevelName || 'nivel';
        
        // Mostrar opciones de exportación
        uiManager.showExportOptions(levelName, levelData);
    }

    showEditor() {
        document.getElementById('main-screen').classList.add('hidden');
        document.getElementById('editor-screen').classList.remove('hidden');
        document.getElementById('player-screen').classList.add('hidden');
        
        // Asegurar que el editor esté visible y actualizado
        setTimeout(() => {
            editor.resizeCanvas();
            editor.updateObjectCount();
        }, 100);
    }

    showMainScreen() {
        document.getElementById('editor-screen').classList.add('hidden');
        document.getElementById('player-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.remove('hidden');
        
        // Recargar proyectos
        this.loadUserProjects();
    }
}

// Variable global para la aplicación
let app;

// Iniciar cuando todo esté cargado
window.addEventListener('load', () => {
    app = new App();
});

// Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(error => {
            console.log('ServiceWorker registration failed:', error);
        });
    });
}
