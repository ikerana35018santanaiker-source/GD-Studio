class App {
    constructor() {
        this.init();
    }

    async init() {
        try {
            // Esperar a que Firebase se inicialice
            await this.waitForAuth();
            
            // Mostrar la pantalla correcta
            if (auth.currentUser) {
                document.getElementById('loading-screen').classList.add('hidden');
                document.getElementById('main-screen').classList.remove('hidden');
                await authManager.loadUserProjects(auth.currentUser.uid);
            } else {
                document.getElementById('loading-screen').classList.add('hidden');
                document.getElementById('auth-screen').classList.remove('hidden');
            }
            
            // Escuchar cambios en tiempo real
            this.setupRealtimeListeners();
            
        } catch (error) {
            console.error('Error initializing app:', error);
            document.getElementById('loading-screen').innerHTML = `
                <div class="loader">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al cargar la aplicación</p>
                    <button onclick="location.reload()">Reintentar</button>
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

    setupRealtimeListeners() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                databaseManager.listenToProjectChanges(user.uid, (projects) => {
                    uiManager.displayProjects(projects);
                });
            }
        });
    }
}

// Iniciar la aplicación cuando todo esté cargado
window.addEventListener('load', () => {
    new App();
});

// Service Worker para PWA (opcional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(error => {
            console.log('ServiceWorker registration failed:', error);
        });
    });
}
