// js/cherry.js
import { TILE_SIZE } from './map.js';

export class Cherry {
    constructor(logicalX, logicalY) {
        this.type = 'CHERRY';
        this.logicalX = logicalX;
        this.logicalY = logicalY;
        this.x = logicalX * TILE_SIZE;
        this.y = logicalY * TILE_SIZE;
        this.isDead = false;
        this.spriteId = 'cherry';
    }

    update(dt, gameState) {
        // Static entity, logic handled by Player collection parsing
    }
}
