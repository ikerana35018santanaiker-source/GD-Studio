// js/editor/editor-physics.js
export class EditorPhysics {
  constructor(gameData) {
    this.gravity = gameData?.gravity || 0.5;
    this.groundY = 300;
  }

  update() {
    // Update all physics objects
    this.objects?.forEach(obj => {
      if (obj.physics) {
        this.applyGravity(obj);
        this.applyVelocity(obj);
        this.checkGroundCollision(obj);
      }
    });
  }

  applyGravity(obj) {
    if (!obj.onGround) {
      obj.velocityY += this.gravity;
    }
  }

  applyVelocity(obj) {
    obj.x += obj.velocityX || 0;
    obj.y += obj.velocityY || 0;
  }

  checkGroundCollision(obj) {
    if (obj.y + obj.height >= this.groundY) {
      obj.y = this.groundY - obj.height;
      obj.velocityY = 0;
      obj.onGround = true;
    } else {
      obj.onGround = false;
    }
  }

  jump(obj, force = -10) {
    if (obj.onGround) {
      obj.velocityY = force;
      obj.onGround = false;
    }
  }

  checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
  }

  reset() {
    this.objects = [];
  }
}
