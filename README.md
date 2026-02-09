# Maze Runner - Escape the Maze

A fast-paced HTML5 Canvas-based puzzle game where players navigate through procedurally generated mazes, collect items, and compete for high scores.

## Features

### Core Gameplay
- **Random Maze Generation**: Each level generates a unique maze using the Recursive Backtracking algorithm
- **Progressive Difficulty**: Maze size increases with each stage (5x5 → 7x7 → 10x10 → 15x15 → 20x20)
- **Three Game Modes**:
  - Normal Mode: Full maze visibility
  - Fog of War: Only see 3 tiles radius around player
  - Time Attack: Race against the clock with increasing time pressure

### Controls
- **Desktop**: WASD keys or Arrow keys for movement
- **Mobile**: Touch and swipe for directional movement
- **Keyboard Shortcut**: Press 'H' for hint (shows path to exit for 3 seconds)

### Game Mechanics
- **Player Character**: Smooth interpolated movement with collision detection
- **Item System**: Collect keys (🔑) and bonus items (⭐) for score multipliers
- **Exit Goal**: Navigate to the exit flag (🚩) to complete the level
- **Scoring**: Base score = (Time Remaining × Stage Level) + (Keys × 100) + (Bonus × 50)
- **Minimap**: Toggleable real-time map showing player position and maze layout

### User Interface
- **Dark Mode First**: Professional dark theme (#0f0f23) with teal accent (#1abc9c)
- **2026 UI/UX Trends**: Glassmorphism, microinteractions, minimalist design
- **Accessibility**: 44px+ touch targets, sufficient color contrast, keyboard navigation
- **Responsive Design**: Works seamlessly on mobile (360px) to desktop screens

### Internationalization (i18n)
12 languages supported with automatic browser language detection:
- 🇰🇷 Korean (한국어)
- 🇺🇸 English
- 🇯🇵 Japanese (日本語)
- 🇨🇳 Chinese (中文)
- 🇪🇸 Spanish (Español)
- 🇧🇷 Portuguese (Português)
- 🇮🇩 Indonesian (Bahasa Indonesia)
- 🇹🇷 Turkish (Türkçe)
- 🇩🇪 German (Deutsch)
- 🇫🇷 French (Français)
- 🇮🇳 Hindi (हिन्दी)
- 🇷🇺 Russian (Русский)

### Sound Effects
- Web Audio API-powered sound effects (can be toggled on/off)
- Move sounds, item collection, level clear, hint sounds
- Graceful fallback if audio context unavailable

### Monetization Features
- Google AdSense banner ads (top and bottom)
- Google Analytics 4 integration (GA-J8GSWM40TV)
- Interstitial ad triggers every 3 levels
- Best score tracking with localStorage persistence

### Progressive Web App (PWA)
- Service Worker for offline functionality
- App manifest for install-to-homescreen
- SVG icons (192x192, 512x512) with maskable support
- Installable on iOS and Android devices

### Analytics & SEO
- Schema.org VideoGame structured data
- Open Graph meta tags for social sharing
- GA4 event tracking for gameplay analytics
- Optimized for search engines

## File Structure

```
maze-runner/
├── index.html              # Main game HTML
├── manifest.json           # PWA configuration
├── sw.js                   # Service Worker for offline
├── icon-192.svg            # App icon (192px)
├── icon-512.svg            # App icon (512px)
├── css/
│   └── style.css          # Complete styling with dark mode
├── js/
│   ├── app.js             # Game logic and Canvas rendering
│   ├── i18n.js            # i18n loader and language switcher
│   └── locales/
│       ├── ko.json        # Korean translations
│       ├── en.json        # English translations
│       ├── ja.json        # Japanese translations
│       ├── zh.json        # Chinese translations
│       ├── es.json        # Spanish translations
│       ├── pt.json        # Portuguese translations
│       ├── id.json        # Indonesian translations
│       ├── tr.json        # Turkish translations
│       ├── de.json        # German translations
│       ├── fr.json        # French translations
│       ├── hi.json        # Hindi translations
│       └── ru.json        # Russian translations
└── README.md              # This file
```

## Installation & Testing

### Local Testing
```bash
# Python 3
cd E:/Fire Project/projects/maze-runner
python -m http.server 8000

# Then visit: http://localhost:8000
```

### Direct Opening
```bash
# Windows
start E:/Fire Project/projects/maze-runner/index.html

# macOS
open E:/Fire Project/projects/maze-runner/index.html

# Linux
xdg-open E:/Fire Project/projects/maze-runner/index.html
```

## Game States

1. **MENU**: Start modal with mode selection
2. **PLAYING**: Active gameplay state
3. **LEVEL_COMPLETE**: Success modal with score and next level button
4. **TIME_OVER**: Failure modal with retry button

## Technical Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript ES6+
- **Graphics**: HTML5 Canvas 2D API
- **Audio**: Web Audio API
- **PWA**: Service Worker, Manifest
- **i18n**: Custom lightweight i18n system
- **Analytics**: Google Analytics 4, AdSense

## Performance Optimizations

- Canvas rendering at native resolution
- Efficient maze generation with DFS algorithm
- RequestAnimationFrame for smooth animations
- Lazy loading of translations
- Service Worker caching strategy
- Minimal dependencies (zero external libraries)

## Browser Compatibility

- Chrome/Edge 60+
- Firefox 55+
- Safari 12+
- Mobile browsers (iOS Safari 12+, Android Chrome)

## License

All code and assets are copyright-free and suitable for commercial use.

## Future Enhancements

- Leaderboard system with Firebase
- Procedural difficulty scaling
- Achievement/badge system
- Level editor
- Multiplayer modes
- Mobile app store distribution
