// js/nobbin.js
import { TILE_SIZE, MAP_COLS, MAP_ROWS, TILE_TYPES } from './map.js';

export class Monster {
    constructor(logicalX, logicalY, spawnDelayMs = 0) {
        this.type = 'NOBBIN';
        this.logicalX = logicalX;
        this.logicalY = logicalY;
        this.x = logicalX * TILE_SIZE;
        this.y = logicalY * TILE_SIZE;
        this.isDead = false;
        this.spriteId = 'nobbin';
        
        this.targetX = logicalX;
        this.targetY = logicalY;
        this.isMoving = false;
        this.speed = 0.0875;

        this.spawnDelay = spawnDelayMs; // Staggered entry

        // Hobbin Mutation
        this.mutationTimer = 3000 + (Math.random() * 8000); // Trigger in 3 to 11s
        this.isHobbin = false;
        this.hobbinDuration = 5000;
    }

    kill(gameState) {
        this.isDead = true;
        gameState.score += 250;
        if (gameState.sound) gameState.sound.playEnemyKill();
    }

    setTargetDirection(dx, dy) {
        const nextX = this.logicalX + dx;
        const nextY = this.logicalY + dy;
        if (nextX >= 0 && nextX < MAP_COLS && nextY >= 0 && nextY < MAP_ROWS) {
            this.targetX = nextX;
            this.targetY = nextY;
            this.isMoving = true;
        }
    }

    update(dt, gameState) {
        if (this.isDead) return;

        // Sequence Spawning logic
        if (this.spawnDelay > 0) {
            this.spawnDelay -= dt;
            return; // Wait inside the spawner
        }

        // Mutation Timers
        if (!this.isHobbin) {
            this.mutationTimer -= dt;
            if (this.mutationTimer <= 0) {
                this.isHobbin = true;
                this.type = 'HOBBIN';
                this.spriteId = 'hobbin';
                this.hobbinDuration = 5000;
            }
        } else {
            this.hobbinDuration -= dt;
            if (this.hobbinDuration <= 0) {
                this.isHobbin = false;
                this.type = 'NOBBIN';
                this.spriteId = 'nobbin';
                this.mutationTimer = 5000 + Math.random() * 10000;
            }
        }

        // Movement Interpolation
        if (this.isMoving) {
            const tx = this.targetX * TILE_SIZE;
            const ty = this.targetY * TILE_SIZE;

            const dx = tx - this.x;
            const dy = ty - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const moveAmt = this.speed * dt;

            if (dist <= moveAmt) {
                this.x = tx;
                this.y = ty;
                this.logicalX = this.targetX;
                this.logicalY = this.targetY;
                this.isMoving = false;
                
                // Hobbin World Interaction Phase! - Dig visually AND logically
                if (this.isHobbin) {
                    if (gameState.map.getTile(this.logicalX, this.logicalY) === TILE_TYPES.DIRT) {
                        gameState.map.setTile(this.logicalX, this.logicalY, TILE_TYPES.AIR);
                        // Also visually erase the dirt canvas so Nobbin doesn't appear to ghost
                        gameState.map.carve(this.x, this.y);
                        if (gameState.sound) gameState.sound.playDig();
                    }
                    for (let e of gameState.entities) {
                        if ((e.type === 'GOLDBAG' || e.type === 'EMERALD') && e !== this && Math.round(e.logicalX) === this.logicalX && Math.round(e.logicalY) === this.logicalY) {
                            if (e.destroy) e.destroy();
                        }
                    }
                }
            } else {
                this.x += (dx / dist) * moveAmt;
                this.y += (dy / dist) * moveAmt;
            }

            // Player collision
            if (gameState.player && !gameState.player.isDead) {
                const pdx = Math.abs(this.x - gameState.player.x);
                const pdy = Math.abs(this.y - gameState.player.y);
                if (pdx < 24 && pdy < 24) {
                    if (gameState.bonusTimer > 0) {
                        this.kill(gameState); // Hunted by powered up Digger
                    } else {
                        gameState.player.isDead = true;
                    }
                }
            }

            return; // Busy moving
        }

        if (!gameState.player || gameState.player.isDead) return;

        // Logic Step - 1. Separation / Anti-Clumping
        let sepDx = 0, sepDy = 0;
        let tooClose = false;

        for (let peer of gameState.entities) {
            if ((peer.type === 'NOBBIN' || peer.type === 'HOBBIN') && peer !== this && peer.spawnDelay <= 0) {
                let mDist = Math.abs(this.logicalX - peer.logicalX) + Math.abs(this.logicalY - peer.logicalY);
                if (mDist < 3) {
                    sepDx += (this.logicalX - peer.logicalX);
                    sepDy += (this.logicalY - peer.logicalY);
                    tooClose = true;
                }
            }
        }

        if (tooClose && !this.isHobbin) {
            let mX = Math.sign(sepDx);
            let mY = Math.sign(sepDy);

            if (mX === 0 && mY === 0) {
                // Perfectly stacked — pick a random open direction
                const rndDirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
                for (let d of rndDirs.sort(() => 0.5 - Math.random())) {
                    if (this.canNobbinWalk(this.logicalX + d.x, this.logicalY + d.y, gameState)) {
                        this.setTargetDirection(d.x, d.y);
                        return;
                    }
                }
                return;
            }

            const dirs = [
                {x: mX, y: 0}, {x: 0, y: mY},
                {x: -mX, y: 0}, {x: 0, y: -mY},
                {x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}
            ];
            for (let d of dirs) {
                if (d.x === 0 && d.y === 0) continue;
                if (this.canNobbinWalk(this.logicalX + d.x, this.logicalY + d.y, gameState)) {
                    this.setTargetDirection(d.x, d.y);
                    return;
                }
            }
            return;
        }

        // Logic Step - 2. Chase or Flee
        let dxToPlayer = gameState.player.logicalX - this.logicalX;
        let dyToPlayer = gameState.player.logicalY - this.logicalY;

        // Pac-Man Ghost Reversal logic
        if (gameState.bonusTimer > 0) {
            dxToPlayer = -dxToPlayer;
            dyToPlayer = -dyToPlayer;
        }

        if (this.isHobbin) {
            // Greedy Attack
            let prefX = Math.abs(dxToPlayer) > Math.abs(dyToPlayer) ? Math.sign(dxToPlayer) : 0;
            let prefY = prefX === 0 ? Math.sign(dyToPlayer) : 0;
            
            if (prefX !== 0 || prefY !== 0) {
                 this.setTargetDirection(prefX, prefY);
            }
        } else {
            // Greedy BFS style movement restricted to AIR
            let prefX = Math.abs(dxToPlayer) > Math.abs(dyToPlayer) ? Math.sign(dxToPlayer) : 0;
            let prefY = Math.abs(dxToPlayer) <= Math.abs(dyToPlayer) ? Math.sign(dyToPlayer) : 0;

            if (prefX !== 0 && this.canNobbinWalk(this.logicalX + prefX, this.logicalY, gameState)) {
                this.setTargetDirection(prefX, 0);
            } else if (prefY !== 0 && this.canNobbinWalk(this.logicalX, this.logicalY + prefY, gameState)) {
                this.setTargetDirection(0, prefY);
            } else if (prefX !== 0 && this.canNobbinWalk(this.logicalX - prefX, this.logicalY, gameState)) {
                this.setTargetDirection(-prefX, 0);
            } else if (prefY !== 0 && this.canNobbinWalk(this.logicalX, this.logicalY - prefY, gameState)) {
                this.setTargetDirection(0, -prefY);
            } else {
                // If completely stuck on greedy logic, pick a random open tile to shimmy out
                const dirs = [{x:1, y:0}, {x:-1, y:0}, {x:0, y:1}, {x:0, y:-1}];
                const open = dirs.filter(d => this.canNobbinWalk(this.logicalX + d.x, this.logicalY + d.y, gameState));
                if (open.length > 0) {
                    const rnd = open[Math.floor(Math.random() * open.length)];
                    this.setTargetDirection(rnd.x, rnd.y);
                }
            }
        }
    }

    canNobbinWalk(x, y, gameState) {
        if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return false;
        if (gameState.map.getTile(x, y) === TILE_TYPES.DIRT) return false;
        
        for (let e of gameState.entities) {
            if (e.type === 'GOLDBAG' && e.logicalX === x && e.logicalY === y) return false;
        }
        return true;
    }
}
