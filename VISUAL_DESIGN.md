# Visual Design & Map System — Full Technical Reference
*Digger HD Remake: Presentation Documentation*

---

## Part 1: The Rendering Pipeline

### How the screen gets drawn — every single frame

The entire game renders on a single **HTML5 Canvas element** (`<canvas id="game-canvas" width="640" height="640">`). No CSS backgrounds, no HTML images, no SVG — everything is drawn by a single JavaScript class called `Renderer` inside `js/renderer.js`.

Every 16ms (60 times per second), the `loop()` in `main.js` fires `renderer.render(gameState)`. The renderer executes the following **strict draw order** (called the "Painter's Algorithm" — back layers first, front layers on top):

```
1. Black Canvas Wipe     → fillRect(0, 0, 640, 640) clears the frame
2. Dirt Layer            → draws the offscreen dirtCanvas texture
3. Entities              → Emeralds, Goldbags, Coins, Bullets, Cherry, Monsters
4. Player (Digger)       → drawn last so it always appears on top of everything
```

---

## Part 2: The Map System

### Grid Architecture

The game world is a **16 × 16 logical grid** of tiles. Each tile in the grid is rendered at exactly **40 × 40 pixels** on screen, giving a total canvas size of **640 × 640 pixels**.

```
TILE_SIZE = 40px
MAP_COLS  = 16
MAP_ROWS  = 16
Canvas    = 640 × 640px
```

Every tile in the grid holds one of two logical values from `TILE_TYPES`:
- `TILE_TYPES.DIRT (1)` — Solid mud. Blocks Nobbins. Can be dug by Digger or a Hobbin.
- `TILE_TYPES.AIR (0)` — Empty tunnel. Characters can move freely.

### The Map String Language

The map is written as a **hand-coded ASCII string array** inside `js/map.js`. Each character directly defines what spawns at that grid coordinate:

| Character | Meaning |
|-----------|---------|
| `D` | Solid Dirt tile |
| `.` | Empty Air tunnel |
| `E` | Dirt tile containing a hidden Emerald |
| `B` | Dirt tile containing a hidden Gold Bag |

```javascript
// Example Map Row (Row 2, y=2):
'D.DD.DEEED.DDE.D'
//  ↑        ↑
//  Air     Emeralds embedded in solid Dirt
```

When the game loads, `loadMapData()` reads every character. `E` and `B` tiles are recorded as `DIRT` in the logical grid (so they are solid walls visually), but `main.js` separately scans `baseLayout` to spawn Emerald and GoldBag entities exactly at those coordinates. The player must physically dig through the dirt to reach them — just like the 1983 arcade original!

---

## Part 3: The Procedural Dirt Texture Shader

### No image files — pure mathematics

The entire brown/red wavy dirt pattern you see is **synthesized pixel-by-pixel using trigonometry** inside `generateDirtLayer()` in `js/map.js`. No texture PNG is ever loaded.

Here is how:

```javascript
// For every single pixel in the 640×640 canvas:
let waveY = y + Math.sin(x * 0.1) * 3;
let isStriped = Math.floor(waveY / 4) % 2 === 0;
```

**Step by step:**
1. For every pixel at `(x, y)`, check if its grid tile is `DIRT`.
2. Add a small horizontal sine wave offset: `Math.sin(x * 0.1) * 3`. This shifts the horizontal stripes slightly left and right creating the authentic wavy lines.
3. Divide by 4 and check even/odd: this groups pixels into 4-pixel-thick alternating bands.
4. Even bands → **Dark Brown** `#8B4513` `(RGB: 139, 69, 19)`
5. Odd bands → **Dark Red** `#8B0000` `(RGB: 139, 0, 0)`
6. AIR tiles → Alpha `= 0` (fully transparent — the black canvas beneath shows through as tunnels).

This entire operation runs **once on level load** and writes into an `OffscreenCanvas` stored in `gameState.map.dirtCanvas`. The renderer `drawImage(dirtCanvas, 0, 0)` composites it onto the main canvas every frame in one GPU-accelerated blit — zero performance cost at runtime!

---

## Part 4: The Tunnel Carving System (Dual-Layer Architecture)

This is the most advanced visual feature: the dirt layer is deliberately separated into two independent systems:

### Layer 1: The Logical Grid (`map.grid[][]`)
- A simple 2D array of `0` and `1` integers.
- Updated by `dig(x, y)` — sets tile to `AIR` when Digger arrives at a new tile.
- Used exclusively for **pathfinding and collision logic**. Nobbins read this to decide where they can walk.

### Layer 2: The Visual Canvas (`map.dirtCanvas`)
- An HTML5 OffscreenCanvas holding the rendered pixel art texture.
- Updated by `carve(px, py)` — called every single animation frame during movement.
- Uses `globalCompositeOperation = 'destination-out'` to punch a smooth circular hole through the canvas pixels at Digger's floating sub-pixel coordinates.

```javascript
// carve() fires every ~16ms as Digger glides:
dirtCtx.globalCompositeOperation = 'destination-out';
dirtCtx.arc(px + 20, py + 20, 22, 0, Math.PI*2); // 22px radius circle
dirtCtx.fill();
```

**Why this matters:** Because `carve()` runs every frame at Digger's interpolated floating pixel X/Y (not snapped to grid), the tunnel hole grows organically and smoothly as Digger glides, instead of popping in as rigid 40×40 squares. This is what makes the digging feel fluid!

---

## Part 5: The Sprite System

### DALL-E Asset Pipeline (Chromakey Shader)

Five character sprites are external DALL-E generated PNG files stored in `assets/`:

| File | Entity |
|------|--------|
| `assets/digger.png` | The player character |
| `assets/nobbin.png` | Basic enemy |
| `assets/hobbin.png` | Advanced enemy (can dig) |
| `assets/goldbag.png` | Falling gold bag |
| `assets/emerald.png` | Collectible gem |

When the game loads, `SpriteManager.loadAll()` fetches all five PNGs and runs each through a **custom Chromakey Shader**:

```javascript
// For every pixel in the loaded PNG:
if (R < 20 && G < 20 && B < 20) {
    Alpha = 0; // Black background → invisible
}
```

This strips the solid black background that DALL-E generates around every character, creating dynamically transparent sprites without needing Photoshop. The processed sprites are cached as `OffscreenCanvas` objects in a JavaScript `Map()` for instant retrieval every frame.

### Procedural Fallback Sprites

Items with no DALL-E PNG (Coins, Cherry, Bullets, RIP tombstone) are **drawn programmatically** in `generateFallbacks()` using Canvas `fillRect()` primitives at initialization, producing authentic pixel-art shapes with zero external files.

---

## Part 6: The Affine Animation System

### Canvas Matrix Transformations for Digger direction

All character animations use **Canvas matrix transforms** (`ctx.save()` / `ctx.translate()` / `ctx.rotate()` / `ctx.scale()` / `ctx.restore()`) rather than sprite sheets. This means a single PNG produces all directional states:

| Digger Direction | Canvas Operation |
|------------------|-----------------|
| Left (native facing) | No transform |
| Right | `ctx.scale(-1, 1)` — horizontal mirror |
| Up | `ctx.rotate(+90°)` |
| Down | `ctx.rotate(-90°)` |
| Digging (any direction) | Additional `ctx.rotate(0.15 * Math.sin(time * 0.02))` wobble |

### Nobbin/Hobbin Squash & Stretch

While enemies are moving, the renderer adds a living squash-and-stretch animation:

```javascript
let stretch = 1 + 0.1 * Math.sin(time * 0.015); // 10% scale pulse X
let squash  = 1 - 0.1 * Math.sin(time * 0.015); // Inverse pulse Y
ctx.scale(stretch, squash);
```

This creates the bouncy, organic "alive" feel without any additional image assets.

---

## Summary Table

| System | Technology | File |
|--------|-----------|------|
| Game Loop | `requestAnimationFrame` 60 FPS | `main.js` |
| Map Grid Logic | 2D integer array | `map.js` |
| Dirt Texture | Math sine-wave pixel shader | `map.js` |
| Tunnel Carving | `destination-out` compositing | `map.js` |
| Sprite Loading | Async PNG + Chromakey shader | `sprites.js` |
| Procedural Sprites | Canvas `fillRect` primitives | `sprites.js` |
| Character Rendering | Canvas Affine Matrix transforms | `renderer.js` |
| Enemy Animation | Squash-and-stretch scale matrix | `renderer.js` |
| Sound Effects | Web Audio API OscillatorNode | `sound.js` |
