// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'light' ? '🌙' : '☀️';
    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        themeToggle.textContent = next === 'light' ? '🌙' : '☀️';
    });
}

// Maze Runner Game - Full Redesign
// Canvas-based maze game with fog of war, BFS hints, combo system, particle effects, D-pad

// ============================================================================
// MazeGenerator: Recursive backtracking + BFS pathfinding + open cell listing
// ============================================================================
class MazeGenerator {
    constructor(width, height, loopPercent = 0.12) {
        this.width = width;
        this.height = height;
        this.maze = this.generateMaze();
        this.breakWalls(loopPercent); // Create loops for multiple routes
    }

    generateMaze() {
        // Initialize maze grid (1 = wall, 0 = path)
        const maze = Array(this.height).fill(null).map(() => Array(this.width).fill(1));

        // Iterative backtracking (safe for large mazes, no stack overflow)
        const visited = Array(this.height).fill(null).map(() => Array(this.width).fill(false));
        const stack = [];

        const startX = 1, startY = 1;
        visited[startY][startX] = true;
        maze[startY][startX] = 0;
        stack.push([startX, startY]);

        const dirs = [
            { x: 0, y: -2, dx: 0, dy: -1 },
            { x: 2, y: 0, dx: 1, dy: 0 },
            { x: 0, y: 2, dx: 0, dy: 1 },
            { x: -2, y: 0, dx: -1, dy: 0 }
        ];

        while (stack.length > 0) {
            const [cx, cy] = stack[stack.length - 1];

            // Find unvisited neighbors
            const neighbors = [];
            for (const dir of dirs) {
                const nx = cx + dir.x;
                const ny = cy + dir.y;
                if (nx > 0 && nx < this.width - 1 && ny > 0 && ny < this.height - 1 && !visited[ny][nx]) {
                    neighbors.push(dir);
                }
            }

            if (neighbors.length === 0) {
                stack.pop(); // Backtrack
            } else {
                // Pick random neighbor
                const dir = neighbors[Math.floor(Math.random() * neighbors.length)];
                const nx = cx + dir.x;
                const ny = cy + dir.y;

                // Carve passage
                maze[cy + dir.dy][cx + dir.dx] = 0;
                maze[ny][nx] = 0;
                visited[ny][nx] = true;
                stack.push([nx, ny]);
            }
        }

        // Ensure start and end are paths
        maze[1][1] = 0;
        maze[this.height - 2][this.width - 2] = 0;

        return maze;
    }

    // Break walls to create loops / multiple routes
    breakWalls(percentage) {
        const breakable = [];
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.maze[y][x] !== 1) continue;
                // Horizontal wall: left and right are paths
                if (x > 1 && x < this.width - 2 &&
                    this.maze[y][x - 1] === 0 && this.maze[y][x + 1] === 0) {
                    breakable.push({ x, y });
                }
                // Vertical wall: top and bottom are paths
                else if (y > 1 && y < this.height - 2 &&
                    this.maze[y - 1][x] === 0 && this.maze[y + 1][x] === 0) {
                    breakable.push({ x, y });
                }
            }
        }
        // Shuffle
        for (let i = breakable.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [breakable[i], breakable[j]] = [breakable[j], breakable[i]];
        }
        const count = Math.floor(breakable.length * percentage);
        for (let i = 0; i < count; i++) {
            this.maze[breakable[i].y][breakable[i].x] = 0;
        }
    }

    isWall(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return true;
        }
        return this.maze[y][x] === 1;
    }

    // BFS pathfinding for hint system
    solvePath(sx, sy, ex, ey) {
        const startX = Math.floor(sx);
        const startY = Math.floor(sy);
        const endX = Math.floor(ex);
        const endY = Math.floor(ey);

        const queue = [[startX, startY]];
        const visited = new Set();
        const parent = new Map();
        visited.add(`${startX},${startY}`);

        while (queue.length > 0) {
            const [cx, cy] = queue.shift();
            if (cx === endX && cy === endY) {
                // Reconstruct path
                const path = [];
                let key = `${endX},${endY}`;
                while (parent.has(key)) {
                    const [px, py] = key.split(',').map(Number);
                    path.unshift({ x: px + 0.5, y: py + 0.5 });
                    key = parent.get(key);
                }
                return path;
            }
            for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
                const nx = cx + dx;
                const ny = cy + dy;
                const nkey = `${nx},${ny}`;
                if (!visited.has(nkey) && !this.isWall(nx, ny)) {
                    visited.add(nkey);
                    parent.set(nkey, `${cx},${cy}`);
                    queue.push([nx, ny]);
                }
            }
        }
        return []; // No path found
    }

    // Get list of open (walkable) cells for item placement
    getOpenCells() {
        const cells = [];
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (!this.isWall(x, y)) {
                    cells.push({ x, y });
                }
            }
        }
        return cells;
    }
}


// ============================================================================
// ParticleSystem: Floating text and sparkle effects
// ============================================================================
class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    addFloatingText(text, x, y, color = '#fff') {
        this.particles.push({
            type: 'text',
            text: text,
            x: x,
            y: y,
            color: color,
            vx: 0,
            vy: -60, // pixels per second upward
            life: 0.7,
            maxLife: 0.7
        });
    }

    addSparkles(x, y, color = '#f1c40f', count = 6) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 40 + Math.random() * 30;
            this.particles.push({
                type: 'sparkle',
                x: x,
                y: y,
                color: color,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.5,
                maxLife: 0.5,
                size: 2 + Math.random() * 2
            });
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            p.x += (p.vx || 0) * dt;
            p.y += p.vy * dt;
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            const alpha = Math.max(0, p.life / p.maxLife);
            if (p.type === 'text') {
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(p.text, p.x, p.y);
                ctx.restore();
            } else if (p.type === 'sparkle') {
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }
}


// ============================================================================
// Game: Main game controller
// ============================================================================
class Game {
    constructor() {
        // DOM references
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');

        // Screens
        this.screens = {
            start: document.getElementById('startScreen'),
            game: document.getElementById('gameScreen'),
            levelComplete: document.getElementById('levelCompleteScreen'),
            gameOver: document.getElementById('gameOverScreen')
        };

        // State
        this.currentScreen = 'start';
        this.gameMode = 'normal'; // 'normal' | 'fog' | 'timer'
        this.gameState = 'ready'; // 'ready' | 'playing' | 'paused'

        // Game data
        this.stage = 1;
        this.score = 0;
        this.totalScore = 0;
        this.timeLeft = 0;
        this.timeUsed = 0;
        this.maxTime = 0;
        this.maze = null;

        // Player
        this.player = { x: 1.5, y: 1.5, trail: [] };
        this.playerSpeed = 0.12; // cells per frame (faster for bigger mazes)
        this.playerRadius = 0.3;
        this.speedMultiplier = 1;
        this.speedBoostTimer = 0;

        // Items
        this.items = [];
        this.keysCollected = 0;
        this.bonusCollected = 0;
        this.totalKeys = 0;
        this.totalBonus = 0;

        // Combo
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboMultiplier = 1;
        this.maxCombo = 0;

        // Hint
        this.hintPath = [];
        this.hintTimer = 0;

        // Minimap
        this.minimapVisible = false;

        // Timer mode
        this.timeFrozen = false;
        this.timeFreezeTimer = 0;

        // Fog mode
        this.fogRadius = 3;

        // Traps
        this.traps = [];
        this.trapCooldown = 0; // prevent instant re-trigger

        // Gate system: exit locked until all keys collected
        this.exitUnlocked = false;

        // Particles
        this.particles = new ParticleSystem();

        // Input
        this.inputKeys = new Set();
        this.dpadDir = null;

        // Sound
        this.sfx = typeof SoundEngine !== 'undefined' ? new SoundEngine() : null;
        this.sfxInitialized = false;

        // Best records
        this.bestStage = parseInt(localStorage.getItem('maze_bestStage') || '0');
        this.bestScore = parseInt(localStorage.getItem('maze_bestScore') || '0');

        // Animation
        this.lastFrameTime = 0;
        this.animFrame = null;

        // DPR
        this.dpr = window.devicePixelRatio || 1;

        // Camera follow
        this.camera = { x: 0, y: 0 };
        this.cellSize = 36; // pixels per cell (fixed, not fit-to-screen)

        // Render state (stored for particle coordinate conversion)
        this.renderOffsetX = 0;
        this.renderOffsetY = 0;
        this.renderScale = 1;

        // Touch swipe state (backup alongside D-pad)
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchActive = false;

        // Explored cells for fog minimap
        this.exploredCells = new Set();

        this.init();
    }

    // ========================================================================
    // Initialization
    // ========================================================================
    init() {
        this.setupEventListeners();
        this.displayBestRecords();
        this.showScreen('start');
    }

    displayBestRecords() {
        const bestStageEl = document.getElementById('best-stage');
        const bestScoreEl = document.getElementById('best-score');
        if (bestStageEl) bestStageEl.textContent = this.bestStage;
        if (bestScoreEl) bestScoreEl.textContent = this.bestScore;
    }

    // ========================================================================
    // Event Listeners
    // ========================================================================
    setupEventListeners() {
        // ---- Keyboard ----
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        // ---- Mode cards ----
        document.querySelectorAll('.mode-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.gameMode = card.dataset.mode;
            });
        });

        // ---- Start button ----
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startGame());
        }

        // ---- Next level ----
        const nextLevelBtn = document.getElementById('nextLevelBtn');
        if (nextLevelBtn) {
            nextLevelBtn.addEventListener('click', () => this.nextLevel());
        }

        // ---- Retry ----
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.startGame());
        }

        // ---- Menu buttons ----
        const menuBtnComplete = document.getElementById('menuBtnComplete');
        if (menuBtnComplete) {
            menuBtnComplete.addEventListener('click', () => this.showScreen('start'));
        }
        const menuBtnOver = document.getElementById('menuBtnOver');
        if (menuBtnOver) {
            menuBtnOver.addEventListener('click', () => this.showScreen('start'));
        }

        // ---- Sound toggle ----
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.addEventListener('click', () => {
                this.initSfx();
                if (this.sfx) {
                    const enabled = this.sfx.toggle();
                    soundToggle.textContent = enabled ? '🔊' : '🔇';
                }
            });
        }

        // ---- Language selector ----
        const langToggle = document.getElementById('lang-toggle');
        const langMenu = document.getElementById('lang-menu');
        if (langToggle && langMenu) {
            langToggle.addEventListener('click', () => {
                langMenu.classList.toggle('hidden');
            });
            document.querySelectorAll('.lang-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    const lang = btn.dataset.lang;
                    if (typeof i18n !== 'undefined') {
                        i18n.setLanguage(lang);
                        i18n.applyTranslations();
                    }
                    langMenu.classList.add('hidden');
                    document.querySelectorAll('.lang-option').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.language-selector')) {
                    langMenu.classList.add('hidden');
                }
            });
        }

        // ---- D-pad: touch + mouse for desktop testing ----
        document.querySelectorAll('.dpad-btn').forEach(btn => {
            const dir = btn.dataset.dir;

            // Touch events
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.initSfx();
                this.dpadDir = dir;
                btn.classList.add('pressed');
            }, { passive: false });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.dpadDir = null;
                btn.classList.remove('pressed');
            }, { passive: false });

            btn.addEventListener('touchcancel', (e) => {
                this.dpadDir = null;
                btn.classList.remove('pressed');
            });

            // Mouse events for desktop testing
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.initSfx();
                this.dpadDir = dir;
                btn.classList.add('pressed');
            });

            btn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                this.dpadDir = null;
                btn.classList.remove('pressed');
            });

            btn.addEventListener('mouseleave', () => {
                this.dpadDir = null;
                btn.classList.remove('pressed');
            });
        });

        // ---- Powerup buttons ----
        const hintBtn = document.getElementById('hint-btn');
        if (hintBtn) {
            hintBtn.addEventListener('click', () => this.showHint());
        }

        const minimapBtn = document.getElementById('minimap-btn');
        if (minimapBtn) {
            minimapBtn.addEventListener('click', () => this.toggleMinimap());
        }

        // ---- Canvas touch (swipe controls as backup) ----
        this.canvas.addEventListener('touchstart', (e) => {
            // Ignore if touch is in D-pad area
            if (e.target.closest('.dpad-container')) return;
            this.initSfx();
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchActive = true;
        }, { passive: true });

        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.touchActive || this.gameState !== 'playing') return;
            if (e.target.closest('.dpad-container')) return;

            const touch = e.touches[0];
            const dx = touch.clientX - this.touchStartX;
            const dy = touch.clientY - this.touchStartY;
            const threshold = 20;

            if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.dpadDir = dx > 0 ? 'right' : 'left';
                } else {
                    this.dpadDir = dy > 0 ? 'down' : 'up';
                }
                this.touchStartX = touch.clientX;
                this.touchStartY = touch.clientY;
            }
        }, { passive: true });

        this.canvas.addEventListener('touchend', () => {
            if (this.touchActive) {
                this.touchActive = false;
                // Only clear dpadDir if no D-pad button is pressed
                if (!document.querySelector('.dpad-btn.pressed')) {
                    this.dpadDir = null;
                }
            }
        }, { passive: true });

        // ---- Resize ----
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    onKeyDown(e) {
        const key = e.key.toLowerCase();

        if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
            this.inputKeys.add(key);
            this.initSfx();
            e.preventDefault();
        }

        if (key === 'h' && this.gameState === 'playing') {
            this.showHint();
            e.preventDefault();
        }

        if (key === 'm' && this.gameState === 'playing') {
            this.toggleMinimap();
            e.preventDefault();
        }

        if (key === 'escape') {
            if (this.gameState === 'playing') {
                this.gameState = 'paused';
                if (this.animFrame) {
                    cancelAnimationFrame(this.animFrame);
                    this.animFrame = null;
                }
                this.showScreen('start');
            }
            e.preventDefault();
        }
    }

    onKeyUp(e) {
        const key = e.key.toLowerCase();
        if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
            this.inputKeys.delete(key);
        }
    }

    initSfx() {
        if (!this.sfxInitialized && this.sfx && this.sfx.init) {
            try {
                this.sfx.init();
                this.sfxInitialized = true;
            } catch (e) {
                // Silently fail
            }
        }
    }

    // ========================================================================
    // Screen Management
    // ========================================================================
    showScreen(name) {
        Object.values(this.screens).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });
        if (this.screens[name]) {
            this.screens[name].classList.add('active');
        }
        this.currentScreen = name;
    }

    // ========================================================================
    // Game Flow
    // ========================================================================
    startGame() {
        this.stage = 1;
        this.totalScore = 0;
        this.initLevel();
        this.showScreen('game');
        this.startGameLoop();
    }

    nextLevel() {
        this.stage++;
        this.initLevel();
        this.showScreen('game');
        this.startGameLoop();
    }

    initLevel() {
        // Maze sizes: stage 1=21, 2=25, 3=29, 4=33, ... capped at 51. Must be odd.
        let mazeSize = 21 + (this.stage - 1) * 4;
        mazeSize = Math.min(mazeSize, 51);
        if (mazeSize % 2 === 0) mazeSize += 1;

        // More loops at higher stages for complexity
        const loopPct = Math.min(0.08 + this.stage * 0.015, 0.20);

        // Create new maze
        this.maze = new MazeGenerator(mazeSize, mazeSize, loopPct);

        // Reset player
        this.player.x = 1.5;
        this.player.y = 1.5;
        this.player.trail = [];

        // Time: scales with maze area but pressure increases
        // Stage 1 (21x21): ~120s, Stage 4 (33x33): ~130s, Stage 8 (51x51): ~140s
        // Generous enough to explore but tight enough to pressure
        const area = mazeSize * mazeSize;
        const timeFactor = Math.max(0.45, 0.85 - this.stage * 0.04);
        this.maxTime = Math.floor(Math.sqrt(area) * 6.5 * timeFactor) * 1000;
        this.timeLeft = this.maxTime;
        this.timeUsed = 0;

        // Speed
        this.speedMultiplier = 1;
        this.speedBoostTimer = 0;

        // Time freeze
        this.timeFrozen = false;
        this.timeFreezeTimer = 0;

        // Combo
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboMultiplier = 1;
        this.maxCombo = 0;

        // Hint
        this.hintPath = [];
        this.hintTimer = 0;

        // Minimap
        this.minimapVisible = false;
        const minimapContainer = document.querySelector('.minimap-container');
        if (minimapContainer) minimapContainer.classList.remove('visible');

        // Fog: radius shrinks at higher stages (5.0 → 3.0 minimum for bigger mazes)
        this.fogRadius = Math.max(3.0, 5.0 - (this.stage - 1) * 0.25);
        this.baseFogRadius = this.fogRadius;
        this.exploredCells = new Set();

        // Exit gate: locked until all keys collected
        this.exitUnlocked = false;

        // Traps
        this.traps = [];
        this.trapCooldown = 0;

        // Particles
        this.particles = new ParticleSystem();

        // Items
        this.keysCollected = 0;
        this.bonusCollected = 0;
        this.generateItems();

        // Init camera to player position
        this.camera.x = this.player.x * this.cellSize - window.innerWidth / 2;
        this.camera.y = this.player.y * this.cellSize - window.innerHeight / 2;

        // Resize canvas
        this.resizeCanvas();

        // Set game state
        this.gameState = 'playing';

        // Update HUD initial
        this.updateHUD();
    }

    generateItems() {
        this.items = [];

        const openCells = this.maze.getOpenCells();

        // Filter out start area (distance from 1,1 < 2) and end area
        const endX = this.maze.width - 2;
        const endY = this.maze.height - 2;
        const validCells = openCells.filter(cell => {
            const distFromStart = Math.sqrt((cell.x - 1) * (cell.x - 1) + (cell.y - 1) * (cell.y - 1));
            const distFromEnd = Math.sqrt((cell.x - endX) * (cell.x - endX) + (cell.y - endY) * (cell.y - endY));
            return distFromStart >= 2 && distFromEnd >= 1.5;
        });

        // Shuffle valid cells
        for (let i = validCells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validCells[i], validCells[j]] = [validCells[j], validCells[i]];
        }

        let cellIndex = 0;

        const pickCell = () => {
            if (cellIndex < validCells.length) {
                return validCells[cellIndex++];
            }
            // Fallback: pick any open cell
            const fallback = openCells[Math.floor(Math.random() * openCells.length)];
            return fallback;
        };

        // Keys: 3-6 per level (scales with maze size)
        const keyCount = Math.min(3 + Math.floor(this.stage / 2), 6);
        this.totalKeys = keyCount;
        for (let i = 0; i < keyCount; i++) {
            const cell = pickCell();
            this.items.push({
                x: cell.x + 0.5,
                y: cell.y + 0.5,
                type: 'key',
                collected: false
            });
        }

        // Bonus stars: 3-6 per level
        const bonusCount = Math.min(3 + Math.floor(this.stage / 2), 6);
        this.totalBonus = bonusCount;
        for (let i = 0; i < bonusCount; i++) {
            const cell = pickCell();
            this.items.push({
                x: cell.x + 0.5,
                y: cell.y + 0.5,
                type: 'bonus',
                collected: false
            });
        }

        // Speed boost: stage 4+
        if (this.stage >= 4) {
            const cell = pickCell();
            this.items.push({
                x: cell.x + 0.5,
                y: cell.y + 0.5,
                type: 'speedBoost',
                collected: false
            });
        }

        // Time freezer: stage 7+ AND timer mode
        if (this.stage >= 7 && this.gameMode === 'timer') {
            const cell = pickCell();
            this.items.push({
                x: cell.x + 0.5,
                y: cell.y + 0.5,
                type: 'timeFreezer',
                collected: false
            });
        }

        // Trap tiles: stage 2+, warps player back to start
        if (this.stage >= 2) {
            const trapCount = Math.min(2 + Math.floor((this.stage - 2)), 8);
            for (let i = 0; i < trapCount; i++) {
                const cell = pickCell();
                this.traps.push({
                    x: cell.x + 0.5,
                    y: cell.y + 0.5,
                    triggered: false
                });
            }
        }
    }

    // ========================================================================
    // Canvas Sizing
    // ========================================================================
    resizeCanvas() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        this.canvas.width = w * this.dpr;
        this.canvas.height = h * this.dpr;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        // Minimap
        this.minimapCanvas.width = 120 * this.dpr;
        this.minimapCanvas.height = 120 * this.dpr;
        this.minimapCanvas.style.width = '120px';
        this.minimapCanvas.style.height = '120px';
        this.minimapCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    // ========================================================================
    // Game Loop
    // ========================================================================
    startGameLoop() {
        if (this.animFrame) {
            cancelAnimationFrame(this.animFrame);
        }
        this.lastFrameTime = performance.now();
        this.animFrame = requestAnimationFrame((t) => this.gameLoop(t));
    }

    gameLoop(timestamp) {
        if (this.gameState !== 'playing') return;

        const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1); // seconds, capped at 100ms
        this.lastFrameTime = timestamp;

        this.update(dt);
        this.render();

        this.animFrame = requestAnimationFrame((t) => this.gameLoop(t));
    }

    // ========================================================================
    // Update
    // ========================================================================
    update(dt) {
        // ---- Time ----
        this.timeUsed += dt * 1000;

        if (this.gameMode === 'timer' && !this.timeFrozen) {
            this.timeLeft -= dt * 1000;
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.gameOver();
                return;
            }
        }

        // ---- Speed boost timer ----
        if (this.speedBoostTimer > 0) {
            this.speedBoostTimer -= dt;
            if (this.speedBoostTimer <= 0) {
                this.speedBoostTimer = 0;
                this.speedMultiplier = 1;
            }
        }

        // ---- Time freeze timer ----
        if (this.timeFreezeTimer > 0) {
            this.timeFreezeTimer -= dt;
            if (this.timeFreezeTimer <= 0) {
                this.timeFreezeTimer = 0;
                this.timeFrozen = false;
            }
        }

        // ---- Combo timer ----
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.comboTimer = 0;
                this.comboCount = 0;
                this.comboMultiplier = 1;
                this.updateComboDisplay();
            }
        }

        // ---- Hint timer ----
        if (this.hintTimer > 0) {
            this.hintTimer -= dt;
            if (this.hintTimer <= 0) {
                this.hintTimer = 0;
                this.hintPath = [];
            }
        }

        // ---- Player movement ----
        let moveX = 0;
        let moveY = 0;

        // From keyboard
        if (this.inputKeys.has('w') || this.inputKeys.has('arrowup')) moveY -= 1;
        if (this.inputKeys.has('s') || this.inputKeys.has('arrowdown')) moveY += 1;
        if (this.inputKeys.has('a') || this.inputKeys.has('arrowleft')) moveX -= 1;
        if (this.inputKeys.has('d') || this.inputKeys.has('arrowright')) moveX += 1;

        // From D-pad
        if (this.dpadDir) {
            switch (this.dpadDir) {
                case 'up': moveY = -1; break;
                case 'down': moveY = 1; break;
                case 'left': moveX = -1; break;
                case 'right': moveX = 1; break;
            }
        }

        // Normalize diagonal movement
        if (moveX !== 0 && moveY !== 0) {
            const len = Math.sqrt(moveX * moveX + moveY * moveY);
            moveX /= len;
            moveY /= len;
        }

        // Apply speed
        const speed = this.playerSpeed * this.speedMultiplier;
        const dx = moveX * speed;
        const dy = moveY * speed;

        // Collision detection: try X and Y independently for wall sliding
        const oldX = this.player.x;
        const oldY = this.player.y;

        // Try move X
        const newX = this.player.x + dx;
        if (!this.collideWithWalls(newX, this.player.y)) {
            this.player.x = newX;
        }

        // Try move Y
        const newY = this.player.y + dy;
        if (!this.collideWithWalls(this.player.x, newY)) {
            this.player.y = newY;
        }

        // Trail: only record when actually moved
        const movedDist = Math.abs(this.player.x - oldX) + Math.abs(this.player.y - oldY);
        if (movedDist > 0.001) {
            this.player.trail.push({ x: this.player.x, y: this.player.y });
            if (this.player.trail.length > 30) {
                this.player.trail.shift();
            }
        }

        // ---- Fog: update explored cells ----
        if (this.gameMode === 'fog') {
            const px = Math.floor(this.player.x);
            const py = Math.floor(this.player.y);
            const fr = Math.ceil(this.fogRadius);
            for (let cy = py - fr; cy <= py + fr; cy++) {
                for (let cx = px - fr; cx <= px + fr; cx++) {
                    if (cx >= 0 && cx < this.maze.width && cy >= 0 && cy < this.maze.height) {
                        const dist = Math.sqrt((cx - this.player.x) * (cx - this.player.x) + (cy - this.player.y) * (cy - this.player.y));
                        if (dist <= this.fogRadius) {
                            this.exploredCells.add(`${cx},${cy}`);
                        }
                    }
                }
            }
        }

        // ---- Item collection ----
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            if (item.collected) continue;

            const distX = this.player.x - item.x;
            const distY = this.player.y - item.y;
            const dist = Math.sqrt(distX * distX + distY * distY);

            if (dist < 0.5) {
                item.collected = true;

                // Screen coordinates for particles
                const screenX = this.renderOffsetX + item.x * this.renderScale;
                const screenY = this.renderOffsetY + item.y * this.renderScale;

                // Combo system: applies to ALL item types
                this.comboCount++;
                this.comboTimer = 2; // 2 seconds
                this.comboMultiplier = 1 + this.comboCount * 0.25;
                if (this.comboCount > this.maxCombo) {
                    this.maxCombo = this.comboCount;
                }
                this.updateComboDisplay();

                if (this.comboCount >= 3) {
                    if (this.sfx && this.sfx.combo) {
                        try { this.sfx.combo(this.comboCount); } catch (e) { /* ignore */ }
                    }
                    this.showToast('comboX');
                }

                switch (item.type) {
                    case 'key': {
                        const pts = Math.floor(100 * this.comboMultiplier);
                        this.totalScore += pts;
                        this.keysCollected++;
                        if (this.sfx && this.sfx.coin) {
                            try { this.sfx.coin(); } catch (e) { /* ignore */ }
                        }
                        this.particles.addSparkles(screenX, screenY, '#f39c12', 6);
                        this.particles.addFloatingText('+' + pts, screenX, screenY - 10, '#f39c12');
                        break;
                    }
                    case 'bonus': {
                        const pts = Math.floor(50 * this.comboMultiplier);
                        this.totalScore += pts;
                        this.bonusCollected++;
                        if (this.sfx && this.sfx.coinCollect) {
                            try { this.sfx.coinCollect(); } catch (e) { /* ignore */ }
                        }
                        this.particles.addSparkles(screenX, screenY, '#e74c3c', 6);
                        this.particles.addFloatingText('+' + pts, screenX, screenY - 10, '#e74c3c');
                        break;
                    }
                    case 'speedBoost': {
                        this.speedMultiplier = 2;
                        this.speedBoostTimer = 5;
                        if (this.sfx && this.sfx.powerUp) {
                            try { this.sfx.powerUp(); } catch (e) { /* ignore */ }
                        }
                        this.particles.addSparkles(screenX, screenY, '#3498db', 8);
                        this.particles.addFloatingText('SPEED!', screenX, screenY - 10, '#3498db');
                        this.showToast('speedBoost');
                        break;
                    }
                    case 'timeFreezer': {
                        this.timeFrozen = true;
                        this.timeFreezeTimer = 5;
                        if (this.sfx && this.sfx.powerUp) {
                            try { this.sfx.powerUp(); } catch (e) { /* ignore */ }
                        }
                        this.particles.addSparkles(screenX, screenY, '#9b59b6', 8);
                        this.particles.addFloatingText('FREEZE!', screenX, screenY - 10, '#9b59b6');
                        this.showToast('timeFrozen');
                        break;
                    }
                }

                // Update fog radius on key collect (grows from shrunken base)
                if (this.gameMode === 'fog') {
                    this.fogRadius = this.baseFogRadius + this.keysCollected * 0.3;
                }

                // Check gate unlock
                if (this.keysCollected >= this.totalKeys && !this.exitUnlocked) {
                    this.exitUnlocked = true;
                    this.showToast('exitUnlocked');
                    if (this.sfx && this.sfx.perfect) {
                        try { this.sfx.perfect(); } catch (e) { /* ignore */ }
                    }
                }
            }
        }

        // ---- Trap check ----
        if (this.trapCooldown > 0) {
            this.trapCooldown -= dt;
        } else {
            for (const trap of this.traps) {
                const tx = this.player.x - trap.x;
                const ty = this.player.y - trap.y;
                const tDist = Math.sqrt(tx * tx + ty * ty);
                if (tDist < 0.45) {
                    // Warp back to start
                    this.player.x = 1.5;
                    this.player.y = 1.5;
                    this.player.trail = [];
                    this.trapCooldown = 1.5; // immunity after warp
                    this.showToast('trapTriggered');
                    if (this.sfx && this.sfx.hit) {
                        try { this.sfx.hit(); } catch (e) { /* ignore */ }
                    }
                    // Penalty: lose 3 seconds in timer mode
                    if (this.gameMode === 'timer') {
                        this.timeLeft -= 3000;
                    }
                    const screenTX = this.renderOffsetX + trap.x * this.renderScale;
                    const screenTY = this.renderOffsetY + trap.y * this.renderScale;
                    this.particles.addSparkles(screenTX, screenTY, '#e74c3c', 10);
                    this.particles.addFloatingText('TRAP!', screenTX, screenTY - 10, '#e74c3c');
                    break;
                }
            }
        }

        // ---- Win check (only if exit unlocked) ----
        const exitX = this.maze.width - 1.5;
        const exitY = this.maze.height - 1.5;
        const exitDist = Math.sqrt(
            (this.player.x - exitX) * (this.player.x - exitX) +
            (this.player.y - exitY) * (this.player.y - exitY)
        );
        if (exitDist < 0.6 && this.exitUnlocked) {
            this.levelComplete();
            return;
        }

        // ---- Particles ----
        this.particles.update(dt);

        // ---- Update HUD ----
        this.updateHUD();
    }

    collideWithWalls(x, y) {
        const r = this.playerRadius;
        return this.maze.isWall(Math.floor(x - r), Math.floor(y - r)) ||
               this.maze.isWall(Math.floor(x + r), Math.floor(y - r)) ||
               this.maze.isWall(Math.floor(x - r), Math.floor(y + r)) ||
               this.maze.isWall(Math.floor(x + r), Math.floor(y + r));
    }

    // ========================================================================
    // Render
    // ========================================================================
    render() {
        const ctx = this.ctx;
        const w = this.canvas.width / this.dpr;
        const h = this.canvas.height / this.dpr;

        // Clear
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, w, h);

        if (!this.maze) return;

        const mazeW = this.maze.width;
        const mazeH = this.maze.height;
        const scale = this.cellSize;

        // Camera follow player (smooth lerp)
        const targetCamX = this.player.x * scale - w / 2;
        const targetCamY = this.player.y * scale - h / 2;

        // Clamp to maze bounds
        const maxCamX = Math.max(0, mazeW * scale - w);
        const maxCamY = Math.max(0, mazeH * scale - h);
        const clampedX = Math.max(0, Math.min(targetCamX, maxCamX));
        const clampedY = Math.max(0, Math.min(targetCamY, maxCamY));

        // Smooth lerp (fast follow)
        this.camera.x += (clampedX - this.camera.x) * 0.15;
        this.camera.y += (clampedY - this.camera.y) * 0.15;

        // If maze fits on screen, center it instead
        const offsetX = (mazeW * scale <= w) ? (w - mazeW * scale) / 2 : -this.camera.x;
        const offsetY = (mazeH * scale <= h) ? (h - mazeH * scale) / 2 : -this.camera.y;

        // Store for particle coordinate conversion
        this.renderOffsetX = offsetX;
        this.renderOffsetY = offsetY;
        this.renderScale = scale;

        // Visible cell range (frustum culling)
        this.visStartCol = Math.max(0, Math.floor(-offsetX / scale) - 1);
        this.visEndCol = Math.min(mazeW, Math.ceil((-offsetX + w) / scale) + 1);
        this.visStartRow = Math.max(0, Math.floor(-offsetY / scale) - 1);
        this.visEndRow = Math.min(mazeH, Math.ceil((-offsetY + h) / scale) + 1);

        ctx.save();

        if (this.gameMode === 'fog') {
            // FOG MODE: Draw scene, then apply radial mask
            this.drawMaze(ctx, offsetX, offsetY, scale);
            this.drawTraps(ctx, offsetX, offsetY, scale);
            this.drawItems(ctx, offsetX, offsetY, scale);
            this.drawExit(ctx, offsetX, offsetY, scale);
            this.drawTrail(ctx, offsetX, offsetY, scale);
            this.drawPlayer(ctx, offsetX, offsetY, scale);
            if (this.hintTimer > 0) this.drawHint(ctx, offsetX, offsetY, scale);

            // Apply fog overlay using destination-in composite
            ctx.save();
            ctx.globalCompositeOperation = 'destination-in';
            const px = offsetX + this.player.x * scale;
            const py = offsetY + this.player.y * scale;
            const fogR = this.fogRadius * scale;
            const gradient = ctx.createRadialGradient(px, py, fogR * 0.3, px, py, fogR);
            gradient.addColorStop(0, 'rgba(255,255,255,1)');
            gradient.addColorStop(0.7, 'rgba(255,255,255,0.8)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();

            // Redraw player on top so always visible
            this.drawPlayer(ctx, offsetX, offsetY, scale);
        } else {
            // Normal / Timer mode: draw everything normally
            this.drawMaze(ctx, offsetX, offsetY, scale);
            this.drawTraps(ctx, offsetX, offsetY, scale);
            this.drawItems(ctx, offsetX, offsetY, scale);
            this.drawExit(ctx, offsetX, offsetY, scale);
            this.drawTrail(ctx, offsetX, offsetY, scale);
            this.drawPlayer(ctx, offsetX, offsetY, scale);
            if (this.hintTimer > 0) this.drawHint(ctx, offsetX, offsetY, scale);
        }

        ctx.restore();

        // Draw particles (always on top, in screen space)
        this.particles.draw(ctx);

        // Draw minimap if visible
        if (this.minimapVisible) {
            this.drawMinimap();
        }
    }

    drawMaze(ctx, ox, oy, scale) {
        const mazeW = this.maze.width;
        const mazeH = this.maze.height;

        // Only draw visible cells (frustum culling)
        const r0 = this.visStartRow, r1 = this.visEndRow;
        const c0 = this.visStartCol, c1 = this.visEndCol;

        for (let y = r0; y < r1; y++) {
            for (let x = c0; x < c1; x++) {
                const px = ox + x * scale;
                const py = oy + y * scale;

                if (this.maze.isWall(x, y)) {
                    ctx.fillStyle = '#12122a';
                    ctx.fillRect(px, py, scale + 0.5, scale + 0.5);
                } else {
                    ctx.fillStyle = '#0a0a1a';
                    ctx.fillRect(px, py, scale + 0.5, scale + 0.5);
                }
            }
        }

        // Draw neon edges where wall meets path (visible area only)
        ctx.strokeStyle = 'rgba(26, 188, 156, 0.12)';
        ctx.lineWidth = 1;

        for (let y = r0; y < r1; y++) {
            for (let x = c0; x < c1; x++) {
                if (!this.maze.isWall(x, y)) continue;

                const px = ox + x * scale;
                const py = oy + y * scale;

                if (y > 0 && !this.maze.isWall(x, y - 1)) {
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(px + scale, py);
                    ctx.stroke();
                }
                if (y < mazeH - 1 && !this.maze.isWall(x, y + 1)) {
                    ctx.beginPath();
                    ctx.moveTo(px, py + scale);
                    ctx.lineTo(px + scale, py + scale);
                    ctx.stroke();
                }
                if (x > 0 && !this.maze.isWall(x - 1, y)) {
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(px, py + scale);
                    ctx.stroke();
                }
                if (x < mazeW - 1 && !this.maze.isWall(x + 1, y)) {
                    ctx.beginPath();
                    ctx.moveTo(px + scale, py);
                    ctx.lineTo(px + scale, py + scale);
                    ctx.stroke();
                }
            }
        }
    }

    drawPlayer(ctx, ox, oy, scale) {
        const px = ox + this.player.x * scale;
        const py = oy + this.player.y * scale;

        // Pulsing size
        const pulse = Math.sin(Date.now() / 300) * 0.03;
        const size = scale * (0.35 + pulse);

        ctx.save();

        // Glow
        ctx.shadowColor = '#1abc9c';
        ctx.shadowBlur = 15;

        // Fill
        ctx.fillStyle = '#48dbfb';
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();

        // Stroke
        ctx.strokeStyle = '#1abc9c';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Speed boost indicator
        if (this.speedBoostTimer > 0) {
            ctx.strokeStyle = 'rgba(52, 152, 219, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(px, py, size + 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Time freeze indicator
        if (this.timeFreezeTimer > 0) {
            ctx.strokeStyle = 'rgba(155, 89, 182, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([2, 4]);
            ctx.beginPath();
            ctx.arc(px, py, size + 7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    drawTrail(ctx, ox, oy, scale) {
        const trail = this.player.trail;
        const len = trail.length;
        if (len === 0) return;

        for (let i = 0; i < len; i++) {
            const t = trail[i];
            const px = ox + t.x * scale;
            const py = oy + t.y * scale;

            // Alpha from 0.02 (oldest) to 0.15 (newest)
            const alpha = 0.02 + (i / len) * 0.13;
            const radius = scale * 0.08 + (i / len) * scale * 0.04;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#1abc9c';
            ctx.beginPath();
            ctx.arc(px, py, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    drawItems(ctx, ox, oy, scale) {
        const now = Date.now();

        for (const item of this.items) {
            if (item.collected) continue;

            // Float offset
            const floatOffset = Math.sin(now / 500 + item.x * 3.7 + item.y * 2.3) * 3;

            const px = ox + item.x * scale;
            const py = oy + item.y * scale + floatOffset;
            const size = scale * 0.28;

            ctx.save();

            // Set glow and colors based on type
            let fillColor, strokeColor, glowColor, emoji;
            switch (item.type) {
                case 'key':
                    fillColor = '#f39c12';
                    strokeColor = 'rgba(243, 156, 18, 0.5)';
                    glowColor = '#f39c12';
                    emoji = '🔑';
                    break;
                case 'bonus':
                    fillColor = '#e74c3c';
                    strokeColor = 'rgba(231, 76, 60, 0.5)';
                    glowColor = '#e74c3c';
                    emoji = '⭐';
                    break;
                case 'speedBoost':
                    fillColor = '#3498db';
                    strokeColor = 'rgba(52, 152, 219, 0.5)';
                    glowColor = '#3498db';
                    emoji = '⚡';
                    break;
                case 'timeFreezer':
                    fillColor = '#9b59b6';
                    strokeColor = 'rgba(155, 89, 182, 0.5)';
                    glowColor = '#9b59b6';
                    emoji = '🧊';
                    break;
                default:
                    fillColor = '#fff';
                    strokeColor = 'rgba(255,255,255,0.5)';
                    glowColor = '#fff';
                    emoji = '?';
            }

            // Glow
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 8;

            // Circle background
            ctx.fillStyle = fillColor;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();

            // Stroke
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            // Emoji on top
            const fontSize = Math.max(8, Math.floor(scale * 0.35));
            ctx.font = `${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, px, py);

            ctx.restore();
        }
    }

    drawExit(ctx, ox, oy, scale) {
        const exitX = this.maze.width - 1.5;
        const exitY = this.maze.height - 1.5;
        const px = ox + exitX * scale;
        const py = oy + exitY * scale;

        const pulse = Math.sin(Date.now() / 400) * 0.05 + 1;
        const size = scale * 0.38 * pulse;

        ctx.save();

        if (this.exitUnlocked) {
            // UNLOCKED: bright green glow
            ctx.shadowColor = '#2ecc71';
            ctx.shadowBlur = 25;
            ctx.fillStyle = '#2ecc71';
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(46, 204, 113, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px, py, size + 4, 0, Math.PI * 2);
            ctx.stroke();

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            const fontSize = Math.max(10, Math.floor(scale * 0.4));
            ctx.font = `${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🚪', px, py);
        } else {
            // LOCKED: dim red, locked icon
            ctx.shadowColor = '#e74c3c';
            ctx.shadowBlur = 10;
            ctx.fillStyle = 'rgba(231, 76, 60, 0.4)';
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(231, 76, 60, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px, py, size + 4, 0, Math.PI * 2);
            ctx.stroke();

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            const fontSize = Math.max(10, Math.floor(scale * 0.4));
            ctx.font = `${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔒', px, py);

            // Show remaining keys needed
            const remaining = this.totalKeys - this.keysCollected;
            if (remaining > 0) {
                ctx.fillStyle = '#e74c3c';
                ctx.font = `bold ${Math.max(8, Math.floor(scale * 0.25))}px sans-serif`;
                ctx.fillText(`🔑x${remaining}`, px, py + size + 8);
            }
        }

        ctx.restore();
    }

    drawTraps(ctx, ox, oy, scale) {
        for (const trap of this.traps) {
            const px = ox + trap.x * scale;
            const py = oy + trap.y * scale;
            const floatY = Math.sin(Date.now() / 600 + trap.x * 3) * 2;
            const size = scale * 0.28;

            ctx.save();
            ctx.shadowColor = '#e74c3c';
            ctx.shadowBlur = 8;

            // Pulsing red circle
            const pulse = 0.3 + Math.sin(Date.now() / 300) * 0.15;
            ctx.fillStyle = `rgba(231, 76, 60, ${pulse})`;
            ctx.beginPath();
            ctx.arc(px, py + floatY, size + 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            // Skull emoji
            const fontSize = Math.max(8, Math.floor(scale * 0.3));
            ctx.font = `${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💀', px, py + floatY);

            ctx.restore();
        }
    }

    drawHint(ctx, ox, oy, scale) {
        if (!this.hintPath || this.hintPath.length < 2) return;

        ctx.save();

        // Animated dashed line
        ctx.strokeStyle = 'rgba(26, 188, 156, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -Date.now() / 100;

        ctx.beginPath();
        // Start from player position
        ctx.moveTo(ox + this.player.x * scale, oy + this.player.y * scale);

        for (const point of this.hintPath) {
            ctx.lineTo(ox + point.x * scale, oy + point.y * scale);
        }
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.restore();
    }

    drawMinimap() {
        const mctx = this.minimapCtx;
        const mazeW = this.maze.width;
        const mazeH = this.maze.height;
        const mapSize = 120;
        const cellSize = mapSize / Math.max(mazeW, mazeH);

        // Clear
        mctx.fillStyle = '#0a0a1a';
        mctx.fillRect(0, 0, mapSize, mapSize);

        // Offset to center if non-square
        const mapOffX = (mapSize - mazeW * cellSize) / 2;
        const mapOffY = (mapSize - mazeH * cellSize) / 2;

        // Draw maze cells
        for (let y = 0; y < mazeH; y++) {
            for (let x = 0; x < mazeW; x++) {
                // In fog mode, only draw explored cells
                if (this.gameMode === 'fog' && !this.exploredCells.has(`${x},${y}`)) {
                    continue;
                }

                const px = mapOffX + x * cellSize;
                const py = mapOffY + y * cellSize;

                if (this.maze.isWall(x, y)) {
                    mctx.fillStyle = '#1a1a3e';
                } else {
                    mctx.fillStyle = '#15152a';
                }
                mctx.fillRect(px, py, cellSize + 0.5, cellSize + 0.5);
            }
        }

        // Draw items on minimap
        for (const item of this.items) {
            if (item.collected) continue;

            // In fog mode, only show if in explored area
            if (this.gameMode === 'fog') {
                const cellKey = `${Math.floor(item.x)},${Math.floor(item.y)}`;
                if (!this.exploredCells.has(cellKey)) continue;
            }

            const ipx = mapOffX + item.x * cellSize;
            const ipy = mapOffY + item.y * cellSize;

            switch (item.type) {
                case 'key': mctx.fillStyle = '#f39c12'; break;
                case 'bonus': mctx.fillStyle = '#e74c3c'; break;
                case 'speedBoost': mctx.fillStyle = '#3498db'; break;
                case 'timeFreezer': mctx.fillStyle = '#9b59b6'; break;
                default: mctx.fillStyle = '#fff';
            }
            mctx.beginPath();
            mctx.arc(ipx, ipy, Math.max(1.5, cellSize * 0.3), 0, Math.PI * 2);
            mctx.fill();
        }

        // Draw traps on minimap
        for (const trap of this.traps) {
            if (this.gameMode === 'fog') {
                const cellKey = `${Math.floor(trap.x)},${Math.floor(trap.y)}`;
                if (!this.exploredCells.has(cellKey)) continue;
            }
            const tpx = mapOffX + trap.x * cellSize;
            const tpy = mapOffY + trap.y * cellSize;
            mctx.fillStyle = '#e74c3c';
            mctx.beginPath();
            mctx.arc(tpx, tpy, Math.max(1.5, cellSize * 0.3), 0, Math.PI * 2);
            mctx.fill();
        }

        // Draw exit
        const exitPx = mapOffX + (this.maze.width - 1.5) * cellSize;
        const exitPy = mapOffY + (this.maze.height - 1.5) * cellSize;
        mctx.fillStyle = this.exitUnlocked ? '#2ecc71' : '#e74c3c';
        mctx.beginPath();
        mctx.arc(exitPx, exitPy, Math.max(2, cellSize * 0.5), 0, Math.PI * 2);
        mctx.fill();

        // Draw player
        const playerPx = mapOffX + this.player.x * cellSize;
        const playerPy = mapOffY + this.player.y * cellSize;
        mctx.fillStyle = '#48dbfb';
        mctx.beginPath();
        mctx.arc(playerPx, playerPy, Math.max(2, cellSize * 0.5), 0, Math.PI * 2);
        mctx.fill();
    }

    // ========================================================================
    // Hint / Minimap
    // ========================================================================
    showHint() {
        if (this.gameState !== 'playing' || !this.maze) return;

        this.hintPath = this.maze.solvePath(
            this.player.x, this.player.y,
            this.maze.width - 1.5, this.maze.height - 1.5
        );
        this.hintTimer = 3; // 3 seconds

        if (this.sfx && this.sfx.click) {
            try { this.sfx.click(); } catch (e) { /* ignore */ }
        }
    }

    toggleMinimap() {
        this.minimapVisible = !this.minimapVisible;
        const container = document.querySelector('.minimap-container');
        if (container) {
            container.classList.toggle('visible', this.minimapVisible);
        }
    }

    // ========================================================================
    // Level Complete
    // ========================================================================
    levelComplete() {
        this.gameState = 'paused';
        if (this.animFrame) {
            cancelAnimationFrame(this.animFrame);
            this.animFrame = null;
        }

        // Calculate scores
        const timeBonusRaw = Math.max(0, Math.floor((this.maxTime - this.timeUsed) / 1000));
        const timeBonus = timeBonusRaw * this.stage;
        const keyScore = this.keysCollected * 100;
        const bonusScore = this.bonusCollected * 50;
        const comboBonus = this.maxCombo >= 3 ? this.maxCombo * 50 : 0;
        const levelScore = timeBonus + keyScore + bonusScore + comboBonus;

        this.totalScore += levelScore;

        // Star rating
        const timePct = 1 - (this.timeUsed / this.maxTime);
        const allItems = (this.keysCollected === this.totalKeys) && (this.bonusCollected === this.totalBonus);
        let stars = 1; // always at least 1 for completing
        if (timePct >= 0.4 || this.keysCollected >= this.totalKeys * 0.5) {
            stars = 2;
        }
        if (timePct >= 0.7 && allItems) {
            stars = 3;
        }

        // Update best records
        let isNewBest = false;
        if (this.stage > this.bestStage) {
            this.bestStage = this.stage;
            localStorage.setItem('maze_bestStage', this.bestStage.toString());
            isNewBest = true;
        }
        if (this.totalScore > this.bestScore) {
            this.bestScore = this.totalScore;
            localStorage.setItem('maze_bestScore', this.bestScore.toString());
            isNewBest = true;
        }
        this.displayBestRecords();

        // Fill in result values
        const timeBonusEl = document.getElementById('result-time-bonus');
        const keysEl = document.getElementById('result-keys');
        const bonusEl = document.getElementById('result-bonus');
        const comboEl = document.getElementById('result-combo');
        const totalEl = document.getElementById('result-total');

        if (timeBonusEl) timeBonusEl.textContent = timeBonus;
        if (keysEl) keysEl.textContent = keyScore;
        if (bonusEl) bonusEl.textContent = bonusScore;
        if (comboEl) comboEl.textContent = comboBonus;
        if (totalEl) totalEl.textContent = levelScore;

        // Animate score values (count up)
        this.animateScoreValue(timeBonusEl, 0, timeBonus, 400);
        this.animateScoreValue(keysEl, 0, keyScore, 500);
        this.animateScoreValue(bonusEl, 0, bonusScore, 600);
        this.animateScoreValue(comboEl, 0, comboBonus, 700);
        this.animateScoreValue(totalEl, 0, levelScore, 900);

        // Stars
        const starEls = document.querySelectorAll('.star-rating .star');
        starEls.forEach((el, i) => {
            el.classList.remove('filled');
            if (i < stars) {
                setTimeout(() => {
                    el.classList.add('filled');
                }, 300 + i * 200);
            }
        });

        // New best badge
        const newBestBadge = document.getElementById('new-best-badge');
        if (newBestBadge) {
            if (isNewBest) {
                newBestBadge.classList.remove('hidden');
            } else {
                newBestBadge.classList.add('hidden');
            }
        }

        // Play sound
        if (this.sfx && this.sfx.levelUp) {
            try { this.sfx.levelUp(); } catch (e) { /* ignore */ }
        }

        // Show screen
        this.showScreen('levelComplete');

        // Ad logic: show interstitial every 3 levels
        if (this.stage % 3 === 0) {
            this.showInterstitialAd();
        }
    }

    animateScoreValue(el, from, to, duration) {
        if (!el || from === to) return;

        const startTime = performance.now();
        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-out
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(from + (to - from) * eased);
            el.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }

    // ========================================================================
    // Game Over
    // ========================================================================
    gameOver() {
        this.gameState = 'paused';
        if (this.animFrame) {
            cancelAnimationFrame(this.animFrame);
            this.animFrame = null;
        }

        // Fill in final stats
        const finalStageEl = document.getElementById('final-stage');
        const finalScoreEl = document.getElementById('final-score');
        if (finalStageEl) finalStageEl.textContent = this.stage;
        if (finalScoreEl) finalScoreEl.textContent = this.totalScore;

        // Update best records
        if (this.stage > this.bestStage) {
            this.bestStage = this.stage;
            localStorage.setItem('maze_bestStage', this.bestStage.toString());
        }
        if (this.totalScore > this.bestScore) {
            this.bestScore = this.totalScore;
            localStorage.setItem('maze_bestScore', this.bestScore.toString());
        }
        this.displayBestRecords();

        // Play sound
        if (this.sfx && this.sfx.gameOver) {
            try { this.sfx.gameOver(); } catch (e) { /* ignore */ }
        }

        // Show screen
        this.showScreen('gameOver');
    }

    // ========================================================================
    // Toast
    // ========================================================================
    showToast(key) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';

        // Fallback text map
        const fallbackMap = {
            'speedBoost': 'Speed Boost!',
            'timeFrozen': 'Time Frozen!',
            'comboX': 'Combo x' + this.comboCount + '!',
            'exitUnlocked': '🔓 Exit Unlocked!',
            'trapTriggered': '💀 Trap! Back to Start!'
        };

        // Try i18n first
        let text = fallbackMap[key] || key;
        if (typeof i18n !== 'undefined' && i18n.t) {
            const translated = i18n.t('toast.' + key);
            if (translated && translated !== 'toast.' + key) {
                text = translated;
                if (key === 'comboX') {
                    text = text.replace('{n}', this.comboCount);
                }
            }
        }

        toast.textContent = text;
        container.appendChild(toast);

        // Auto-remove after 2s
        setTimeout(() => {
            toast.classList.add('out');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 2000);
    }

    // ========================================================================
    // HUD
    // ========================================================================
    updateHUD() {
        const stageEl = document.getElementById('stage-display');
        const timeEl = document.getElementById('time-display');
        const scoreEl = document.getElementById('score-display');
        const keyEl = document.getElementById('key-count');
        const bonusEl = document.getElementById('bonus-count');

        if (stageEl) stageEl.textContent = this.stage;

        if (timeEl) {
            if (this.gameMode === 'timer') {
                // Countdown in seconds
                const secs = Math.max(0, Math.ceil(this.timeLeft / 1000));
                timeEl.textContent = secs;

                // Warning color when low
                if (secs <= 10) {
                    timeEl.style.color = '#e74c3c';
                } else if (secs <= 20) {
                    timeEl.style.color = '#f39c12';
                } else {
                    timeEl.style.color = '';
                }

                // Frozen indicator
                if (this.timeFrozen) {
                    timeEl.style.color = '#9b59b6';
                }
            } else {
                // Elapsed as M:SS
                const totalSecs = Math.floor(this.timeUsed / 1000);
                const mins = Math.floor(totalSecs / 60);
                const secs = totalSecs % 60;
                timeEl.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
                timeEl.style.color = '';
            }
        }

        if (scoreEl) scoreEl.textContent = this.totalScore;
        if (keyEl) keyEl.textContent = `${this.keysCollected}/${this.totalKeys}`;
        if (bonusEl) bonusEl.textContent = this.bonusCollected;
    }

    updateComboDisplay() {
        const comboEl = document.getElementById('combo-display');
        if (!comboEl) return;

        if (this.comboCount > 0 && this.comboTimer > 0) {
            comboEl.classList.remove('hidden');
            comboEl.textContent = 'x' + this.comboMultiplier.toFixed(1);

            // Pulse animation: remove and re-add class
            comboEl.classList.remove('pulse');
            // Force reflow
            void comboEl.offsetWidth;
            comboEl.classList.add('pulse');
        } else {
            comboEl.classList.add('hidden');
        }
    }

    // ========================================================================
    // Interstitial Ad
    // ========================================================================
    showInterstitialAd() {
        if (window.adsbygoogle) {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({
                    google_ad_client: 'ca-pub-3600813755953882',
                    enable_page_level_ads: true
                });
            } catch (e) {
                // Silently fail if ads not available
            }
        }
    }
}


// ============================================================================
// DOMContentLoaded: Init i18n, hide loader, create game
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    const loader = document.getElementById('app-loader');

    // Init i18n with try-catch to prevent loader stuck
    try {
        if (typeof i18n !== 'undefined' && i18n.init) {
            await i18n.init();
        }
    } catch (e) {
        console.warn('i18n init failed:', e);
    }

    // Hide loader regardless of i18n outcome
    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 300);
    }

    // Create and start game
    const game = new Game();
});
