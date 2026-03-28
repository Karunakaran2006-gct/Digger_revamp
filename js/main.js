// js/main.js
import { Renderer } from './renderer.js';
import { GameMap } from './map.js';
import { Player } from './player.js';
import { SpriteManager } from './sprites.js';
import { ScoreManager } from './score.js';
import { Emerald } from './emerald.js';
import { GoldBag } from './goldbag.js';
import { Monster } from './nobbin.js';
import { Cherry } from './cherry.js';
import { MAP_COLS, MAP_ROWS, TILE_TYPES, TILE_SIZE } from './map.js';
import { SoundManager } from './sound.js';

const STATE = { MENU: 0, PLAYING: 1, OVER: 2 };

class Game {
    constructor() {
        this.state = STATE.MENU;
        this.renderer = null; 
        this.lastTime = 0;
        
        this.spriteManager = new SpriteManager();
        this.gameMap = new GameMap();
        this.player = null;
        
        this.gameState = {
            map: this.gameMap,
            player: null,
            sprites: this.spriteManager,
            entities: [],
            score: 0,
            lives: 3,
            difficulty: 'Medium',
            sound: new SoundManager()
        };

        this.loop = this.loop.bind(this);
        this.setupUI();
    }

    setupUI() {
        document.getElementById('btn-easy').addEventListener('click', () => this.startGame('Easy'));
        document.getElementById('btn-medium').addEventListener('click', () => this.startGame('Medium'));
        document.getElementById('btn-hard').addEventListener('click', () => this.startGame('Hard'));
        document.getElementById('btn-home').addEventListener('click', () => this.showMenu());
    }

    showMenu() {
        this.state = STATE.MENU;
        document.getElementById('home-screen').style.display = 'flex';
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('overlay-screen').style.display = 'none';
        document.getElementById('high-score-display').innerText = `HIGH SCORE: ${ScoreManager.getHighScore().padStart(6, '0')}`;
        this.gameState.entities = [];
    }

    gameOver(isWin) {
        this.state = STATE.OVER;
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('overlay-screen').style.display = 'flex';
        
        let titleEle = document.getElementById('overlay-title');
        let msgEle = document.getElementById('overlay-message');

        if (isWin) {
            titleEle.innerText = "YOU WON!";
            titleEle.style.color = "#00FFCC";
        } else {
            titleEle.innerText = "GAME OVER";
            titleEle.style.color = "#FF0000";
        }
        
        ScoreManager.saveHighScore(this.gameState.score);
        msgEle.innerHTML = `Final Score: ${this.gameState.score}<br>High Score: ${ScoreManager.getHighScore()}`;
    }

    async startGame(difficulty) {
        if (!this.renderer) {
            this.renderer = new Renderer('game-canvas');
        }

        // Await high fidelity async PNG buffer caching explicitly
        if (!this.spriteManager.loaded) {
            await this.spriteManager.loadAll();
        }
        
        this.gameState.difficulty = difficulty;
        this.gameState.score = 0;
        this.gameState.lives = 3;
        this.gameState.level = 1;
        this.loadLevel();
    }

    loadLevel() {
        this.gameState.entities = [];
        this.gameState.time = 0;
        this.gameState.globalFrame = 1;
        this.gameState.bonusTimer = 0;
        this.gameState.cherrySpawned = false;
        this.gameState.monstersToSpawn = 0;
        this.gameState.spawnTimer = 0;
        this.updateHUD();

        this.gameMap.loadRandomMap();
        
        // Spawn Entities Logic tightly aligned to Map Layout definitions
        this.gameState.totalEmeralds = 0;
        for (let y = 0; y < MAP_ROWS; y++) {
            for (let x = 0; x < MAP_COLS; x++) {
                let cell = this.gameMap.baseLayout[y][x];
                if (cell === 'E') {
                    this.gameState.entities.push(new Emerald(x, y));
                    this.gameState.totalEmeralds++;
                } else if (cell === 'B') {
                    this.gameState.entities.push(new GoldBag(x, y));
                }
            }
        }

        // Spawn 3 nobbins from level 1, more as levels progress
        const level = this.gameState.level || 1;
        const monsterCount = Math.min(2 + level, 6); // Level 1 = 3, Level 2 = 4, max 6
        for (let i = 0; i < monsterCount; i++) {
            const spawnDelay = i === 0 ? 0 : (1500 * i);
            const m = new Monster(14, 1, spawnDelay);
            // Only first `level` monster(s) can transform to Hobbin
            if (i >= level) {
                m.mutationTimer = 9999999;
            }
            this.gameState.entities.push(m);
        }

        if (!this.player) this.player = new Player(7, 13);
        else { this.player.isDead = false; this.player.logicalX = 7; this.player.logicalY = 13; this.player.x = 7 * TILE_SIZE; this.player.y = 13 * TILE_SIZE; }
        this.gameState.player = this.player;

        document.getElementById('home-screen').style.display = 'none';
        document.getElementById('overlay-screen').style.display = 'none';
        document.getElementById('game-container').style.display = 'flex';
        
        this.state = STATE.PLAYING;
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);
    }

    updateHUD() {
        document.getElementById('score').innerText = `SCORE: ${this.gameState.score.toString().padStart(5, '0')}`;
        document.getElementById('lives').innerText = `LIVES: ${this.gameState.lives}`;
    }

    update(dt) {
        if (this.state !== STATE.PLAYING) return;
        
        this.gameState.time += dt;
        this.gameState.globalFrame = Math.floor(this.gameState.time / 150) % 2 === 0 ? 1 : 2;

        this.player.update(dt, this.gameState);
        
        let emeraldStr = 0;
        for (let i = this.gameState.entities.length - 1; i >= 0; i--) {
            let e = this.gameState.entities[i];
            if (e.update) e.update(dt, this.gameState);
            if (e.type === 'EMERALD' && !e.isDead) emeraldStr++;
            
            if (e.isDead) {
                // Register killed monsters to infinite spigot
                if (e.type === 'NOBBIN' || e.type === 'HOBBIN') {
                    this.gameState.monstersToSpawn++;
                }
                this.gameState.entities.splice(i, 1);
            }
        }

        // Infinite Monster Wave Spigot
        if (this.gameState.monstersToSpawn > 0) {
            this.gameState.spawnTimer += dt;
            if (this.gameState.spawnTimer > 4000) {
                this.gameState.entities.push(new Monster(14, 1, 0));
                this.gameState.monstersToSpawn--;
                this.gameState.spawnTimer = 0;
            }
        }

        if (this.gameState.score >= 1000 && !this.gameState.cherrySpawned) {
            this.gameState.cherrySpawned = true;
            this.gameState.entities.push(new Cherry(14, 1));
            if (this.gameState.sound) this.gameState.sound.playBonus();
        }

        if (this.gameState.bonusTimer > 0) this.gameState.bonusTimer -= dt;

        // Level Progression loop
        if (emeraldStr === 0 && this.gameState.totalEmeralds > 0) {
            this.gameState.level++;
            // Restart cycle without dying
            this.loadLevel();
            return;
        }

        // Death State (Dramatic Pause)
        if (this.player.isDead) {
            this.gameState.deathTimer = (this.gameState.deathTimer || 0) + dt;
            if (this.gameState.deathTimer > 2000) {
                this.gameState.lives--;
                if (this.gameState.lives <= 0) {
                    this.gameOver(false);
                } else {
                    this.player = new Player(1, 1);
                    this.gameState.player = this.player;
                    this.gameState.deathTimer = 0;
                    
                    // Reset Nobbins positions cleanly
                    for (let e of this.gameState.entities) {
                        if (e.type === 'NOBBIN' || e.type === 'HOBBIN') {
                            e.logicalX = 14;
                            e.logicalY = 1;
                            e.x = e.logicalX * TILE_SIZE;
                            e.y = e.logicalY * TILE_SIZE;
                            e.isMoving = false;
                            e.isDead = false;
                        }
                    }
                }
            }
            return; // Freeze entities natively during RIP view
        }
    }

    loop(timestamp) {
        if (this.state !== STATE.PLAYING) return;

        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (dt < 100) {
            this.update(dt);
            this.renderer.render(this.gameState);
            // Sync HUD inside frame
            this.updateHUD();
        }

        requestAnimationFrame(this.loop);
    }
}

window.onload = () => {
    const game = new Game();
};
