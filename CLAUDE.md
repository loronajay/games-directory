# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Jay's Retro Arcade** — a GitHub Pages site at `jayarcade.com` that hosts TurboWarp-exported games with a retro CRT aesthetic. Games are built in TurboWarp (a Scratch fork), exported as ZIPs, then imported and patched automatically via Python scripts.

This repo is one layer of a larger connected system called the **Jay Arcade ecosystem** — a full-stack competitive arcade platform being built by a solo developer (Jay Lorona). The ecosystem connects:

- **Game Creation** → Jay builds each game manually in TurboWarp (a Scratch fork)
- **Game Distribution** → `jayarcade.com` (this repo — the platform layer)
- **Leaderboards** → `leaderboard-server` (`github.com/loronajay/leaderboard-server`) — Express + PostgreSQL on Railway, live
- **Multiplayer** → `factory-network-server` (`github.com/loronajay/factory-network-server`) — WebSocket matchmaking server, live
- **Player Engagement** → Competitive systems (Phase 2, not yet built)
- **Physical Hardware** → Bird Duty: Lite + JayArcade Cabinets (Phase 3+)
- **Cabinet OS** → `jayarcade.com` site served locally on Pi 5 via nginx + Chromium kiosk; subscription-gated updates via `git pull` on boot

The platform is currently in **Phase 1 — Cloud Arcade Platform**. Phase 1 goal: a stable, public-facing arcade with a solid game library, cross-device support, and early monetization.

**Canonical controls by platform:**
- **Web** — keyboard, mouse, gamepad
- **Mobile** — touch controller (on-screen D-pad + buttons via `jay-mobile.js`)
- **JayArcade Cabinets** — joystick + buttons
- **JayArcade Backpack** — gamepad / fightstick
- **Bird Duty: Lite** — touchscreen

## Current Focus

**Active: Leaderboard pipeline integration.** Read `leaderboard-server-progress.md` for the authoritative status — it supersedes `leaderboard-integration-plan.md`.

**Server status (as of 2026-04-04): fully deployed.** Express + pg on Railway, PostgreSQL schema live, all 9 game secret keys deployed as env vars, health check confirmed at `https://leaderboard-server-production.up.railway.app/health`.

**Pipeline status: Steps 1–5 complete. Waiting on apple-catcher TurboWarp rebuild before Step 6.**

~~1. Create `.env` at `C:\Users\leoja\Desktop\Dad Games\full-games\.env`~~ — Done
~~2. Update `factory-leaderboards.js` TurboWarp extension~~ — Done (rebuild/re-export still needed before E2E test)
~~3. Add `"leaderboard"` block to each game's `game.json`~~ — Done (enabled: true for apple-catcher, bird-duty, blade-and-sphere, space-molestors, speed-demon)
~~4. Extend `patch_all_games.py` to load `.env`, read `game.json`, inject `leaderboard` config + `JayLeaderboard` helper~~ — Done
~~5. Dry run: `python scripts/patch_all_games.py --dry-run`~~ — Done, output confirmed correct
6. Rebuild apple-catcher in TurboWarp with leaderboard blocks wired up → re-export → drop in `../exports/`
7. Full build + push: `python scripts/build_arcade.py --commit --push`
8. E2E test on apple-catcher

Also ongoing: refining the website, adding new game titles, and fixing navigation bugs. Changes should be committed and pushed when a natural milestone is reached.

## Broader Ecosystem Context

Understanding the full picture helps Claude make better-informed suggestions for this repo.

### Jay Arcade Vision

Jay Arcade is designed to revive the competitive culture of classic arcades using modern web technology. Core design principles mirror what made arcades successful: simple controls, quick sessions, repeatable gameplay, skill-based competition, score-driven progression.

The long-term platform vision includes:
- **Global leaderboards** and **player profiles** with persistent stats
- **Personal Arcades** — `jayarcade.com/arcade/<player>` — each player gets their own customizable arcade environment showcasing rankings, trophies, favorite games, and achievements
- **Weekly challenges** and **tournament systems**
- **Hardware** — Three physical products planned (Phase 3):
  - **Bird Duty: Lite** — battery-powered touchscreen handheld; first prototype and "playable business card"
  - **JayArcade Backpack** — portable cabinet with display built into the backpack; runs Arcade OS on Raspberry Pi; gamepad/fightstick controlled; marketing tool and tournament prize
  - **JayArcade Cabinets** — full arcade cabinet on Raspberry Pi; joystick + buttons; offline mode (retains last OS state) + online subscription mode (leaderboard sync, updates)
- **Subscription model** — $5/mo gates global leaderboards and automatic game/UI updates. Lapsed or unsubscribed cabinets retain the last version they received and run indefinitely offline — they never regress to a base version.

### Phase Roadmap

| Phase | Status | Focus |
|---|---|---|
| 1 — Cloud Arcade Platform | **ACTIVE** | Website, game library, pipeline, mobile controller, early monetization |
| 2 — Competitive Platform Systems | Planned | Player profiles, leaderboards, personal arcades, challenges, tournaments |
| 3 — Prototype Arcade Hardware | Planned | Bird Duty: Lite, JayArcade Backpack, JayArcade Cabinet prototypes |
| 4 — Pilot Deployments | Planned | Real-world testing at events/venues |
| 5 — Arcade Ecosystem Expansion | Planned | Global competitive network, venue cabinets |

### Bird Duty: Lite

**Repo:** `github.com/loronajay/bird-duty-lite`

Bird Duty: Lite is an ESP32 + display embedded device that boots directly into gameplay — no OS, no navigation — functioning as a tiny self-contained arcade cabinet / "playable business card."

**Current status (as of March 2026):** Hardware not yet in hand. Browser build is stable and in translation-readiness tightening (prepping JS for C firmware port). Firmware work begins when hardware arrives. No Bird Duty: Lite work happens in this repo.

### JayArcade Cabinet

**Roadmap:** `cabinet-roadmap.md`

JayArcade Cabinets run the same `jayarcade.com` site locally on a Raspberry Pi 5. nginx serves the repo at `localhost`, Chromium launches in kiosk mode. The web UI is the "OS" the player sees — the Linux layer is invisible infrastructure.

**Two modes:**
- **Offline / unsubscribed** — serves whatever version was last received via `git pull`. Never regresses. Leaderboard link hidden. Local in-game leaderboards (handled per game) still work.
- **Online + subscribed ($5/mo)** — on every boot, runs `git pull origin main` before kiosk launches, pulling the latest committed build from the repo. Global leaderboards enabled.

**Update model:** Jay runs `python scripts/build_arcade.py --commit --push` on his dev machine. That commits fully built/patched web files to the repo. On the Pi, after `git pull`, `python scripts/build_physical_arcade.py` runs to generate the cabinet build into `cabinet/`. Chromium kiosk points to `http://localhost/cabinet/`.

**Cabinet build pipeline:** `scripts/build_physical_arcade.py` reads the web source files (`index.html`, `grid.html`) and writes cabinet-specific versions to `cabinet/`. Source files are never modified. The script:
- Strips `<!-- CABINET-STRIP-START/END -->` blocks (factory-box, popular-box) and `/* CABINET-STRIP-START/END */` JS blocks from `grid.html`
- Injects `<base href="../">` so asset paths resolve correctly from the `cabinet/` subdirectory
- Injects cabinet CSS: `cursor: none`, `overflow: hidden`, compact title bar, 3×3 grid sized to fit 1080p
- Injects cabinet JS: `window.scrollTo` no-op, wheel event block, null-safe fallbacks for stripped elements
- Removes hostname redirect scripts from `index.html` (irrelevant at localhost)
- Writes `cabinet/network-status.json` (currently hardcoded `online: false` until subscription service exists)

**CABINET-STRIP markers:** `grid.html` contains HTML comment markers (`<!-- CABINET-STRIP-START/END -->`) and JS comment markers (`/* CABINET-STRIP-START/END */`) around web-only content. These are invisible to browsers and have no effect on the web version. When adding new web-only content to `grid.html` that should be stripped from the cabinet build, wrap it in these markers.

**Controls:** Cabinet joystick + buttons map to key presses via the same `JAY_GAME_CONFIG` / `control_overrides.py` system used for web and mobile. Games handle their own controls by listening for key presses — no cabinet-specific JS layer needed.

**Subscription service:** Not yet built. Planned as a separate backend service (Phase 4). Until then, subscription status is stubbed via a local file on the Pi.

**Boot animation:** The BIOS startup animation (currently on `grid.html`) is planned to eventually serve as the cabinet boot screen, displaying while the update check runs silently in the background.

### TurboWarp Game Factory

The `turbowarp-game-factory/index.html` page on this site showcases the **TurboWarp Game Factory** — a separate project by Jay that includes a suite of modular TurboWarp extensions. The Game Factory repo (`github.com/loronajay/textify-blockify-IR`) also houses **Textify/Blockify**, a round-trip IR system for converting TurboWarp block logic to structured text and back for AI-assisted workflows.

**Important distinction:** Textify/Blockify is part of the TurboWarp Game Factory project, not the Jay Arcade game creation pipeline. Jay builds each arcade game himself manually in TurboWarp. The Game Factory is a related but separate body of work that has its own showcase page on the site.

---

## Build Pipeline

All scripts live in `scripts/`. The typical workflow is:

1. Export game from TurboWarp → ZIP lands in `../exports/` (sibling directory, outside this repo)
2. Run the build script:
   ```bash
   python scripts/build_arcade.py
   python scripts/build_arcade.py --commit --push   # also git commit + push
   python scripts/build_arcade.py --dry-run         # preview only
   ```
3. What `build_arcade.py` does automatically:
   - Extracts ZIPs from `../exports/` into `games/{slug}/`
   - Validates each game has `index.html`
   - Creates/preserves `game.json` metadata per game
   - Runs `patch_all_games.py` (injects mobile meta tags, `jay-mobile.js`, `js/jay-analytics.js`, `JAY_GAME_CONFIG`, GoatCounter analytics, and game engagement tracking)
   - Runs `generate_grid.py` (regenerates the auto-generated section of `grid.html`)
   - Optionally commits and pushes

Individual scripts can also be run standalone:
```bash
python scripts/patch_all_games.py      # re-patch all game HTML files
python scripts/generate_grid.py        # regenerate grid.html cards only
```

### Cabinet Build Pipeline

`build_physical_arcade.py` generates the cabinet build into `cabinet/` from the web source. Run this on the Pi after every `git pull`, or locally to preview the cabinet layout.

```bash
python scripts/build_physical_arcade.py            # generate cabinet/
python scripts/build_physical_arcade.py --dry-run  # preview only
```

The `cabinet/` directory is gitignored — it's always generated fresh and never committed. On the Pi, the boot sequence is:

```bash
git pull origin main                       # get latest web build (subscribed only)
python scripts/build_physical_arcade.py   # generate cabinet build
# systemd then launches Chromium → http://localhost/cabinet/
```

## Architecture Overview

### Pages
- `index.html` — Landing page with two mode cards: "QUICK SELECT" (→ `grid.html`) and "ENTER ARCADE" (→ `games/mini-arcade/`)
- `grid.html` — Paged game gallery (9 cards/page). The game card HTML between `<!-- AUTO-GENERATED-GRID-PAGES-START -->` and `<!-- AUTO-GENERATED-GRID-PAGES-END -->` is **entirely auto-generated** — never edit it manually.
- `turbowarp-game-factory/index.html` — Showcase page for the TurboWarp Game Factory system. Module cards use hover-to-play preview videos from `previews/game-factory-previews/`. The OPEN SOURCE section has a full Textify/Blockify demo video (`previews/game-factory-previews/textify-blockify-demo.mp4`) and CTAs linking to the live demo and GitHub.
- `dev/index.html` — Founder Console. Private roadmap page with BIOS boot sequence. Accessible via `dev.jayarcade.com`.
- `invest/index.html` — Investor Overview. **Private page** — not publicly promoted until further traction. Features the full game library with preview videos. Accessible via `invest.jayarcade.com`.

### Stylesheets
- `css/index.css` — styles for `index.html`
- `css/grid.css` — styles for `grid.html` (references `../images/background.png` since it lives in `css/`)
- All other pages (`turbowarp-game-factory`, `dev`, `invest`) still have inline `<style>` blocks.

`generate_grid.py` only rewrites content between the grid markers, never the `<head>` — the CSS split has no effect on the pipeline.

### Games
Each game lives at `games/{slug}/` and must have:
- `index.html` — TurboWarp packager export (the actual game)
- `game.json` — Metadata used by `generate_grid.py`:
  ```json
  {
    "title": "Display Name",
    "order": 1,
    "card_classes": [],
    "preview": "slug.mp4"
  }
  ```
  - `title`: omit or leave `""` to auto-generate from folder slug
  - `order`: sort position on grid (default `9999`)
  - `card_classes`: e.g. `["desktop-only"]` hides on mobile
  - `preview`: defaults to `"{slug}.mp4"` from `previews/`

`games/mini-arcade/` is special — it's the 2D arcade lobby and is excluded from the grid.

**Current game slugs:** `apple-catcher`, `art-of-war`, `bird-duty`, `blade-and-sphere`, `dodgeballs`, `paddle-battle`, `space-molestors`, `speed-demon`, `sumorai`

### Game-Specific Controls
`scripts/control_overrides.py` maps gamepad/keyboard inputs to game-specific keys. Edit this to add/change control schemes for individual games. The `JAY_GAME_CONFIG` block injected by `patch_all_games.py` reads from this file.

### Shared JS
- `js/arcade-input.js` — Unified keyboard + gamepad input (arrow keys, WASD, D-pad, analog stick) used by the navigation UI. Exposes `ArcadeInput.onAction(fn)`.
- `js/jay-mobile.js` — On-screen d-pad controller injected into all games (currently **v19.7**). Only activates on mobile (coarse pointer or Android/iOS user agent). Polls for `window.vm.runtime.ioDevices.keyboard` every 50ms before initializing, then posts key events directly to the TurboWarp VM.

  **Layouts** (set via `window.JAY_GAME_CONFIG.mobile.layout`):
  - `"default"` — ring d-pad on the left + ABXY face button diamond on the right
  - `"dual-dpad"` — two ring d-pads; right pad maps ABXY keys to directional inputs

  **D-pad detail** — SVG ring with 8 segmented zones (4 cardinal, 4 diagonal). Uses Genesis-style angle detection: cardinals get ±26°, diagonals get ±18°. Includes hysteresis so the current direction only changes when the candidate zone is clearly winning (+8° margin). A thumb cursor tracks the raw finger position within the ring.

  **Key mapping** — defaults: `left:a, right:d, up:w, down:s, a:c, b:v, x:b, y:f`. Overridden per-game by `gameConfig.keyOverrides` (set in `control_overrides.py`).

  **`JAY_GAME_CONFIG.mobile` options:**
  - `layout` — `"default"` or `"dual-dpad"`
  - `buttonLabels` — `{ a, b, x, y }` label strings shown on face buttons
  - `sizeProfile` — `"compact"` (0.9×), `"normal"` (1.0×), or `"large"` (1.1×)
  - `portraitOffsetTweaks` / `landscapeOffsetTweaks` — `{ faceRight, faceBottom, padLeft, padBottom }` pixel nudges for fine-tuning element placement per orientation

  **Color system** — separate "plate color" (borders, UI chrome) and "glow color" (lighting/shadows). 18 named presets (e.g. `"arcade-cyan"`, `"neon-pink"`). Persisted in `localStorage` as `jayControllerPlateColor` / `jayControllerGlowColor`. Cycled at runtime via the "Plate Color" and "Glow Color" utility buttons (top-left corner).

  **Utility buttons** (fixed, top-left, monospace font):
  - **Scanlines** (top: 6px) — holds key `"2"` while pressed to toggle CRT scanlines in-game
  - **Plate Color** (top: 36px) — cycles plate color through all 18 presets
  - **Glow Color** (top: 66px) — cycles glow color independently

  **First gesture** — on the first touch, attempts `requestFullscreen()` and `screen.orientation.lock("landscape")`.

### Preview Videos
`previews/{slug}.mp4` — autoplay-on-hover videos for game cards on `grid.html` and `invest/index.html`.
`previews/game-factory-previews/{name}.mp4` — hover-to-play module previews on the factory page.

## Adding a New Game

1. Place the exported ZIP in `../exports/`
2. Add an entry to `scripts/control_overrides.py` if the game needs custom controls or mobile layout
3. Run `python scripts/build_arcade.py --commit --push`
4. The script handles everything else — extraction, patching, grid regeneration, and optionally git
5. Also add the game manually to `invest/index.html` featured grid if appropriate (private page — still keep it current)

## Updating an Existing Game

Same as adding — drop the new export ZIP in `../exports/` and re-run the build. The script overwrites and re-patches.

## Visual Design

Retro 1980s arcade aesthetic throughout: "Press Start 2P" font, neon cyan/magenta on black, CRT scanlines and vignette overlays, CRT collapse animation on page transitions.

## Analytics Notes

The repo now has a private analytics dashboard at `dev/analytics.html`. It polls GoatCounter counter JSON endpoints and focuses on per-game signals that matter for retention: pageviews, launches, estimated average engaged time, brief-session rate, and 3m+ session rate.

`scripts/patch_all_games.py` is responsible for analytics injection on exported TurboWarp game pages. In addition to the existing GoatCounter pageview normalization, it now injects:

- `js/jay-analytics.js`
- a `JAY_GAME_ANALYTICS` helper block that measures visible foreground time
- bucketed engagement events emitted on `visibilitychange` / `pagehide`

Current engagement buckets:

- `lt-10s`
- `10-30s`
- `30-60s`
- `1-3m`
- `3-10m`
- `10-20m`
- `20m-plus`

These are page-level engagement signals, not true in-game telemetry. If deeper gameplay analytics are needed later (game over, retry, score submit, level progression), that instrumentation must be emitted from inside the TurboWarp package logic.
