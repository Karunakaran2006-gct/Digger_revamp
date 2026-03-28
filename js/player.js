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
        this.speed = 0.125;
        this.baseSpeed = 0.125;
        this.canShoot = true;
        this.isStunned = false;
        this.stunTimer = 0;
        this.stunDuration = 2500; // ms stun from bag
        
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

        // Stun state — cannot move, just count down
        if (this.isStunned) {
            this.stunTimer += dt;
            if (this.stunTimer >= this.stunDuration) {
                this.isStunned = false;
                this.stunTimer = 0;
            }
            return;
        }

        // Spacebar shooting mechanism
        if (this.keys[' '] && this.canShoot) {
            this.canShoot = false;
            const bullet = new Bullet(this.x, this.y, this.direction);
            gameState.entities.push(bullet);
            if (gameState.sound) gameState.sound.playShoot();
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
                if (gameState.sound) gameState.sound.playDig();

                // Collect Emeralds / Coins
                for (let e of gameState.entities) {
                    if (e.logicalX === this.logicalX && e.logicalY === this.logicalY) {
                        if (e.type === 'EMERALD') {
                            gameState.score += 25;
                            e.isDead = true;
                            gameState.emeraldStreak = (gameState.emeraldStreak || 0) + 1;
                            if (gameState.emeraldStreak % 8 === 0) {
                                gameState.score += 250; // 8-in-a-row bonus!
                                if (gameState.sound) gameState.sound.playBonus();
                            }
                            if (gameState.sound) gameState.sound.playGem();
                        } else if (e.type === 'COIN') {
                            gameState.score += 1;
                            e.isDead = true;
                            if (gameState.sound) gameState.sound.playCoin();
                        } else if (e.type === 'CHERRY') {
                            gameState.score += 1000;
                            gameState.bonusTimer = 10000;
                            e.isDead = true;
                            if (gameState.sound) gameState.sound.playBonus();
                        }
                    }
                }
            } else {
                // Interpolation glide — carve only while moving
                this.x += (dx / dist) * moveAmt;
                this.y += (dy / dist) * moveAmt;
                gameState.map.carve(this.x, this.y);
            }
        }

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
                    let pushingBag = false;
                    for (let e of gameState.entities) {
                        if (e.type === 'GOLDBAG' && e.logicalX === nextX && e.logicalY === nextY) {
                            if (e.push(moveDirX, moveDirY, gameState)) {
                                pathBlocked = false;
                                pushingBag = true;
                                // Speed reduction: slight if open air beyond, heavy if dirt beyond
                                const beyondX = nextX + moveDirX;
                                const beyondY = nextY + moveDirY;
                                const isBeyondDirt = gameState.map.getTile(beyondX, beyondY) !== 0;
                                this.speed = isBeyondDirt ? 0.055 : 0.08;
                            } else {
                                pathBlocked = true;
                            }
                        }
                    }
                    if (!pushingBag) this.speed = this.baseSpeed;

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
