import { getTypeByKey } from "../level/object-registry.js";
import { GROUND_Y } from "../level/level-model.js";

/**
 * Motor de físicas 2D estilo Geometry Dash (cubo)
 */
export class PhysicsEngine {
  constructor(options = {}) {
    this.groundY = options.groundY ?? GROUND_Y;
    this.gravity = options.gravity ?? 1800;
    this.jumpForce = options.jumpForce ?? -620;
    this.moveSpeed = options.moveSpeed ?? 300;
    this.cellSize = options.cellSize ?? 30;

    this.player = {
      x: 80,
      y: this.groundY - 30,
      width: 28,
      height: 28,
      vx: this.moveSpeed,
      vy: 0,
      onGround: false,
      dead: false,
      finished: false
    };

    this.objects = [];
    this.cameraX = 0;
    this.levelEnd = 5000;
    this.gravityFlipped = false;
  }

  loadLevel(level) {
    this.objects = (level.objects || []).map((o) => {
      const def = getTypeByKey(o.type);
      return {
        ...o,
        solid: def.solid,
        hazard: def.hazard,
        orb: def.orb,
        pad: def.pad,
        portal: def.portal,
        portalEffect: def.portalEffect,
        color: def.color
      };
    });
    this.groundY = level.groundY ?? GROUND_Y;
    this.moveSpeed = 300 * (level.speed || 1);
    this.levelEnd = level.length || 12000;
    this.reset();
  }

  reset() {
    this.player = {
      x: 80,
      y: this.groundY - 30,
      width: 28,
      height: 28,
      vx: this.moveSpeed,
      vy: 0,
      onGround: false,
      dead: false,
      finished: false
    };
    this.cameraX = 0;
    this.gravityFlipped = false;
  }

  jump() {
    if (this.player.dead || this.player.finished) return;
    if (this.player.onGround) {
      this.player.vy = this.gravityFlipped ? -this.jumpForce : this.jumpForce;
      this.player.onGround = false;
    }
  }

  orbJump() {
    this.player.vy = this.gravityFlipped ? this.jumpForce * 0.85 : this.jumpForce * 0.85;
    this.player.onGround = false;
  }

  padBoost() {
    this.player.vy = this.gravityFlipped ? this.jumpForce * 1.35 : this.jumpForce * 1.35;
    this.player.onGround = false;
  }

  update(dt) {
    const p = this.player;
    if (p.dead || p.finished) return;

    const g = this.gravityFlipped ? -this.gravity : this.gravity;
    p.vy += g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.onGround = false;
    this.resolveCollisions();

    const floor = this.groundY;
    if (!this.gravityFlipped && p.y + p.height >= floor) {
      p.y = floor - p.height;
      p.vy = 0;
      p.onGround = true;
    } else if (this.gravityFlipped && p.y <= 60) {
      p.y = 60;
      p.vy = 0;
      p.onGround = true;
    }

    if (p.y > 800 || p.y < -200) {
      p.dead = true;
    }

    if (p.x >= this.levelEnd) {
      p.finished = true;
    }

    this.cameraX = Math.max(0, p.x - 200);
  }

  resolveCollisions() {
    const p = this.player;
    const pb = this.getAABB(p);

    for (const obj of this.objects) {
      const ob = this.getObjectAABB(obj);

      if (!this.aabbOverlap(pb, ob)) continue;

      if (obj.hazard) {
        p.dead = true;
        return;
      }

      if (obj.orb && this.aabbOverlap(pb, ob)) {
        this.orbJump();
        continue;
      }

      if (obj.pad && this.aabbOverlap(pb, ob)) {
        this.padBoost();
        continue;
      }

      if (obj.portal && obj.portalEffect === "flipGravity") {
        this.gravityFlipped = !this.gravityFlipped;
        continue;
      }

      if (!obj.solid) continue;

      const overlapX = Math.min(pb.right, ob.right) - Math.max(pb.left, ob.left);
      const overlapY = Math.min(pb.bottom, ob.bottom) - Math.max(pb.top, ob.top);

      if (overlapX < overlapY) {
        if (pb.cx < ob.cx) p.x -= overlapX;
        else p.x += overlapX;
        p.dead = true;
        return;
      }

      if (!this.gravityFlipped) {
        if (p.vy >= 0) {
          p.y = ob.top - p.height;
          p.vy = 0;
          p.onGround = true;
        } else {
          p.y = ob.bottom;
          p.vy = 0;
        }
      } else {
        if (p.vy <= 0) {
          p.y = ob.bottom;
          p.vy = 0;
          p.onGround = true;
        } else {
          p.y = ob.top - p.height;
          p.vy = 0;
        }
      }

      pb.top = p.y;
      pb.bottom = p.y + p.height;
    }
  }

  getAABB(ent) {
    return {
      left: ent.x,
      right: ent.x + ent.width,
      top: ent.y,
      bottom: ent.y + ent.height,
      cx: ent.x + ent.width / 2,
      cy: ent.y + ent.height / 2
    };
  }

  getObjectAABB(obj) {
    return {
      left: obj.x,
      right: obj.x + (obj.width || 30),
      top: obj.y,
      bottom: obj.y + (obj.height || 30)
    };
  }

  aabbOverlap(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  getProgress() {
    return Math.min(100, Math.round((this.player.x / this.levelEnd) * 100));
  }
}
