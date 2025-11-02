# Auction Game v1.0.0

Multiplayer browser-based game with auction system, bots, economy, and progression.

## 🚀 Quick Start

### Running the Local Server

```bash
python3 scripts/dev-server.py
```

Then open http://localhost:5500 in your browser.

### Alternative Commands

```bash
# Run with live reload
python3 scripts/dev-server-livereload.py

# Run via script (creates PID file)
./scripts/dev-start.sh

# Stop server
./scripts/stop_server.sh
```

## 📁 Project Structure

```
auction/
├── css/                   # All stylesheets
│   ├── menu.css          # Menu styles
│   ├── v1.css            # Game screen styles
│   ├── bank.css          # Banking system styles
│   ├── realestate.css    # Real estate styles
│   └── events.css        # Events styles
├── js/                    # All scripts
│   ├── menu.js           # Main menu logic
│   ├── v1.js             # Core auction logic
│   ├── bank-system.js    # Banking system
│   ├── bank-ui.js        # Bank UI
│   ├── realestate-system.js  # Real estate system
│   ├── realestate-ui.js      # Real estate UI
│   ├── events-system.js      # Events system
│   ├── events-ui.js          # Events UI
│   ├── sparks-effect.js      # Visual effects
│   ├── localization-manager.js  # Localization system
│   ├── localization-data.json   # Interface translations
│   ├── manifest.json            # PWA manifest
│   └── sw-v2.js                 # Service worker
├── assets/                # Resources
│   ├── icons/            # PWA icons
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── icon.svg
│   ├── images/           # Images
│   │   └── menu-bg.png  # Menu background (hammer)
│   └── bots/            # Bot avatars
│       ├── animals/     # Animals (a1-a10)
│       ├── humans/      # Humans (h1-h10)
│       └── landscapes/  # Landscapes (l1-l10)
├── scripts/              # Development scripts
│   ├── dev-server.py          # Main server without caching
│   ├── dev-server-livereload.py  # Server with auto-reload
│   ├── dev-start.sh           # Startup script with PID
│   └── start_server.sh        # Universal management script
├── src/                  # Source code modules
│   ├── auth.js          # Firebase authentication
│   ├── index.js         # Module system entry point
│   ├── bots/            # Bot system
│   │   ├── BotArchetypes.js  # Bot archetypes (strategies)
│   │   ├── BotDirector.js    # Bot management
│   │   └── BotRunner.js      # Bot action execution
│   ├── config/
│   │   └── bots.config.json  # Bot configuration
│   ├── core/            # Core systems
│   │   ├── analytics.js      # Analytics
│   │   ├── Events.js         # Events system
│   │   ├── leagues.js        # Leagues
│   │   ├── matchmaking.js    # Matchmaking
│   │   └── settings.js       # Settings
│   ├── fx/              # Visual effects
│   │   ├── avk-coins.css
│   │   ├── avk-coins.js
│   │   ├── coins.js
│   │   └── winEffects.js
│   └── ui/
│       └── leaguesPanel.js   # Leagues panel UI
├── settings/             # JSON configurations
│   ├── economy.json     # Economic parameters
│   ├── leagues.json     # League settings
│   └── matchmaking.json # Matchmaking parameters
├── index.html            # Main menu
├── v1.html               # Game screen
└── README.md             # This file
```

## 🎮 Features

### Main Menu
- 🏦 **Bank** — deposits and loans
- 🏠 **Real Estate** — purchase properties for passive income
- 🛒 **Store** — buy upgrades
- 🎉 **Events** — special events and rewards
- 👥 **Friends** — social features
- 🏆 **Top** — leaderboard
- 🎒 **Bag** — inventory
- ⚔️ **Mode** — game mode selection
- �� **Suggest** — send feedback

### Gameplay
- 5 auction columns with different difficulty levels
- Bot system with various strategies
- Timers and auto-bidding
- League system (Bronze → Platinum)
- Economy with balance and progression
- Victory effects and animations

## ⚙️ Technologies

- **Vanilla JavaScript** (ES6+)
- **CSS3** with animations and gradients
- **PWA** (Progressive Web App)
- **Service Worker** for offline mode
- **LocalStorage** for progress saving
- **Firebase** (optional, for authentication)

## 🔧 Development

### Dev Server Features

- **Port**: 5500
- **Caching disabled** — changes visible immediately after Ctrl+R
- **CORS**: all origins allowed for development
- **Livereload** — automatic page reload on file changes (in dev-server-livereload.py)

### Build/Deployment Files

- `assets/icons/icon-*.png` — PWA icons for device installation
- `server.pid` — running server PID (created automatically)

## 📝 Notes

- All files are now organized in folders for a professional GitHub repository
- All old versions (snapshots) and `untitled folder` removed
- Service Worker caches resources for fast loading
- Game saves progress in browser LocalStorage
- Firebase is optional — can play without registration
- Mobile device support (responsive + PWA)

## 🐛 Known Issues

- `firebase-config.js` is missing (optional, for Firebase)

## 📄 License

Private project.

---
**Version**: v1.0.0  
**Last Updated**: November 2, 2025  
**Author**: avokadoveiks
