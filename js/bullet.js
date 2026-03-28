// js/bullet.js
import { TILE_SIZE, MAP_COLS, MAP_ROWS, TILE_TYPES } from './map.js';

const MAX_BULLET_DISTANCE = TILE_SIZE * 8; // Max 8 tiles travel distance

export class Bullet {
    constructor(startX, startY, dir) {
        this.type = 'BULLET';
        this.x = startX + TILE_SIZE / 2;
        this.y = startY + TILE_SIZE / 2;
        this.direction = dir;
        this.speed = 0.5;
        this.isDead = false;
        this.startX = this.x;
        this.startY = this.y;
        this.distTravelled = 0;

        // Burst particle effect on death
        this.bursting = false;
        this.burstTimer = 0;
        this.burstDuration = 180; // ms

        this.logicalX = Math.round(this.x / TILE_SIZE);
        this.logicalY = Math.round(this.y / TILE_SIZE);

        this.spriteId = null; // We draw manually in renderer via type check
    }

    update(dt, gameState) {
        if (this.isDead && !this.bursting) return;

        // Burst countdown after hit
        if (this.bursting) {
            this.burstTimer += dt;
            if (this.burstTimer >= this.burstDuration) {
                this.isDead = true;
                this.bursting = false;
            }
            return;
        }

        let moveAmt = this.speed * dt;
        if (this.direction === 'Right') this.x += moveAmt;
        if (this.direction === 'Left')  this.x -= moveAmt;
        if (this.direction === 'Up')    this.y -= moveAmt;
        if (this.direction === 'Down')  this.y += moveAmt;

        this.distTravelled += moveAmt;
        this.logicalX = Math.floor(this.x / TILE_SIZE);
        this.logicalY = Math.floor(this.y / TILE_SIZE);

        // Bounds check
        if (this.logicalX < 0 || this.logicalX >= MAP_COLS || this.logicalY < 0 || this.logicalY >= MAP_ROWS) {
            this.triggerBurst();
            return;
        }

        // Wall collision — stop bullet inside dirt
        if (gameState.map.getTile(this.logicalX, this.logicalY) === TILE_TYPES.DIRT) {
            this.triggerBurst();
            return;
        }

        // Max distance check
        if (this.distTravelled >= MAX_BULLET_DISTANCE) {
            this.triggerBurst();
            return;
        }

        // Enemy collision
        for (let e of gameState.entities) {
            if ((e.type === 'NOBBIN' || e.type === 'HOBBIN') && !e.isDead) {
                let dx = Math.abs(e.x - this.x);
                let dy = Math.abs(e.y - this.y);
                if (dx < 22 && dy < 22) {
                    e.kill(gameState);
                    this.triggerBurst();
                    return;
                }
            }
        }
    }

    triggerBurst() {
        this.bursting = true;
        this.burstTimer = 0;
    }
}
