# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Jay's Retro Arcade** — a GitHub Pages site at `jayarcade.com` that hosts TurboWarp-exported games with a retro CRT aesthetic. Games are built in TurboWarp (a Scratch fork), exported as ZIPs, then imported and patched automatically via Python scripts.

## Current Focus

Refining the website, adding new game titles, and fixing navigation bugs. Changes should be committed and pushed when a natural milestone is reached.

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
- `turbowarp-game-factory/index.html` — Showcase page for the TurboWarp Game Factory system. Module cards use hover-to-play preview videos from `previews/game-factory-previews/`. Links to the open source repo at `github.com/loronajay/textify-blockify-IR`.
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
- `js/jay-mobile.js` — On-screen d-pad controller injected into all games. Only activates on mobile (touch/coarse pointer). Layout controlled by `window.JAY_GAME_CONFIG.mobile.layout` (`"default"` or `"dual-dpad"`). Integrates directly with the TurboWarp VM keyboard input device.

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
