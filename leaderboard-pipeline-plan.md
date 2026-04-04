# Leaderboard Pipeline Integration Plan

## Context

This document is a handoff for extending the existing build pipeline to inject leaderboard config into games — without breaking anything that already works.

A separate `leaderboard-server` has been designed and its full spec lives at:
`C:\Users\leoja\Desktop\Dad Games\full-games\leaderboard-server\leaderboard-plan.md`

This document covers only what needs to change in this repo.

---

## What Already Exists (do not break)

- `scripts/build_arcade.py` — master build script
- `scripts/patch_all_games.py` — patches each game's `index.html` with viewport meta, `jay-mobile.js`, GoatCounter analytics, and a `JAY_GAME_CONFIG` block delimited by `JAY_GAME_CONFIG_START` / `JAY_GAME_CONFIG_END` comments
- `games/{game}/game.json` — per-game metadata (order, title, card classes, etc.)
- `JAY_GAME_CONFIG` — already injected JS config object, the established hook for per-game runtime config

Read and understand the existing scripts fully before making any changes.

---

## What Needs to Change

### 1. `game.json` — add leaderboard fields

Each game's `game.json` needs new leaderboard fields:

```json
{
  "order": 1,
  "title": "Apple Catcher",
  "leaderboard": {
    "enabled": true,
    "scoreMin": 0,
    "scoreMax": 9999
  }
}
```

`scoreMin` / `scoreMax` define the valid score range for that game — used by the server for anti-cheat validation. Set these based on what is actually achievable in each game.

---

### 2. `patch_all_games.py` — extend `JAY_GAME_CONFIG` injection

When `game.json` has `leaderboard.enabled: true`, extend the injected `JAY_GAME_CONFIG` block to include:

```js
const JAY_GAME_CONFIG = {
  // ...all existing fields unchanged...
  leaderboard: {
    url:    "https://leaderboard-server.railway.app",
    gameId: "apple-catcher",
    key:    "<per-game secret from env>"
  }
};
```

- `url` — the Railway leaderboard server URL (same for all games)
- `gameId` — the game's folder name / slug (e.g. `"apple-catcher"`)
- `key` — a per-game secret loaded from an environment variable (e.g. `KEY_APPLE_CATCHER`). Never hardcoded. Never committed.

If `leaderboard.enabled` is false or missing, skip leaderboard injection entirely for that game.

---

### 3. Inject `JayLeaderboard` JS helper

After the `JAY_GAME_CONFIG` block, inject a `JayLeaderboard` inline `<script>` into each leaderboard-enabled game. This is a thin `fetch()` wrapper the game uses to submit and retrieve scores.

```js
const JayLeaderboard = (() => {
  const cfg = JAY_GAME_CONFIG.leaderboard;

  function deviceType() {
    if (typeof JAY_MOBILE_ACTIVE !== "undefined" && JAY_MOBILE_ACTIVE) return "mobile";
    return "desktop";
  }

  function submit(playerName, score) {
    if (!cfg) return;
    return fetch(cfg.url + "/scores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-leaderboard-key": cfg.key
      },
      body: JSON.stringify({
        gameId:     cfg.gameId,
        playerName: playerName,
        score:      score,
        deviceType: deviceType()
      })
    });
  }

  function getTop(limit = 10, device = null) {
    if (!cfg) return Promise.resolve([]);
    const d = device || deviceType();
    return fetch(`${cfg.url}/scores/${cfg.gameId}?device=${d}&limit=${limit}`)
      .then(r => r.json())
      .then(data => data.scores || []);
  }

  return { submit, getTop, deviceType };
})();
```

**Important:** The `deviceType()` detection above assumes `jay-mobile.js` exposes a `JAY_MOBILE_ACTIVE` boolean. Read `jay-mobile.js` first and adjust to match whatever it actually exposes — do not guess.

---

## Environment Variables

Per-game secret keys must be available as environment variables when the build script runs. They are never stored in the repo.

| Game | Env var |
|---|---|
| apple-catcher | `KEY_APPLE_CATCHER` |
| art-of-war | `KEY_ART_OF_WAR` |
| bird-duty | `KEY_BIRD_DUTY` |
| blade-and-sphere | `KEY_BLADE_AND_SPHERE` |
| dodgeballs | `KEY_DODGEBALLS` |
| paddle-battle | `KEY_PADDLE_BATTLE` |
| space-molestors | `KEY_SPACE_MOLESTORS` |
| speed-demon | `KEY_SPEED_DEMON` |
| sumorai | `KEY_SUMORAI` |

The build script reads these from the environment (or a `.env` file outside the repo) and passes the correct key into each game's injection.

---

## Leaderboard Server API Reference

**Submit:** `POST /scores`
- Header: `x-leaderboard-key: <key>`
- Body: `{ gameId, playerName, score, deviceType }`
- Valid deviceTypes: `"mobile"`, `"desktop"`, `"arcade"`

**Fetch:** `GET /scores/:gameId?device=<deviceType>&limit=<n>`
- `device` is required
- Returns: `{ gameId, device, scores: [{ rank, playerName, score, createdAt }] }`

---

## Order of Work

1. Read and fully understand `patch_all_games.py` and `build_arcade.py` before changing anything
2. Read `jay-mobile.js` to understand how to detect mobile/desktop at runtime
3. Update each applicable `game.json` with leaderboard fields
4. Extend `patch_all_games.py` to inject leaderboard config and `JayLeaderboard` helper
5. Do a dry-run build and inspect the output HTML before committing
