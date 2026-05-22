// js/editor/editor-canvas.js
export class EditorCanvas {
  constructor(canvas, gameData) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = new Camera(gameData?.camera || { x: 0, y: 0, zoom: 1 });
    this.backgroundColor = gameData?.backgroundColor || '#1a1a2e';
    this.groundColor = gameData?.groundColor || '#16213e';
    this.gridSize = 30;
    this.resize();
    
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = this.canvas.parentElement.clientHeight;
  }

  render(objects) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Background
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Grid
    this.drawGrid();
    
    // Apply camera
    this.ctx.save();
    this.ctx.translate(
      this.canvas.width / 2 - this.camera.x * this.camera.zoom,
      this.canvas.height / 2 - this.camera.y * this.camera.zoom
    );
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    
    // Draw ground
    this.drawGround();
    
    // Draw objects
    objects.forEach(obj => this.drawObject(obj));
    
    this.ctx.restore();
  }

  drawGrid() {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    
    const startX = -(this.camera.x % this.gridSize) * this.camera.zoom + this.canvas.width / 2;
    const startY = -(this.camera.y % this.gridSize) * this.camera.zoom + this.canvas.height / 2;
    
    for (let x = startX; x < this.canvas.width; x += this.gridSize * this.camera.zoom) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    
    for (let y = startY; y < this.canvas.height; y += this.gridSize * this.camera.zoom) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  drawGround() {
    this.ctx.fillStyle = this.groundColor;
    this.ctx.fillRect(-5000, 300, 10000, 500);
    
    this.ctx.strokeStyle = '#0f3460';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(-5000, 300);
    this.ctx.lineTo(5000, 300);
    this.ctx.stroke();
  }

  drawObject(obj) {
    switch (obj.type) {
      case 'block':
        this.drawBlock(obj);
        break;
      case 'spike':
        this.drawSpike(obj);
        break;
      case 'orb':
        this.drawOrb(obj);
        break;
      case 'portal':
        this.drawPortal(obj);
        break;
      case 'player':
        this.drawPlayer(obj);
        break;
    }
  }

  drawBlock(obj) {
    this.ctx.fillStyle = obj.color || '#e94560';
    this.ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
  }

  drawSpike(obj) {
    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.beginPath();
    this.ctx.moveTo(obj.x, obj.y + obj.height);
    this.ctx.lineTo(obj.x + obj.width / 2, obj.y);
    this.ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawOrb(obj) {
    this.ctx.fillStyle = obj.color || '#ffd93d';
    this.ctx.beginPath();
    this.ctx.arc(obj.x + obj.radius, obj.y + obj.radius, obj.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  drawPortal(obj) {
    this.ctx.fillStyle = obj.color || '#6c5ce7';
    this.ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    
    // Portal effect
    const gradient = this.ctx.createLinearGradient(obj.x, obj.y, obj.x + obj.width, obj.y + obj.height);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
  }

  drawPlayer(obj) {
    // Player cube
    this.ctx.fillStyle = '#00d2ff';
    this.ctx.fillRect(obj.x, obj.y, 30, 30);
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(obj.x, obj.y, 30, 30);
    
    // Player face
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(obj.x + 8, obj.y + 8, 6, 6);
    this.ctx.fillRect(obj.x + 16, obj.y + 8, 6, 6);
  }

  exportGameData() {
    return {
      camera: {
        x: this.camera.x,
        y: this.camera.y,
        zoom: this.camera.zoom
      },
      backgroundColor: this.backgroundColor,
      groundColor: this.groundColor
    };
  }
}

class Camera {
  constructor(config) {
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.zoom = config.zoom || 1;
    this.target = null;
  }

  follow(target) {
    if (target) {
      this.x += (target.x - this.x) * 0.1;
      this.y += (target.y - this.y) * 0.1;
    }
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
  }
}
