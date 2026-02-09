// Maze Runner Game
class MazeGenerator {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.maze = this.generateMaze();
    }

    generateMaze() {
        // Initialize maze grid (1 = wall, 0 = path)
        const maze = Array(this.height).fill(null).map(() => Array(this.width).fill(1));

        // Recursive Backtracking algorithm
        const visited = Array(this.height).fill(null).map(() => Array(this.width).fill(false));

        const carve = (x, y) => {
            visited[y][x] = true;
            maze[y][x] = 0;

            const directions = [
                { x: 0, y: -2, dx: 0, dy: -1 }, // North
                { x: 2, y: 0, dx: 1, dy: 0 },   // East
                { x: 0, y: 2, dx: 0, dy: 1 },   // South
                { x: -2, y: 0, dx: -1, dy: 0 }  // West
            ];

            // Shuffle directions
            for (let i = directions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [directions[i], directions[j]] = [directions[j], directions[i]];
            }

            for (const dir of directions) {
                const nx = x + dir.x;
                const ny = y + dir.y;

                if (nx > 0 && nx < this.width - 1 && ny > 0 && ny < this.height - 1 && !visited[ny][nx]) {
                    maze[y + dir.dy][x + dir.dx] = 0;
                    carve(nx, ny);
                }
            }
        };

        // Start from (1, 1) to ensure walls on edges
        carve(1, 1);

        // Ensure start and end are paths
        maze[1][1] = 0;
        maze[this.height - 2][this.width - 2] = 0;

        return maze;
    }

    isWall(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return true;
        }
        return this.maze[y][x] === 1;
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');

        // Game states
        this.gameState = 'MENU'; // MENU, PLAYING, LEVEL_COMPLETE, TIME_OVER
        this.gameMode = 'normal'; // normal, fog, timer

        // Game variables
        this.stage = 1;
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('mazeRunnerBestScore') || '0');
        this.timeLeft = 60;
        this.timeUsed = 0;
        this.soundEnabled = localStorage.getItem('mazeRunnerSound') !== 'false';
        this.hintActive = false;
        this.hintTimer = 0;

        // Player
        this.player = {
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            radius: 0.3,
            speed: 0.15
        };

        // Keys
        this.keys = new Set();
        this.maze = null;

        // Items
        this.items = [];
        this.itemsCollected = {
            keys: 0,
            bonus: 0
        };

        // Touch/swipe
        this.touchStartX = 0;
        this.touchStartY = 0;

        this.setupCanvas();
        this.setupEventListeners();
        this.updateBestScore();

        // Audio context for sound effects
        this.audioContext = null;
    }

    setupCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        this.minimapCanvas.width = 150;
        this.minimapCanvas.height = 150;
    }

    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));

        // Modal buttons
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('next-btn').addEventListener('click', () => this.nextLevel());
        document.getElementById('restart-btn').addEventListener('click', () => this.restartGame());
        document.getElementById('retry-btn').addEventListener('click', () => this.restartGame());

        // Control buttons
        document.getElementById('hint-btn').addEventListener('click', () => this.showHint());
        document.getElementById('minimap-toggle').addEventListener('click', () => this.toggleMinimap());
        document.getElementById('sound-toggle').addEventListener('click', () => this.toggleSound());

        // Game mode selection
        document.querySelectorAll('input[name="gameMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.gameMode = e.target.value;
            });
        });

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase();

        if (key === 'h' && this.gameState === 'PLAYING') {
            this.showHint();
            e.preventDefault();
        }

        if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
            this.keys.add(key);
            e.preventDefault();
        }
    }

    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
            this.keys.delete(key);
        }
    }

    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    }

    handleTouchMove(e) {
        if (this.gameState !== 'PLAYING') return;

        const dx = e.touches[0].clientX - this.touchStartX;
        const dy = e.touches[0].clientY - this.touchStartY;

        const threshold = 30;

        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > threshold) {
                this.keys.add('arrowright');
                this.keys.delete('arrowleft');
            } else if (dx < -threshold) {
                this.keys.add('arrowleft');
                this.keys.delete('arrowright');
            }
        } else {
            if (dy > threshold) {
                this.keys.add('arrowdown');
                this.keys.delete('arrowup');
            } else if (dy < -threshold) {
                this.keys.add('arrowup');
                this.keys.delete('arrowdown');
            }
        }

        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    }

    handleTouchEnd(e) {
        this.keys.clear();
    }

    handleResize() {
        this.setupCanvas();
    }

    showStartModal() {
        document.getElementById('start-modal').classList.remove('hidden');
        document.getElementById('game-over-modal').classList.add('hidden');
        document.getElementById('game-failed-modal').classList.add('hidden');
    }

    startGame() {
        const selectedMode = document.querySelector('input[name="gameMode"]:checked');
        if (selectedMode) {
            this.gameMode = selectedMode.value;
        }

        this.stage = 1;
        this.score = 0;
        this.itemsCollected = { keys: 0, bonus: 0 };
        this.gameState = 'PLAYING';
        this.initializeLevel();

        document.getElementById('start-modal').classList.add('hidden');
        this.gameLoop();
    }

    nextLevel() {
        this.stage++;
        this.itemsCollected = { keys: 0, bonus: 0 };
        this.gameState = 'PLAYING';
        this.initializeLevel();

        document.getElementById('game-over-modal').classList.add('hidden');
        this.gameLoop();
    }

    restartGame() {
        this.gameState = 'MENU';
        this.showStartModal();
    }

    initializeLevel() {
        // Calculate maze size based on stage
        const mazeSize = Math.min(5 + Math.floor(this.stage / 2) * 2, 21);
        this.maze = new MazeGenerator(mazeSize, mazeSize);

        // Set time limit based on stage
        this.timeLeft = 60 + (this.stage - 1) * 10;
        this.timeUsed = 0;

        // Set player position at start
        this.player.x = 1.5;
        this.player.y = 1.5;

        // Generate items
        this.generateItems();

        // Update UI
        this.updateUI();
    }

    generateItems() {
        this.items = [];
        const mazeWidth = this.maze.getWidth();
        const mazeHeight = this.maze.getHeight();

        // Generate random items in the maze
        const itemCount = 3 + this.stage;

        for (let i = 0; i < itemCount; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * (mazeWidth - 2)) + 1;
                y = Math.floor(Math.random() * (mazeHeight - 2)) + 1;
            } while (this.maze.isWall(x, y));

            const itemType = Math.random() > 0.7 ? 'bonus' : 'key';
            this.items.push({
                x: x + 0.5,
                y: y + 0.5,
                type: itemType,
                collected: false
            });
        }
    }

    showHint() {
        if (this.gameState !== 'PLAYING') return;

        this.hintActive = true;
        this.hintTimer = 3000; // 3 seconds

        this.playSound('hint');
    }

    toggleMinimap() {
        const container = document.getElementById('minimap-container');
        container.classList.toggle('hidden');
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const btn = document.getElementById('sound-toggle');
        if (this.soundEnabled) {
            btn.textContent = '🔊';
            localStorage.setItem('mazeRunnerSound', 'true');
        } else {
            btn.textContent = '🔇';
            localStorage.setItem('mazeRunnerSound', 'false');
        }
    }

    playSound(type) {
        if (!this.soundEnabled) return;

        // Only play Web Audio API sounds if supported
        if (!window.AudioContext && !window.webkitAudioContext) return;

        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        try {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            switch (type) {
                case 'move':
                    oscillator.frequency.value = 600;
                    gainNode.gain.setValueAtTime(0.05, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                    oscillator.start(now);
                    oscillator.stop(now + 0.1);
                    break;
                case 'item':
                    oscillator.frequency.value = 800;
                    gainNode.gain.setValueAtTime(0.1, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                    oscillator.start(now);
                    oscillator.stop(now + 0.2);
                    break;
                case 'clear':
                    oscillator.frequency.value = 1000;
                    gainNode.gain.setValueAtTime(0.1, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                    oscillator.start(now);
                    oscillator.stop(now + 0.4);
                    break;
                case 'hint':
                    oscillator.frequency.setValueAtTime(600, now);
                    oscillator.frequency.linearRampToValueAtTime(800, now + 0.1);
                    gainNode.gain.setValueAtTime(0.08, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                    oscillator.start(now);
                    oscillator.stop(now + 0.1);
                    break;
            }
        } catch (e) {
            // Silently fail if audio context is not available
        }
    }

    updateUI() {
        document.getElementById('stage-display').textContent = this.stage;
        document.getElementById('time-display').textContent = Math.max(0, Math.ceil(this.timeLeft / 1000));
        document.getElementById('score-display').textContent = this.score;
        document.getElementById('key-count').textContent = this.itemsCollected.keys;
        document.getElementById('bonus-count').textContent = this.itemsCollected.bonus;
    }

    updateBestScore() {
        document.getElementById('best-score').textContent = this.bestScore;
    }

    update(deltaTime) {
        if (this.gameState !== 'PLAYING') return;

        // Update time
        this.timeLeft -= deltaTime;
        this.timeUsed += deltaTime;

        // Check time limit
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.endGame(false);
            return;
        }

        // Handle input
        let moveX = 0;
        let moveY = 0;

        if (this.keys.has('w') || this.keys.has('arrowup')) {
            moveY -= 1;
        }
        if (this.keys.has('s') || this.keys.has('arrowdown')) {
            moveY += 1;
        }
        if (this.keys.has('a') || this.keys.has('arrowleft')) {
            moveX -= 1;
        }
        if (this.keys.has('d') || this.keys.has('arrowright')) {
            moveX += 1;
        }

        // Normalize diagonal movement
        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.707;
            moveY *= 0.707;
        }

        // Update player velocity
        this.player.vx = moveX * this.player.speed;
        this.player.vy = moveY * this.player.speed;

        // Update player position with collision detection
        const newX = this.player.x + this.player.vx;
        const newY = this.player.y + this.player.vy;

        if (!this.collideWithWalls(newX, newY)) {
            this.player.x = newX;
            this.player.y = newY;
            if (moveX !== 0 || moveY !== 0) {
                this.playSound('move');
            }
        }

        // Check item collection
        this.checkItemCollection();

        // Check win condition
        this.checkWinCondition();

        // Update hint timer
        if (this.hintTimer > 0) {
            this.hintTimer -= deltaTime;
        } else {
            this.hintActive = false;
        }

        this.updateUI();
    }

    collideWithWalls(x, y) {
        const radius = this.player.radius;
        return this.maze.isWall(Math.floor(x - radius), Math.floor(y - radius)) ||
               this.maze.isWall(Math.floor(x + radius), Math.floor(y - radius)) ||
               this.maze.isWall(Math.floor(x - radius), Math.floor(y + radius)) ||
               this.maze.isWall(Math.floor(x + radius), Math.floor(y + radius));
    }

    checkItemCollection() {
        this.items.forEach(item => {
            if (!item.collected) {
                const dx = this.player.x - item.x;
                const dy = this.player.y - item.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 0.5) {
                    item.collected = true;
                    if (item.type === 'key') {
                        this.itemsCollected.keys++;
                    } else {
                        this.itemsCollected.bonus++;
                    }
                    this.playSound('item');
                }
            }
        });
    }

    checkWinCondition() {
        const mazeWidth = this.maze.getWidth();
        const mazeHeight = this.maze.getHeight();
        const endX = mazeWidth - 1.5;
        const endY = mazeHeight - 1.5;

        const dx = this.player.x - endX;
        const dy = this.player.y - endY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 0.8) {
            this.endGame(true);
        }
    }

    endGame(won) {
        this.gameState = won ? 'LEVEL_COMPLETE' : 'TIME_OVER';

        if (won) {
            // Calculate score
            const timeBonus = Math.max(0, Math.floor(this.timeLeft / 1000));
            this.score = (timeBonus * this.stage) + (this.itemsCollected.keys * 100) + (this.itemsCollected.bonus * 50);

            // Update best score
            if (this.score > this.bestScore) {
                this.bestScore = this.score;
                localStorage.setItem('mazeRunnerBestScore', this.bestScore);
                this.updateBestScore();
            }

            // Show game over modal
            document.getElementById('result-stage').textContent = this.stage;
            document.getElementById('result-score').textContent = this.score;
            document.getElementById('result-time').textContent = Math.ceil(this.timeUsed / 1000) + 's';
            document.getElementById('game-over-modal').classList.remove('hidden');

            this.playSound('clear');

            // Ad logic - show interstitial every 3 levels
            if (this.stage % 3 === 0) {
                this.showInterstitialAd();
            }
        } else {
            document.getElementById('game-failed-modal').classList.remove('hidden');
        }
    }

    showInterstitialAd() {
        // Call AdSense interstitial ad if available
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

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate scaling
        const mazeWidth = this.maze.getWidth();
        const mazeHeight = this.maze.getHeight();
        const scale = Math.min(
            this.canvas.width / mazeWidth,
            this.canvas.height / mazeHeight
        );

        // Center maze on canvas
        const offsetX = (this.canvas.width - mazeWidth * scale) / 2;
        const offsetY = (this.canvas.height - mazeHeight * scale) / 2;

        // Draw maze
        this.drawMaze(offsetX, offsetY, scale);

        // Draw items
        this.drawItems(offsetX, offsetY, scale);

        // Draw exit
        this.drawExit(offsetX, offsetY, scale);

        // Draw player
        this.drawPlayer(offsetX, offsetY, scale);

        // Draw hint path if active
        if (this.hintActive) {
            this.drawHintPath(offsetX, offsetY, scale);
        }

        // Draw minimap if visible
        if (!document.getElementById('minimap-container').classList.contains('hidden')) {
            this.drawMinimap(offsetX, offsetY, scale);
        }
    }

    drawMaze(offsetX, offsetY, scale) {
        for (let y = 0; y < this.maze.getHeight(); y++) {
            for (let x = 0; x < this.maze.getWidth(); x++) {
                if (this.maze.isWall(x, y)) {
                    this.ctx.fillStyle = '#16213e';
                    this.ctx.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale);

                    // Draw walls with slight glow
                    this.ctx.strokeStyle = 'rgba(26, 188, 156, 0.2)';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(offsetX + x * scale, offsetY + y * scale, scale, scale);
                } else {
                    this.ctx.fillStyle = '#0f0f23';
                    this.ctx.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale);
                }
            }
        }
    }

    drawItems(offsetX, offsetY, scale) {
        this.items.forEach(item => {
            if (!item.collected) {
                const x = offsetX + item.x * scale;
                const y = offsetY + item.y * scale;
                const size = scale * 0.3;

                if (item.type === 'key') {
                    // Draw key
                    this.ctx.fillStyle = '#f39c12';
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, size, 0, Math.PI * 2);
                    this.ctx.fill();

                    // Glow
                    this.ctx.strokeStyle = 'rgba(243, 156, 18, 0.5)';
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                } else {
                    // Draw bonus
                    this.ctx.fillStyle = '#e74c3c';
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, size, 0, Math.PI * 2);
                    this.ctx.fill();

                    // Glow
                    this.ctx.strokeStyle = 'rgba(231, 76, 60, 0.5)';
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                }
            }
        });
    }

    drawExit(offsetX, offsetY, scale) {
        const mazeWidth = this.maze.getWidth();
        const mazeHeight = this.maze.getHeight();
        const x = offsetX + (mazeWidth - 1.5) * scale;
        const y = offsetY + (mazeHeight - 1.5) * scale;
        const size = scale * 0.4;

        // Draw exit flag
        this.ctx.fillStyle = '#1abc9c';
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fill();

        // Glow effect
        this.ctx.strokeStyle = 'rgba(26, 188, 156, 0.6)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw flag pole
        this.ctx.strokeStyle = '#48dbfb';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - size);
        this.ctx.lineTo(x, y + size);
        this.ctx.stroke();
    }

    drawPlayer(offsetX, offsetY, scale) {
        const x = offsetX + this.player.x * scale;
        const y = offsetY + this.player.y * scale;
        const size = scale * 0.35;

        // Draw player
        this.ctx.fillStyle = '#48dbfb';
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw outline
        this.ctx.strokeStyle = '#1abc9c';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw glow
        this.ctx.shadowColor = 'rgba(26, 188, 156, 0.8)';
        this.ctx.shadowBlur = 15;
        this.ctx.beginPath();
        this.ctx.arc(x, y, size + 2, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(26, 188, 156, 0.3)';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        this.ctx.shadowColor = 'transparent';
    }

    drawHintPath(offsetX, offsetY, scale) {
        // Simple hint: highlight path to exit
        const mazeWidth = this.maze.getWidth();
        const mazeHeight = this.maze.getHeight();
        const endX = mazeWidth - 1.5;
        const endY = mazeHeight - 1.5;

        // Draw line from player to exit
        this.ctx.strokeStyle = 'rgba(26, 188, 156, 0.4)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(offsetX + this.player.x * scale, offsetY + this.player.y * scale);
        this.ctx.lineTo(offsetX + endX * scale, offsetY + endY * scale);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawMinimap(offsetX, offsetY, scale) {
        const mazeWidth = this.maze.getWidth();
        const mazeHeight = this.maze.getHeight();
        const minimapScale = this.minimapCanvas.width / mazeWidth;

        // Clear minimap
        this.minimapCtx.fillStyle = '#16213e';
        this.minimapCtx.fillRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);

        // Draw minimap maze
        for (let y = 0; y < mazeHeight; y++) {
            for (let x = 0; x < mazeWidth; x++) {
                if (this.maze.isWall(x, y)) {
                    this.minimapCtx.fillStyle = '#0f0f23';
                    this.minimapCtx.fillRect(x * minimapScale, y * minimapScale, minimapScale, minimapScale);
                }
            }
        }

        // Draw minimap player
        this.minimapCtx.fillStyle = '#48dbfb';
        this.minimapCtx.beginPath();
        this.minimapCtx.arc(this.player.x * minimapScale, this.player.y * minimapScale, 2, 0, Math.PI * 2);
        this.minimapCtx.fill();

        // Draw minimap exit
        const endX = mazeWidth - 1.5;
        const endY = mazeHeight - 1.5;
        this.minimapCtx.fillStyle = '#1abc9c';
        this.minimapCtx.beginPath();
        this.minimapCtx.arc(endX * minimapScale, endY * minimapScale, 2, 0, Math.PI * 2);
        this.minimapCtx.fill();
    }

    gameLoop() {
        const now = Date.now();
        const deltaTime = (now - (this.lastFrameTime || now));
        this.lastFrameTime = now;

        this.update(deltaTime);
        this.draw();

        if (this.gameState === 'PLAYING') {
            requestAnimationFrame(() => this.gameLoop());
        }
    }

    run() {
        this.showStartModal();
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.run();
});
