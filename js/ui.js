class UIManager {
    constructor() {
        this.currentMode = 'manual';
        this.setupUIListeners();
        this.setupEditorListeners();
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
            document.getElementById('create-level-modal').classList.add('hidden');
            this.showLevelConfig('manual');
        });

        document.getElementById('ai-create').addEventListener('click', () => {
            this.currentMode = 'ai';
            document.getElementById('create-level-modal').classList.add('hidden');
            this.showLevelConfig('ai');
        });

        // Level config form
        document.getElementById('level-config-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLevelCreation();
        });

        // Close modals
        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = btn.closest('.modal');
                if (modal) {
                    modal.classList.add('hidden');
                }
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

    setupEditorListeners() {
        // Editor toolbar tools
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                editor.setTool(btn.dataset.tool);
            });
        });
    }

    switchAuthTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        document.getElementById('login-form').classList.toggle('active', tab === 'login');
        document.getElementById('register-form').classList.toggle('active', tab === 'register');
        document.getElementById('forgot-password-form').classList.add('hidden');
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            this.showNotification('Por favor completa todos los campos', 'error');
            return;
        }

        try {
            await authManager.loginWithEmail(email, password);
            this.showNotification('¡Bienvenido!', 'success');
            document.getElementById('login-form').reset();
        } catch (error) {
            this.showNotification(this.getAuthErrorMessage(error), 'error');
        }
    }

    async handleRegister() {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        if (!name || !email || !password) {
            this.showNotification('Por favor completa todos los campos', 'error');
            return;
        }

        try {
            await authManager.registerWithEmail(email, password, name);
            this.showNotification('¡Registro exitoso!', 'success');
            document.getElementById('register-form').reset();
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

        if (!email) {
            this.showNotification('Por favor ingresa tu email', 'error');
            return;
        }

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

    async handleLevelCreation() {
        const name = document.getElementById('level-name').value;
        const difficulty = document.getElementById('level-difficulty').value;
        const audioFile = document.getElementById('level-audio').files[0];
        const newgroundsId = document.getElementById('level-ng-id').value;

        if (!name) {
            this.showNotification('El nombre del nivel es requerido', 'error');
            return;
        }

        try {
            let audioBase64 = null;
            if (audioFile) {
                // Mostrar indicador de carga
                this.showNotification('Procesando audio...', 'info');
                audioBase64 = await databaseManager.fileToBase64(audioFile);
            }

            const levelData = {
                name: name,
                difficulty: difficulty,
                audioBase64: audioBase64,
                newgroundsId: newgroundsId || null,
                createdWith: this.currentMode
            };

            // Cerrar modal de configuración
            document.getElementById('level-config-modal').classList.add('hidden');
            
            // Crear nivel usando la app principal
            await app.createNewLevel(levelData);
            
            // Limpiar formulario
            document.getElementById('level-config-form').reset();
            
        } catch (error) {
            console.error('Error creating level:', error);
            this.showNotification('Error al crear el nivel: ' + error.message, 'error');
        }
    }

    showCreateLevelModal() {
        document.getElementById('create-level-modal').classList.remove('hidden');
    }

    showImportLevelModal() {
        document.getElementById('import-level-modal').classList.remove('hidden');
    }

    showLevelConfig(mode) {
        const title = document.getElementById('level-config-title');
        title.textContent = mode === 'ai' 
            ? 'Configurar Nivel con IA' 
            : 'Configurar Nivel Manual';
        
        document.getElementById('level-config-modal').classList.remove('hidden');
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

    displayProjects(projects) {
        const grid = document.getElementById('projects-grid');
        if (!grid) return;
        
        grid.innerHTML = '';

        if (!projects || Object.keys(projects).length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <i class="fas fa-folder-open" style="font-size: 4rem; color: #00ff88; margin-bottom: 1rem;"></i>
                    <h3>No hay proyectos aún</h3>
                    <p>Crea tu primer nivel o importa uno existente</p>
                    <button class="primary-btn" onclick="document.getElementById('create-level-btn').click()" style="margin-top: 1rem; width: auto; display: inline-block;">
                        <i class="fas fa-plus"></i> Crear Nivel
                    </button>
                </div>
            `;
            return;
        }

        const projectEntries = Object.entries(projects).reverse();

        projectEntries.forEach(([id, project]) => {
            const card = this.createProjectCard(id, project);
            grid.appendChild(card);
        });
    }

    createProjectCard(id, project) {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.style.cursor = 'pointer';
        
        card.addEventListener('click', () => {
            if (app && typeof app.openProject === 'function') {
                app.openProject(id);
            }
        });

        card.innerHTML = `
            <div class="project-thumbnail" style="background: linear-gradient(135deg, #1a1a2e, #16213e); display: flex; align-items: center; justify-content: center; min-height: 200px;">
                ${project.thumbnail 
                    ? `<img src="${project.thumbnail}" alt="${project.name}" style="width: 100%; height: 100%; object-fit: cover;">`
                    : `<i class="fas fa-cube" style="font-size: 4rem; color: #00ff88;"></i>`
                }
            </div>
            <div class="project-info" style="padding: 1rem;">
                <h3 style="margin-bottom: 0.5rem; color: #fff;">${project.name || 'Sin nombre'}</h3>
                <div class="project-meta" style="display: flex; justify-content: space-between; color: #a0a0b0; font-size: 0.9rem;">
                    <span><i class="fas fa-cubes"></i> ${project.objectCount || 0} objetos</span>
                    <span><i class="fas fa-clock"></i> ${project.duration || 0}s</span>
                    <span class="difficulty-badge" style="padding: 2px 8px; border-radius: 12px; background: #00ff88; color: #000; font-weight: bold;">
                        ${this.getDifficultyLabel(project.difficulty)}
                    </span>
                </div>
            </div>
        `;

        return card;
    }

    getDifficultyLabel(difficulty) {
        const labels = {
            'easy': 'Fácil',
            'normal': 'Normal',
            'hard': 'Difícil',
            'harder': 'Muy Difícil',
            'insane': 'Insano',
            'demon': 'Demon'
        };
        return labels[difficulty] || 'Normal';
    }

    showExportOptions(levelName, levelData) {
        const exportModal = document.createElement('div');
        exportModal.className = 'modal';
        exportModal.style.display = 'flex';
        exportModal.innerHTML = `
            <div class="modal-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h2>Exportar Nivel</h2>
                    <button class="close-btn" style="background: none; border: none; color: #fff; font-size: 1.5rem; cursor: pointer;">&times;</button>
                </div>
                <div class="export-options" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 2rem 0;">
                    <div class="option-card" id="export-gmd-btn" style="cursor: pointer; padding: 2rem; text-align: center; background: #16213e; border-radius: 12px; border: 2px solid #2a2a4a;">
                        <i class="fas fa-file-export" style="font-size: 3rem; color: #00ff88; margin-bottom: 1rem;"></i>
                        <h3>Exportar .gmd</h3>
                        <p style="color: #a0a0b0;">Formato para Geometry Dash</p>
                    </div>
                    <div class="option-card" id="export-json-btn" style="cursor: pointer; padding: 2rem; text-align: center; background: #16213e; border-radius: 12px; border: 2px solid #2a2a4a;">
                        <i class="fas fa-file-code" style="font-size: 3rem; color: #00ff88; margin-bottom: 1rem;"></i>
                        <h3>Exportar JSON</h3>
                        <p style="color: #a0a0b0;">Formato para importar después</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(exportModal);
        
        // Event listeners
        exportModal.querySelector('.close-btn').addEventListener('click', () => {
            exportModal.remove();
        });
        
        exportModal.addEventListener('click', (e) => {
            if (e.target === exportModal) {
                exportModal.remove();
            }
        });
        
        exportModal.querySelector('#export-gmd-btn').addEventListener('click', () => {
            exportImport.exportToGMD({
                name: levelName,
                objects: levelData.objects,
                settings: levelData.settings
            });
            exportModal.remove();
        });
        
        exportModal.querySelector('#export-json-btn').addEventListener('click', () => {
            exportImport.exportToJSON({
                name: levelName,
                objects: levelData.objects,
                settings: levelData.settings
            });
            exportModal.remove();
        });
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
            'auth/network-request-failed': 'Error de conexión. Verifica tu internet'
        };
        
        return errorMessages[error.code] || error.message || 'Error de autenticación';
    }

    showNotification(message, type = 'info') {
        // Eliminar notificaciones anteriores
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff4444' : type === 'warning' ? '#ffaa00' : '#4488ff'};
            color: ${type === 'warning' ? '#000' : '#fff'};
            padding: 1rem 1.5rem;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        const icons = {
            success: 'check-circle',
            error: 'times-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        notification.innerHTML = `
            <i class="fas fa-${icons[type] || 'info-circle'}" style="font-size: 1.2rem;"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-eliminar después de 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

const uiManager = new UIManager();
