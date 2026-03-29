# Jay Arcade — Development Roadmap (Canon v3)

## Roadmap Philosophy

Jay Arcade is being built by a solo developer, so development must:

- Proceed in clear, controlled phases
- Preserve working systems
- Prioritize real-world progress over perfection
- Support early validation and monetization

Each phase unlocks the next layer of the ecosystem. This roadmap represents a full-stack arcade system:

| Layer | System |
|---|---|
| Game Creation | Turbowarp -> exported games |
| Game Distribution | Jay Arcade platform |
| Player Engagement | Competition systems |
| Physical Product | Hardware |
| Revenue | Monetization layer |

---

## Phase Structure

| Phase | Name | Status |
|---|---|---|
| 1 | Cloud Arcade Platform | **ACTIVE** |
| 2 | Competitive Platform Systems | Planned |
| 3 | Prototype Arcade Hardware | Planned |
| 4 | Pilot Deployments | Planned |
| 5 | Arcade Ecosystem Expansion | Planned |

---

## Phase 1 — Cloud Arcade Platform (ACTIVE)

**Objective:** Build a stable, scalable, and monetizable browser-based arcade platform.

This phase establishes:
- Your distribution system
- Your development pipeline
- Your first public-facing product
- Your initial revenue entry points

### 1. Arcade Interface Layer (Arcade OS — Web)

The Arcade OS is the identity layer of the platform.

Key components:
- Boot / entry experience
- CRT visual styling
- Navigation system
- Game launcher interface

> Note: This does not need to be over-engineered yet. Focus on feel + clarity, not full OS simulation.

### 2. Game Library

Build a curated library of original arcade-style games.

Current reality:
- Games are already being integrated via the pipeline
- Focus is quality + consistency, not just quantity

Target: ~10–15 strong games (not filler)

Games must follow:
- Fast start
- Short sessions
- High replayability
- Skill-based mechanics

### 3. Mobile Controller System (LOCKED ARCHITECTURE)

The mobile controller is a core differentiator.

Current stable version: **v19.7** (baseline — must be preserved)

Features:
- Segmented 8-direction D-pad
- Face buttons
- Multi-touch support
- Visual themes (plate + glow)
- Responsive layouts

Rules:
- This is a shell overlay only
- Games handle their own logic
- Do NOT restructure this system

### 4. Automated Game Pipeline

One of the platform's strongest systems.

Handles:
- TurboWarp exports
- Game folder generation
- Runtime patching
- Grid regeneration

**Purpose:** Scale game integration without manual work.

**Textify/Blockify**

**Current status (as of March 2026): Full round-trip working.**
- Textify exports block logic as structured IR text
- Blockify imports IR and renders it back as visual Scratch blocks
- AI roundtrip testing: Gemini 8/8 pass, ChatGPT 8/8 pass, Claude (partial — testing ongoing)

Known limits:
- No natural-language-to-patch layer yet
- No project-wide wrapper IR root yet
- No sprite creation ops yet

### 6. Early Monetization Layer

Phase 1 is no longer just technical — it must support early income generation.

Initial focus:
- Short-form content (YouTube Shorts / TikTok)
- Traffic → jayarcade.com
- Clear call-to-action (play + engage)

Optional early paths:
- Supporter donations
- Contact funnel
- Early audience building

> Constraint: Some level of income must begin during or immediately after Phase 1.

### Phase 1 Milestone

Deliver a public-facing arcade platform with:
- Stable deployment pipeline
- Playable game library
- Cross-device support
- Working mobile controller
- Clear user entry experience
- Initial traffic + engagement loop

---

## Phase 2 — Competitive Platform Systems

**Objective:** Transform the platform from "play games" into "compete and return."

### Systems

**Player Identity**
- Player accounts
- Persistent profiles
- Tracked stats: scores, achievements, history

**Global Leaderboards**
- Global rankings
- Weekly resets
- Seasonal systems

**Personal Arcades**
- `jayarcade.com/arcade/<player>`
- Displays stats, favorite games, achievements, rankings

**Weekly Challenges**
- Rotating challenges
- Structured replay incentives

**Tournament System**
- Online competitions
- Community events
- Streamed matches (future)

### Phase 2 Milestone

A true competitive arcade platform with identity, progression, and replay loops.

---

## Phase 3 — Prototype Arcade Hardware

**Objective:** Build the first physical marketing device — Bird Duty: Lite + build the first physical arcade cabinet.

**Core Concept: Bird Duty - Lite** A battery-powered touchscreen gaming device running a simplified Arcade OS, curated game set, and optimized input system.

**Hardware Direction:**
- Touchscreen-first (no buttons required for prototype)
- Rechargeable battery
- Compact form factor

**Input System:** Based on the mobile controller logic, adapted for embedded use.

**Core Concept: JayArcade Backpack**
A portable JayArcade "cabinet". Runs on battery power, display is built into the backpack. Will run the cabinet version of the OS on a Raspberry Pi. Core purpose is for marketing/tournament prize.

**Hardware Direction**
-Accepts all major gamepads + Fightsticks
-Gamepad controlled


**Core Concept: JayArcade Cabinets**
A physical representation of the JayArcade OS, stripped down and built up to feel like a real arcade cabinet. JayArcade cabinets will run on a Raspberry Pi and feature an online mode (subscription based) and an offline mode that retains current version of the OS.

**Hardware Direction** 
-Joystick + Button controls
-Plug and Play
-Customizable Arcade Hardware

**Modes:**

*Offline Mode (Required)*
- Fully playable without internet
- Local storage
- Local scores

*Online Mode (Optional Early)*
- Leaderboard sync
- Updates

### Phase 3 Milestone

A fully playable handheld arcade prototype.
A fully operational prototype JayArcade cabinet.
A fully operational backpack unit.

---

## Phase 4 — Pilot Deployments

**Objective:** Test the system in the real world.

**Environments:**
- Conventions
- Local events
- Pop-up setups
- Small venues

**Features:**

*Attract Mode*
- Gameplay previews
- Highlights
- Promotional loops

*Data Collection*
- Engagement
- Retention
- Game performance
- Player behavior

### Phase 4 Milestone

Validated real-world usage and interest.

---

## Phase 5 — Arcade Ecosystem Expansion

**Objective:** Scale into a connected arcade network.

**Systems:**
- Global competition layer
- Regional leaderboards
- Official tournaments (Sumorai/Bird Duty)
- Live events

**Hardware Expansion:**
- Home units
- Venue cabinets
- Portable arcade systems

**Long-Term Vision:** A global competitive arcade ecosystem combining web platform, physical devices, and community competition.
