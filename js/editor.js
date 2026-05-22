// Editor de Niveles - Se inicializa inmediatamente
const Editor = (function() {
    let canvas = null;
    let ctx = null;
    let objects = [];
    let selectedObject = null;
    let currentTool = 'select';
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let camera = { x: 0, y: 0 };
    let gridSize = 30;
    let zoom = 1;
    let currentLevelName = 'Sin nombre';
    let gameLoopId = null;
    let initialized = false;

    function init() {
        if (initialized) return;
        
        canvas = document.getElementById('editor-canvas');
        if (!canvas) {
            console.log('Canvas del editor no encontrado, reintentando...');
            setTimeout(init, 100);
            return;
        }
        
        ctx = canvas.getContext('2d');
        setupCanvas();
        setupEventListeners();
        startGameLoop();
        initialized = true;
        console.log('Editor inicializado correctamente');
    }

    function setupCanvas() {
        if (!canvas) return;
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    function resizeCanvas() {
        if (!canvas) return;
        const container = canvas.parentElement;
        if (container) {
            canvas.width = container.clientWidth || 800;
            canvas.height = container.clientHeight || 600;
        }
    }

    function setupEventListeners() {
        if (!canvas) return;

        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('contextmenu', e => e.preventDefault());
        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd);
    }

    function getMousePos(e) {
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / zoom - camera.x,
            y: (e.clientY - rect.top) / zoom - camera.y
        };
    }

    function snapToGrid(pos) {
        return {
            x: Math.round(pos.x / gridSize) * gridSize,
            y: Math.round(pos.y / gridSize) * gridSize
        };
    }

    function onMouseDown(e) {
        const pos = getMousePos(e);
        
        if (currentTool === 'select') {
            selectedObject = getObjectAtPosition(pos);
            if (selectedObject) {
                isDragging = true;
                dragStart = { ...pos };
            }
        } else if (currentTool === 'erase') {
            const obj = getObjectAtPosition(pos);
            if (obj) removeObject(obj);
        } else {
            addObject(currentTool, snapToGrid(pos));
        }
    }

    function onMouseMove(e) {
        const pos = getMousePos(e);
        
        if (isDragging && selectedObject) {
            selectedObject.x += pos.x - dragStart.x;
            selectedObject.y += pos.y - dragStart.y;
            dragStart = { ...pos };
        }
    }

    function onMouseUp(e) {
        isDragging = false;
    }

    function onWheel(e) {
        e.preventDefault();
        zoom *= e.deltaY > 0 ? 0.9 : 1.1;
        zoom = Math.max(0.1, Math.min(5, zoom));
    }

    function onTouchStart(e) {
        e.preventDefault();
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            onMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }

    function onTouchMove(e) {
        e.preventDefault();
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }

    function onTouchEnd(e) {
        e.preventDefault();
        onMouseUp({});
    }

    function addObject(type, pos) {
        const types = {
            'block': { color: '#00ff88', size: 30, shape: 'square' },
            'spike': { color: '#ff4444', size: 30, shape: 'triangle' },
            'orb': { color: '#ffaa00', size: 20, shape: 'circle' },
            'portal': { color: '#4488ff', size: 30, shape: 'portal' }
        };

        if (!types[type]) return;

        objects.push({
            id: Date.now() + Math.random(),
            type: type,
            x: pos.x,
            y: pos.y,
            ...types[type]
        });
        
        updateObjectCount();
    }

    function removeObject(obj) {
        objects = objects.filter(o => o !== obj);
        if (selectedObject === obj) selectedObject = null;
        updateObjectCount();
    }

    function getObjectAtPosition(pos) {
        for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            const halfSize = obj.size / 2;
            if (pos.x >= obj.x - halfSize && pos.x <= obj.x + halfSize &&
                pos.y >= obj.y - halfSize && pos.y <= obj.y + halfSize) {
                return obj;
            }
        }
        return null;
    }

    function updateObjectCount() {
        const nameElement = document.getElementById('editor-level-name');
        if (nameElement) {
            nameElement.textContent = `${currentLevelName} - ${objects.length} objetos`;
        }
    }

    function drawGrid() {
        if (!ctx || !canvas) return;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        const startX = -camera.x % gridSize;
        const startY = -camera.y % gridSize;

        for (let x = startX; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        for (let y = startY; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }

    function drawObject(obj) {
        if (!ctx) return;
        
        ctx.fillStyle = obj.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        if (obj.shape === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(obj.x, obj.y - obj.size / 2);
            ctx.lineTo(obj.x - obj.size / 2, obj.y + obj.size / 2);
            ctx.lineTo(obj.x + obj.size / 2, obj.y + obj.size / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (obj.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, obj.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (obj.shape === 'portal') {
            ctx.fillRect(obj.x - obj.size / 2, obj.y - obj.size / 2, obj.size, obj.size);
            ctx.strokeRect(obj.x - obj.size / 2, obj.y - obj.size / 2, obj.size, obj.size);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, obj.size / 4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(obj.x - obj.size / 2, obj.y - obj.size / 2, obj.size, obj.size);
            ctx.strokeRect(obj.x - obj.size / 2, obj.y - obj.size / 2, obj.size, obj.size);
        }

        if (selectedObject === obj) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(obj.x - obj.size / 2 - 5, obj.y - obj.size / 2 - 5, obj.size + 10, obj.size + 10);
        }
    }

    function render() {
        if (!ctx || !canvas) return;
        
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.scale(zoom, zoom);
        drawGrid();
        objects.forEach(drawObject);
        ctx.restore();
    }

    function gameLoop() {
        render();
        gameLoopId = requestAnimationFrame(gameLoop);
    }

    function startGameLoop() {
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        gameLoop();
    }

    function loadLevel(newObjects, name) {
        console.log('Editor: Cargando nivel:', name, 'Objetos:', newObjects?.length || 0);
        objects = Array.isArray(newObjects) ? [...newObjects] : [];
        currentLevelName = name || 'Sin nombre';
        selectedObject = null;
        camera = { x: 0, y: 0 };
        zoom = 1;
        updateObjectCount();
        
        if (objects.length > 0) {
            fitCameraToObjects();
        }
        
        resizeCanvas();
        console.log('Editor: Nivel cargado con', objects.length, 'objetos');
    }

    function fitCameraToObjects() {
        if (objects.length === 0 || !canvas) return;
        
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        objects.forEach(obj => {
            minX = Math.min(minX, obj.x - obj.size);
            maxX = Math.max(maxX, obj.x + obj.size);
            minY = Math.min(minY, obj.y - obj.size);
            maxY = Math.max(maxY, obj.y + obj.size);
        });
        
        camera.x = -(minX + maxX) / 2 + canvas.width / 2;
        camera.y = -(minY + maxY) / 2 + canvas.height / 2;
    }

    function setTool(tool) {
        currentTool = tool;
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
    }

    function getLevelData() {
        return {
            objects: objects,
            settings: { gridSize, camera, zoom }
        };
    }

    function calculateDuration() {
        if (objects.length === 0) return 0;
        const maxX = Math.max(...objects.map(obj => obj.x));
        return Math.max(1, Math.ceil(maxX / 300));
    }

    // Iniciar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // API pública
    return {
        loadLevel,
        setTool,
        getLevelData,
        calculateDuration,
        get currentLevelName() { return currentLevelName; },
        set currentLevelName(name) { currentLevelName = name; updateObjectCount(); },
        resizeCanvas,
        updateObjectCount
    };
})();

// Exponer globalmente
window.editor = Editor;
console.log('Editor module loaded');
