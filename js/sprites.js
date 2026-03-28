// js/sprites.js
import { TILE_SIZE } from './map.js';

const ASSET_PATHS = {
    'digger': 'assets/digger.png',
    'nobbin': 'assets/nobbin.png',
    'hobbin': 'assets/hobbin.png',
    'goldbag': 'assets/goldbag.png',
    'emerald': 'assets/emerald.png'
};

export class SpriteManager {
    constructor() {
        this.sprites = new Map();
        this.loaded = false;
    }

    async loadAll() {
        const promises = [];
        for (let [id, path] of Object.entries(ASSET_PATHS)) {
            promises.push(this.loadImageAndChromaKey(id, path));
        }
        await Promise.all(promises);
        
        // Generate fallback logic for non-DALL-E items (Coin/Bullet) dynamically
        this.generateFallbacks();
        
        this.loaded = true;
    }

    loadImageAndChromaKey(id, path) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = path;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                // AI black background compression artifact eraser
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i] < 20 && data[i+1] < 20 && data[i+2] < 20) {
                        data[i+3] = 0; // Map pure black to complete invisible transparency
                    }
                }
                ctx.putImageData(imageData, 0, 0);

                this.sprites.set(id, canvas);
                
                // Polyfill for rigid 2-frame loop request dependencies
                this.sprites.set(`${id}1`, canvas);
                this.sprites.set(`${id}2`, canvas);
                
                if (id === 'digger') {
                    for (let dir of ['Right', 'Left', 'Up', 'Down']) {
                        this.sprites.set(`digger${dir}1`, canvas);
                        this.sprites.set(`digger${dir}2`, canvas);
                    }
                }
                resolve();
            };
        });
    }

    generateFallbacks() {
        // Coin Fallback (Scattered Pixel Cluster)
        const coin = document.createElement('canvas');
        coin.width = TILE_SIZE; coin.height = TILE_SIZE;
        const cCtx = coin.getContext('2d');
        const drawCoin = (cx, cy) => {
            cCtx.fillStyle = '#FFD700'; 
            cCtx.fillRect(cx - 6, cy - 6, 12, 12);
            cCtx.fillStyle = '#FFFFFF'; // Bright glint
            cCtx.fillRect(cx - 4, cy - 4, 4, 4);
        };
        drawCoin(12, 16); drawCoin(28, 14); drawCoin(20, 26);
        this.sprites.set('coin1', coin);
        this.sprites.set('coin2', coin);

        // RIP Tombstone Fallback (Pixel-Blocky Arch)
        const rip = document.createElement('canvas');
        rip.width = TILE_SIZE; rip.height = TILE_SIZE;
        const rCtx = rip.getContext('2d');
        rCtx.fillStyle = '#888888';
        rCtx.fillRect(4, 12, 32, 28);
        rCtx.fillRect(8, 4, 24, 8); // Stepped arch
        
        // Cyan pixel cracks
        rCtx.fillStyle = '#00FFFF';
        rCtx.fillRect(12, 12, 4, 4); rCtx.fillRect(16, 16, 4, 8);
        rCtx.fillRect(28, 8, 4, 4);
        
        rCtx.fillStyle = '#000000';
        rCtx.font = 'bold 12px "Courier New"';
        rCtx.fillText('RiP', 9, 28);
        this.sprites.set('rip1', rip);
        this.sprites.set('rip2', rip);

        // Bullet Fallback
        const bullet = document.createElement('canvas');
        bullet.width = TILE_SIZE; bullet.height = TILE_SIZE;
        const bCtx = bullet.getContext('2d');
        bCtx.fillStyle = '#FFFFFF';
        bCtx.fillRect(TILE_SIZE/2 - 4, TILE_SIZE/2 - 4, 8, 8);
        this.sprites.set('bullet1', bullet);
        this.sprites.set('bullet2', bullet);

        // Cherry Fallback (Pixel-Blocky Stem)
        const cherry = document.createElement('canvas');
        cherry.width = TILE_SIZE; cherry.height = TILE_SIZE;
        const chCtx = cherry.getContext('2d');
        chCtx.fillStyle = '#FF0033'; // Deep Red
        chCtx.fillRect(12, 18, 16, 16);
        chCtx.fillStyle = '#00FF00'; // Green stem
        chCtx.fillRect(20, 8, 4, 10);
        chCtx.fillRect(24, 4, 8, 4);
        this.sprites.set('cherry1', cherry);
        this.sprites.set('cherry2', cherry);
    }

    get(spriteId) {
        return this.sprites.get(spriteId);
    }
}
