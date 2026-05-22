import { PhysicsEngine } from "../physics/physics-engine.js";
import { drawObject, drawPlayer } from "../render/object-renderer.js";

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
    this.viewW = 800;
    this.viewH = 400;
  }

  start(level, callbacks = {}) {
    this.onProgress = callbacks.onProgress || (() => {});
    this.onDeath = callbacks.onDeath || (() => {});
    this.onFinish = callbacks.onFinish || (() => {});
    this.engine.onDeath = () => this.onDeath();
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
    const wrap = this.canvas.closest(".test-canvas-wrap") || this.canvas.parentElement;
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

    this.engine.update(dt, now);
    this.onProgress(this.engine.getProgress());

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
    const gy = this.engine.groundY;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#0c1929");
    grad.addColorStop(1, "#0a1628");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#1a2332";
    ctx.fillRect(0, gy - cam, w + 400, h);

    for (const obj of this.engine.objects) {
      drawObject(ctx, obj, { cameraX: cam, viewW: w });
    }

    drawPlayer(ctx, this.engine.player, cam, this.engine.player.dead);
  }
}
