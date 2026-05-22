// Variable global para la aplicación
let app;

class App {
    constructor() {
        this.currentProjectId = null;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            console.log('Inicializando GD Studio...');
            
            // Mostrar pantalla de carga
            this.showScreen('loading');
            
            // Esperar a que Firebase y los módulos estén listos
            await this.waitForFirebase();
            await this.waitForModules();
            
            // Verificar autenticación
            await this.checkAuthState();
            
            this.isInitialized = true;
            console.log('GD Studio inicializado correctamente');
            
        } catch (error) {
            console.error('Error al inicializar:', error);
            this.showErrorScreen(error);
        }
    }

    waitForFirebase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const checkFirebase = () => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    console.log('Firebase inicializado');
                    resolve();
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkFirebase, 100);
                } else {
                    reject(new Error('Firebase no se pudo inicializar'));
                }
            };
            
            checkFirebase();
        });
    }

    waitForModules() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100;
            
            const checkModules = () => {
                if (typeof authManager !== 'undefined' && 
                    typeof databaseManager !== 'undefined' && 
                    typeof editor !== 'undefined' && 
                    typeof player !== 'undefined' && 
                    typeof aiGenerator !== 'undefined' && 
                    typeof exportImport !== 'undefined' && 
                    typeof uiManager !== 'undefined') {
                    console.log('Todos los módulos cargados');
                    resolve();
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkModules, 50);
                } else {
                    reject(new Error('No se pudieron cargar todos los módulos'));
                }
            };
            
            checkModules();
        });
    }

    async checkAuthState() {
        return new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged(async (user) => {
                unsubscribe();
                
                if (user) {
                    console.log('Usuario autenticado:', user.uid);
                    await this.loadUserProjects();
                    this.showScreen('main');
                } else {
                    console.log('No hay usuario autenticado');
                    this.showScreen('auth');
                }
                
                this.setupAuthListener();
                this.setupGlobalListeners();
                resolve();
            });
        });
    }

    setupAuthListener() {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('Auth state changed: Usuario logueado');
                this.showScreen('main');
                await this.loadUserProjects();
            } else {
                console.log('Auth state changed: Usuario no logueado');
                this.showScreen('auth');
            }
        });
    }

    setupGlobalListeners() {
        // Back to projects
        const backBtn = document.getElementById('back-to-projects');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.showMainScreen();
            });
        }

        // Test level
        const testBtn = document.getElementById('test-level-btn');
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                this.testLevel();
            });
        }

        // Save level
        const saveBtn = document.getElementById('save-level-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveCurrentLevel();
            });
        }

        // Export level
        const exportBtn = document.getElementById('export-level-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportCurrentLevel();
            });
        }

        // Stop test
        const stopBtn = document.getElementById('stop-test-btn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                if (typeof player !== 'undefined') {
                    player.stopLevel();
                }
            });
        }
    }

    showScreen(screenName) {
        const screens = {
            loading: 'loading-screen',
            auth: 'auth-screen',
            main: 'main-screen',
            editor: 'editor-screen',
            player: 'player-screen'
        };

        // Ocultar todas las pantallas
        Object.values(screens).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.add('hidden');
            }
        });

        // Mostrar la pantalla solicitada
        const targetScreen = document.getElementById(screens[screenName]);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
        }
    }

    async loadUserProjects() {
        if (!auth.currentUser) {
            console.log('No se pueden cargar proyectos: usuario no autenticado');
            return;
        }

        try {
            const projects = await databaseManager.getAllProjects(auth.currentUser.uid);
            if (typeof uiManager !== 'undefined' && uiManager.displayProjects) {
                uiManager.displayProjects(projects);
            }
        } catch (error) {
            console.error('Error al cargar proyectos:', error);
        }
    }

    async createNewLevel(levelData) {
        try {
            if (!auth.currentUser) {
                uiManager.showNotification('Debes iniciar sesión primero', 'error');
                return;
            }

            console.log('Creando nuevo nivel:', levelData);

            // Generar nivel con IA si es necesario
            if (levelData.createdWith === 'ai' && typeof aiGenerator !== 'undefined') {
                const aiLevel = aiGenerator.generateLevel(levelData.difficulty);
                levelData.objects = aiLevel.objects || [];
                levelData.settings = aiLevel.settings || {};
            } else {
                levelData.objects = levelData.objects || [];
                levelData.settings = levelData.settings || {};
            }

            // Guardar en base de datos
            const userId = auth.currentUser.uid;
            const project = await databaseManager.saveProject(userId, levelData);
            
            if (!project || !project.id) {
                throw new Error('Error al guardar el proyecto');
            }

            console.log('Proyecto guardado:', project);

            // Guardar referencia al proyecto actual
            this.currentProjectId = project.id;
            
            // Cargar en el editor
            if (typeof editor !== 'undefined') {
                editor.loadLevel(project.objects || [], project.name);
                editor.currentLevelName = project.name;
                
                // Cambiar a la pantalla del editor
                this.showScreen('editor');
                
                uiManager.showNotification(`Nivel "${project.name}" creado correctamente`, 'success');
                
                // Recargar lista de proyectos
                await this.loadUserProjects();
            } else {
                throw new Error('Editor no disponible');
            }
            
        } catch (error) {
            console.error('Error al crear nivel:', error);
            uiManager.showNotification('Error al crear el nivel: ' + error.message, 'error');
        }
    }

    async importLevel(levelData) {
        try {
            if (!auth.currentUser) {
                uiManager.showNotification('Debes iniciar sesión primero', 'error');
                return;
            }

            console.log('Importando nivel:', levelData);

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
            
            if (!project || !project.id) {
                throw new Error('Error al guardar el proyecto importado');
            }

            console.log('Proyecto importado guardado:', project);
            
            // Guardar referencia
            this.currentProjectId = project.id;
            
            // Cargar en editor
            if (typeof editor !== 'undefined') {
                editor.loadLevel(project.objects, project.name);
                editor.currentLevelName = project.name;
                
                // Mostrar editor
                this.showScreen('editor');
                
                uiManager.showNotification('Nivel importado correctamente', 'success');
                
                // Recargar proyectos
                await this.loadUserProjects();
            } else {
                throw new Error('Editor no disponible');
            }
            
        } catch (error) {
            console.error('Error al importar nivel:', error);
            uiManager.showNotification('Error al importar: ' + error.message, 'error');
        }
    }

    async openProject(projectId) {
        try {
            if (!auth.currentUser) {
                uiManager.showNotification('Debes iniciar sesión', 'error');
                return;
            }

            console.log('Abriendo proyecto:', projectId);

            const userId = auth.currentUser.uid;
            const project = await databaseManager.getProject(userId, projectId);
            
            if (!project) {
                throw new Error('Proyecto no encontrado');
            }

            console.log('Proyecto cargado:', project);
            
            this.currentProjectId = projectId;
            
            // Verificar que el editor existe
            if (typeof editor === 'undefined') {
                throw new Error('Editor no inicializado');
            }

            // Cargar en el editor
            editor.loadLevel(project.objects || [], project.name);
            editor.currentLevelName = project.name;
            
            // Mostrar editor
            this.showScreen('editor');
            
            console.log('Proyecto abierto correctamente');
            
        } catch (error) {
            console.error('Error al abrir proyecto:', error);
            uiManager.showNotification('Error al abrir el proyecto: ' + error.message, 'error');
        }
    }

    async saveCurrentLevel() {
        try {
            if (!this.currentProjectId || !auth.currentUser) {
                uiManager.showNotification('No hay un proyecto activo para guardar', 'error');
                return;
            }

            if (typeof editor === 'undefined') {
                throw new Error('Editor no disponible');
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
            console.error('Error al guardar nivel:', error);
            uiManager.showNotification('Error al guardar: ' + error.message, 'error');
        }
    }

    testLevel() {
        if (typeof editor === 'undefined' || typeof player === 'undefined') {
            uiManager.showNotification('Editor o player no disponibles', 'error');
            return;
        }

        const levelData = editor.getLevelData();
        if (levelData.objects && levelData.objects.length > 0) {
            player.startLevel(levelData.objects);
        } else {
            uiManager.showNotification('Agrega objetos al nivel antes de testear', 'warning');
        }
    }

    exportCurrentLevel() {
        if (typeof editor === 'undefined') {
            uiManager.showNotification('Editor no disponible', 'error');
            return;
        }

        const levelData = editor.getLevelData();
        const levelName = editor.currentLevelName || 'nivel';
        
        if (typeof uiManager !== 'undefined' && uiManager.showExportOptions) {
            uiManager.showExportOptions(levelName, levelData);
        }
    }

    showMainScreen() {
        this.showScreen('main');
        this.loadUserProjects();
    }

    showErrorScreen(error) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div class="loader">
                    <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #ff4444;"></i>
                    <p style="color: #ff4444;">Error al cargar la aplicación</p>
                    <p style="font-size: 0.9rem; color: #a0a0b0;">${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 10px 20px; background: #00ff88; border: none; border-radius: 5px; cursor: pointer; color: #000; font-weight: bold;">
                        Reintentar
                    </button>
                </div>
            `;
        }
    }
}

// Iniciar la aplicación cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, iniciando aplicación...');
    app = new App();
});

// También iniciar si el DOM ya está cargado
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('DOM ya cargado, iniciando aplicación...');
    setTimeout(() => {
        app = new App();
    }, 100);
}
