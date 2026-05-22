import { getTypeByKey } from "../level/object-registry.js";
import { GROUND_Y } from "../level/level-model.js";

const PLAYER_W = 28;
const PLAYER_H = 28;
const SPAWN_X = 120;
const HAZARD_SHRINK = 6;
const INVINCIBLE_MS = 1200;

/**
 * Motor de físicas 2D — estilo Geometry Dash (sin muerte por pared lateral)
 */
export class PhysicsEngine {
  constructor(options = {}) {
    this.groundY = options.groundY ?? GROUND_Y;
    this.gravity = options.gravity ?? 1900;
    this.jumpForce = options.jumpForce ?? -640;
    this.moveSpeed = options.moveSpeed ?? 300;
    this.player = this._newPlayer();
    this.objects = [];
    this.cameraX = 0;
    this.levelEnd = 5000;
    this.gravityFlipped = false;
    this.invincibleUntil = 0;
    this.orbCooldown = 0;
    this.padCooldown = 0;
    this.portalCooldown = 0;
    this.deathReported = false;
    this.onDeath = null;
  }

  _newPlayer() {
    return {
      x: SPAWN_X,
      y: this.groundY - PLAYER_H - 2,
      width: PLAYER_W,
      height: PLAYER_H,
      vx: this.moveSpeed,
      vy: 0,
      onGround: false,
      dead: false,
      finished: false
    };
  }

  loadLevel(level) {
    this.objects = (level.objects || [])
      .map((o) => {
        const def = getTypeByKey(o.type);
        return {
          ...o,
          solid: def.solid && !def.hazard,
          hazard: def.hazard,
          orb: def.orb,
          pad: def.pad,
          portal: def.portal,
          portalEffect: def.portalEffect,
          coin: def.coin,
          deco: def.deco,
          trigger: def.trigger
        };
      })
      .filter((o) => !o.trigger && (o.width > 0 || o.height > 0));

    this.groundY = level.groundY ?? GROUND_Y;
    this.moveSpeed = 300 * (level.speed || 1);
    this.levelEnd =
      level.length ||
      Math.max(3000, ...this.objects.map((o) => o.x + (o.width || 30))) + 400;
    this.reset();
  }

  reset() {
    this.player = this._newPlayer();
    this.player.vx = this.moveSpeed;
    this._placeOnGround();
    this.cameraX = 0;
    this.gravityFlipped = false;
    this.invincibleUntil = performance.now() + INVINCIBLE_MS;
    this.orbCooldown = 0;
    this.padCooldown = 0;
    this.portalCooldown = 0;
    this.deathReported = false;
  }

  _placeOnGround() {
    const p = this.player;
    p.y = this.groundY - p.height - 2;
    for (const obj of this.objects) {
      if (!obj.solid) continue;
      if (p.x + p.width > obj.x && p.x < obj.x + obj.width) {
        const top = obj.y;
        if (p.y + p.height <= top + 8) {
          p.y = top - p.height;
        }
      }
    }
  }

  jump() {
    const p = this.player;
    if (p.dead || p.finished) return;
    if (p.onGround) {
      p.vy = this.gravityFlipped ? -this.jumpForce : this.jumpForce;
      p.onGround = false;
    }
  }

  update(dt, now = performance.now()) {
    const p = this.player;
    if (p.dead) {
      if (now > this.invincibleUntil) {
        this.reset();
      }
      return;
    }
    if (p.finished) return;

    if (this.orbCooldown > 0) this.orbCooldown -= dt;
    if (this.padCooldown > 0) this.padCooldown -= dt;
    if (this.portalCooldown > 0) this.portalCooldown -= dt;

    const g = this.gravityFlipped ? -this.gravity : this.gravity;
    p.vy += g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.onGround = false;

    this.resolveCollisions(now);

    const floor = this.groundY;
    if (!this.gravityFlipped) {
      if (p.y + p.height >= floor) {
        p.y = floor - p.height;
        p.vy = 0;
        p.onGround = true;
      }
    } else if (p.y <= 50) {
      p.y = 50;
      p.vy = 0;
      p.onGround = true;
    }

    if (p.y > floor + 350 || p.y < -250) {
      this.kill(now);
    }

    if (p.x >= this.levelEnd) p.finished = true;
    this.cameraX = Math.max(0, p.x - 200);
  }

  kill(now) {
    if (this.player.dead) return;
    this.player.dead = true;
    this.invincibleUntil = now + 900;
    if (!this.deathReported) {
      this.deathReported = true;
      this.onDeath?.();
    }
  }

  resolveCollisions(now) {
    const p = this.player;
    const invincible = now < this.invincibleUntil;
    let pb = this.getAABB(p);

    for (const obj of this.objects) {
      const ob = this.getObjectAABB(obj);
      if (!this.aabbOverlap(pb, ob)) continue;

      if (obj.hazard && !invincible) {
        if (this.hazardHit(pb, ob)) {
          this.kill(now);
          return;
        }
        continue;
      }

      if (obj.orb && this.orbCooldown <= 0) {
        const dist = Math.hypot(pb.cx - ob.cx, pb.cy - ob.cy);
        if (dist < 36) {
          p.vy = this.gravityFlipped ? this.jumpForce * 0.9 : this.jumpForce * 0.9;
          p.onGround = false;
          this.orbCooldown = 0.25;
        }
        continue;
      }

      if (obj.pad && this.padCooldown <= 0 && p.vy >= -50) {
        if (this.aabbOverlap(pb, ob)) {
          p.vy = this.jumpForce * 1.4;
          p.onGround = false;
          this.padCooldown = 0.35;
        }
        continue;
      }

      if (obj.portal && this.portalCooldown <= 0) {
        if (obj.portalEffect === "flipGravity") {
          this.gravityFlipped = !this.gravityFlipped;
          this.portalCooldown = 0.5;
        }
        continue;
      }

      if (!obj.solid) continue;

      const overlapX = Math.min(pb.right, ob.right) - Math.max(pb.left, ob.left);
      const overlapY = Math.min(pb.bottom, ob.bottom) - Math.max(pb.top, ob.top);

      if (overlapX < 1 || overlapY < 1) continue;

      if (overlapX < overlapY * 0.65) {
        if (pb.cx < ob.cx) p.x = ob.left - p.width - 1;
        else p.x = ob.right + 1;
        pb = this.getAABB(p);
        continue;
      }

      if (!this.gravityFlipped) {
        if (p.vy >= -30 && pb.bottom > ob.top + 4) {
          p.y = ob.top - p.height;
          p.vy = Math.min(0, p.vy);
          p.onGround = true;
        } else if (p.vy < 0) {
          p.y = ob.bottom;
          p.vy = 0;
        }
      } else {
        if (p.vy <= 30 && pb.top < ob.bottom - 4) {
          p.y = ob.bottom;
          p.vy = Math.max(0, p.vy);
          p.onGround = true;
        } else if (p.vy > 0) {
          p.y = ob.top - p.height;
          p.vy = 0;
        }
      }

      pb = this.getAABB(p);
    }
  }

  hazardHit(pb, ob) {
    const shrink = HAZARD_SHRINK;
    const hLeft = ob.left + shrink;
    const hRight = ob.right - shrink;
    const hTop = ob.top + shrink;
    const hBottom = ob.bottom - shrink;
    const cx = pb.cx;
    const cy = pb.cy;
    return cx > hLeft && cx < hRight && cy > hTop && cy < hBottom;
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
      bottom: obj.y + (obj.height || 30),
      cx: obj.x + (obj.width || 30) / 2,
      cy: obj.y + (obj.height || 30) / 2
    };
  }

  aabbOverlap(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  getProgress() {
    return Math.min(100, Math.round((this.player.x / this.levelEnd) * 100));
  }
}
