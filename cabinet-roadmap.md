# JayArcade Cabinet Roadmap
**Last updated: 2026-04-05** — build pipeline complete

---

## What This Is

JayArcade Cabinets are full arcade cabinets running on Raspberry Pi. The cabinet UI is the same HTML/CSS/JS site as `jayarcade.com` — served locally by nginx and displayed in Chromium kiosk mode. The Linux layer is invisible infrastructure; the web UI is the "OS" the player sees.

The cabinet has two modes:

| Mode | Condition | Leaderboards | Updates |
|---|---|---|---|
| **Offline** | No network, or no active subscription | Hidden | Skipped on boot |
| **Online (subscribed)** | Network + active $5/mo subscription | Visible | `git pull` on every boot |

**Offline persistence rule:** The cabinet's local git repo is always the source of truth. When online + subscribed, `git pull` advances it forward. When offline or unsubscribed, the cabinet serves whatever state was last successfully pulled. It never regresses to a base version — if a user's subscription lapses, they keep the last version they received.

**Update flow:** Jay runs `python scripts/build_arcade.py --commit --push` on his dev machine. That commits the fully built and patched web files to the repo. On the Pi, the boot sequence is:
1. `git pull origin main` — gets latest web build (subscribed only)
2. `python scripts/build_physical_arcade.py` — generates `cabinet/` from web source
3. Chromium kiosk launches pointing to `http://localhost/cabinet/`

**Cabinet build script:** `scripts/build_physical_arcade.py` reads `index.html` and `grid.html` (web versions, never modified) and writes cabinet-specific versions to `cabinet/`. Strips web-only content via `<!-- CABINET-STRIP-START/END -->` and `/* CABINET-STRIP-START/END */` markers, injects cabinet CSS/JS, outputs `cabinet/network-status.json`. The `cabinet/` directory is gitignored and always generated fresh.

---

## Hardware Spec

- **Board:** Raspberry Pi 5 (4GB or 8GB)
- **Display:** 24" 1080p monitor
- **Controls:** Joystick + buttons → mapped to key presses via `JAY_GAME_CONFIG` / `control_overrides.py` (same system used for web/mobile)
- **Cabinet repo path:** `/opt/jayarcade/`

---

## Phase 1 — Basic Kiosk

Get the Pi running the cabinet build in kiosk mode locally. Proves hardware and software work together.

- [x] `scripts/build_physical_arcade.py` written and tested — generates `cabinet/` from web source
- [x] Cabinet layout: all games fit on one 1080p screen (3×3 grid, no scroll, no pagination arrows)
- [x] Cabinet CSS: `cursor: none`, `overflow: hidden`, compact title bar, viewport-fitted grid
- [x] Web-only content stripped via marker system (`factory-box`, `popular-box`, GoatCounter JS)
- [ ] Set up Raspberry Pi 5 with Raspberry Pi OS
- [ ] Clone repo to `/opt/jayarcade/`
- [ ] Configure nginx to serve `/opt/jayarcade/` at `http://localhost`
- [ ] Configure Chromium to launch in kiosk mode pointing to `http://localhost/cabinet/`
- [ ] Set up systemd service (`arcade-kiosk.service`) to launch Chromium on boot
- [ ] Set up `arcade-updater.service` to run `git pull` + `build_physical_arcade.py` before kiosk launches
- [ ] Verify all games run acceptably on Pi 5 hardware
- [ ] Auto-login and boot directly into the arcade UI (no desktop visible)

---

## Phase 2 — Network-Aware Boot

Cabinet detects its network state at boot and adjusts the UI accordingly.

- [ ] Boot script checks network connectivity, writes `/opt/jayarcade/network-status.json`:
  ```json
  { "online": true }   // or false
  ```
- [ ] Systemd ordering: network check runs before kiosk launches
- [ ] `grid.html` JS reads `network-status.json` and conditionally hides the leaderboard nav link
- [ ] If offline but a network is physically reachable: show "Connect to Network" prompt in the arcade UI
- [ ] Connecting switches the cabinet to online mode and reloads

---

## Phase 3 — Subscription-Gated Updates

Paying users ($5/mo) get game and UI updates automatically on every boot.

- [ ] Stub a subscription check (local license key file at `/opt/jayarcade/subscription.json`) for testing:
  ```json
  { "subscribed": true, "expires": "2027-01-01" }
  ```
- [ ] Boot script logic:
  1. Check network
  2. If online: check subscription status
  3. If subscribed: `git pull origin main`
  4. Launch kiosk
- [ ] Leaderboard link visibility gated on both network AND subscription status
- [ ] Cabinet device type (`"cabinet"`) passed through to leaderboard submissions (already defined in leaderboard spec, not yet in production)

---

## Phase 4 — Subscription Service

Real backend that validates the $5/mo subscription and manages cabinet accounts.

- [ ] New backend service (separate from `leaderboard-server`, or a new module/route group within it — TBD)
- [ ] Account creation + payment integration ($5/mo recurring)
- [ ] Cabinet authenticates via stored credentials → server returns subscription status
- [ ] Replace local `subscription.json` stub with live API check
- [ ] Grace period handling (lapsed subscription → keeps last received version, online features disabled)

---

## Future / Nice-to-Have

- Adapt the `grid.html` BIOS startup animation for the cabinet boot screen (displayed while the update check runs silently in the background)
- OTA cabinet setup / remote management
- Page indicator dots or subtle `▶` hint so the player knows more game pages exist
- Offline "subscription lapsed" indicator in the UI
