import { createObject, getTypeByKey } from "../level/object-registry.js";
import { drawObject } from "../render/object-renderer.js";
import { GRID_CELL, GROUND_Y } from "../level/level-model.js";
import { snapToGrid } from "../utils/helpers.js";

/**
 * Canvas del editor: dibujo, selección, colocación y pan/zoom
 */
export class EditorCanvas {
  constructor(canvasEl, options = {}) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext("2d");
    this.onSelect = options.onSelect || (() => {});
    this.onChange = options.onChange || (() => {});

    this.level = null;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.selectedUid = null;
    this.activeTool = null;
    this.isDragging = false;
    this.isPanning = false;
    this.dragStart = null;
    this.dragObject = null;
    this.lastPointer = { x: 0, y: 0 };

    this._bindEvents();
    this._resize();
    window.addEventListener("resize", () => this._resize());
  }

  setLevel(level) {
    this.level = level;
    this.selectedUid = null;
    this.draw();
  }

  getLevel() {
    return this.level;
  }

  setActiveTool(typeKey) {
    this.activeTool = typeKey;
  }

  setZoom(z) {
    this.zoom = Math.max(0.4, Math.min(2.5, z));
    this.draw();
    return this.zoom;
  }

  getSelectedObject() {
    if (!this.level || !this.selectedUid) return null;
    return this.level.objects.find((o) => o.uid === this.selectedUid) || null;
  }

  selectObject(uid) {
    this.selectedUid = uid;
    this.onSelect(this.getSelectedObject());
    this.draw();
  }

  deleteSelected() {
    if (!this.level || !this.selectedUid) return;
    this.level.objects = this.level.objects.filter((o) => o.uid !== this.selectedUid);
    this.selectedUid = null;
    this.onSelect(null);
    this.onChange();
    this.draw();
  }

  duplicateSelected() {
    const obj = this.getSelectedObject();
    if (!obj || !this.level) return;
    const copy = {
      ...JSON.parse(JSON.stringify(obj)),
      uid: `obj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      x: obj.x + GRID_CELL,
      y: obj.y
    };
    this.level.objects.push(copy);
    this.selectObject(copy.uid);
    this.onChange();
    this.draw();
  }

  updateSelected(props) {
    const obj = this.getSelectedObject();
    if (!obj) return;
    Object.assign(obj, props);
    this.onChange();
    this.draw();
  }

  screenToWorld(sx, sy) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (sx - rect.left) / this.zoom - this.panX;
    const y = (sy - rect.top) / this.zoom - this.panY;
    return { x, y };
  }

  _resize() {
    const wrap = this.canvas.parentElement;
    if (!wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  _bindEvents() {
    const onDown = (e) => this._pointerDown(e);
    const onMove = (e) => this._pointerMove(e);
    const onUp = (e) => this._pointerUp(e);

    this.canvas.addEventListener("mousedown", onDown);
    this.canvas.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      onDown(e.touches[0]);
    }, { passive: false });
    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      onMove(e.touches[0]);
    }, { passive: false });
    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      onUp(e.changedTouches[0]);
    });

    this.canvas.addEventListener("wheel", (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        this.setZoom(this.zoom + delta);
      } else {
        this.panX -= e.deltaX * 0.5;
        this.draw();
      }
    }, { passive: false });

    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  _pointerDown(e) {
    const { x, y } = this.screenToWorld(e.clientX, e.clientY);
    this.lastPointer = { x: e.clientX, y: e.clientY };

    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      this.isPanning = true;
      return;
    }

    const hit = this._hitTest(x, y);
    if (hit) {
      this.selectObject(hit.uid);
      this.isDragging = true;
      this.dragObject = hit;
      this.dragStart = { x, y, ox: hit.x, oy: hit.y };
      return;
    }

    if (this.activeTool) {
      this._placeObject(this.activeTool, snapToGrid(x), snapToGrid(y));
      return;
    }

    this.selectedUid = null;
    this.onSelect(null);
    this.draw();
  }

  _pointerMove(e) {
    if (this.isPanning) {
      const dx = (e.clientX - this.lastPointer.x) / this.zoom;
      this.panX += dx;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      this.draw();
      return;
    }

    if (this.isDragging && this.dragObject) {
      const { x, y } = this.screenToWorld(e.clientX, e.clientY);
      const dx = x - this.dragStart.x;
      const dy = y - this.dragStart.y;
      this.dragObject.x = snapToGrid(this.dragStart.ox + dx);
      this.dragObject.y = snapToGrid(this.dragStart.oy + dy);
      this.onChange();
      this.draw();
    }
  }

  _pointerUp() {
    this.isDragging = false;
    this.isPanning = false;
    this.dragObject = null;
  }

  _hitTest(wx, wy) {
    if (!this.level) return null;
    for (let i = this.level.objects.length - 1; i >= 0; i--) {
      const o = this.level.objects[i];
      if (
        wx >= o.x &&
        wx <= o.x + (o.width || 30) &&
        wy >= o.y &&
        wy <= o.y + (o.height || 30)
      ) {
        return o;
      }
    }
    return null;
  }

  _placeObject(typeKey, x, y) {
    if (!this.level) return;
    const gy = this.level.groundY ?? GROUND_Y;
    const def = getTypeByKey(typeKey);
    const obj = createObject(typeKey, snapToGrid(x), snapToGrid(y));
    if (def.solid) {
      obj.y = gy - (obj.height || 30);
    } else if (def.hazard) {
      obj.y = gy - (obj.height || 28);
    } else if (def.pad) {
      obj.y = gy - (obj.height || 12);
    }
    this.level.objects.push(obj);
    this.selectObject(obj.uid);
    this.onChange();
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    const bg = this.level?.background || { r: 10, g: 18, b: 32 };
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `rgb(${bg.r * 0.3},${bg.g * 0.3},${bg.b * 0.5})`);
    grad.addColorStop(1, `rgb(${bg.r},${bg.g},${bg.b})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.translate(this.panX * this.zoom, this.panY * this.zoom);
    ctx.scale(this.zoom, this.zoom);

    this._drawGrid(ctx, w, h);
    if (this.level) {
      this._drawGround(ctx);
      const viewW = w / this.zoom;
      for (const obj of this.level.objects) {
        drawObject(ctx, obj, {
          selected: obj.uid === this.selectedUid,
          cameraX: 0,
          viewW
        });
      }
    }

    ctx.restore();
  }

  _drawGrid(ctx, w, h) {
    const cell = GRID_CELL;
    const startX = Math.floor(-this.panX / cell) * cell;
    const endX = startX + w / this.zoom + cell * 2;
    const groundY = this.level?.groundY ?? GROUND_Y;

    ctx.strokeStyle = "rgba(42, 53, 72, 0.5)";
    ctx.lineWidth = 1;
    for (let x = startX; x < endX; x += cell) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h / this.zoom);
      ctx.stroke();
    }
    for (let y = 0; y < h / this.zoom; y += cell) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(0, 212, 255, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, groundY);
    ctx.lineTo(endX, groundY);
    ctx.stroke();
  }

  _drawGround(ctx) {
    const gy = this.level.groundY ?? GROUND_Y;
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-500, gy, 20000, 400);
  }

}