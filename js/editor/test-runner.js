import { PhysicsEngine } from "../physics/physics-engine.js";
import { getTypeByKey } from "../level/object-registry.js";

/**
 * Vista de prueba del nivel con motor de físicas
 */
export class TestRunner {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext("2d");
    this.engine = new PhysicsEngine();
    this.running = false;
    this.raf = null;
    this.lastTime = 0;
    this.onProgress = () => {};
    this.onDeath = () => {};
    this.onFinish = () => {};
  }

  start(level, callbacks = {}) {
    this.onProgress = callbacks.onProgress || (() => {});
    this.onDeath = callbacks.onDeath || (() => {});
    this.onFinish = callbacks.onFinish || (() => {});
    this.engine.loadLevel(level);
    this.running = true;
    this.lastTime = performance.now();
    this._resize();
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
  }

  restart() {
    this.engine.reset();
    this.lastTime = performance.now();
  }

  jump() {
    this.engine.jump();
  }

  _resize() {
    const wrap = this.canvas.parentElement;
    if (!wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight - 60;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.viewW = w;
    this.viewH = h;
  }

  _loop() {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.033);
    this.lastTime = now;

    this.engine.update(dt);
    this.onProgress(this.engine.getProgress());

    if (this.engine.player.dead) {
      this.onDeath();
      setTimeout(() => this.engine.reset(), 600);
    }
    if (this.engine.player.finished) {
      this.onFinish();
    }

    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _draw() {
    const ctx = this.ctx;
    const w = this.viewW;
    const h = this.viewH;
    const cam = this.engine.cameraX;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a0e17";
    ctx.fillRect(0, 0, w, h);

    const gy = this.engine.groundY;
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, gy - cam + 0, w + 500, h);

    for (const obj of this.engine.objects) {
      const sx = obj.x - cam;
      if (sx < -100 || sx > w + 100) continue;
      const def = getTypeByKey(obj.type);
      ctx.fillStyle = def.color || "#4ade80";
      const ow = obj.width || 30;
      const oh = obj.height || 30;

      if (def.hazard) {
        ctx.beginPath();
        ctx.moveTo(sx + ow / 2, obj.y);
        ctx.lineTo(sx, obj.y + oh);
        ctx.lineTo(sx + ow, obj.y + oh);
        ctx.closePath();
        ctx.fill();
      } else if (def.orb) {
        ctx.beginPath();
        ctx.arc(sx + ow / 2, obj.y + oh / 2, ow / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (obj.solid !== false) {
        ctx.fillRect(sx, obj.y, ow, oh);
      }
    }

    const p = this.engine.player;
    const px = p.x - cam;
    ctx.fillStyle = p.dead ? "#ef4444" : "#00d4ff";
    ctx.fillRect(px, p.y, p.width, p.height);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(px, p.y, p.width, p.height);
  }
}
