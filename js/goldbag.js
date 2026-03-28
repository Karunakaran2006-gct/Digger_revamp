// js/goldbag.js
import { TILE_SIZE, MAP_COLS, MAP_ROWS, TILE_TYPES } from './map.js';
import { Coin } from './coin.js';

export class GoldBag {
    constructor(logicalX, logicalY) {
        this.type = 'GOLDBAG';
        this.logicalX = logicalX;
        this.logicalY = logicalY;
        this.x = logicalX * TILE_SIZE;
        this.y = logicalY * TILE_SIZE;
        this.isDead = false;
        this.spriteId = 'goldbag';
        
        this.isFalling = false;
        this.fallHeight = 0;
        this.fallSpeed = 0.3125; 
    }

    push(moveDirX, moveDirY, gameState) {
        if (this.isFalling || moveDirY !== 0) return false;

        const nextX = this.logicalX + moveDirX;
        if (nextX < 0 || nextX >= MAP_COLS) return false;

        if (gameState.map.getTile(nextX, this.logicalY) !== TILE_TYPES.AIR) {
            return false;
        }

        for (let e of gameState.entities) {
            if ((e.type === 'GOLDBAG' || e.type === 'EMERALD') && e.logicalX === nextX && e.logicalY === this.logicalY) {
                return false;
            }
        }

        this.logicalX = nextX;
        this.x = this.logicalX * TILE_SIZE;
        return true;
    }

    destroy() {
        this.isDead = true; 
    }

    shatterToCoins(gameState) {
        this.isDead = true;
        if (gameState.sound) gameState.sound.playBagShatter();
        for (let i=0; i<4; i++) {
             let offX = Math.floor(Math.random() * 3) - 1;
             let offY = Math.floor(Math.random() * 3) - 1;
             let cx = Math.max(0, Math.min(MAP_COLS-1, this.logicalX + offX));
             let cy = Math.max(0, Math.min(MAP_ROWS-1, this.logicalY + offY));
             
             gameState.entities.push(new Coin(cx, cy));
        }
        gameState.score += 500;
    }

    update(dt, gameState) {
        if (this.isDead) return;

        if (!this.isFalling) {
            let nextY = this.logicalY + 1;
            if (nextY < MAP_ROWS && gameState.map.getTile(this.logicalX, nextY) === TILE_TYPES.AIR) {
                let supportedByBag = false;
                for (let e of gameState.entities) {
                    if (e.type === 'GOLDBAG' && !e.isFalling && e.logicalX === this.logicalX && e.logicalY === nextY) {
                        supportedByBag = true;
                    }
                }
                
                if (!supportedByBag) {
                    this.isFalling = true;
                    this.fallHeight = 0;
                }
            }
        }

        if (this.isFalling) {
            this.y += this.fallSpeed * dt;
            const currentLogicalY = Math.floor(this.y / TILE_SIZE);
            
            if (currentLogicalY > this.logicalY) {
                this.logicalY = currentLogicalY;
                this.fallHeight += 1;
            }

            for (let e of [gameState.player, ...gameState.entities]) {
                if (!e || e.isDead || e === this) continue;
                if (e.type === 'NOBBIN' || e.type === 'HOBBIN' || !e.type) {
                    if (Math.abs(e.x - this.x) < 20 && Math.abs(e.y - this.y) < 25) {
                        if (e.kill) e.kill(gameState);
                        else e.isDead = true; // Player
                        this.shatterToCoins(gameState);
                    }
                }
            }

            let nextY = this.logicalY + 1;
            let hitGround = false;
            if (nextY >= MAP_ROWS || gameState.map.getTile(this.logicalX, nextY) !== TILE_TYPES.AIR) {
                hitGround = true;
            } else {
                for (let e of gameState.entities) {
                    if (e.type === 'GOLDBAG' && e !== this && e.logicalX === this.logicalX && e.logicalY === nextY) {
                        hitGround = true;
                    }
                }
            }

            if (hitGround && (this.y >= this.logicalY * TILE_SIZE)) {
                this.y = this.logicalY * TILE_SIZE;
                this.isFalling = false;
                
                if (this.fallHeight > 1 || nextY >= MAP_ROWS) {
                    this.shatterToCoins(gameState);
                }
                this.fallHeight = 0;
            }
        }
    }
}
