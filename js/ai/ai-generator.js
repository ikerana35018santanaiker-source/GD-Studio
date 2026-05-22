// js/ai/ai-generator.js
import { DatabaseService } from '../database/database-service.js';

export class AIGenerator {
  constructor() {
    this.difficultyProfiles = {
      easy: {
        speed: 0.5,
        density: 0.2,
        jumpForce: -12,
        maxGaps: 60,
        spikeChance: 0.3,
        orbChance: 0.4,
        portalChance: 0.1,
        colorScheme: ['#00e676', '#69f0ae', '#b9f6ca'],
        groundSegments: { min: 5, max: 10 },
        blockHeight: { min: 30, max: 60 }
      },
      normal: {
        speed: 0.8,
        density: 0.35,
        jumpForce: -11,
        maxGaps: 45,
        spikeChance: 0.45,
        orbChance: 0.5,
        portalChance: 0.2,
        colorScheme: ['#ffd93d', '#ff9800', '#ffc107'],
        groundSegments: { min: 3, max: 7 },
        blockHeight: { min: 30, max: 90 }
      },
      hard: {
        speed: 1.0,
        density: 0.5,
        jumpForce: -10,
        maxGaps: 35,
        spikeChance: 0.6,
        orbChance: 0.55,
        portalChance: 0.3,
        colorScheme: ['#e94560', '#ff5252', '#d32f2f'],
        groundSegments: { min: 2, max: 5 },
        blockHeight: { min: 40, max: 120 }
      },
      harder: {
        speed: 1.2,
        density: 0.65,
        jumpForce: -9,
        maxGaps: 25,
        spikeChance: 0.75,
        orbChance: 0.6,
        portalChance: 0.4,
        colorScheme: ['#9c27b0', '#e040fb', '#7b1fa2'],
        groundSegments: { min: 1, max: 4 },
        blockHeight: { min: 50, max: 150 }
      },
      insane: {
        speed: 1.5,
        density: 0.8,
        jumpForce: -8,
        maxGaps: 20,
        spikeChance: 0.85,
        orbChance: 0.7,
        portalChance: 0.5,
        colorScheme: ['#ff1744', '#f50057', '#c51162'],
        groundSegments: { min: 1, max: 3 },
        blockHeight: { min: 60, max: 180 }
      },
      demon: {
        speed: 2.0,
        density: 0.95,
        jumpForce: -7,
        maxGaps: 15,
        spikeChance: 0.95,
        orbChance: 0.85,
        portalChance: 0.7,
        colorScheme: ['#ff0000', '#d50000', '#b71c1c'],
        groundSegments: { min: 1, max: 2 },
        blockHeight: { min: 80, max: 200 }
      }
    };

    this.patterns = {
      staircase: (x, y, params) => this.generateStaircase(x, y, params),
      wave: (x, y, params) => this.generateWave(x, y, params),
      corridor: (x, y, params) => this.generateCorridor(x, y, params),
      spider: (x, y, params) => this.generateSpider(x, y, params),
      memory: (x, y, params) => this.generateMemory(x, y, params),
      sync: (x, y, params) => this.generateSync(x, y, params)
    };

    this.currentSection = 0;
    this.sections = [];
  }

  async generateLevel(projectId, options) {
    const {
      difficulty = 'normal',
      length = 60, // segundos
      audioAnalysis = null,
      style = 'mixed'
    } = options;

    const profile = this.difficultyProfiles[difficulty];
    const objects = [];
    let currentX = 100;
    const groundY = 300;
    
    // Generar secciones basadas en el audio
    const sections = audioAnalysis 
      ? this.analyzeAudioSections(audioAnalysis, length)
      : this.generateDefaultSections(length, profile);

    // Generar objetos por sección
    for (const section of sections) {
      const sectionObjects = await this.generateSection(
        currentX, 
        groundY, 
        section, 
        profile,
        style
      );
      
      objects.push(...sectionObjects);
      currentX += section.width;
    }

    // Añadir decoraciones
    const decoratedObjects = this.addDecorations(objects, profile);
    
    // Añadir portales de velocidad
    const objectsWithPortals = this.addSpeedPortals(decoratedObjects, profile);
    
    // Verificar jugabilidad
    const playableObjects = this.verifyPlayability(objectsWithPortals, profile);

    // Generar thumbnail
    const thumbnail = this.generateThumbnail(playableObjects, profile);

    // Guardar en base de datos
    const dbService = new DatabaseService(auth.currentUser.uid);
    const project = {
      title: options.name || `Nivel IA - ${difficulty}`,
      difficulty: difficulty,
      objects: playableObjects,
      duration: length,
      isAIGenerated: true,
      thumbnail: thumbnail,
      audioBase64: options.audioBase64,
      newgroundsId: options.newgroundsId,
      gameData: {
        camera: { x: 0, y: 0, zoom: 1 },
        backgroundColor: profile.colorScheme[2] || '#1a1a2e',
        groundColor: this.darkenColor(profile.colorScheme[0]),
        gravity: 0.5,
        speed: profile.speed
      },
      aiMetadata: {
        seed: Math.random().toString(36).substring(7),
        sections: sections.length,
        patterns: Object.keys(this.patterns).length,
        generationDate: new Date().toISOString()
      }
    };

    return await dbService.saveProject(project);
  }

  analyzeAudioSections(audioAnalysis, length) {
    // Análisis básico de audio si está disponible
    if (!audioAnalysis || !audioAnalysis.beats) {
      return this.generateDefaultSections(length, null);
    }

    const sections = [];
    let currentTime = 0;
    
    for (const beat of audioAnalysis.beats) {
      const section = {
        startTime: currentTime,
        duration: beat.duration || 2,
        intensity: beat.intensity || 0.5,
        pattern: this.selectPatternForIntensity(beat.intensity),
        width: (beat.duration || 2) * 800 * (beat.intensity || 0.5)
      };
      sections.push(section);
      currentTime += section.duration;
      
      if (currentTime >= length) break;
    }

    return sections;
  }

  generateDefaultSections(length, profile) {
    const sections = [];
    const sectionDuration = 3 + Math.random() * 4;
    const totalSections = Math.floor(length / sectionDuration);
    
    for (let i = 0; i < totalSections; i++) {
      const intensity = Math.min(0.3 + (i / totalSections) * 0.7, 1);
      sections.push({
        startTime: i * sectionDuration,
        duration: sectionDuration,
        intensity: intensity,
        pattern: this.selectPatternForIntensity(intensity),
        width: sectionDuration * 800 * intensity
      });
    }
    
    return sections;
  }

  selectPatternForIntensity(intensity) {
    const patterns = Object.keys(this.patterns);
    
    if (intensity < 0.3) {
      return ['staircase', 'corridor'][Math.floor(Math.random() * 2)];
    } else if (intensity < 0.6) {
      return ['wave', 'sync', 'memory'][Math.floor(Math.random() * 3)];
    } else {
      return ['spider', 'wave', 'sync'][Math.floor(Math.random() * 3)];
    }
  }

  async generateSection(startX, groundY, section, profile, style) {
    const objects = [];
    const sectionWidth = section.width;
    let currentX = startX;

    // Generar suelo base
    objects.push(...this.generateGround(currentX, groundY, sectionWidth, profile));

    // Añadir obstáculos según intensidad
    const obstacleCount = Math.floor(sectionWidth / 60 * section.intensity);
    
    for (let i = 0; i < obstacleCount; i++) {
      const x = currentX + (i * (sectionWidth / obstacleCount));
      const obstacle = this.generateObstacle(x, groundY, profile, section.intensity);
      
      if (obstacle) {
        objects.push(obstacle);
        
        // Añadir objetos relacionados (orbs, portales)
        if (Math.random() < profile.orbChance * section.intensity) {
          objects.push(this.generateOrb(x + obstacle.width + 20, groundY, profile));
        }
        
        if (Math.random() < profile.portalChance * section.intensity) {
          objects.push(this.generatePortal(x + obstacle.width + 40, groundY, profile));
        }
      }
    }

    // Aplicar patrón específico
    const patternObjects = this.patterns[section.pattern](
      startX, 
      groundY, 
      { ...profile, width: sectionWidth, intensity: section.intensity }
    );
    objects.push(...patternObjects);

    return objects;
  }

  generateGround(x, y, width, profile) {
    const segments = [];
    const segmentWidth = 60;
    const segmentsCount = Math.floor(width / segmentWidth);
    
    for (let i = 0; i < segmentsCount; i++) {
      if (Math.random() > profile.density * 0.2) {
        segments.push({
          type: 'block',
          x: x + i * segmentWidth,
          y: y + 30,
          width: segmentWidth,
          height: 30,
          color: profile.colorScheme[0],
          properties: { isGround: true }
        });
      }
    }
    
    return segments;
  }

  generateObstacle(x, groundY, profile, intensity) {
    const types = ['block', 'spike'];
    
    if (intensity > 0.7) {
      types.push('tripleSpike');
    }
    
    const type = types[Math.floor(Math.random() * types.length)];
    
    switch(type) {
      case 'block':
        const height = profile.blockHeight.min + 
          Math.random() * (profile.blockHeight.max - profile.blockHeight.min);
        return {
          type: 'block',
          x: x,
          y: groundY - height + 30,
          width: 30 + Math.random() * 20,
          height: height,
          color: profile.colorScheme[Math.floor(Math.random() * profile.colorScheme.length)]
        };
        
      case 'spike':
        return {
          type: 'spike',
          x: x,
          y: groundY - 30 + 30,
          width: 30,
          height: 30,
          color: '#ff6b6b'
        };
        
      case 'tripleSpike':
        return [
          {
            type: 'spike',
            x: x,
            y: groundY - 30 + 30,
            width: 30,
            height: 30,
            color: '#ff6b6b'
          },
          {
            type: 'spike',
            x: x + 25,
            y: groundY - 40 + 30,
            width: 30,
            height: 40,
            color: '#ff6b6b'
          },
          {
            type: 'spike',
            x: x + 50,
            y: groundY - 30 + 30,
            width: 30,
            height: 30,
            color: '#ff6b6b'
          }
        ];
    }
  }

  generateOrb(x, groundY, profile) {
    const orbTypes = ['jump', 'gravity', 'speed'];
    const type = orbTypes[Math.floor(Math.random() * orbTypes.length)];
    const colors = {
      jump: '#ffd93d',
      gravity: '#00d2ff',
      speed: '#e94560'
    };

    return {
      type: 'orb',
      x: x,
      y: groundY - 80,
      radius: 15,
      color: colors[type],
      properties: {
        orbType: type,
        action: type === 'jump' ? 'jump' : 
                type === 'gravity' ? 'flipGravity' : 'boost'
      }
    };
  }

  generatePortal(x, groundY, profile) {
    const portalTypes = ['normal', 'mini', 'ship', 'ball', 'ufo', 'wave'];
    const type = portalTypes[Math.floor(Math.random() * portalTypes.length)];
    
    return {
      type: 'portal',
      x: x,
      y: groundY - 50,
      width: 20,
      height: 50,
      color: profile.colorScheme[1],
      properties: {
        portalType: type,
        transformTo: type
      }
    };
  }

  // Patrones de juego
  generateStaircase(x, y, params) {
    const objects = [];
    const steps = 5 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < steps; i++) {
      objects.push({
        type: 'block',
        x: x + i * 60,
        y: y - (i * 30) + 30,
        width: 40,
        height: 30 * (i + 1),
        color: params.colorScheme[i % params.colorScheme.length]
      });
    }
    
    return objects;
  }

  generateWave(x, y, params) {
    const objects = [];
    const amplitude = 100;
    const frequency = 0.05;
    const width = params.width || 800;
    
    for (let i = 0; i < width; i += 20) {
      const waveY = y - Math.sin(i * frequency) * amplitude + 30;
      objects.push({
        type: 'spike',
        x: x + i,
        y: waveY - 20,
        width: 20,
        height: 20,
        color: params.colorScheme[0]
      });
    }
    
    return objects;
  }

  generateCorridor(x, y, params) {
    const objects = [];
    const height = 150;
    
    // Techo
    for (let i = 0; i < params.width; i += 40) {
      objects.push({
        type: 'block',
        x: x + i,
        y: y - height,
        width: 40,
        height: 30,
        color: params.colorScheme[0]
      });
    }
    
    // Suelo
    objects.push(...this.generateGround(x, y, params.width, params));
    
    return objects;
  }

  generateSpider(x, y, params) {
    const objects = [];
    const centerX = x + params.width / 2;
    
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 100 + Math.random() * 50;
      const orbX = centerX + Math.cos(angle) * radius;
      const orbY = y - 100 + Math.sin(angle) * radius;
      
      objects.push({
        type: 'orb',
        x: orbX,
        y: orbY,
        radius: 15,
        color: params.colorScheme[i % params.colorScheme.length],
        properties: { orbType: 'jump' }
      });
    }
    
    return objects;
  }

  generateMemory(x, y, params) {
    const objects = [];
    const pattern = [1, 0, 1, 1, 0, 1, 0, 1];
    
    pattern.forEach((hasObstacle, i) => {
      if (hasObstacle) {
        objects.push({
          type: 'block',
          x: x + i * 50,
          y: y - 60 + 30,
          width: 40,
          height: 60,
          color: params.colorScheme[i % params.colorScheme.length]
        });
      }
    });
    
    return objects;
  }

  generateSync(x, y, params) {
    const objects = [];
    
    for (let i = 0; i < 10; i++) {
      const syncX = x + i * 80;
      
      // Objeto superior
      objects.push({
        type: 'block',
        x: syncX,
        y: y - 150,
        width: 30,
        height: 80,
        color: params.colorScheme[0]
      });
      
      // Objeto inferior (sincronizado)
      objects.push({
        type: 'spike',
        x: syncX + 15,
        y: y - 30 + 30,
        width: 30,
        height: 30,
        color: '#ff6b6b'
      });
    }
    
    return objects;
  }

  // Utilidades
  addDecorations(objects, profile) {
    const decorated = [...objects];
    
    // Añadir fondos
    objects.forEach(obj => {
      if (obj.type === 'block' && Math.random() < 0.3) {
        decorated.push({
          type: 'decoration',
          x: obj.x + 5,
          y: obj.y + 5,
          width: 10,
          height: 10,
          color: this.lightenColor(obj.color),
          properties: { decorationType: 'glow' }
        });
      }
    });
    
    return decorated;
  }

  addSpeedPortals(objects, profile) {
    const result = [...objects];
    let speed = 1;
    
    for (let i = 0; i < objects.length; i += 20) {
      speed = Math.min(speed + 0.2, 3);
      
      if (Math.random() < 0.3 && objects[i]) {
        result.push({
          type: 'speedPortal',
          x: objects[i].x + 40,
          y: objects[i].y - 50,
          width: 20,
          height: 50,
          color: '#00ff00',
          properties: { speed: speed }
        });
      }
    }
    
    return result;
  }

  verifyPlayability(objects, profile) {
    const player = { x: 0, y: 300, velocityY: 0, onGround: true };
    const playable = [];
    
    for (const obj of objects) {
      if (this.canPlayerPass(player, obj, profile)) {
        playable.push(obj);
      } else {
        // Ajustar objeto para hacerlo pasable
        const adjusted = this.adjustObstacle(obj, profile);
        if (adjusted) {
          playable.push(adjusted);
        }
      }
    }
    
    return playable;
  }

  canPlayerPass(player, obstacle, profile) {
    // Simulación simple de paso
    const jumpHeight = Math.abs(profile.jumpForce * 20);
    const obstacleHeight = obstacle.y - 300 + obstacle.height;
    
    return obstacleHeight < jumpHeight;
  }

  adjustObstacle(obj, profile) {
    // Ajustar altura máxima
    const maxHeight = Math.abs(profile.jumpForce * 20);
    
    if (obj.type === 'block' && obj.height > maxHeight) {
      return { ...obj, height: maxHeight - 10 };
    }
    
    return obj;
  }

  generateThumbnail(objects, profile) {
    // Crear thumbnail canvas
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    // Fondo
    ctx.fillStyle = profile.colorScheme[2] || '#1a1a2e';
    ctx.fillRect(0, 0, 400, 200);
    
    // Suelo
    ctx.fillStyle = this.darkenColor(profile.colorScheme[0]);
    ctx.fillRect(0, 150, 400, 50);
    
    // Dibujar algunos objetos
    objects.slice(0, 20).forEach((obj, i) => {
      const scaleX = (obj.x / 5000) * 400;
      const scaleY = 150 - (obj.y / 500) * 200;
      
      ctx.fillStyle = obj.color || '#ffffff';
      
      if (obj.type === 'block') {
        ctx.fillRect(scaleX, scaleY, 10, 10);
      } else if (obj.type === 'spike') {
        ctx.beginPath();
        ctx.moveTo(scaleX, scaleY + 10);
        ctx.lineTo(scaleX + 5, scaleY);
        ctx.lineTo(scaleX + 10, scaleY + 10);
        ctx.fill();
      }
    });
    
    // Texto
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.fillText('AI Generated', 150, 30);
    
    return canvas.toDataURL();
  }

  // Colores
  lightenColor(color) {
    // Implementación simple
    return color + 'aa';
  }

  darkenColor(color) {
    // Implementación simple
    return color + '88';
  }
}
