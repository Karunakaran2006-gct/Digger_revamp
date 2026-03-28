// js/renderer.js
import { TILE_SIZE } from './map.js';

export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    clear() {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    render(gameState) {
        this.clear();

        // Draw Map procedural dirt layers (Rigid anti-aliasing)
        this.ctx.imageSmoothingEnabled = false;
        if (gameState.map.dirtCanvas) {
            this.ctx.drawImage(gameState.map.dirtCanvas, 0, 0);
        }

        // Draw AI High-Fidelity Entities (Smoothing ON to scale 1024 -> 48 cleanly)
        this.ctx.imageSmoothingEnabled = true;

        const frame = gameState.globalFrame || 1;

        if (gameState.entities) {
            for (let e of gameState.entities) {
                if (e.spriteId) {
                    const renderId = `${e.spriteId}${frame}`;
                    const sprite = gameState.sprites.get(renderId);
                    
                    if (sprite) {
                        this.ctx.save();
                        // Anchor at physical center of the dynamic scale tile
                        this.ctx.translate(Math.round(e.x) + TILE_SIZE/2, Math.round(e.y) + TILE_SIZE/2);
                        
                        // Bounce/Squash AI Animation
                        if (e.type === 'NOBBIN' || e.type === 'HOBBIN') {
                            if (e.isMoving) {
                                let stretch = 1 + 0.1 * Math.sin(gameState.time * 0.015);
                                let squash = 1 - 0.1 * Math.sin(gameState.time * 0.015);
                                this.ctx.scale(stretch, squash);
                            }
                            // User request: "increase the nobbin/hobbin size a bit not too big" -> rendered at 56x56 (1.4x scale over 40)
                            this.ctx.drawImage(sprite, -28, -28, 56, 56);
                        } else {
                            // Standard 16x16 40px grid scaling -> drawn at 48x48
                            this.ctx.drawImage(sprite, -24, -24, 48, 48);
                        }

                        this.ctx.restore();
                    }
                }
            }
        }

        const p = gameState.player;
        if (p) {
            const spriteId = p.isDead ? `rip${frame}` : `digger${p.direction}${frame}`;
            const playerSprite = gameState.sprites.get(spriteId);
            
            if (playerSprite) {
                this.ctx.save();
                this.ctx.translate(Math.round(p.x) + TILE_SIZE/2, Math.round(p.y) + TILE_SIZE/2);
                
                if (!p.isDead) {
                    // Native Base Model faces LEFT
                    if (p.direction === 'Right') {
                        this.ctx.scale(-1, 1);
                    } else if (p.direction === 'Up') {
                        this.ctx.rotate(Math.PI / 2);
                    } else if (p.direction === 'Down') {
                        this.ctx.rotate(-Math.PI / 2);
                    }

                    // Digging Wobble
                    if (p.isMoving) {
                        this.ctx.rotate(0.15 * Math.sin(gameState.time * 0.02));
                    }
                }

                this.ctx.drawImage(playerSprite, -24, -24, 48, 48);
                this.ctx.restore();
            }
        }
    }
}
