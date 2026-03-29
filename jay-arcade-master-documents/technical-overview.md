# Jay Arcade — Technical Overview (Canon v3)

## System Summary

Jay Arcade is a modular arcade platform ecosystem built using modern web technologies. The platform is designed to operate across three environments:

1. **Cloud Web Platform** (current stage)
2. **Embedded / Offline Arcade System** (hardware stage)
3. **Connected Arcade Network** (long-term ecosystem)

---

## System Structure

The system is built as a layered, modular architecture separating:

- Platform interface
- Game runtime
- Input systems
- Build pipeline
- Tooling (Textify/Blockify)
- Competitive systems
- Hardware integration
- Monetization layer

This separation allows the platform to scale without breaking existing functionality.

---

## Core Architecture

### Primary Stack

```
Player Access Layer
       ↓
Arcade OS Interface
       ↓
Game Directory / Selection System
       ↓
Game Runtime Environment
       ↓
Individual Arcade Games
```

### Supporting Systems

- Unified Input System
- Mobile Controller System (LOCKED)
- Game Pipeline System
- Textify/Blockify System (Tooling Layer)
- Monetization Layer (traffic + funnel)
- Competitive Systems (future)
- Deployment Infrastructure

---

## Arcade OS Interface

The Arcade OS is the identity and interaction layer of the platform. It simulates the experience of using an arcade system while remaining lightweight and web-native.

**Implementation:** HTML, CSS, JavaScript

**Core Responsibilities:**
- Entry / boot experience
- Navigation
- Game selection
- Visual identity (CRT styling)

### Boot Sequence

The platform includes a stylized startup sequence:
- CRT-style effects
- Loading text
- Arcade-inspired transitions
- Start prompt

**Purpose:** Reinforce arcade identity, not simulate hardware perfectly.

### Mode Entry

The entry layer supports multiple access paths:
- Play mode
- Developer access (`dev.jayarcade.com`)
- Investor content (`invest.jayarcade.com`)

---

## Game Directory System

The game directory displays the playable arcade library.

**Structure:**
- Grid-based layout
- Video previews
- Titles
- Launch links

> **Critical:** The HTML structure of each card must remain consistent — platform scripts depend on it.

---

## Game Runtime Environment

Each game runs in an isolated runtime environment.

**Source:** TurboWarp exports placed into `games/<slug>/`

**Example structure:**
```
games/
  apple-catcher/
    index.html
    script.js
    assets/
```

**Guarantees:**
- Games cannot break the platform
- Games do not affect each other
- New games can be added safely

**Runtime Responsibilities:** initialization, rendering, asset loading, gameplay logic, input handling.

---

## Unified Input System

The platform uses a normalized input layer.

**Supported Inputs:**
- Keyboard
- Gamepad
- Touch (mobile controller)
- Future hardware

**Normalized Actions:** left, right, up, down, select, action

This allows one game logic to work across all device types.

---

## Mobile Controller System (LOCKED)

The mobile controller is a core platform system.

**Current Version:** v19.7 (stable baseline)

**Features:**
- Segmented 8-direction D-pad
- Face buttons
- Multi-touch support
- Responsive layout
- Plate color + glow system

**Architecture Rule:** Shell overlay only — games handle their own logic. Must not be restructured.

---

## Game Pipeline System

The platform includes an automated build and integration pipeline.

**Pipeline Flow:**
```
TurboWarp exports → scripts → games-directory-page/games/
```

**Responsibilities:**
- TurboWarp export intake
- Runtime patching
- Folder generation
- Grid regeneration

**Typical Workflow:**
1. Export TurboWarp project
2. Place in `../exports/`
3. Run build script
4. Patch + integrate
5. Update grid
6. Deploy

---

## Textify/Blockify System (Tooling Layer)

Textify/Blockify is part of the game creation pipeline, not the runtime. It is a deterministic, round-trip IR (Intermediate Representation) transformation engine for TurboWarp/Scratch block programs.

**Full pipeline:**
```
TurboWarp editor → [Textify] → Canon IR → [AI model] → [Blockify] → Scratch blocks
```

**Purpose:**
- Convert block logic → structured IR text
- Enable AI-assisted debugging and game mutation
- Support full round-trip editing

**Current Status (as of March 2026): Full round-trip working.**
- Textify exports any stack to clipboard as canonical IR
- Blockify parses IR and renders it back as visual Scratch blocks
- AI roundtrip tested: Gemini 8/8 pass, ChatGPT 8/8 pass, Claude partial (testing ongoing)
- Jest suite: 16 test suites / 201 tests passing

**Known Limits:**
- No natural-language-to-patch layer yet
- No project-wide wrapper IR root yet
- No sprite creation ops yet

**Repo:** `github.com/loronajay/textify-blockify-IR`

---

## Automated Patching System

Patch scripts modify runtime builds after export.

**Purpose:**
- Inject platform features
- Avoid manual editing of games
- Maintain consistency

**Examples:**
- Input handling hooks
- Shared scripts
- Platform integrations (mobile controller, analytics)

---

## Metadata System

Each game includes `game.json` metadata used by the platform.

**Fields:**
- `title` — display name
- `order` — sort position on grid
- `preview` — preview video filename
- `card_classes` — e.g. `["desktop-only"]`

**Purpose:** Automate grid generation.

---

## Deployment Infrastructure

The platform is deployed as a static web application (GitHub Pages).

**Responsibilities:**
- Version control integration
- Automated updates
- Build + deploy workflow

---

## Monetization Layer (Active)

The platform includes an early-stage growth + revenue system.

**Components:**
- Short-form content (traffic source)
- Platform entry funnel (jayarcade.com)
- Engagement loop

**Purpose:** Drive users to platform, support early income, validate demand.

---

## Competitive Systems (Future Layer)

Planned systems:
- Player profiles
- Global leaderboards
- Weekly challenges
- Tournaments

**Role:** Transform platform from game launcher into competitive ecosystem.

---

## Hardware System (Bird Duty: Lite Track)

The platform is designed to extend into hardware.

**Bird Duty: Lite:**
- Touchscreen-based
- Battery-powered
- Handheld arcade device

**Role:** Prototype hardware system, marketing tool, bridge between web and physical platform.

**Offline Arcade System:**
- Local game library
- Local gameplay
- Local leaderboards
- Optional: updates and leaderboard sync when connected

All inputs map to the same normalized input system.

---

## Technical Design Principles

- **Modularity** — Systems are isolated to prevent cascading failures
- **Automation** — Repetitive tasks are handled by pipeline tools
- **Stability** — Game isolation protects the platform
- **Scalability** — Architecture supports growth across web and hardware

---

## Current Technical Status

The platform currently includes:
- Functional Arcade OS interface
- Automated game pipeline
- TurboWarp runtime integration
- Unified input system
- Mobile Controller v19.7 (stable)
- Full Textify/Blockify round-trip system (export + import both working)

---

## Summary

Jay Arcade is a modular, scalable arcade platform connecting game creation (Textify/Blockify), distribution (platform), engagement (competition), growth (monetization), and hardware (Bird Duty: Lite).
