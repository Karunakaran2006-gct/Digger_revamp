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

        // Wobble before fall
        this.wobbleTimer = 0;
        this.wobbleDuration = 350; // ms of wobble before drop
        this.isWobbling = false;
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

        if (!this.isFalling && !this.isWobbling) {
            let nextY = this.logicalY + 1;
            if (nextY < MAP_ROWS && gameState.map.getTile(this.logicalX, nextY) === TILE_TYPES.AIR) {
                let supportedByBag = false;
                for (let e of gameState.entities) {
                    if (e.type === 'GOLDBAG' && !e.isFalling && e.logicalX === this.logicalX && e.logicalY === nextY) {
                        supportedByBag = true;
                    }
                }
                // Only wobble if NOT placed directly on ground (5b: 1-tile-above-ground bags don't fall/shatter)
                const twoBelow = this.logicalY + 2;
                const hasFallSpace = twoBelow < MAP_ROWS && gameState.map.getTile(this.logicalX, twoBelow) === TILE_TYPES.AIR;
                if (!supportedByBag) {
                    if (hasFallSpace) {
                        this.isWobbling = true;
                        this.wobbleTimer = 0;
                    }
                }
            }
        }

        // Wobble phase
        if (this.isWobbling) {
            this.wobbleTimer += dt;
            if (this.wobbleTimer >= this.wobbleDuration) {
                this.isWobbling = false;
                this.isFalling = true;
                this.fallHeight = 0;
            }
            return; // Don't fall yet, just wobble visually
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
                        if (this.fallHeight > 1) {
                            if (e.kill) {
                                e.kill(gameState); // Monster killed
                            } else if (!e.type) {
                                // Player — stun instead of kill (issue 5a)
                                if (!e.isStunned) {
                                    e.isStunned = true;
                                    e.stunTimer = 0;
                                    if (gameState.sound) gameState.sound.playDeath();
                                }
                            }
                            this.shatterToCoins(gameState);
                        }
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
