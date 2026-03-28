// js/score.js
export class ScoreManager {
    static getHighScore() {
        return localStorage.getItem('digger_highscore') || '000000';
    }

    static saveHighScore(score) {
        const current = parseInt(this.getHighScore(), 10);
        if (score > current) {
            localStorage.setItem('digger_highscore', score.toString().padStart(6, '0'));
            return true;
        }
        return false;
    }
}
