// js/test/level-tester.js
export class LevelTester {
  constructor(containerId, levelData) {
    this.container = document.getElementById(containerId);
    this.levelData = levelData;
    this.canvas = null;
    this.ctx = null;
    this.player = null;
    this.objects = [];
    this.camera = { x: 0, y: 0 };
    this.keys = {};
    this.isPlaying = false;
    this.score = 0;
    this.deaths = 0;
    this.attemptNumber = 1;
    this.practiceMode = false;
    this.showHitboxes = false;
    this.recording = false;
    this.replayData = [];
    this.audioContext = null;
    this.audioBuffer = null;
    this.audioSource = null;
    this.beatMarkers = [];
    
    this.init();
  }

  async init() {
    await this.setupCanvas();
    await this.loadAudio();
    this.loadObjects();
    this.createPlayer();
    this.setupControls();
    this.setupHUD();
    this.startGameLoop();
  }

  async setupCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'testCanvas';
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);
    this.resize();
    
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = this.container.clientWidth;
    this.canvas.height = this.container.clientHeight;
  }

  async loadAudio() {
    if (!this.levelData.audioBase64) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Convertir base64 a ArrayBuffer
      const base64Data = this.levelData.audioBase64.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      this.audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);
      
      // Analizar beats para efectos visuales
      this.analyzeBeats();
      
      // Crear botón de reproducción
      this.createAudioControl();
    } catch (error) {
      console.warn('Error cargando audio:', error);
    }
  }

  analyzeBeats() {
    if (!this.audioBuffer) return;
    
    const channelData = this.audioBuffer.getChannelData(0);
    const sampleRate = this.audioBuffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.05); // 50ms window
    
    let energy = 0;
    const energyHistory = [];
    
    for (let i = 0; i < channelData.length; i += windowSize) {
      let windowEnergy = 0;
      
      for (let j = i; j < Math.min(i + windowSize, channelData.length); j++) {
        windowEnergy += channelData[j] * channelData[j];
      }
      
      windowEnergy /= windowSize;
      energyHistory.push(windowEnergy);
      energy += windowEnergy;
    }
    
    const avgEnergy = energy / energyHistory.length;
    const threshold = avgEnergy * 1.5;
    
    // Detectar beats
    for (let i = 1; i < energyHistory.length; i++) {
      if (energyHistory[i] > threshold && energyHistory[i - 1] <= threshold) {
        this.beatMarkers.push({
          time: (i * windowSize) / sampleRate,
          energy: energyHistory[i]
        });
      }
    }
  }

  createAudioControl() {
    const control = document.createElement('div');
    control.className = 'audio-control';
    control.innerHTML = `
      <button id="playPauseBtn">
        <i class="fas fa-play"></i>
      </button>
      <div class="progress-bar">
        <div class="progress" id="audioProgress"></div>
      </div>
      <span id="audioTime">0:00 / 0:00</span>
      <div class="volume-control">
        <i class="fas fa-volume-up"></i>
        <input type="range" id="volumeSlider" min="0" max="100" value="70">
      </div>
    `;
    
    this.container.appendChild(control);
    this.setupAudioControls();
  }

  setupAudioControls() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    
    playPauseBtn?.addEventListener('click', () => {
      if (this.audioSource) {
        if (this.audioContext.state === 'running') {
          this.audioContext.suspend();
          playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
          this.audioContext.resume();
          playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
      } else {
        this.playAudio();
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
      }
    });
    
    volumeSlider?.addEventListener('input', (e) => {
      if (this.gainNode) {
        this.gainNode.gain.value = e.target.value / 100;
      }
    });
  }

  playAudio() {
    if (!this.audioBuffer || !this.audioContext) return;
    
    this.audioSource = this.audioContext.createBufferSource();
    this.gainNode = this.audioContext.createGain();
    
    this.audioSource.buffer = this.audioBuffer;
    this.audioSource.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
    
    this.audioSource.start(0);
    this.startTime = this.audioContext.currentTime;
    
    this.audioSource.onended = () => {
      this.audioSource = null;
      document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
    };
    
    this.updateAudioProgress();
  }

  updateAudioProgress() {
    if (!this.audioSource) return;
    
    const progress = document.getElementById('audioProgress');
    const timeDisplay = document.getElementById('audioTime');
    
    const update = () => {
      if (!this.audioBuffer || !this.audioContext) return;
      
      const elapsed = this.audioContext.currentTime - this.startTime;
      const duration = this.audioBuffer.duration;
      const percent = (elapsed / duration) * 100;
      
      if (progress) progress.style.width = `${percent}%`;
      if (timeDisplay) {
        timeDisplay.textContent = `${this.formatTime(elapsed)} / ${this.formatTime(duration)}`;
      }
      
      if (elapsed < duration) {
        requestAnimationFrame(update);
      }
    };
    
    requestAnimationFrame(update);
  }

  loadObjects() {
    this.objects = this.levelData.objects.map(obj => ({
      ...obj,
      originalX: obj.x,
      originalY: obj.y,
      active: true,
      hit: false,
      animationState: 0
    }));
  }

  createPlayer() {
    this.player = {
      x: 100,
      y: 300,
      width: 30,
      height: 30,
      velocityX: 0,
      velocityY: 0,
      onGround: true,
      gravity: 0.5,
      jumpForce: -10,
      speed: this.levelData.gameData?.speed || 0.8,
      isAlive: true,
      mode: 'cube', // cube, ship, ball, ufo, wave, robot, spider
      rotation: 0,
      trailPositions: [],
      dashCooldown: 0,
      effects: []
    };
    
    this.camera = { x: 0, y: 0 };
  }

  setupControls() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        this.handleJump();
      }
      
      if (e.code === 'KeyP') {
        this.togglePause();
      }
      
      if (e.code === 'KeyR') {
        this.resetLevel();
      }
      
      if (e.code === 'KeyH') {
        this.showHitboxes = !this.showHitboxes;
      }
    });
    
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    
    // Controles táctiles
    this.setupTouchControls();
  }

  setupTouchControls() {
    const touchArea = document.createElement('div');
    touchArea.className = 'touch-controls';
    touchArea.innerHTML = `
      <button id="touchJump" class="touch-btn">
        <i class="fas fa-arrow-up"></i>
      </button>
      <button id="touchPause" class="touch-btn">
        <i class="fas fa-pause"></i>
      </button>
    `;
    
    this.container.appendChild(touchArea);
    
    document.getElementById('touchJump')?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleJump();
    });
    
    document.getElementById('touchPause')?.addEventListener('click', () => {
      this.togglePause();
    });
  }

  handleJump() {
    if (!this.player.isAlive) return;
    
    switch (this.player.mode) {
      case 'cube':
        if (this.player.onGround) {
          this.player.velocityY = this.player.jumpForce;
          this.player.onGround = false;
          this.createJumpEffect();
        }
        break;
        
      case 'ship':
        this.player.velocityY = -5;
        break;
        
      case 'ball':
        if (this.player.onGround) {
          this.player.gravity = -this.player.gravity;
        }
        break;
        
      case 'ufo':
        if (this.player.onGround) {
          this.player.velocityY = -8;
          this.player.onGround = false;
        }
        break;
    }
    
    if (this.recording) {
      this.replayData.push({
        time: performance.now(),
        action: 'jump',
        position: { ...this.player }
      });
    }
  }

  createJumpEffect() {
    for (let i = 0; i < 10; i++) {
      this.player.effects.push({
        type: 'particle',
        x: this.player.x,
        y: this.player.y + this.player.height,
        velocityX: (Math.random() - 0.5) * 4,
        velocityY: -Math.random() * 5,
        life: 1,
        color: '#ffd93d'
      });
    }
  }

  startGameLoop() {
    let lastTime = 0;
    
    const loop = (currentTime) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;
      
      if (this.isPlaying) {
        this.update(deltaTime);
      }
      
      this.render();
      
      if (this.player.isAlive) {
        requestAnimationFrame(loop);
      }
    };
    
    this.isPlaying = true;
    requestAnimationFrame(loop);
  }

  update(deltaTime) {
    // Actualizar jugador
    this.updatePlayer(deltaTime);
    
    // Actualizar cámara
    this.updateCamera();
    
    // Verificar colisiones
    this.checkCollisions();
    
    // Actualizar efectos
    this.updateEffects(deltaTime);
    
    // Verificar muerte
    this.checkDeath();
    
    // Actualizar score
    this.updateScore();
    
    // Verificar beats
    this.checkBeats();
  }

  updatePlayer(deltaTime) {
    if (!this.player.isAlive) return;
    
    // Gravedad
    this.player.velocityY += this.player.gravity;
    
    // Movimiento
    this.player.velocityX = this.player.speed * 300;
    
    // Actualizar posición
    this.player.x += this.player.velocityX * deltaTime;
    this.player.y += this.player.velocityY * deltaTime;
    
    // Rotación (modo cube)
    if (this.player.mode === 'cube') {
      if (!this.player.onGround) {
        this.player.rotation += 5 * deltaTime;
      } else {
        this.player.rotation = Math.round(this.player.rotation / 90) * 90;
      }
    }
    
    // Trail
    if (Math.abs(this.player.velocityX) > 0) {
      this.player.trailPositions.push({
        x: this.player.x,
        y: this.player.y,
        alpha: 1
      });
      
      if (this.player.trailPositions.length > 20) {
        this.player.trailPositions.shift();
      }
    }
    
    // Enfriamiento de dash
    if (this.player.dashCooldown > 0) {
      this.player.dashCooldown -= deltaTime;
    }
  }

  updateCamera() {
    const targetX = this.player.x - this.canvas.width / 3;
    const targetY = 300 - this.canvas.height / 2;
    
    this.camera.x += (targetX - this.camera.x) * 0.1;
    this.camera.y += (targetY - this.camera.y) * 0.1;
  }

  checkCollisions() {
    this.objects.forEach(obj => {
      if (!obj.active) return;
      
      if (this.checkAABB(this.player, obj)) {
        this.handleCollision(obj);
      }
    });
  }

  checkAABB(a, b) {
    // Ajustar hitboxes para mejor gameplay
    const margin = 5;
    return (
      a.x + margin < b.x + b.width - margin &&
      a.x + a.width - margin > b.x + margin &&
      a.y + margin < b.y + b.height - margin &&
      a.y + a.height - margin > b.y + margin
    );
  }

  handleCollision(obj) {
    switch (obj.type) {
      case 'block':
        this.handleBlockCollision(obj);
        break;
      case 'spike':
        this.player.isAlive = false;
        this.deaths++;
        obj.hit = true;
        break;
      case 'orb':
        this.handleOrbCollision(obj);
        break;
      case 'portal':
        this.handlePortalCollision(obj);
        break;
      case 'speedPortal':
        this.player.speed = obj.properties.speed;
        break;
    }
  }

  handleBlockCollision(obj) {
    // Colisión con plataformas
    const playerBottom = this.player.y + this.player.height;
    const playerTop = this.player.y;
    const objBottom = obj.y + obj.height;
    const objTop = obj.y;
    
    const overlapBottom = playerBottom - objTop;
    const overlapTop = objBottom - playerTop;
    const overlapLeft = (this.player.x + this.player.width) - obj.x;
    const overlapRight = (obj.x + obj.width) - this.player.x;
    
    const minOverlapY = Math.min(overlapBottom, overlapTop);
    const minOverlapX = Math.min(overlapLeft, overlapRight);
    
    if (minOverlapY < minOverlapX) {
      // Colisión vertical
      if (overlapBottom < overlapTop && this.player.velocityY > 0) {
        // Cayendo sobre el bloque
        this.player.y = obj.y - this.player.height;
        this.player.velocityY = 0;
        this.player.onGround = true;
      } else if (overlapTop < overlapBottom && this.player.velocityY < 0) {
        // Golpeando desde abajo
        this.player.y = obj.y + obj.height;
        this.player.velocityY = 0;
      }
    }
  }

  handleOrbCollision(obj) {
    const orbType = obj.properties?.orbType || 'jump';
    
    switch (orbType) {
      case 'jump':
        this.player.velocityY = this.player.jumpForce * 1.2;
        this.player.onGround = false;
        break;
      case 'gravity':
        this.player.gravity = -this.player.gravity;
        break;
      case 'speed':
        this.player.velocityX = this.player.speed * 500 * 1.5;
        this.player.dashCooldown = 0.5;
        break;
    }
    
    obj.active = false;
    
    // Efecto visual
    for (let i = 0; i < 20; i++) {
      this.player.effects.push({
        type: 'orbParticle',
        x: obj.x,
        y: obj.y,
        velocityX: (Math.random() - 0.5) * 8,
        velocityY: (Math.random() - 0.5) * 8,
        life: 1,
        color: obj.color
      });
    }
  }

  handlePortalCollision(obj) {
    const portalType = obj.properties?.portalType || 'cube';
    
    this.player.mode = portalType;
    
    // Cambiar física según modo
    switch (portalType) {
      case 'ship':
        this.player.gravity = 0.3;
        break;
      case 'ball':
        this.player.gravity = 0.8;
        break;
      case 'ufo':
        this.player.gravity = 0.6;
        break;
      default:
        this.player.gravity = 0.5;
    }
    
    obj.active = false;
  }

  updateEffects(deltaTime) {
    this.player.effects = this.player.effects.filter(effect => {
      effect.x += effect.velocityX * deltaTime;
      effect.y += effect.velocityY * deltaTime;
      effect.life -= deltaTime * 2;
      return effect.life > 0;
    });
  }

  checkDeath() {
    if (!this.player.isAlive) {
      if (this.practiceMode) {
        // Respawn en modo práctica
        setTimeout(() => {
          this.respawn();
        }, 500);
      } else {
        this.showDeathScreen();
      }
    }
    
    // Caer del mapa
    if (this.player.y > 800) {
      this.player.isAlive = false;
    }
  }

  respawn() {
    this.createPlayer();
    this.objects.forEach(obj => {
      obj.active = true;
      obj.hit = false;
    });
  }

  showDeathScreen() {
    const deathScreen = document.createElement('div');
    deathScreen.className = 'death-screen';
    deathScreen.innerHTML = `
      <div class="death-content">
        <h2>¡Has Muerto!</h2>
        <p>Intento #${this.attemptNumber}</p>
        <p>Progreso: ${Math.floor(this.player.x / 100)}%</p>
        <p>Muertes: ${this.deaths}</p>
        <div class="death-buttons">
          <button class="btn btn-primary" id="retryBtn">
            <i class="fas fa-redo"></i> Reintentar
          </button>
          <button class="btn btn-secondary" id="menuBtn">
            <i class="fas fa-home"></i> Menú
          </button>
        </div>
      </div>
    `;
    
    this.container.appendChild(deathScreen);
    
    document.getElementById('retryBtn')?.addEventListener('click', () => {
      deathScreen.remove();
      this.attemptNumber++;
      this.respawn();
    });
    
    document.getElementById('menuBtn')?.addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  }

  updateScore() {
    this.score = Math.floor(this.player.x / 10);
    
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
      scoreElement.textContent = this.score;
    }
  }

  checkBeats() {
    if (!this.audioContext || !this.audioSource) return;
    
    const currentTime = this.audioContext.currentTime - this.startTime;
    
    this.beatMarkers.forEach(beat => {
      if (Math.abs(beat.time - currentTime) < 0.05) {
        this.onBeat(beat);
      }
    });
  }

  onBeat(beat) {
    // Efecto visual de beat
    const intensity = beat.energy / 0.1;
    this.player.effects.push({
      type: 'beat',
      x: this.player.x,
      y: this.player.y,
      radius: 50 * intensity,
      life: 0.5
    });
    
    // Mover objetos al ritmo
    this.objects.forEach(obj => {
      if (obj.properties?.reactive) {
        obj.y = obj.originalY - 10 * intensity;
      }
    });
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Fondo
    this.ctx.fillStyle = this.levelData.gameData?.backgroundColor || '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Grid
    this.drawGrid();
    
    // Aplicar cámara
    this.ctx.save();
    this.ctx.translate(-this.camera.x, -this.camera.y);
    
    // Suelo
    this.drawGround();
    
    // Objetos
    this.objects.forEach(obj => this.drawObject(obj));
    
    // Jugador
    this.drawPlayer();
    
    // Efectos
    this.player.effects.forEach(effect => this.drawEffect(effect));
    
    this.ctx.restore();
    
    // HUD
    this.drawHUD();
  }

  drawGrid() {
    const gridSize = 40;
    const startX = -(this.camera.x % gridSize);
    const startY = -(this.camera.y % gridSize);
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    this.ctx.lineWidth = 1;
    
    for (let x = startX; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    
    for (let y = startY; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  drawGround() {
    const groundY = 330;
    this.ctx.fillStyle = this.levelData.gameData?.groundColor || '#16213e';
    this.ctx.fillRect(-5000, groundY, 10000, 500);
    
    // Línea de suelo
    this.ctx.strokeStyle = '#0f3460';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(-5000, groundY);
    this.ctx.lineTo(5000, groundY);
    this.ctx.stroke();
  }

  drawObject(obj) {
    if (!obj.active) return;
    
    if (this.showHitboxes && obj.type !== 'decoration') {
      this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    }
    
    this.ctx.save();
    
    if (obj.hit) {
      this.ctx.globalAlpha = 0.5;
    }
    
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
    }
    
    this.ctx.restore();
  }

  drawBlock(obj) {
    // Sombra
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(obj.x + 3, obj.y + 3, obj.width, obj.height);
    
    // Bloque principal
    this.ctx.fillStyle = obj.color || '#e94560';
    this.ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    
    // Borde
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    
    // Highlight
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.fillRect(obj.x, obj.y, obj.width, 3);
  }

  drawSpike(obj) {
    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.beginPath();
    this.ctx.moveTo(obj.x, obj.y + obj.height);
    this.ctx.lineTo(obj.x + obj.width / 2, obj.y);
    this.ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Brillo
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.moveTo(obj.x + 5, obj.y + obj.height);
    this.ctx.lineTo(obj.x + obj.width / 2, obj.y + 5);
    this.ctx.lineTo(obj.x + obj.width / 2, obj.y + obj.height);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawOrb(obj) {
    // Glow
    const gradient = this.ctx.createRadialGradient(
      obj.x + obj.radius, obj.y + obj.radius, 0,
      obj.x + obj.radius, obj.y + obj.radius, obj.radius * 2
    );
    gradient.addColorStop(0, obj.color + '80');
    gradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(obj.x + obj.radius, obj.y + obj.radius, obj.radius * 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Orb
    this.ctx.fillStyle = obj.color;
    this.ctx.beginPath();
    this.ctx.arc(obj.x + obj.radius, obj.y + obj.radius, obj.radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Brillo
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.beginPath();
    this.ctx.arc(obj.x + obj.radius - 3, obj.y + obj.radius - 3, obj.radius * 0.3, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Icono
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      obj.properties?.orbType === 'jump' ? '↑' :
      obj.properties?.orbType === 'gravity' ? '↕' : '→',
      obj.x + obj.radius,
      obj.y + obj.radius + 4
    );
  }

  drawPortal(obj) {
    // Efecto portal
    const gradient = this.ctx.createLinearGradient(obj.x, obj.y, obj.x + obj.width, obj.y);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.5, obj.color);
    gradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
  }

  drawPlayer() {
    if (!this.player.isAlive) return;
    
    this.ctx.save();
    this.ctx.translate(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
    this.ctx.rotate(this.player.rotation * Math.PI / 180);
    
    // Trail
    this.player.trailPositions.forEach((pos, i) => {
      this.ctx.globalAlpha = i / this.player.trailPositions.length * 0.5;
      this.ctx.fillStyle = '#00d2ff';
      this.ctx.fillRect(
        pos.x - this.player.x - this.player.width / 2,
        pos.y - this.player.y - this.player.height / 2,
        this.player.width,
        this.player.height
      );
    });
    
    this.ctx.globalAlpha = 1;
    
    // Cuerpo
    this.ctx.fillStyle = '#00d2ff';
    this.ctx.fillRect(-this.player.width / 2, -this.player.height / 2, this.player.width, this.player.height);
    
    // Borde
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(-this.player.width / 2, -this.player.height / 2, this.player.width, this.player.height);
    
    // Ojos
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(-8, -8, 6, 6);
    this.ctx.fillRect(2, -8, 6, 6);
    
    // Pupilas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(-6, -6, 3, 3);
    this.ctx.fillRect(4, -6, 3, 3);
    
    this.ctx.restore();
  }

  drawEffect(effect) {
    this.ctx.globalAlpha = effect.life;
    
    switch (effect.type) {
      case 'particle':
        this.ctx.fillStyle = effect.color;
        this.ctx.fillRect(effect.x, effect.y, 4, 4);
        break;
        
      case 'orbParticle':
        this.ctx.fillStyle = effect.color;
        this.ctx.beginPath();
        this.ctx.arc(effect.x, effect.y, 3, 0, Math.PI * 2);
        this.ctx.fill();
        break;
        
      case 'beat':
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(effect.x, effect.y, effect.radius * effect.life, 0, Math.PI * 2);
        this.ctx.stroke();
        break;
    }
    
    this.ctx.globalAlpha = 1;
  }

  setupHUD() {
    const hud = document.createElement('div');
    hud.className = 'game-hud';
    hud.innerHTML = `
      <div class="hud-top">
        <div class="hud-item">
          <i class="fas fa-star"></i>
          <span id="score">0</span>
        </div>
        <div class="hud-item">
          <i class="fas fa-skull"></i>
          <span id="deaths">0</span>
        </div>
        <div class="hud-item">
          <i class="fas fa-tachometer-alt"></i>
          <span id="speed">1x</span>
        </div>
      </div>
      <div class="hud-bottom">
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress" id="levelProgress"></div>
          </div>
          <span id="progressPercent">0%</span>
        </div>
      </div>
    `;
    
    this.container.appendChild(hud);
  }

  drawHUD() {
    const progress = Math.min((this.player.x / 5000) * 100, 100);
    const progressBar = document.getElementById('levelProgress');
    const progressPercent = document.getElementById('progressPercent');
    
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressPercent) progressPercent.textContent = `${Math.floor(progress)}%`;
    
    const speedElement = document.getElementById('speed');
    if (speedElement) speedElement.textContent = `${this.player.speed.toFixed(1)}x`;
    
    const deathsElement = document.getElementById('deaths');
    if (deathsElement) deathsElement.textContent = this.deaths;
  }

  togglePause() {
    this.isPlaying = !this.isPlaying;
    
    if (!this.isPlaying) {
      this.showPauseMenu();
    } else {
      const pauseMenu = document.querySelector('.pause-menu');
      pauseMenu?.remove();
    }
  }

  showPauseMenu() {
    const menu = document.createElement('div');
    menu.className = 'pause-menu';
    menu.innerHTML = `
      <div class="pause-content">
        <h2>Pausa</h2>
        <button class="btn btn-primary" id="resumeBtn">
          <i class="fas fa-play"></i> Continuar
        </button>
        <button class="btn btn-secondary" id="restartBtn">
          <i class="fas fa-redo"></i> Reiniciar
        </button>
        <button class="btn btn-secondary" id="practiceBtn">
          <i class="fas fa-graduation-cap"></i> Modo Práctica
        </button>
        <button class="btn btn-secondary" id="quitBtn">
          <i class="fas fa-door-open"></i> Salir
        </button>
      </div>
    `;
    
    this.container.appendChild(menu);
    
    document.getElementById('resumeBtn')?.addEventListener('click', () => {
      menu.remove();
      this.isPlaying = true;
    });
    
    document.getElementById('restartBtn')?.addEventListener('click', () => {
      menu.remove();
      this.resetLevel();
    });
    
    document.getElementById('practiceBtn')?.addEventListener('click', () => {
      this.practiceMode = true;
      menu.remove();
      this.isPlaying = true;
    });
    
    document.getElementById('quitBtn')?.addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  }

  resetLevel() {
    this.createPlayer();
    this.score = 0;
    this.camera = { x: 0, y: 0 };
    this.objects.forEach(obj => {
      obj.active = true;
      obj.hit = false;
    });
    this.isPlaying = true;
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// Inicializar tester
if (document.getElementById('testContainer')) {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  
  // Cargar datos del proyecto
  fetch(`/api/projects/${projectId}`)
    .then(res => res.json())
    .then(data => {
      new LevelTester('testContainer', data);
    });
}
