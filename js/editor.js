class LevelPlayer {
    constructor() {
        this.canvas = document.getElementById('player-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.player = {
            x: 100,
            y: 300,
            width: 30,
            height: 30,
            vy: 0,
            gravity: 0.8,
            jumpForce: -12,
            isJumping: false,
            rotation: 0
        };
        this.objects = [];
        this.camera = { x: 0, y: 0 };
        this.isPlaying = false;
        this.attempts = 0;
        this.progress = 0;
        this.dead = false;
        
        this.setupCanvas();
        this.setupControls();
    }

    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                e.preventDefault();
                this.jump();
            }
        });

        // Mouse/Touch controls
        this.canvas.addEventListener('click', () => this.jump());
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.jump();
        });
    }

    jump() {
        if (!this.isPlaying || this.dead) return;
        
        if (this.player.y >= this.canvas.height - this.player.height) {
            this.player.vy = this.player.jumpForce;
            this.player.isJumping = true;
        }
    }

    checkCollision(obj) {
        const playerRect = {
            x: this.player.x,
            y: this.player.y,
            width: this.player.width,
            height: this.player.height
        };

        let objRect;
        
        if (obj.shape === 'triangle') {
            // Simplified collision for triangles
            objRect = {
                x: obj.x - obj.size / 2,
                y: obj.y - obj.size / 2,
                width: obj.size,
                height: obj.size
            };
        } else {
            objRect = {
                x: obj.x - obj.size / 2,
                y: obj.y - obj.size / 2,
                width: obj.size,
                height: obj.size
            };
        }

        return (
            playerRect.x < objRect.x + objRect.width &&
            playerRect.x + playerRect.width > objRect.x &&
            playerRect.y < objRect.y + objRect.height &&
            playerRect.y + playerRect.height > objRect.y
        );
    }

    update() {
        if (!this.isPlaying || this.dead) return;

        // Apply gravity
        this.player.vy += this.player.gravity;
        this.player.y += this.player.vy;

        // Ground collision
        if (this.player.y >= this.canvas.height - this.player.height) {
            this.player.y = this.canvas.height - this.player.height;
            this.player.vy = 0;
            this.player.isJumping = false;
        }

        // Ceiling collision
        if (this.player.y <= 0) {
            this.player.y = 0;
            this.player.vy = 0;
        }

        // Camera follow
        this.camera.x = this.player.x - 100;

        // Update rotation
        if (this.player.isJumping) {
            this.player.rotation += 0.1;
        } else {
            this.player.rotation = 0;
        }

        // Check collisions with objects
        for (const obj of this.objects) {
            if (this.checkCollision(obj)) {
                if (obj.type === 'spike' || (obj.type === 'block' && this.player.vy > 0)) {
                    this.die();
                    return;
                }
                
                if (obj.type === 'orb') {
                    this.player.vy = this.player.jumpForce * 1.5;
                }
                
                if (obj.type === 'portal') {
                    // Teleport effect
                    this.player.y = this.canvas.height - 100;
                }

                // Platform collision (only from top)
                if (obj.type === 'block' && 
                    this.player.vy > 0 && 
                    this.player.y - this.player.vy <= obj.y - obj.size / 2) {
                    this.player.y = obj.y - obj.size / 2 - this.player.height;
                    this.player.vy = 0;
                    this.player.isJumping = false;
                }
            }
        }

        // Update progress
        const maxX = Math.max(...this.objects.map(obj => obj.x), 1000);
        this.progress = Math.min((this.player.x / maxX) * 100, 100);
        
        this.updateStats();
    }

    die() {
        this.dead = true;
        this.attempts++;
        setTimeout(() => this.respawn(), 1000);
    }

    respawn() {
        this.player.x = 100;
        this.player.y = 300;
        this.player.vy = 0;
        this.player.rotation = 0;
        this.player.isJumping = false;
        this.dead = false;
        this.camera.x = 0;
        this.progress = 0;
    }

    updateStats() {
        document.getElementById('player-attempts').textContent = 
            `Intentos: ${this.attempts}`;
        document.getElementById('player-progress').textContent = 
            `Progreso: ${Math.floor(this.progress)}%`;
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // Draw ground
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(this.camera.x, this.canvas.height - 20, 
                         this.canvas.width + 200, 20);

        // Draw objects
        this.objects.forEach(obj => {
            this.ctx.fillStyle = obj.color;
            
            if (obj.shape === 'triangle') {
                this.ctx.beginPath();
                this.ctx.moveTo(obj.x, obj.y - obj.size / 2);
                this.ctx.lineTo(obj.x - obj.size / 2, obj.y + obj.size / 2);
                this.ctx.lineTo(obj.x + obj.size / 2, obj.y + obj.size / 2);
                this.ctx.closePath();
                this.ctx.fill();
            } else if (obj.shape === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(obj.x, obj.y, obj.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (obj.shape === 'portal') {
                this.ctx.fillRect(obj.x - obj.size / 2, obj.y - obj.size / 2, 
                                 obj.size, obj.size);
            } else {
                this.ctx.fillRect(obj.x - obj.size / 2, obj.y - obj.size / 2, 
                                 obj.size, obj.size);
            }
        });

        // Draw player
        this.ctx.save();
        this.ctx.translate(this.player.x + this.player.width / 2, 
                          this.player.y + this.player.height / 2);
        this.ctx.rotate(this.player.rotation);
        
        this.ctx.fillStyle = '#00ff88';
        this.ctx.fillRect(-this.player.width / 2, -this.player.height / 2, 
                         this.player.width, this.player.height);
        
        // Draw eyes
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(-5, -10, 10, 10);
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(-2, -7, 4, 4);
        
        this.ctx.restore();

        this.ctx.restore();

        // Draw death effect
        if (this.dead) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    startLevel(objects) {
        this.objects = objects || [];
        this.player = {
            x: 100,
            y: 300,
            width: 30,
            height: 30,
            vy: 0,
            gravity: 0.8,
            jumpForce: -12,
            isJumping: false,
            rotation: 0
        };
        this.attempts = 0;
        this.progress = 0;
        this.dead = false;
        this.isPlaying = true;
        
        document.getElementById('player-screen').classList.remove('hidden');
        this.updateStats();
        
        this.gameLoop();
    }

    stopLevel() {
        this.isPlaying = false;
        document.getElementById('player-screen').classList.add('hidden');
    }

    gameLoop() {
        if (!this.isPlaying) return;

        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    // Añadir al final del archivo editor.js existente:

// Método para actualizar el contador de objetos
updateObjectCount() {
    const count = this.objects.length;
    const nameElement = document.getElementById('editor-level-name');
    if (nameElement) {
        nameElement.textContent = `${this.currentLevelName || 'Nivel'} - ${count} objetos`;
    }
}

// Método para cargar nivel mejorado
loadLevel(objects, name) {
    console.log('Cargando nivel:', name, 'con', objects?.length || 0, 'objetos');
    
    this.objects = Array.isArray(objects) ? [...objects] : [];
    this.currentLevelName = name || 'Sin nombre';
    this.selectedObject = null;
    this.camera = { x: 0, y: 0 };
    this.zoom = 1;
    
    // Actualizar UI
    this.updateObjectCount();
    
    // Ajustar cámara para ver los objetos
    if (this.objects.length > 0) {
        this.fitCameraToObjects();
    }
    
    // Forzar redibujado
    this.resizeCanvas();
    this.render();
    
    console.log('Nivel cargado:', this.objects.length, 'objetos');
}

// Ajustar cámara para mostrar todos los objetos
fitCameraToObjects() {
    if (this.objects.length === 0) return;
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    this.objects.forEach(obj => {
        minX = Math.min(minX, obj.x - obj.size);
        maxX = Math.max(maxX, obj.x + obj.size);
        minY = Math.min(minY, obj.y - obj.size);
        maxY = Math.max(maxY, obj.y + obj.size);
    });
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    this.camera.x = -centerX + this.canvas.width / 2;
    this.camera.y = -centerY + this.canvas.height / 2;
}
}

const player = new LevelPlayer();
