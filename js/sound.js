// js/sound.js — Procedural 8-bit Sound Engine using the Web Audio API
// All sounds are synthesized mathematically — zero audio files required!

export class SoundManager {
    constructor() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {
            console.warn('Web Audio API not supported:', e);
            this.ctx = null;
        }
    }

    _play(type, frequency, duration, gainLevel = 0.3, frequencyEnd = null) {
        if (!this.ctx) return;

        // Resume context if suspended (browser autoplay policy)
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.ctx.currentTime);

        // Optional frequency sweep for retro sounds
        if (frequencyEnd !== null) {
            oscillator.frequency.exponentialRampToValueAtTime(frequencyEnd, this.ctx.currentTime + duration);
        }

        gainNode.gain.setValueAtTime(gainLevel, this.ctx.currentTime);
        // Fade out at end to prevent clicking
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        oscillator.start(this.ctx.currentTime);
        oscillator.stop(this.ctx.currentTime + duration);
    }

    // Short crunchy dig effect — low-pitch square wave burp
    playDig() {
        this._play('square', 120, 0.08, 0.15, 60);
    }

    // Bright gem collection ting — high-pitched square blip ascending
    playGem() {
        this._play('square', 600, 0.12, 0.2, 1200);
    }

    // Gold bag shatter — harsh sawtooth descending rumble
    playBagShatter() {
        this._play('sawtooth', 300, 0.2, 0.3, 60);
    }

    // Enemy kill — satisfying ascending pop
    playEnemyKill() {
        this._play('square', 200, 0.15, 0.25, 600);
    }

    // Player death — dramatic descending sawtooth explosion
    playDeath() {
        this._play('sawtooth', 440, 0.05, 0.3);
        setTimeout(() => this._play('sawtooth', 300, 0.1, 0.3, 80), 60);
        setTimeout(() => this._play('sawtooth', 150, 0.15, 0.3, 40), 150);
    }

    // Cherry bonus — triumphant ascending arpeggio
    playBonus() {
        const notes = [261, 329, 392, 523]; // C, E, G, C octave
        notes.forEach((hz, i) => {
            setTimeout(() => this._play('square', hz, 0.15, 0.25), i * 80);
        });
    }

    // Shoot bullet — quick high laser zap
    playShoot() {
        this._play('sawtooth', 800, 0.1, 0.15, 200);
    }

    // Coin collect — tiny tick
    playCoin() {
        this._play('square', 900, 0.05, 0.1);
    }
}
