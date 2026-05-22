class DatabaseManager {
    constructor() {
        this.db = database;
    }

    // Guardar proyecto
    async saveProject(userId, projectData) {
        try {
            const projectRef = this.db.ref(`users/${userId}/projects`).push();
            const project = {
                id: projectRef.key,
                name: projectData.name,
                difficulty: projectData.difficulty,
                audioBase64: projectData.audioBase64 || null,
                newgroundsId: projectData.newgroundsId || null,
                objects: projectData.objects || [],
                settings: projectData.settings || {},
                thumbnail: projectData.thumbnail || null,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
                duration: projectData.duration || 0,
                objectCount: projectData.objects ? projectData.objects.length : 0
            };

            await projectRef.set(project);
            return project;
        } catch (error) {
            console.error('Error al guardar proyecto:', error);
            throw error;
        }
    }

    // Actualizar proyecto
    async updateProject(userId, projectId, updates) {
        try {
            const projectRef = this.db.ref(`users/${userId}/projects/${projectId}`);
            updates.updatedAt = firebase.database.ServerValue.TIMESTAMP;
            
            if (updates.objects) {
                updates.objectCount = updates.objects.length;
            }
            
            await projectRef.update(updates);
            return true;
        } catch (error) {
            console.error('Error al actualizar proyecto:', error);
            throw error;
        }
    }

    // Eliminar proyecto
    async deleteProject(userId, projectId) {
        try {
            await this.db.ref(`users/${userId}/projects/${projectId}`).remove();
            return true;
        } catch (error) {
            console.error('Error al eliminar proyecto:', error);
            throw error;
        }
    }

    // Obtener proyecto
    async getProject(userId, projectId) {
        try {
            const snapshot = await this.db.ref(`users/${userId}/projects/${projectId}`).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error al obtener proyecto:', error);
            throw error;
        }
    }

    // Obtener todos los proyectos del usuario
    async getAllProjects(userId) {
        try {
            const snapshot = await this.db.ref(`users/${userId}/projects`).once('value');
            return snapshot.val() || {};
        } catch (error) {
            console.error('Error al obtener proyectos:', error);
            throw error;
        }
    }

    // Convertir archivo a Base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    // Escuchar cambios en tiempo real
    listenToProjectChanges(userId, callback) {
        const projectsRef = this.db.ref(`users/${userId}/projects`);
        projectsRef.on('value', (snapshot) => {
            const projects = snapshot.val() || {};
            callback(projects);
        });
    }
}

const databaseManager = new DatabaseManager();
