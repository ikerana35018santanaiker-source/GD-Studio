class ExportImportManager {
    constructor() {
        this.setupImportListeners();
    }

    setupImportListeners() {
        // GMD Import
        const gmdInput = document.querySelector('#import-gmd input');
        const gmdZone = document.getElementById('import-gmd');
        
        gmdZone.addEventListener('click', () => gmdInput.click());
        gmdZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            gmdZone.style.borderColor = '#00ff88';
        });
        gmdZone.addEventListener('dragleave', () => {
            gmdZone.style.borderColor = '';
        });
        gmdZone.addEventListener('drop', (e) => {
            e.preventDefault();
            gmdZone.style.borderColor = '';
            const file = e.dataTransfer.files[0];
            if (file) this.importGMD(file);
        });
        gmdInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.importGMD(file);
        });

        // JSON Import
        const jsonInput = document.querySelector('#import-json input');
        const jsonZone = document.getElementById('import-json');
        
        jsonZone.addEventListener('click', () => jsonInput.click());
        jsonZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            jsonZone.style.borderColor = '#00ff88';
        });
        jsonZone.addEventListener('dragleave', () => {
            jsonZone.style.borderColor = '';
        });
        jsonZone.addEventListener('drop', (e) => {
            e.preventDefault();
            jsonZone.style.borderColor = '';
            const file = e.dataTransfer.files[0];
            if (file) this.importJSON(file);
        });
        jsonInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.importJSON(file);
        });
    }

    async importGMD(file) {
        try {
            const text = await file.text();
            const levelData = this.parseGMD(text);
            
            // Guardar el nivel importado
            const userId = auth.currentUser.uid;
            const project = await databaseManager.saveProject(userId, {
                name: levelData.name || file.name.replace('.gmd', ''),
                difficulty: levelData.difficulty || 'normal',
                objects: levelData.objects || [],
                settings: levelData.settings || {}
            });

            // Cargar en el editor
            editor.loadLevel(project.objects, project.name);
            this.showEditor();
            
            uiManager.showNotification('Nivel importado correctamente', 'success');
        } catch (error) {
            console.error('Error importing GMD:', error);
            uiManager.showNotification('Error al importar el archivo .gmd', 'error');
        }
    }

    async importJSON(file) {
        try {
            const text = await file.text();
            const levelData = JSON.parse(text);
            
            // Validar estructura
            if (!levelData.objects || !Array.isArray(levelData.objects)) {
                throw new Error('Formato JSON inválido');
            }

            const userId = auth.currentUser.uid;
            const project = await databaseManager.saveProject(userId, {
                name: levelData.name || file.name.replace('.json', ''),
                difficulty: levelData.difficulty || 'normal',
                objects: levelData.objects,
                settings: levelData.settings || {}
            });

            editor.loadLevel(project.objects, project.name);
            this.showEditor();
            
            uiManager.showNotification('Nivel importado correctamente', 'success');
        } catch (error) {
            console.error('Error importing JSON:', error);
            uiManager.showNotification('Error al importar el archivo JSON', 'error');
        }
    }

    parseGMD(data) {
        // Parser básico para archivos .gmd
        const lines = data.split('\n');
        const levelData = {
            objects: [],
            settings: {},
            name: 'Imported Level'
        };

        for (const line of lines) {
            if (line.startsWith('#')) continue; // Comentarios
            
            const parts = line.split(';');
            if (parts.length < 2) continue;

            const key = parts[0].trim();
            const value = parts[1].trim();

            switch (key) {
                case 'kS1': levelData.name = value; break;
                case 'kS2': levelData.description = value; break;
                case 'kI1': levelData.difficulty = this.mapGMDDifficulty(value); break;
                // Añadir más parsing según el formato GMD
            }
        }

        // Generar objetos básicos basados en los datos
        // Esto es simplificado - en una implementación real necesitarías
        // parsear la estructura completa del formato GMD
        levelData.objects = this.generateBasicObjects();

        return levelData;
    }

    mapGMDDifficulty(value) {
        const difficulties = {
            '0': 'na',
            '10': 'easy',
            '20': 'normal',
            '30': 'hard',
            '40': 'harder',
            '50': 'insane',
            '50+': 'demon'
        };
        return difficulties[value] || 'normal';
    }

    generateBasicObjects() {
        // Generar objetos básicos de ejemplo
        return [
            { id: 1, type: 'block', x: 200, y: 500, size: 30, color: '#00ff88', shape: 'square' },
            { id: 2, type: 'block', x: 230, y: 500, size: 30, color: '#00ff88', shape: 'square' },
            { id: 3, type: 'block', x: 260, y: 500, size: 30, color: '#00ff88', shape: 'square' },
            { id: 4, type: 'spike', x: 350, y: 470, size: 30, color: '#ff4444', shape: 'triangle' }
        ];
    }

    async exportToGMD(levelData) {
        // Generar string GMD
        let gmdContent = '';
        gmdContent += `kS1;${levelData.name || 'Untitled'}\n`;
        gmdContent += `kS2;${levelData.description || ''}\n`;
        gmdContent += `kI1;${this.reverseMapDifficulty(levelData.difficulty)}\n`;
        
        // Exportar objetos
        levelData.objects.forEach((obj, index) => {
            gmdContent += `OBJ;${obj.type};${obj.x};${obj.y};${obj.size}\n`;
        });

        // Descargar archivo
        this.downloadFile(
            `${levelData.name || 'level'}.gmd`,
            gmdContent,
            'text/plain'
        );
    }

    async exportToJSON(levelData) {
        const jsonContent = JSON.stringify(levelData, null, 2);
        this.downloadFile(
            `${levelData.name || 'level'}.json`,
            jsonContent,
            'application/json'
        );
    }

    reverseMapDifficulty(difficulty) {
        const difficulties = {
            'na': '0',
            'easy': '10',
            'normal': '20',
            'hard': '30',
            'harder': '40',
            'insane': '50',
            'demon': '50+'
        };
        return difficulties[difficulty] || '20';
    }

    downloadFile(filename, content, type) {
        const blob = new Blob([content], { type: type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showEditor() {
        document.getElementById('main-screen').classList.add('hidden');
        document.getElementById('editor-screen').classList.remove('hidden');
    }
}

const exportImport = new ExportImportManager();
