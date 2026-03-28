// js/bullet.js
import { TILE_SIZE, MAP_COLS, MAP_ROWS } from './map.js';

export class Bullet {
    constructor(startX, startY, dir) {
        this.type = 'BULLET';
        this.x = startX;
        this.y = startY;
        this.direction = dir;
        this.speed = 0.625; // High definition bullet speed
        this.isDead = false;
        
        this.logicalX = Math.round(this.x / TILE_SIZE);
        this.logicalY = Math.round(this.y / TILE_SIZE);

        this.spriteId = 'bullet';
    }

    update(dt, gameState) {
        if (this.isDead) return;

        let moveAmt = this.speed * dt;
        if (this.direction === 'Right') this.x += moveAmt;
        if (this.direction === 'Left') this.x -= moveAmt;
        if (this.direction === 'Up') this.y -= moveAmt;
        if (this.direction === 'Down') this.y += moveAmt;

        this.logicalX = Math.floor(this.x / TILE_SIZE);
        this.logicalY = Math.floor(this.y / TILE_SIZE);

        // Bounds check
        if (this.logicalX < 0 || this.logicalX >= MAP_COLS || this.logicalY < 0 || this.logicalY >= MAP_ROWS) {
            this.isDead = true;
            return;
        }

        // Hit geometry
        for (let e of gameState.entities) {
            if ((e.type === 'NOBBIN' || e.type === 'HOBBIN') && !e.isDead) {
                let dx = Math.abs(e.x - this.x);
                let dy = Math.abs(e.y - this.y);
                if (dx < 24 && dy < 24) { 
                    e.kill(gameState);
                    this.isDead = true;
                    return;
                }
            }
        }
    }
}
