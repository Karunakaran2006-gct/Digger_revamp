// js/map.js

export const TILE_SIZE = 40;
export const MAP_COLS = 16;
export const MAP_ROWS = 16;

export const TILE_TYPES = {
    AIR: 0,
    DIRT: 1
};

// Map arrays: 'D' for Dirt, '.' for Air, 'E' for Emerald in Dirt, 'B' for Bag inside Dirt!
// 'D'=dirt wall, '.'=open tunnel, 'e'=emerald in tunnel, 'b'=goldbag in tunnel
const MAP_POOL = [
    [ // Map A — L-shape left + big right corridor (matches reference image)
        'DDDDDDDDDDDDDDDD',
        'D..DDDbDDDDD...D',
        'D.eDDDDDDDDDe..D',
        'D.eDDDDDDDDDe..D',
        'D.eDbDDDDDDDe..D',
        'D.eeDDDDDDDBe..D',
        'D..eDDDDDDDDe..D',
        'D.........DDD..D',
        'DDDDDDDDDDDDe..D',
        'DDDDDDDDDDDDeB.D',
        'DDDDDDDDDDDDe..D',
        'DDDDDDDDDDDDee.D',
        'DDDDDDDDDDDD...D',
        'D.e..e.eB.e.e..D',
        'DDDDDDDDDDDDDDDD',
        'DDDDDDDDDDDDDDDD'
    ],
    [ // Map B — right-side heavy corridor with mid connector
        'DDDDDDDDDDDDDDDD',
        'D..DDDDDDDDDe..D',
        'D.eDDDDDDDDDe..D',
        'D.eDbDDDDDDBe..D',
        'D.eeDDDDDDDDe..D',
        'D..DDDDDDDDD...D',
        'DDDDD.DDDDDDD..D',
        'DDDDD.DDDDDDBe.D',
        'DDDDD.DDDDDDee.D',
        'DDDDD.DDDDDDe..D',
        'D.....DDDDDDe..D',
        'D..DDDDDDDDD...D',
        'D.eDDDDDDDDDe..D',
        'D..e.b.e.e.e...D',
        'DDDDDDDDDDDDDDDD',
        'DDDDDDDDDDDDDDDD'
    ],
    [ // Map C — double column tunnels with horizontal bridges
        'DDDDDDDDDDDDDDDD',
        'D..DDDDDDbDD...D',
        'D.eDDDDDDDDDe..D',
        'D.eDDDDDDDDDe..D',
        'D..............D',
        'D.eDbDDDDDDBe..D',
        'D.eeDDDDDDDDe..D',
        'D..eDDDDDDDDe..D',
        'D..............D',
        'DDDDDDDDDDDDeB.D',
        'DDDDDDDDDDDDe..D',
        'DDDDDDDDDDDDe..D',
        'DDDDDDDDDDDD...D',
        'D..e.e.b.e.e...D',
        'DDDDDDDDDDDDDDDD',
        'DDDDDDDDDDDDDDDD'
    ]
];

export class GameMap {
    constructor() {
        this.grid = [];
        this.dirtCanvas = null;
        this.dirtCtx = null;
    }

    loadRandomMap() {
        const poolIndex = Math.floor(Math.random() * MAP_POOL.length);
        this.loadMapData(MAP_POOL[poolIndex]);
    }

    loadMapData(mapStringArray) {
        this.grid = [];
        this.baseLayout = mapStringArray;
        for (let y = 0; y < MAP_ROWS; y++) {
            let row = [];
            for (let x = 0; x < MAP_COLS; x++) {
                let cell = mapStringArray[y] ? mapStringArray[y][x] : 'D';
                // Only 'D' is solid dirt — E and B are items placed in AIR tunnels
                if (cell === 'D') {
                    row.push(TILE_TYPES.DIRT);
                } else {
                    row.push(TILE_TYPES.AIR);
                }
            }
            this.grid.push(row);
        }
        this.generateDirtLayer();
    }

    getTile(x, y) {
        if (x >= 0 && x < MAP_COLS && y >= 0 && y < MAP_ROWS) {
            return this.grid[y][x];
        }
        return TILE_TYPES.DIRT; // Solid map boundary
    }

    setTile(x, y, type) {
        if (x >= 0 && x < MAP_COLS && y >= 0 && y < MAP_ROWS) {
            this.grid[y][x] = type;
        }
    }

    generateDirtLayer() {
        this.dirtCanvas = document.createElement('canvas');
        this.dirtCanvas.width = MAP_COLS * TILE_SIZE;
        this.dirtCanvas.height = MAP_ROWS * TILE_SIZE;
        this.dirtCtx = this.dirtCanvas.getContext('2d');

        const imageData = this.dirtCtx.createImageData(this.dirtCanvas.width, this.dirtCanvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % this.dirtCanvas.width;
            const y = Math.floor((i / 4) / this.dirtCanvas.width);
            
            const gridX = Math.floor(x / TILE_SIZE);
            const gridY = Math.floor(y / TILE_SIZE);

            if (this.grid[gridY] && this.grid[gridY][gridX] === TILE_TYPES.DIRT) {
                // Mathematical sine-wave generation for tight 4-pixel Wavy Stripes
                let waveY = y + Math.sin(x * 0.1) * 3;
                let isStriped = Math.floor(waveY / 4) % 2 === 0;
                
                if (isStriped) {
                    // Dark Brown `#8B4513`
                    data[i]     = 139;
                    data[i + 1] = 69;
                    data[i + 2] = 19;
                } else {
                    // Dark Red `#8B0000`
                    data[i]     = 139;
                    data[i + 1] = 0;
                    data[i + 2] = 0;
                }
                data[i + 3] = 255;
            } else {
                data[i + 3] = 0;
            }
        }
        
        this.dirtCtx.putImageData(imageData, 0, 0);
    }

    dig(logicalX, logicalY) {
        // Alias for setting to AIR, used specifically for logical map state tracking
        if (this.getTile(logicalX, logicalY) === TILE_TYPES.DIRT) {
            this.setTile(logicalX, logicalY, TILE_TYPES.AIR);
        }
    }

    carve(px, py) {
        // Physically carves the pixel data smoothly as Digger traverses the sub-tiles!
        if (this.dirtCtx) {
            this.dirtCtx.globalCompositeOperation = 'destination-out';
            this.dirtCtx.beginPath();
            this.dirtCtx.arc(px + TILE_SIZE/2, py + TILE_SIZE/2, TILE_SIZE/1.8, 0, Math.PI*2);
            this.dirtCtx.fill();
            this.dirtCtx.globalCompositeOperation = 'source-over';
        }
    }
}
