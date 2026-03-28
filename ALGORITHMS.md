# Essential Game Algorithms & Mechanics
*Technical Overview for the Digger HTML5 Engine Remake*

Below is the complete engineering breakdown of the core algorithms developed to modernize and recreate the classic mechanics using pure Mathematics and Front-End rendering APIs.

---

### 1. The Procedural Chromakey Shader (Alpha-Masking Matrix)
**Used For:** Loading Artificial Intelligence (DALL-E) Sprites dynamically.
**How it Works:** Rather than requiring pre-edited invisible PNGs, the `AssetLoader` scans the raw `1024x1024` pixel image buffer natively via `Canvas rendering grids`. We engineered an algorithm that manually reads every pixel's Red-Green-Blue (RGB) memory vector. If the vector is pure black (`#000000`), the algorithm forces the Alpha memory byte (`A`) to `0`, successfully generating real-time transparency across complex AI-generated character art entirely inside the browser.

### 2. Sub-Tile Physics (Linear Interpolation / LERP)
**Used For:** Achieving 60-FPS Silky Smooth Movement.
**How it Works:** Arcade original games teleport characters from block to block rigidly. We wrote a decoupled physics/logic engine where Digger logically targets a block (e.g. `X=7, Y=13`), but his physical render coordinates calculate the visual vector distance (`dx` and `dy`). The algorithm interpolates exactly how many `moveAmt = speed * deltaTime` fractions of pixels to drift across the screen, mimicking highly advanced modern physics engines exactly without physics libraries.

### 3. Continuous Organic Tunnel Carving (`destination-out` Compositing)
**Used For:** Creating the incredibly smooth mud-digging tunnels instead of jagged blocky cuts.
**How it Works:** In a lesser engine, traversing a 40x40 grid means you instantly delete one rigid 40x40 square of dirt from memory. We hooked the `GameMap.carve()` algorithm directly into the Sub-Tile interpolation physics loop. Every single frame (`16ms`), Digger drops a circular invisible stamp over the Canvas layer using `globalCompositeOperation = 'destination-out'`. This forces the graphics card to organically slice a perfectly smooth circle out of the dirt matching Digger's physical floating trajectory!

### 4. Greedy "Best-First" Grid Pathfinding AI
**Used For:** Nobbin tracking and relentless chasing behavior.
**How it Works:** Instead of destroying browser memory with a heavy A* (A-Star) search tree algorithm, our enemies utilize a highly optimized Greedy Vector equation. The Nobbins calculate exactly how far away Digger is on the X and Y bounds (`dxToPlayer`, `dyToPlayer`). They programmatically choose to move along whichever axis is longest. If they detect a solid dirt wall or Goldbag blocking their preferred algorithm, they auto-shimmy into the secondary axis routing perfectly around the maze structurally!

### 5. Anti-Clumping Vector Dispersion
**Used For:** Ensuring Enemies never overlap on exactly the same grid block visually.
**How it Works:** Since multiple Nobbins have the exact same "Greedy Pathfinding" algorithm, they would naturally merge into one giant character to hunt Digger. To fix this, we wrote a Repulsion Vector! The game continuously loops `mDist` between enemy coordinates. If two Nobbins realize they occupy the exact same matrix block, their math reverses (`mX = Math.sign(sepDx)`), explicitly forcing them to randomly burst outwardly into empty air adjacent spaces!

### 6. Mathematical Procedural Texture Synthesis
**Used For:** Recreating the classic Red/Brown wavy dirt patterns in stunning HD!
**How it Works:** We completely bypassed using a physical background image or loaded CSS. The entire map pixel pattern is explicitly run using Trigonometry inside `GameMap.js`. We use a high-frequency Sine wave formula: `Math.floor((y + Math.sin(x*0.1)*3) / 4) % 2 === 0` traversing the 640x640 pixel buffer layout. Because the drawing relies purely on Math, when we scaled the camera up and down, the dirt natively re-draws in perfect 8-bit aesthetic without image-blurring constraints!

### 7. Pac-Man Finite State Machine (Target Inversion)
**Used For:** The 10-Second Cherry Bonus Mode behavior.
**How it Works:** The moment Digger collects a Cherry, the Engine triggers a `bonusTimer` Finite State constraint. The AI algorithm instantly inverts its Delta vectors (`dxToPlayer = -dxToPlayer`) forcing every single enemy on the board to prioritize fleeing empty Grid spaces! The collision framework logically switches flags: causing overlap detection to add 250 points instead of executing the `gameOver()` loop!
