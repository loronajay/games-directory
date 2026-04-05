# Jay Arcade — Master System Architecture
**Last updated: 2026-04-05**

This document covers how every part of the Jay Arcade ecosystem connects and operates — from building a game in TurboWarp through packaging, patching, deployment, leaderboard integration, and cabinet delivery. It is the authoritative technical reference for the full system.

---

## 1. Ecosystem Map

```
[TurboWarp Packager]
        │  exports ZIP → ../exports/
        ▼
[build_arcade.py]  ←─── the main command
        │
        ├─ 1. Extract ZIPs → games/{slug}/
        ├─ 2. patch_all_games.py   (modifies index.html)
        ├─ 3. generate_grid.py     (rewrites grid section in grid.html)
        └─ 4. git commit + push    (optional)
                │
                ▼
        [GitHub Pages → jayarcade.com]
                │
                ├─ [leaderboard-server]  (Railway — Express + PostgreSQL)
                └─ [factory-network-server]  (WebSocket matchmaking)

[Pi 5 Cabinet]  ←── git pull → build_physical_arcade.py → cabinet/
```

---

## 2. Directory Layout

```
full-games/
├── exports/                    ← staging area for TurboWarp ZIPs (outside repo)
├── .env                        ← leaderboard secrets (never committed)
└── games-directory-page/       ← this repo (jayarcade.com)
    ├── index.html              ← landing page (two mode cards)
    ├── grid.html               ← paged game gallery (9 cards/page)
    ├── games/
    │   ├── mini-arcade/        ← 2D lobby (excluded from grid)
    │   ├── apple-catcher/
    │   │   ├── index.html      ← TurboWarp export (patched in place)
    │   │   └── game.json       ← metadata (title, order, leaderboard config)
    │   └── {slug}/...
    ├── js/
    │   ├── jay-mobile.js       ← on-screen controller (v19.7), injected into games
    │   └── arcade-input.js     ← keyboard + gamepad nav for index/grid
    ├── css/
    │   ├── index.css
    │   └── grid.css
    ├── previews/
    │   └── {slug}.mp4          ← hover-preview videos for game cards
    ├── scripts/
    │   ├── build_arcade.py         ← main build entry point
    │   ├── patch_all_games.py      ← HTML injector
    │   ├── generate_grid.py        ← grid HTML regenerator
    │   ├── control_overrides.py    ← per-game input configs
    │   └── build_physical_arcade.py ← cabinet build generator
    ├── cabinet/                ← generated, gitignored, Pi-specific build
    └── turbowarp-game-factory/ ← separate project showcase page
```

---

## 3. Game Creation — TurboWarp Packager

Jay builds each game manually in **TurboWarp** (a Scratch fork). When a game is ready to ship:

1. Open the project in TurboWarp Packager
2. Export as a **ZIP** (self-contained HTML bundle)
3. Drop the ZIP into `../exports/` (sibling directory, outside the repo)
   - ZIP filename = game slug (e.g. `apple-catcher.zip`)

The ZIP contains at minimum:
- `index.html` — the full self-contained game (TurboWarp runtime + Scratch VM embedded)
- Any asset files referenced by the game

The ZIP structure may or may not have a wrapping folder — `build_arcade.py` handles both cases transparently.

**The game HTML at this stage is a raw TurboWarp export** — it has no mobile support, no analytics, no leaderboard hooks, and may have a non-standard viewport tag. The patcher fixes all of this.

---

## 4. Build Pipeline — `build_arcade.py`

**Command:** `python scripts/build_arcade.py [--dry-run] [--commit] [--push] [--clean-exports]`

This is the single entry point for all arcade updates. It runs four sequential steps:

### Step 1 — Import ZIPs

For each `*.zip` in `../exports/`:

1. **Preserve** existing `game.json` if present (before wiping the folder)
2. **Clear** the target `games/{slug}/` directory completely
3. **Extract** the ZIP into `games/{slug}/`
   - If the ZIP has a single wrapping folder, unwrap it automatically
4. **Restore** `game.json` (or create a starter one if it's a new game)
5. **Validate** that `index.html` exists — if not, abort the entire build

If any game fails import, the build aborts before patching.

### Step 2 — Patch All Games

Calls `patch_all_games.py` (covered in detail in Section 5).

### Step 3 — Regenerate Grid

Calls `generate_grid.py` (covered in Section 7).

### Step 4 — Git Commit + Push (optional)

```bash
git add .
git commit -m "Build arcade update"
git push
```

Only runs if `--commit` or `--push` flags are passed. `--push` implies `--commit`.

---

## 5. Patcher — `patch_all_games.py`

**Command:** `python scripts/patch_all_games.py [game-slug ...] [--dry-run] [--commit] [--push]`

This script reads `games/{slug}/index.html`, modifies it in memory, and writes it back. It is idempotent — running it twice produces the same result. Each patch pass has four phases:

### Phase 1 — Meta Tags

Ensures every game HTML has the correct mobile/viewport meta tags:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0,
  maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="screen-orientation" content="landscape">
```

Logic:
- If a viewport tag already exists with the wrong value → replace it
- If no viewport tag exists → insert the full block after `<meta charset>` or `<head>`
- Always checks and adds any missing individual meta tags

### Phase 2 — Shared Scripts

Injects into the game HTML (before `</body>`):

**`jay-mobile.js`** — the on-screen controller:
```html
<script src="../../js/jay-mobile.js"></script>
```
- Upgrades any legacy paths (`../js/jay-mobile.js`) automatically

**GoatCounter analytics:**
```html
<script>
window.goatcounter = {
  path: function(p) { /* strips /games-directory prefix, normalizes path */ }
};
</script>
<script data-goatcounter="https://loronajay.goatcounter.com/count"
  async src="//gc.zgo.at/count.js"></script>
```

### Phase 3 — Game Config (`JAY_GAME_CONFIG`)

Reads `control_overrides.py` to get per-game config, then injects a `window.JAY_GAME_CONFIG` block immediately before `jay-mobile.js`. The block is wrapped in markers so it can be updated on subsequent patches:

```html
<!-- JAY_GAME_CONFIG_START -->
<script>
window.JAY_GAME_CONFIG = {
  "keyOverrides": { ... },
  "mobile": { "layout": "default" },
  "leaderboard": { ... }   // only if enabled
};
</script>
<!-- JAY_GAME_CONFIG_END -->
```

If no entry exists in `control_overrides.py`, a default config is injected (empty overrides, default layout). On subsequent patches the existing block is replaced, not duplicated.

### Phase 4 — Leaderboard Helper (`JayLeaderboard`)

If leaderboard is enabled for this game (see Section 6), injects immediately after the config block:

```html
<!-- JAY_LEADERBOARD_START -->
<script>
window.JayLeaderboard = (function() {
  // reads window.JAY_GAME_CONFIG.leaderboard
  // exposes: submit(playerName, score) → Promise
  //          getTop(limit, device)    → Promise<scores[]>
  //          deviceType()             → "mobile" | "desktop"
})();
</script>
<!-- JAY_LEADERBOARD_END -->
```

The game's TurboWarp code calls `window.JayLeaderboard.submit(...)` and `window.JayLeaderboard.getTop(...)` directly. The helper handles all HTTP, auth headers, and error states — the game just passes a name and score.

If leaderboard is later disabled for a game, the next patch run removes this block.

---

## 6. Game Metadata — `game.json`

Each game directory contains a `game.json`:

```json
{
  "title": "Apple Catcher",        // display name; omit for auto-slug-to-title
  "order": 1,                      // sort position on grid (default 9999)
  "card_classes": [],              // e.g. ["desktop-only"] to hide on mobile
  "preview": "apple-catcher.mp4", // defaults to {slug}.mp4

  "leaderboard": {
    "enabled": true,               // false = patcher skips this game
    "scoreMin": 0,
    "scoreMax": 99999
  }
}
```

The `game.json` is **preserved across re-imports** — when a new ZIP is dropped in, `build_arcade.py` reads the existing `game.json` before clearing the folder and writes it back after extraction. Manual metadata is never lost.

### Leaderboard Activation Chain

For leaderboard injection to happen, three things must all be true:

1. `game.json` has `"leaderboard": { "enabled": true }`
2. `LEADERBOARD_URL` is set in `../full-games/.env`
3. The `.env` contains a matching `KEY_{SLUG}` secret (e.g. `KEY_APPLE_CATCHER`)

If any condition fails, the patcher emits a warning and skips leaderboard injection for that game — it does not abort.

---

## 7. Control Overrides — `control_overrides.py`

Defines `GAME_CONFIGS` dict mapping game slugs to their `JAY_GAME_CONFIG`:

```python
GAME_CONFIGS = {
    "apple-catcher": {
        "keyOverrides": {
            "b": "ArrowLeft",
            "x": "ArrowRight"
        },
        "mobile": {
            "layout": "dual-dpad"   # two d-pads; right pad maps ABXY to directions
        }
    },
    "blade-and-sphere": {
        "keyOverrides": {
            "up": "j",
            "b": "c",
            "a": "w"
        },
        "mobile": {
            "layout": "default"
        }
    }
}
```

**Key mapping defaults** (before overrides): `left→a, right→d, up→w, down→s, a→c, b→v, x→b, y→f`

When `jay-mobile.js` initializes, it reads `window.JAY_GAME_CONFIG.keyOverrides` and routes its D-pad/button events to whatever keys the game actually listens for. This means the TurboWarp game code never changes — only the mapping layer changes.

---

## 8. Grid Generator — `generate_grid.py`

**Command:** `python scripts/generate_grid.py`

Reads all `games/{slug}/game.json` files, builds HTML card markup for each game, and replaces the content between the two markers in `grid.html`:

```html
<!-- AUTO-GENERATED-GRID-PAGES-START -->
... all pages/cards go here ...
<!-- AUTO-GENERATED-GRID-PAGES-END -->
```

**Never edit the HTML between these markers manually.** It will be overwritten on the next build.

### What it generates

- Sorts games by `order` (then alphabetically)
- Skips `mini-arcade/`
- Paginates at 9 cards per page (fills remainder with "COMING SOON" future cards)
- Always generates at least 2 pages
- Each card links to `games/{slug}/index.html`
- Preview video uses `previews/{preview_filename}` (autoplay-on-hover handled by grid.js)

---

## 9. Shared JavaScript Layer

### `js/arcade-input.js` — Navigation Input

Used by `index.html` and `grid.html` (the platform UI, not individual games). Exposes `window.ArcadeInput.onAction(fn)` with unified events: `left`, `right`, `up`, `down`, `select`.

Sources:
- Keyboard: Arrow keys, WASD, Enter/Space
- Gamepad: D-pad buttons + left analog stick, A button (polled via `requestAnimationFrame`)

### `js/jay-mobile.js` — In-Game Controller (v19.7)

Injected into every game by the patcher. Only activates on mobile (coarse pointer or Android/iOS UA). Polls `window.vm.runtime.ioDevices.keyboard` every 50ms before initializing — waits for TurboWarp VM to be ready, then posts key events directly into the Scratch/TurboWarp key input system.

**Layouts:**
- `"default"` — ring D-pad (left) + ABXY face button diamond (right)
- `"dual-dpad"` — two ring D-pads; right maps ABXY to directional key inputs

**D-pad mechanics:**
- SVG ring with 8 segmented zones (4 cardinal, 4 diagonal)
- Genesis-style angle detection: cardinals ±26°, diagonals ±18°
- Hysteresis: direction only changes when candidate zone wins by +8° margin
- Smooth thumb cursor tracks raw finger position

**Color system:**
- 18 named presets (e.g. `"arcade-cyan"`, `"neon-pink"`)
- Separate "plate color" (chrome/borders) and "glow color" (lighting/shadows)
- Persisted in `localStorage` as `jayControllerPlateColor` / `jayControllerGlowColor`

**Utility buttons** (top-left, always visible on mobile):
- **Scanlines** — holds key `"2"` to toggle CRT effect in-game
- **Plate Color** — cycles plate through 18 presets
- **Glow Color** — cycles glow color independently

**First touch:** calls `requestFullscreen()` + `screen.orientation.lock("landscape")`

---

## 10. Leaderboard Server

**Repo:** `github.com/loronajay/leaderboard-server`
**Live at:** `https://leaderboard-server-production.up.railway.app`

Stack: Express + PostgreSQL, deployed on Railway.

### Schema

```sql
CREATE TABLE scores (
  id          SERIAL PRIMARY KEY,
  game_id     TEXT NOT NULL,
  player_name TEXT NOT NULL,
  score       INTEGER NOT NULL,
  device_type TEXT NOT NULL,   -- "mobile" | "desktop"
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### API

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | none | Server health check |
| POST | `/scores` | `x-leaderboard-key` header | Submit a score |
| GET | `/scores/:gameId?device=&limit=` | none | Fetch top scores |

POST body: `{ gameId, playerName, score, deviceType }`

POST CORS is restricted to `jayarcade.com`. GET is open.

Rate limiting: 10 POST requests per IP per minute (in-memory sliding window).

### Auth Key Flow

```
Railway env vars (KEY_APPLE_CATCHER, KEY_BIRD_DUTY, ...)
        │
        ├─ Server reads them into gameConfig.js to authenticate incoming POST requests
        │
        └─ ../full-games/.env (local, never committed) ← patcher reads this
                │
                └─ patch_all_games.py injects key into JAY_GAME_CONFIG.leaderboard.key
                        │
                        └─ JayLeaderboard helper sends it as x-leaderboard-key header
```

The game code itself never sees or manages the key — it calls `window.JayLeaderboard.submit(name, score)` and the injected helper handles auth.

### Score separation by device

Mobile and desktop scores are stored separately (via `device_type` column and separate indexes). `JayLeaderboard.deviceType()` detects which context the player is on. Leaderboard fetches default to the player's own device type but can query either.

---

## 11. Deployment — GitHub Pages

The repo is served as a static site at `jayarcade.com` via GitHub Pages.

Subdomains via CNAME / GitHub Pages subdomain routing:
- `jayarcade.com` → `index.html`
- `dev.jayarcade.com` → `dev/index.html` (Founder Console)
- `invest.jayarcade.com` → `invest/index.html` (Investor Overview — private)

**Typical deploy command:**
```bash
python scripts/build_arcade.py --commit --push
```

This imports any pending ZIPs, patches all games, regenerates the grid, commits, and pushes to `main`. GitHub Pages serves the latest `main` automatically.

---

## 12. Cabinet Build — `build_physical_arcade.py`

**Command:** `python scripts/build_physical_arcade.py [--dry-run]`

Run on the Pi after every `git pull`. Generates a cabinet-specific version of the site into `cabinet/` (gitignored, never committed). Source files are never modified.

### What it strips (from `grid.html`)

Anything wrapped in cabinet strip markers is removed:
```html
<!-- CABINET-STRIP-START -->
... web-only content (factory-box, popular-box, etc.) ...
<!-- CABINET-STRIP-END -->
```
```js
/* CABINET-STRIP-START */
... web-only JS (popularity tracking, etc.) ...
/* CABINET-STRIP-END */
```

These markers are invisible to browsers — they have zero effect on the web version.

### What it injects (into both pages)

**`<base href="../">`** — makes all asset paths (`js/`, `css/`, `games/`, `previews/`) resolve correctly from the `cabinet/` subdirectory.

**Cabinet CSS (both pages):**
```css
* { cursor: none !important; }
html, body { overflow: hidden !important; }
```

**Cabinet grid CSS (`grid.html` only):**
- Compact title bar (smaller font, less padding)
- Grid fills 83vh — all 9 cards visible on one 1080p screen, no scrolling/pagination
- Nav arrows hidden (`display: none`)

**Cabinet grid JS (`grid.html` only):**
```js
const popularBox = null;   // null-safe fallback for stripped elements
const popularLink = null;
window.scrollTo = () => {};  // prevents centerOnTarget from scrolling
window.addEventListener('wheel', e => e.preventDefault(), { passive: false });
```

### What it strips from `index.html`

Hostname redirect scripts (pointless at `localhost`):
```js
// These patterns are removed:
if (location.hostname ...
const host = ...
```

Also rewrites the grid link:
```html
href="grid.html"  →  href="cabinet/grid.html"
```

### `cabinet/network-status.json`

```json
{ "online": false }
```

Hardcoded until the subscription service is built (Phase 4). The grid reads this to decide whether to show/hide the leaderboard link.

### Pi Boot Sequence

```bash
git pull origin main                        # subscribed cabinets only
python scripts/build_physical_arcade.py    # generate cabinet/ from latest web build
# systemd launches Chromium in kiosk mode → http://localhost/cabinet/
```

Unsubscribed / offline cabinets skip the `git pull` and serve the last received build indefinitely — they never regress.

---

## 13. Multi-Platform Surface

The same game, built once, runs across all surfaces:

| Surface | Controls | Mobile Controller | Leaderboard |
|---|---|---|---|
| Web (desktop) | Keyboard / gamepad | no | yes (if enabled) |
| Web (mobile) | `jay-mobile.js` on-screen controller | yes | yes (if enabled) |
| JayArcade Cabinet | Joystick + buttons → key presses | no | yes (if subscribed) |
| JayArcade Backpack | Gamepad / fightstick | no | yes (if subscribed) |
| Bird Duty: Lite | Touchscreen (custom firmware) | N/A | planned |

All surfaces ultimately send keyboard key events to the TurboWarp VM. The only layer that changes is what hardware/input generates those key events. The game code is identical on every surface.

---

## 14. Adding a New Game (End-to-End)

1. Build the game in TurboWarp, export as ZIP named `{slug}.zip`
2. Drop ZIP in `../exports/`
3. Add entry to `scripts/control_overrides.py` if the game needs custom key mappings or mobile layout
4. Set `"leaderboard": { "enabled": true }` in the game's `game.json` if it should have a leaderboard (the patcher will create a starter `game.json` if one doesn't exist — you can edit it after the first build)
5. Add `KEY_{SLUG}` to both `../full-games/.env` (local) and Railway env vars (server)
6. Add a preview video to `previews/{slug}.mp4`
7. Run `python scripts/build_arcade.py --commit --push`
8. Add the game to `invest/index.html` featured grid if appropriate (manual — private page)

---

## 15. Connected External Services

| Service | Repo | Host | Role |
|---|---|---|---|
| Leaderboard Server | `loronajay/leaderboard-server` | Railway | Score storage + retrieval |
| Factory Network Server | `loronajay/factory-network-server` | Railway | WebSocket matchmaking |
| Bird Duty: Lite | `loronajay/bird-duty-lite` | N/A | Embedded hardware (separate project) |
| TurboWarp Game Factory | `loronajay/textify-blockify-IR` | N/A | Separate project, showcased at `/turbowarp-game-factory/` |
| GoatCounter | `loronajay.goatcounter.com` | GoatCounter cloud | Page view analytics |
| GitHub Pages | `loronajay/games-directory-page` | GitHub | Static site hosting (jayarcade.com) |
