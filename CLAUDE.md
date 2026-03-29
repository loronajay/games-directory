# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Jay's Retro Arcade** — a GitHub Pages site at `jayarcade.com` that hosts TurboWarp-exported games with a retro CRT aesthetic. Games are built in TurboWarp (a Scratch fork), exported as ZIPs, then imported and patched automatically via Python scripts.

This repo is one layer of a larger connected system called the **Jay Arcade ecosystem** — a full-stack competitive arcade platform being built by a solo developer (Jay Lorona). The ecosystem connects:

- **Game Creation** → Textify/Blockify tooling layer (`github.com/loronajay/textify-blockify-IR`)
- **Game Distribution** → `jayarcade.com` (this repo — the platform layer)
- **Player Engagement** → Competitive systems (Phase 2, not yet built)
- **Physical Hardware** → Bird Duty: Lite + future arcade devices (Phase 3+)

The platform is currently in **Phase 1 — Cloud Arcade Platform**. Phase 1 goal: a stable, public-facing arcade with a solid game library, cross-device support, and early monetization.

## Current Focus

Refining the website, adding new game titles, and fixing navigation bugs. Changes should be committed and pushed when a natural milestone is reached.

## Broader Ecosystem Context

Understanding the full picture helps Claude make better-informed suggestions for this repo.

### Jay Arcade Vision

Jay Arcade is designed to revive the competitive culture of classic arcades using modern web technology. Core design principles mirror what made arcades successful: simple controls, quick sessions, repeatable gameplay, skill-based competition, score-driven progression.

The long-term platform vision includes:
- **Global leaderboards** and **player profiles** with persistent stats
- **Personal Arcades** — `jayarcade.com/arcade/<player>` — each player gets their own customizable arcade environment showcasing rankings, trophies, favorite games, and achievements
- **Weekly challenges** and **tournament systems**
- **Hardware** — Bird Duty: Lite (battery-powered touchscreen handheld, first prototype) → home units → venue cabinets
- **Subscription model** — cabinets retain value whether subscription is active (updates) or inactive (last installed state)

### Phase Roadmap

| Phase | Status | Focus |
|---|---|---|
| 1 — Cloud Arcade Platform | **ACTIVE** | Website, game library, pipeline, mobile controller, early monetization |
| 2 — Competitive Platform Systems | Planned | Player profiles, leaderboards, personal arcades, challenges, tournaments |
| 3 — Prototype Arcade Hardware | Planned | Bird Duty: Lite (touchscreen handheld) |
| 4 — Pilot Deployments | Planned | Real-world testing at events/venues |
| 5 — Arcade Ecosystem Expansion | Planned | Global competitive network, venue cabinets |

### Textify/Blockify System (Tooling Layer)

**Repo:** `github.com/loronajay/textify-blockify-IR` (open source, also by Jay)

Textify/Blockify is a deterministic, round-trip IR (Intermediate Representation) transformation engine for TurboWarp/Scratch block programs. It enables AI-assisted game development by converting visual block logic to structured text and back.

**Full pipeline:**
```
TurboWarp editor → [Textify extension] → Textify Canon IR → [AI model] → [Blockify extension] → Scratch blocks
```

**Current status (as of March 2026): Full round-trip is working.**
- **Textify (export):** Click any block → copies full stack as IR to clipboard. Can export all stacks from a named sprite, with or without grammar rules prepended for AI consumption.
- **Blockify (import/render):** Parses IR from clipboard and renders it back as visual Scratch blocks using an embedded `scratch-blocks` renderer. Supports `[procedure]`, `[script]`, `[stack:]`, and `[opcode:]` roots.
- **AI roundtrip testing:** Tested against Google Gemini (8/8 pass), ChatGPT (8/8 pass), and Claude Sonnet 4.6 (partial — 2/4 pass before test credits ran out, testing ongoing).
- **Jest suite:** 16 test suites / 201 tests passing.

**Known current limits:**
- No natural-language-to-patch layer yet
- No project-wide wrapper IR root yet
- No sprite creation ops yet
- No logic-review/lint engine yet

The IR format is bracket-delimited and deterministic. Grammar is defined in `IR_GRAMMAR.md` (machine-optimized for AI consumption). The repo includes `factory_extensions/` — TurboWarp Game Factory extensions that were previously separate.

### TurboWarp Game Factory

The `turbowarp-game-factory/index.html` page on this site showcases the Game Factory system (modular Scratch extension framework). It links to `github.com/loronajay/textify-blockify-IR` since the factory extensions now live there under `factory_extensions/`.

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
   - Runs `patch_all_games.py` (injects mobile meta tags, `jay-mobile.js`, `JAY_GAME_CONFIG`, GoatCounter analytics)
   - Runs `generate_grid.py` (regenerates the auto-generated section of `grid.html`)
   - Optionally commits and pushes

Individual scripts can also be run standalone:
```bash
python scripts/patch_all_games.py    # re-patch all game HTML files
python scripts/generate_grid.py      # regenerate grid.html cards only
```

## Architecture Overview

### Pages
- `index.html` — Landing page with two mode cards: "QUICK SELECT" (→ `grid.html`) and "ENTER ARCADE" (→ `games/mini-arcade/`)
- `grid.html` — Paged game gallery (9 cards/page). The game card HTML between `<!-- AUTO-GENERATED-GRID-PAGES-START -->` and `<!-- AUTO-GENERATED-GRID-PAGES-END -->` is **entirely auto-generated** — never edit it manually.
- `turbowarp-game-factory/index.html` — Showcase page for the TurboWarp Game Factory system. Module cards use hover-to-play preview videos from `previews/game-factory-previews/`. Links to `github.com/loronajay/textify-blockify-IR`.
- `dev/index.html` — Founder Console. Private roadmap page with BIOS boot sequence. Accessible via `dev.jayarcade.com`.
- `invest/index.html` — Investor Overview. Features the game library with preview videos and links. Accessible via `invest.jayarcade.com`.

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

**Current game slugs:** `apple-catcher`, `art-of-war`, `bird-duty`, `blade-and-sphere`, `dodgeballs`, `paddle-battle`, `sumorai`

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
5. Also add the game manually to `invest/index.html` featured grid if appropriate

## Updating an Existing Game

Same as adding — drop the new export ZIP in `../exports/` and re-run the build. The script overwrites and re-patches.

## Visual Design

Retro 1980s arcade aesthetic throughout: "Press Start 2P" font, neon cyan/magenta on black, CRT scanlines and vignette overlays, CRT collapse animation on page transitions.
