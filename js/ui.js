class UIManager {
    constructor() {
        this.currentMode = 'manual'; // 'manual' or 'ai'
        this.setupUIListeners();
    }

    setupUIListeners() {
        // Auth tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchAuthTab(btn.dataset.tab));
        });

        // Auth forms
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        document.getElementById('google-login-btn').addEventListener('click', () => {
            this.handleGoogleAuth('login');
        });

        document.getElementById('google-register-btn').addEventListener('click', () => {
            this.handleGoogleAuth('register');
        });

        document.getElementById('forgot-password-btn').addEventListener('click', () => {
            this.showForgotPassword();
        });

        document.getElementById('back-to-login-btn').addEventListener('click', () => {
            this.hideForgotPassword();
        });

        document.getElementById('reset-password-btn').addEventListener('click', () => {
            this.handleResetPassword();
        });

        // Main screen buttons
        document.getElementById('create-level-btn').addEventListener('click', () => {
            this.showCreateLevelModal();
        });

        document.getElementById('import-level-btn').addEventListener('click', () => {
            this.showImportLevelModal();
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Create level options
        document.getElementById('manual-create').addEventListener('click', () => {
            this.currentMode = 'manual';
            this.showLevelConfig();
        });

        document.getElementById('ai-create').addEventListener('click', () => {
            this.currentMode = 'ai';
            this.showLevelConfig();
        });

        // Level config form
        document.getElementById('level-config-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLevelCreation();
        });

        // Editor toolbar
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                editor.setTool(btn.dataset.tool);
            });
        });

        document.getElementById('back-to-projects').addEventListener('click', () => {
            this.showMainScreen();
        });

        document.getElementById('test-level-btn').addEventListener('click', () => {
            this.testLevel();
        });

        document.getElementById('save-level-btn').addEventListener('click', () => {
            this.saveLevel();
        });

        document.getElementById('export-level-btn').addEventListener('click', () => {
            this.showExportOptions();
        });

        document.getElementById('stop-test-btn').addEventListener('click', () => {
            player.stopLevel();
        });

        // Close modals
        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal').classList.add('hidden');
            });
        });

        // Close modals on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }

    switchAuthTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        document.getElementById('login-form').classList.toggle('active', tab === 'login');
        document.getElementById('register-form').classList.toggle('active', tab === 'register');
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            await authManager.loginWithEmail(email, password);
            this.showNotification('¡Bienvenido!', 'success');
        } catch (error) {
            this.showNotification(this.getAuthErrorMessage(error), 'error');
        }
    }

    async handleRegister() {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        try {
            await authManager.registerWithEmail(email, password, name);
            this.showNotification('¡Registro exitoso!', 'success');
        } catch (error) {
            this.showNotification(this.getAuthErrorMessage(error), 'error');
        }
    }

    async handleGoogleAuth(type) {
        try {
            await authManager.loginWithGoogle();
            this.showNotification(
                type === 'login' ? '¡Bienvenido!' : '¡Registro exitoso!',
                'success'
            );
        } catch (error) {
            this.showNotification('Error al autenticar con Google', 'error');
        }
    }

    async handleResetPassword() {
        const email = document.getElementById('reset-email').value;

        try {
            await authManager.resetPassword(email);
            this.showNotification('Link de recuperación enviado a tu email', 'success');
            this.hideForgotPassword();
        } catch (error) {
            this.showNotification('Error al enviar el link de recuperación', 'error');
        }
    }

    async handleLogout() {
        try {
            await authManager.logout();
            this.showNotification('Sesión cerrada', 'info');
        } catch (error) {
            this.showNotification('Error al cerrar sesión', 'error');
        }
    }

    showForgotPassword() {
        document.getElementById('login-form').classList.remove('active');
        document.getElementById('register-form').classList.remove('active');
        document.getElementById('forgot-password-form').classList.remove('hidden');
    }

    hideForgotPassword() {
        document.getElementById('forgot-password-form').classList.add('hidden');
        document.getElementById('login-form').classList.add('active');
    }

    showCreateLevelModal() {
        document.getElementById('create-level-modal').classList.remove('hidden');
    }

    showImportLevelModal() {
        document.getElementById('import-level-modal').classList.remove('hidden');
    }

    showLevelConfig() {
        document.getElementById('create-level-modal').classList.add('hidden');
        const title = document.getElementById('level-config-title');
        title.textContent = this.currentMode === 'ai' 
            ? 'Configurar Nivel con IA' 
            : 'Configurar Nivel Manual';
        document.getElementById('level-config-modal').classList.remove('hidden');
    }

    async handleLevelCreation() {
        const name = document.getElementById('level-name').value;
        const difficulty = document.getElementById('level-difficulty').value;
        const audioFile = document.getElementById('level-audio').files[0];
        const newgroundsId = document.getElementById('level-ng-id').value;

        try {
            let audioBase64 = null;
            if (audioFile) {
                audioBase64 = await databaseManager.fileToBase64(audioFile);
            }

            const userId = auth.currentUser.uid;
            let levelData;

            if (this.currentMode === 'ai') {
                // Generar nivel con IA
                const aiLevel = aiGenerator.generateLevel(difficulty);
                levelData = {
                    name: name,
                    difficulty: difficulty,
                    audioBase64: audioBase64,
                    newgroundsId: newgroundsId || null,
                    objects: aiLevel.objects,
                    settings: aiLevel.settings,
                    createdWith: 'ai'
                };
            } else {
                // Crear nivel vacío manual
                levelData = {
                    name: name,
                    difficulty: difficulty,
                    audioBase64: audioBase64,
                    newgroundsId: newgroundsId || null,
                    objects: [],
                    settings: {},
                    createdWith: 'manual'
                };
            }

            const project = await databaseManager.saveProject(userId, levelData);
            
            // Cargar en el editor
            editor.loadLevel(project.objects, project.name);
            document.getElementById('level-config-modal').classList.add('hidden');
            this.showEditor();
            
            this.showNotification('Nivel creado correctamente', 'success');
        } catch (error) {
            console.error('Error creating level:', error);
            this.showNotification('Error al crear el nivel', 'error');
        }
    }

    showEditor() {
        document.getElementById('main-screen').classList.add('hidden');
        document.getElementById('editor-screen').classList.remove('hidden');
    }

    showMainScreen() {
        document.getElementById('editor-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.remove('hidden');
    }

    testLevel() {
        const levelData = editor.getLevelData();
        player.startLevel(levelData.objects);
    }

    async saveLevel() {
        try {
            const userId = auth.currentUser.uid;
            const levelData = editor.getLevelData();
            const duration = editor.calculateDuration();
            
            await databaseManager.updateProject(userId, this.currentProjectId, {
                objects: levelData.objects,
                settings: levelData.settings,
                duration: duration,
                objectCount: levelData.objects.length
            });

            this.showNotification('Nivel guardado correctamente', 'success');
        } catch (error) {
            console.error('Error saving level:', error);
            this.showNotification('Error al guardar el nivel', 'error');
        }
    }

    showExportOptions() {
        const levelData = editor.getLevelData();
        const levelName = editor.currentLevelName || 'level';
        
        const exportModal = document.createElement('div');
        exportModal.className = 'modal';
        exportModal.innerHTML = `
            <div class="modal-content">
                <h2>Exportar Nivel</h2>
                <div class="export-options">
                    <button class="option-card" id="export-gmd">
                        <i class="fas fa-file-export"></i>
                        <h3>Exportar .gmd</h3>
                        <p>Formato para Geometry Dash</p>
                    </button>
                    <button class="option-card" id="export-json">
                        <i class="fas fa-file-code"></i>
                        <h3>Exportar JSON</h3>
                        <p>Formato para importar después</p>
                    </button>
                </div>
                <button class="close-modal-btn">&times;</button>
            </div>
        `;
        
        document.body.appendChild(exportModal);
        exportModal.classList.remove('hidden');
        
        exportModal.querySelector('#export-gmd').addEventListener('click', () => {
            exportImport.exportToGMD({
                name: levelName,
                objects: levelData.objects,
                settings: levelData.settings
            });
            exportModal.remove();
        });
        
        exportModal.querySelector('#export-json').addEventListener('click', () => {
            exportImport.exportToJSON({
                name: levelName,
                objects: levelData.objects,
                settings: levelData.settings
            });
            exportModal.remove();
        });
        
        exportModal.querySelector('.close-modal-btn').addEventListener('click', () => {
            exportModal.remove();
        });
        
        exportModal.addEventListener('click', (e) => {
            if (e.target === exportModal) {
                exportModal.remove();
            }
        });
    }

    displayProjects(projects) {
        const grid = document.getElementById('projects-grid');
        grid.innerHTML = '';

        const projectEntries = Object.entries(projects).reverse(); // Más recientes primero

        if (projectEntries.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>No hay proyectos aún</h3>
                    <p>Crea tu primer nivel o importa uno existente</p>
                </div>
            `;
            return;
        }

        projectEntries.forEach(([id, project]) => {
            const card = this.createProjectCard(id, project);
            grid.appendChild(card);
        });
    }

    createProjectCard(id, project) {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.onclick = () => this.openProject(id);

        card.innerHTML = `
            <div class="project-thumbnail">
                ${project.thumbnail 
                    ? `<img src="${project.thumbnail}" alt="${project.name}">`
                    : `<i class="fas fa-cube" style="font-size: 3rem; color: #00ff88;"></i>`
                }
            </div>
            <div class="project-info">
                <h3>${project.name || 'Sin nombre'}</h3>
                <div class="project-meta">
                    <span><i class="fas fa-cubes"></i> ${project.objectCount || 0} objetos</span>
                    <span><i class="fas fa-clock"></i> ${project.duration || 0}s</span>
                    <span class="difficulty-badge difficulty-${project.difficulty || 'normal'}">
                        ${this.getDifficultyLabel(project.difficulty)}
                    </span>
                </div>
            </div>
        `;

        return card;
    }

    async openProject(projectId) {
        try {
            const userId = auth.currentUser.uid;
            const project = await databaseManager.getProject(userId, projectId);
            
            if (project) {
                this.currentProjectId = projectId;
                editor.loadLevel(project.objects || [], project.name);
                this.showEditor();
            }
        } catch (error) {
            console.error('Error opening project:', error);
            this.showNotification('Error al abrir el proyecto', 'error');
        }
    }

    getDifficultyLabel(difficulty) {
        const labels = {
            'easy': 'Fácil',
            'normal': 'Normal',
            'hard': 'Difícil',
            'harder': 'Más Difícil',
            'insane': 'Insano',
            'demon': 'Demon'
        };
        return labels[difficulty] || 'Normal';
    }

    getAuthErrorMessage(error) {
        const errorMessages = {
            'auth/email-already-in-use': 'Este email ya está registrado',
            'auth/invalid-email': 'Email inválido',
            'auth/operation-not-allowed': 'Operación no permitida',
            'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
            'auth/user-disabled': 'Usuario deshabilitado',
            'auth/user-not-found': 'Usuario no encontrado',
            'auth/wrong-password': 'Contraseña incorrecta',
            'auth/invalid-credential': 'Credenciales inválidas',
            'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
            'auth/network-request-failed': 'Error de conexión'
        };
        
        return errorMessages[error.code] || 'Error de autenticación';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${
                type === 'success' ? 'check-circle' :
                type === 'error' ? 'times-circle' : 'info-circle'
            }"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

const uiManager = new UIManager();
