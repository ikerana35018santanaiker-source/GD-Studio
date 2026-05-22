class AuthManager {
    constructor() {
        this.currentUser = null;
        this.setupAuthListeners();
    }

    setupAuthListeners() {
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            if (user) {
                this.onUserLoggedIn(user);
            } else {
                this.onUserLoggedOut();
            }
        });
    }

    onUserLoggedIn(user) {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.remove('hidden');
        this.loadUserProjects(user.uid);
    }

    onUserLoggedOut() {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('main-screen').classList.add('hidden');
        document.getElementById('editor-screen').classList.add('hidden');
    }

    async registerWithEmail(email, password, name) {
        try {
            const recaptchaResponse = grecaptcha.getResponse();
            if (!recaptchaResponse) {
                throw new Error('Por favor, completa el reCAPTCHA');
            }

            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({ displayName: name });
            
            // Guardar datos del usuario en Realtime Database
            await database.ref(`users/${userCredential.user.uid}`).set({
                name: name,
                email: email,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                projects: {}
            });

            return userCredential.user;
        } catch (error) {
            console.error('Error en registro:', error);
            throw error;
        }
    }

    async loginWithEmail(email, password) {
        try {
            const recaptchaResponse = grecaptcha.getResponse();
            if (!recaptchaResponse) {
                throw new Error('Por favor, completa el reCAPTCHA');
            }

            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            return userCredential.user;
        } catch (error) {
            console.error('Error en login:', error);
            throw error;
        }
    }

    async loginWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);
            
            // Si es un usuario nuevo, guardar en la base de datos
            const userRef = database.ref(`users/${result.user.uid}`);
            const snapshot = await userRef.once('value');
            
            if (!snapshot.exists()) {
                await userRef.set({
                    name: result.user.displayName,
                    email: result.user.email,
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    projects: {}
                });
            }

            return result.user;
        } catch (error) {
            console.error('Error en login con Google:', error);
            throw error;
        }
    }

    async resetPassword(email) {
        try {
            await auth.sendPasswordResetEmail(email);
            return true;
        } catch (error) {
            console.error('Error al enviar reset:', error);
            throw error;
        }
    }

    async logout() {
        try {
            await auth.signOut();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            throw error;
        }
    }

    async loadUserProjects(userId) {
        const projectsRef = database.ref(`users/${userId}/projects`);
        const snapshot = await projectsRef.once('value');
        const projects = snapshot.val() || {};
        
        uiManager.displayProjects(projects);
    }
}

const authManager = new AuthManager();
