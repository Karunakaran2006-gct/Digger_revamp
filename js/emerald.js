// js/emerald.js
import { TILE_SIZE } from './map.js';

export class Emerald {
    constructor(logicalX, logicalY) {
        this.type = 'EMERALD';
        this.logicalX = logicalX;
        this.logicalY = logicalY;
        this.x = logicalX * TILE_SIZE;
        this.y = logicalY * TILE_SIZE;
        this.isDead = false;
        this.spriteId = 'emerald';
    }

    destroy() {
        this.isDead = true;
    }
}
