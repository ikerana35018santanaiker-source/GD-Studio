// Aplicación Principal
const App = (function() {
    let currentProjectId = null;
    let initialized = false;

    function init() {
        if (initialized) return;
        
        console.log('Inicializando aplicación...');
        
        // Esperar a que Firebase esté listo
        waitForFirebase(() => {
            // Esperar a que el editor esté listo
            waitForEditor(() => {
                setupAuthListener();
                setupUIListeners();
                checkInitialAuth();
                initialized = true;
                console.log('Aplicación inicializada correctamente');
            });
        });
    }

    function waitForFirebase(callback) {
        let attempts = 0;
        const check = () => {
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                callback();
            } else if (attempts < 50) {
                attempts++;
                setTimeout(check, 100);
            } else {
                showError('Firebase no se pudo inicializar');
            }
        };
        check();
    }

    function waitForEditor(callback) {
        let attempts = 0;
        const check = () => {
            if (window.editor && typeof window.editor.loadLevel === 'function') {
                callback();
            } else if (attempts < 100) {
                attempts++;
                setTimeout(check, 100);
            } else {
                showError('Editor no se pudo inicializar');
            }
        };
        check();
    }

    function setupAuthListener() {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                console.log('Usuario autenticado:', user.uid);
                showScreen('main');
                loadUserProjects();
            } else {
                console.log('Usuario no autenticado');
                showScreen('auth');
            }
        });
    }

    function checkInitialAuth() {
        const user = firebase.auth().currentUser;
        if (user) {
            showScreen('main');
            loadUserProjects();
        } else {
            showScreen('auth');
        }
        hideLoadingScreen();
    }

    function hideLoadingScreen() {
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) loadingScreen.classList.add('hidden');
        }, 500);
    }

    function showScreen(screenName) {
        const screens = ['loading-screen', 'auth-screen', 'main-screen', 'editor-screen', 'player-screen'];
        screens.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });

        const targetMap = {
            'loading': 'loading-screen',
            'auth': 'auth-screen',
            'main': 'main-screen',
            'editor': 'editor-screen',
            'player': 'player-screen'
        };

        const targetId = targetMap[screenName];
        if (targetId) {
            const target = document.getElementById(targetId);
            if (target) target.classList.remove('hidden');
        }
    }

    function setupUIListeners() {
        // Back to projects
        document.getElementById('back-to-projects')?.addEventListener('click', () => {
            showScreen('main');
            loadUserProjects();
        });

        // Test level
        document.getElementById('test-level-btn')?.addEventListener('click', () => {
            testLevel();
        });

        // Save level
        document.getElementById('save-level-btn')?.addEventListener('click', () => {
            saveCurrentLevel();
        });

        // Export level
        document.getElementById('export-level-btn')?.addEventListener('click', () => {
            exportCurrentLevel();
        });

        // Stop test
        document.getElementById('stop-test-btn')?.addEventListener('click', () => {
            if (window.player) window.player.stopLevel();
        });

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', async () => {
            try {
                await firebase.auth().signOut();
                showNotification('Sesión cerrada', 'info');
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
            }
        });

        // Create level button
        document.getElementById('create-level-btn')?.addEventListener('click', () => {
            document.getElementById('create-level-modal')?.classList.remove('hidden');
        });

        // Import level button
        document.getElementById('import-level-btn')?.addEventListener('click', () => {
            document.getElementById('import-level-modal')?.classList.remove('hidden');
        });

        // Create options
        document.getElementById('manual-create')?.addEventListener('click', () => {
            document.getElementById('create-level-modal')?.classList.add('hidden');
            document.getElementById('level-config-title').textContent = 'Configurar Nivel Manual';
            document.getElementById('level-config-modal')?.classList.remove('hidden');
            window._createMode = 'manual';
        });

        document.getElementById('ai-create')?.addEventListener('click', () => {
            document.getElementById('create-level-modal')?.classList.add('hidden');
            document.getElementById('level-config-title').textContent = 'Configurar Nivel con IA';
            document.getElementById('level-config-modal')?.classList.remove('hidden');
            window._createMode = 'ai';
        });

        // Level config form
        document.getElementById('level-config-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleCreateLevel();
        });

        // Close modals
        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal')?.classList.add('hidden');
            });
        });

        // Close modals on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.add('hidden');
            });
        });

        // Auth tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const tab = btn.dataset.tab;
                document.getElementById('login-form').classList.toggle('active', tab === 'login');
                document.getElementById('register-form').classList.toggle('active', tab === 'register');
                document.getElementById('forgot-password-form')?.classList.add('hidden');
            });
        });

        // Auth forms
        document.getElementById('login-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleLogin();
        });

        document.getElementById('register-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleRegister();
        });

        // Google auth
        document.getElementById('google-login-btn')?.addEventListener('click', () => handleGoogleAuth());
        document.getElementById('google-register-btn')?.addEventListener('click', () => handleGoogleAuth());

        // Forgot password
        document.getElementById('forgot-password-btn')?.addEventListener('click', () => {
            document.getElementById('login-form')?.classList.remove('active');
            document.getElementById('register-form')?.classList.remove('active');
            document.getElementById('forgot-password-form')?.classList.remove('hidden');
        });

        document.getElementById('back-to-login-btn')?.addEventListener('click', () => {
            document.getElementById('forgot-password-form')?.classList.add('hidden');
            document.getElementById('login-form')?.classList.add('active');
        });

        document.getElementById('reset-password-btn')?.addEventListener('click', async () => {
            const email = document.getElementById('reset-email')?.value;
            if (!email) {
                showNotification('Ingresa tu email', 'error');
                return;
            }
            try {
                await firebase.auth().sendPasswordResetEmail(email);
                showNotification('Link de recuperación enviado', 'success');
                document.getElementById('forgot-password-form')?.classList.add('hidden');
                document.getElementById('login-form')?.classList.add('active');
            } catch (error) {
                showNotification('Error: ' + error.message, 'error');
            }
        });

        // Import handlers
        setupImportHandlers();

        // Editor tools
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.editor) window.editor.setTool(btn.dataset.tool);
            });
        });
    }

    function setupImportHandlers() {
        const setupDropZone = (zoneId, inputSelector, handler) => {
            const zone = document.getElementById(zoneId);
            const input = document.querySelector(inputSelector);
            
            if (!zone || !input) return;

            zone.addEventListener('click', () => input.click());
            
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.style.borderColor = '#00ff88';
            });
            
            zone.addEventListener('dragleave', () => {
                zone.style.borderColor = '';
            });
            
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.style.borderColor = '';
                const file = e.dataTransfer.files[0];
                if (file) handler(file);
            });
            
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) handler(file);
            });
        };

        setupDropZone('import-gmd', '#import-gmd input', importGMD);
        setupDropZone('import-json', '#import-json input', importJSON);
    }

    async function handleLogin() {
        const email = document.getElementById('login-email')?.value;
        const password = document.getElementById('login-password')?.value;
        
        if (!email || !password) {
            showNotification('Completa todos los campos', 'error');
            return;
        }

        try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
            showNotification('¡Bienvenido!', 'success');
        } catch (error) {
            showNotification(getAuthError(error), 'error');
        }
    }

    async function handleRegister() {
        const name = document.getElementById('register-name')?.value;
        const email = document.getElementById('register-email')?.value;
        const password = document.getElementById('register-password')?.value;
        
        if (!name || !email || !password) {
            showNotification('Completa todos los campos', 'error');
            return;
        }

        try {
            const result = await firebase.auth().createUserWithEmailAndPassword(email, password);
            await result.user.updateProfile({ displayName: name });
            
            await firebase.database().ref(`users/${result.user.uid}`).set({
                name, email,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            
            showNotification('¡Registro exitoso!', 'success');
        } catch (error) {
            showNotification(getAuthError(error), 'error');
        }
    }

    async function handleGoogleAuth() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await firebase.auth().signInWithPopup(provider);
            
            const userRef = firebase.database().ref(`users/${result.user.uid}`);
            const snapshot = await userRef.once('value');
            
            if (!snapshot.exists()) {
                await userRef.set({
                    name: result.user.displayName,
                    email: result.user.email,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
            }
            
            showNotification('¡Bienvenido!', 'success');
        } catch (error) {
            showNotification('Error con Google: ' + error.message, 'error');
        }
    }

    async function handleCreateLevel() {
        const name = document.getElementById('level-name')?.value;
        const difficulty = document.getElementById('level-difficulty')?.value;
        const audioFile = document.getElementById('level-audio')?.files[0];
        const ngId = document.getElementById('level-ng-id')?.value;
        const mode = window._createMode || 'manual';

        if (!name) {
            showNotification('El nombre es requerido', 'error');
            return;
        }

        try {
            let audioBase64 = null;
            if (audioFile) {
                audioBase64 = await fileToBase64(audioFile);
            }

            let objects = [];
            let settings = {};

            if (mode === 'ai' && window.aiGenerator) {
                const aiLevel = window.aiGenerator.generateLevel(difficulty);
                objects = aiLevel.objects || [];
                settings = aiLevel.settings || {};
            }

            const user = firebase.auth().currentUser;
            if (!user) throw new Error('No autenticado');

            const projectRef = firebase.database().ref(`users/${user.uid}/projects`).push();
            const project = {
                id: projectRef.key,
                name, difficulty, audioBase64,
                newgroundsId: ngId || null,
                objects, settings,
                createdWith: mode,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
                objectCount: objects.length,
                duration: objects.length > 0 ? Math.ceil(Math.max(...objects.map(o => o.x)) / 300) : 0
            };

            await projectRef.set(project);
            
            currentProjectId = project.id;
            
            if (window.editor) {
                window.editor.loadLevel(objects, name);
                window.editor.currentLevelName = name;
            }

            document.getElementById('level-config-modal')?.classList.add('hidden');
            document.getElementById('level-config-form')?.reset();
            showScreen('editor');
            showNotification(`Nivel "${name}" creado`, 'success');
            loadUserProjects();

        } catch (error) {
            console.error('Error al crear nivel:', error);
            showNotification('Error: ' + error.message, 'error');
        }
    }

    async function importGMD(file) {
        try {
            const text = await file.text();
            const levelData = parseGMD(text);
            
            const user = firebase.auth().currentUser;
            if (!user) throw new Error('No autenticado');

            const projectRef = firebase.database().ref(`users/${user.uid}/projects`).push();
            const project = {
                id: projectRef.key,
                name: levelData.name || file.name.replace('.gmd', ''),
                difficulty: levelData.difficulty || 'normal',
                objects: levelData.objects || [],
                settings: levelData.settings || {},
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
                objectCount: levelData.objects?.length || 0,
                duration: 0
            };

            await projectRef.set(project);
            currentProjectId = project.id;

            if (window.editor) {
                window.editor.loadLevel(project.objects, project.name);
                window.editor.currentLevelName = project.name;
            }

            document.getElementById('import-level-modal')?.classList.add('hidden');
            showScreen('editor');
            showNotification('Nivel importado correctamente', 'success');
            loadUserProjects();

        } catch (error) {
            console.error('Error al importar GMD:', error);
            showNotification('Error al importar: ' + error.message, 'error');
        }
    }

    async function importJSON(file) {
        try {
            const text = await file.text();
            const levelData = JSON.parse(text);

            if (!levelData.objects || !Array.isArray(levelData.objects)) {
                throw new Error('Formato JSON inválido');
            }

            const user = firebase.auth().currentUser;
            if (!user) throw new Error('No autenticado');

            const projectRef = firebase.database().ref(`users/${user.uid}/projects`).push();
            const project = {
                id: projectRef.key,
                name: levelData.name || file.name.replace('.json', ''),
                difficulty: levelData.difficulty || 'normal',
                objects: levelData.objects,
                settings: levelData.settings || {},
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
                objectCount: levelData.objects.length,
                duration: levelData.objects.length > 0 ? Math.ceil(Math.max(...levelData.objects.map(o => o.x)) / 300) : 0
            };

            await projectRef.set(project);
            currentProjectId = project.id;

            if (window.editor) {
                window.editor.loadLevel(project.objects, project.name);
                window.editor.currentLevelName = project.name;
            }

            document.getElementById('import-level-modal')?.classList.add('hidden');
            showScreen('editor');
            showNotification('Nivel importado correctamente', 'success');
            loadUserProjects();

        } catch (error) {
            console.error('Error al importar JSON:', error);
            showNotification('Error: ' + error.message, 'error');
        }
    }

    async function openProject(projectId) {
        try {
            const user = firebase.auth().currentUser;
            if (!user) throw new Error('No autenticado');

            console.log('Abriendo proyecto:', projectId);

            const snapshot = await firebase.database().ref(`users/${user.uid}/projects/${projectId}`).once('value');
            const project = snapshot.val();

            if (!project) throw new Error('Proyecto no encontrado');

            console.log('Proyecto cargado:', project.name, 'Objetos:', project.objects?.length || 0);

            currentProjectId = projectId;

            if (!window.editor) {
                throw new Error('Editor no disponible');
            }

            window.editor.loadLevel(project.objects || [], project.name);
            window.editor.currentLevelName = project.name;
            showScreen('editor');

        } catch (error) {
            console.error('Error al abrir proyecto:', error);
            showNotification('Error: ' + error.message, 'error');
        }
    }

    async function saveCurrentLevel() {
        try {
            if (!currentProjectId) {
                showNotification('No hay proyecto activo', 'error');
                return;
            }

            const user = firebase.auth().currentUser;
            if (!user) throw new Error('No autenticado');

            if (!window.editor) throw new Error('Editor no disponible');

            const levelData = window.editor.getLevelData();
            const duration = window.editor.calculateDuration();

            await firebase.database().ref(`users/${user.uid}/projects/${currentProjectId}`).update({
                objects: levelData.objects,
                settings: levelData.settings,
                duration,
                objectCount: levelData.objects.length,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });

            showNotification('Nivel guardado', 'success');
            loadUserProjects();

        } catch (error) {
            console.error('Error al guardar:', error);
            showNotification('Error: ' + error.message, 'error');
        }
    }

    function testLevel() {
        if (!window.editor) {
            showNotification('Editor no disponible', 'error');
            return;
        }

        const levelData = window.editor.getLevelData();
        if (levelData.objects && levelData.objects.length > 0) {
            if (window.player) window.player.startLevel(levelData.objects);
        } else {
            showNotification('Agrega objetos primero', 'warning');
        }
    }

    function exportCurrentLevel() {
        if (!window.editor) return;

        const levelData = window.editor.getLevelData();
        const name = window.editor.currentLevelName || 'nivel';

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Exportar Nivel</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 2rem 0;">
                    <div class="option-card" id="exp-gmd" style="cursor:pointer; padding:2rem; text-align:center; background:#16213e; border-radius:12px; border:2px solid #2a2a4a;">
                        <i class="fas fa-file-export" style="font-size:3rem; color:#00ff88;"></i>
                        <h3>.gmd</h3>
                        <p>Geometry Dash</p>
                    </div>
                    <div class="option-card" id="exp-json" style="cursor:pointer; padding:2rem; text-align:center; background:#16213e; border-radius:12px; border:2px solid #2a2a4a;">
                        <i class="fas fa-file-code" style="font-size:3rem; color:#00ff88;"></i>
                        <h3>JSON</h3>
                        <p>Importar después</p>
                    </div>
                </div>
                <button class="close-modal-btn">&times;</button>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.close-modal-btn').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        modal.querySelector('#exp-gmd').onclick = () => {
            let gmd = `kS1;${name}\n`;
            levelData.objects.forEach(obj => {
                gmd += `OBJ;${obj.type};${obj.x};${obj.y};${obj.size}\n`;
            });
            downloadFile(`${name}.gmd`, gmd);
            modal.remove();
        };

        modal.querySelector('#exp-json').onclick = () => {
            downloadFile(`${name}.json`, JSON.stringify({ name, objects: levelData.objects, settings: levelData.settings }, null, 2));
            modal.remove();
        };
    }

    function downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function loadUserProjects() {
        const user = firebase.auth().currentUser;
        if (!user) return;

        try {
            const snapshot = await firebase.database().ref(`users/${user.uid}/projects`).once('value');
            const projects = snapshot.val() || {};
            displayProjects(projects);
        } catch (error) {
            console.error('Error al cargar proyectos:', error);
        }
    }

    function displayProjects(projects) {
        const grid = document.getElementById('projects-grid');
        if (!grid) return;

        grid.innerHTML = '';

        const entries = Object.entries(projects).reverse();

        if (entries.length === 0) {
            grid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:3rem;">
                    <i class="fas fa-folder-open" style="font-size:4rem; color:#00ff88;"></i>
                    <h3>No hay proyectos</h3>
                    <p>Crea tu primer nivel</p>
                </div>
            `;
            return;
        }

        entries.forEach(([id, project]) => {
            const card = document.createElement('div');
            card.className = 'project-card';
            card.style.cssText = 'background:#16213e; border-radius:12px; overflow:hidden; cursor:pointer; transition:transform 0.3s;';
            card.onmouseenter = () => card.style.transform = 'translateY(-5px)';
            card.onmouseleave = () => card.style.transform = 'translateY(0)';
            card.onclick = () => openProject(id);

            card.innerHTML = `
                <div style="height:200px; background:linear-gradient(135deg, #1a1a2e, #16213e); display:flex; align-items:center; justify-content:center;">
                    <i class="fas fa-cube" style="font-size:4rem; color:#00ff88;"></i>
                </div>
                <div style="padding:1rem;">
                    <h3>${project.name || 'Sin nombre'}</h3>
                    <div style="display:flex; justify-content:space-between; color:#a0a0b0; font-size:0.9rem; margin-top:0.5rem;">
                        <span><i class="fas fa-cubes"></i> ${project.objectCount || 0}</span>
                        <span><i class="fas fa-clock"></i> ${project.duration || 0}s</span>
                        <span style="background:#00ff88; color:#000; padding:2px 8px; border-radius:12px; font-weight:bold;">
                            ${getDifficultyLabel(project.difficulty)}
                        </span>
                    </div>
                </div>
            `;

            grid.appendChild(card);
        });
    }

    function getDifficultyLabel(diff) {
        const labels = { easy: 'Fácil', normal: 'Normal', hard: 'Difícil', harder: 'Muy Difícil', insane: 'Insano', demon: 'Demon' };
        return labels[diff] || 'Normal';
    }

    function parseGMD(data) {
        const lines = data.split('\n');
        const result = { objects: [], settings: {}, name: 'Importado' };
        
        for (const line of lines) {
            if (line.startsWith('#') || !line.includes(';')) continue;
            const [key, value] = line.split(';').map(s => s.trim());
            
            if (key === 'kS1') result.name = value;
            else if (key.startsWith('OBJ')) {
                const [, type, x, y, size] = line.split(';');
                if (type && x && y) {
                    result.objects.push({
                        id: Date.now() + Math.random(),
                        type: type.trim(),
                        x: parseInt(x),
                        y: parseInt(y),
                        size: parseInt(size) || 30,
                        color: type === 'spike' ? '#ff4444' : type === 'orb' ? '#ffaa00' : '#00ff88',
                        shape: type === 'spike' ? 'triangle' : type === 'orb' ? 'circle' : 'square'
                    });
                }
            }
        }

        if (result.objects.length === 0) {
            result.objects = [
                { id: 1, type: 'block', x: 200, y: 500, size: 30, color: '#00ff88', shape: 'square' },
                { id: 2, type: 'block', x: 230, y: 500, size: 30, color: '#00ff88', shape: 'square' },
                { id: 3, type: 'spike', x: 350, y: 470, size: 30, color: '#ff4444', shape: 'triangle' }
            ];
        }

        return result;
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function getAuthError(error) {
        const messages = {
            'auth/email-already-in-use': 'Email ya registrado',
            'auth/invalid-email': 'Email inválido',
            'auth/weak-password': 'Contraseña muy débil (mínimo 6 caracteres)',
            'auth/user-not-found': 'Usuario no encontrado',
            'auth/wrong-password': 'Contraseña incorrecta',
            'auth/invalid-credential': 'Credenciales inválidas',
            'auth/too-many-requests': 'Demasiados intentos. Espera un momento'
        };
        return messages[error.code] || error.message || 'Error de autenticación';
    }

    function showNotification(message, type = 'info') {
        document.querySelectorAll('.notification').forEach(n => n.remove());

        const colors = { success: '#00ff88', error: '#ff4444', warning: '#ffaa00', info: '#4488ff' };
        const icons = { success: 'check-circle', error: 'times-circle', warning: 'exclamation-triangle', info: 'info-circle' };

        const notif = document.createElement('div');
        notif.className = 'notification';
        notif.style.cssText = `
            position:fixed; bottom:20px; right:20px; background:${colors[type]}; 
            color:${type === 'warning' ? '#000' : '#fff'}; padding:1rem 1.5rem; 
            border-radius:8px; z-index:10000; animation:slideIn 0.3s ease;
            display:flex; align-items:center; gap:10px; box-shadow:0 4px 12px rgba(0,0,0,0.3);
        `;
        notif.innerHTML = `<i class="fas fa-${icons[type]}"></i><span>${message}</span>`;
        
        document.body.appendChild(notif);
        setTimeout(() => {
            notif.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }

    function showError(message) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div class="loader">
                    <i class="fas fa-exclamation-triangle" style="color:#ff4444;"></i>
                    <p style="color:#ff4444;">Error</p>
                    <p>${message}</p>
                    <button onclick="location.reload()" style="margin-top:1rem; padding:10px 20px; background:#00ff88; border:none; border-radius:5px; cursor:pointer;">
                        Reintentar
                    </button>
                </div>
            `;
        }
    }

    // Iniciar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // API pública
    return {
        openProject,
        createNewLevel: handleCreateLevel,
        importLevel: async (data) => {
            const user = firebase.auth().currentUser;
            if (!user) throw new Error('No autenticado');

            const projectRef = firebase.database().ref(`users/${user.uid}/projects`).push();
            const project = {
                id: projectRef.key,
                name: data.name || 'Importado',
                difficulty: data.difficulty || 'normal',
                objects: data.objects || [],
                settings: data.settings || {},
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
                objectCount: (data.objects || []).length,
                duration: 0
            };

            await projectRef.set(project);
            currentProjectId = project.id;

            if (window.editor) {
                window.editor.loadLevel(project.objects, project.name);
                window.editor.currentLevelName = project.name;
            }

            showScreen('editor');
            showNotification('Importado correctamente', 'success');
            loadUserProjects();
        }
    };
})();

// Exponer globalmente
window.app = App;
console.log('App module loaded');
