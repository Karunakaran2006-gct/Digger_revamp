// js/player.js
import { TILE_SIZE, MAP_COLS, MAP_ROWS, TILE_TYPES } from './map.js';
import { Bullet } from './bullet.js';

export class Player {
    constructor(startX, startY) {
        // Logical grid coordinates
        this.logicalX = startX;
        this.logicalY = startY;

        // Visual coordinates (sub-tile smooth movement)
        this.x = startX * TILE_SIZE;
        this.y = startY * TILE_SIZE;

        this.targetX = startX;
        this.targetY = startY;

        // Configuration High-Res Speed
        this.speed = 0.125; // pixels per ms
        this.canShoot = true; // 1 bullet per life
        
        // Input state
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            ' ': false
        };

        this.direction = 'Right';
        this.isMoving = false;
        this.isDead = false;

        this.setupInputs();
    }

    setupInputs() {
        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = true;
            }
        });
        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = false;
            }
        });
    }

    update(dt, gameState) {
        if (this.isDead) return;

        // Spacebar shooting mechanism
        if (this.keys[' '] && this.canShoot) {
            this.canShoot = false;
            const bullet = new Bullet(this.x, this.y, this.direction);
            gameState.entities.push(bullet);
        }

        // 1. Moving towards target logic
        if (this.isMoving) {
            const tx = this.targetX * TILE_SIZE;
            const ty = this.targetY * TILE_SIZE;

            const dx = tx - this.x;
            const dy = ty - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            const moveAmt = this.speed * dt;

            // Arrived at target
            if (dist <= moveAmt) {
                this.x = tx;
                this.y = ty;
                this.logicalX = this.targetX;
                this.logicalY = this.targetY;
                this.isMoving = false;
                
                // Dig dirt if we landed on it
                gameState.map.dig(this.logicalX, this.logicalY);

                // Collect Emeralds / Coins
                for (let e of gameState.entities) {
                    if (e.logicalX === this.logicalX && e.logicalY === this.logicalY) {
                        if (e.type === 'EMERALD') {
                            gameState.score += 200;
                            e.isDead = true; 
                        } else if (e.type === 'COIN') {
                            gameState.score += 1;
                            e.isDead = true;
                        } else if (e.type === 'CHERRY') {
                            gameState.score += 1000;
                            gameState.bonusTimer = 10000; 
                            e.isDead = true;
                        }
                    }
                }
            } else {
                // Interpolation glide
                this.x += (dx / dist) * moveAmt;
                this.y += (dy / dist) * moveAmt;
                
                // Continuous pixel-perfect carving
                gameState.map.carve(this.x, this.y);
            }
        } 

        // Poll for physical static carving if standing still
        if (!this.isMoving) gameState.map.carve(this.x, this.y);

        // 2. Poll for new movement input if idle
        if (!this.isMoving) {
            let moveDirX = 0;
            let moveDirY = 0;

            if (this.keys.ArrowRight) { moveDirX = 1; this.direction = 'Right'; }
            else if (this.keys.ArrowLeft) { moveDirX = -1; this.direction = 'Left'; }
            else if (this.keys.ArrowDown) { moveDirY = 1; this.direction = 'Down'; }
            else if (this.keys.ArrowUp) { moveDirY = -1; this.direction = 'Up'; }

            if (moveDirX !== 0 || moveDirY !== 0) {
                const nextX = this.logicalX + moveDirX;
                const nextY = this.logicalY + moveDirY;

                // Restrict bounds strictly to 0..15 inside the map
                if (nextX >= 0 && nextX < MAP_COLS && nextY >= 0 && nextY < MAP_ROWS) {
                    
                    // Check for solid entities blocking the path (GoldBag)
                    let pathBlocked = false;
                    for (let e of gameState.entities) {
                        if (e.type === 'GOLDBAG' && e.logicalX === nextX && e.logicalY === nextY) {
                            // Can we push the bag?
                            if (e.push(moveDirX, moveDirY, gameState)) {
                                pathBlocked = false; // Pushed successfully
                            } else {
                                pathBlocked = true; // Cannot push (blocked behind)
                            }
                        }
                    }

                    if (!pathBlocked) {
                        this.targetX = nextX;
                        this.targetY = nextY;
                        this.isMoving = true;
                    }
                }
            }
        }
    }
}
