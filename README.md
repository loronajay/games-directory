# Jay's Retro Arcade

**[jayarcade.com](https://jayarcade.com)** — A browser-based competitive arcade platform with a retro CRT aesthetic. Built and maintained by Jay Lorona.

---

## What This Is

Jay's Retro Arcade is a GitHub Pages site hosting a library of original arcade-style games built in TurboWarp (a Scratch fork). Games are designed around fast starts, short sessions, high replayability, and skill-based mechanics.

This repo is the **platform layer** of a larger connected ecosystem — see [Ecosystem](#ecosystem) below.

---

## The Games

Each game is built manually by Jay in TurboWarp, exported as a ZIP, and integrated via an automated Python build pipeline. The pipeline handles extraction, patching (mobile controller injection, analytics), and grid regeneration automatically.

**Current library:** Apple Catcher, Art of War, Bird Duty, Blade & Sphere, Dodgeballs, Paddle Battle, Sumorai

---

## Site Structure

| Page | URL | Description |
|---|---|---|
| Landing | `jayarcade.com` | Entry point — Quick Select or Enter Arcade |
| Game Grid | `jayarcade.com/grid.html` | Paged game gallery (9 cards/page) |
| Mini Arcade | `jayarcade.com/games/mini-arcade/` | 2D arcade lobby |
| Game Factory | `jayarcade.com/turbowarp-game-factory/` | TurboWarp Game Factory showcase |
| Founder Console | `dev.jayarcade.com` | Private roadmap (BIOS boot sequence) |
| Investor Overview | `invest.jayarcade.com` | Investor-facing game library + overview |

---

## Build Pipeline

```bash
python scripts/build_arcade.py                  # build only
python scripts/build_arcade.py --commit --push  # build + deploy
python scripts/build_arcade.py --dry-run        # preview
```

To add a new game: drop the TurboWarp export ZIP into `../exports/` and run the build script.

---

## Mobile Controller

All games are playable on mobile via a custom on-screen controller (`js/jay-mobile.js`, currently **v19.7**):

- Segmented 8-direction D-pad + ABXY face buttons
- Multi-touch support
- 18 plate/glow color presets, persisted in localStorage
- Attempts fullscreen + landscape lock on first touch

---

## Ecosystem

Jay's Retro Arcade is Phase 1 of a larger platform:

| Phase | Focus | Status |
|---|---|---|
| 1 — Cloud Arcade Platform | Website, game library, mobile controller, pipeline | **Active** |
| 2 — Competitive Systems | Player profiles, leaderboards, personal arcades, tournaments | Planned |
| 3 — Arcade Hardware | Bird Duty: Lite, JayArcade Backpack, JayArcade Cabinets | Planned |
| 4 — Pilot Deployments | Real-world testing at events and venues | Planned |
| 5 — Ecosystem Expansion | Global competitive network, venue cabinets | Planned |

### Hardware (Phase 3)

- **Bird Duty: Lite** — Battery-powered touchscreen handheld. First prototype and "playable business card."
- **JayArcade Backpack** — Portable cabinet built into a backpack. Raspberry Pi, gamepad/fightstick controlled. Marketing tool and tournament prize.
- **JayArcade Cabinets** — Full arcade cabinet on Raspberry Pi. Joystick + buttons. Offline mode (retains last OS state) + online subscription mode (leaderboard sync, updates).

### Related Projects

- **[TurboWarp Game Factory](https://github.com/loronajay/textify-blockify-IR)** — A separate project by Jay. A suite of modular TurboWarp extensions including Textify/Blockify, a round-trip IR system for AI-assisted block logic workflows. Showcased at `jayarcade.com/turbowarp-game-factory/`.

---

## Visual Design

Retro 1980s arcade aesthetic: Press Start 2P font, neon cyan/magenta on black, CRT scanlines and vignette overlays, CRT collapse animation on page transitions.
