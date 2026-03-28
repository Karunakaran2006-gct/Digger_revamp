// js/coin.js
import { TILE_SIZE } from './map.js';

export class Coin {
    constructor(logicalX, logicalY) {
        this.type = 'COIN';
        this.logicalX = logicalX;
        this.logicalY = logicalY;
        this.x = logicalX * TILE_SIZE;
        this.y = logicalY * TILE_SIZE;
        this.isDead = false;
        this.spriteId = 'coin';
        this.timer = 8000; // 8 decay
    }

    update(dt, gameState) {
        if (this.isDead) return;
        this.timer -= dt;
        if (this.timer <= 0) {
            this.isDead = true;
        }
    }
}
