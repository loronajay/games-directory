# Leaderboard Integration Plan

## Status

**Server: fully deployed as of 2026-04-04.** Railway + PostgreSQL live, all 9 game keys deployed as env vars, health check confirmed. See `leaderboard-server-progress.md` for the full task list of what's done and what's left.

**Remaining in this repo:** Steps 1–4 below (game.json updates, patch_all_games.py extension). Step 2 in the progress doc (TurboWarp extension update) is being handled in a separate session.

## Scope

This plan covers only code changes to this repo (`games-directory-page`).

---

## Code Changes (In Order)

### Step 1 — Update Each `game.json`

Add leaderboard fields to every applicable game. Example:

```json
{
  "title": "Apple Catcher",
  "order": 1,
  "card_classes": [],
  "leaderboard": {
    "enabled": true,
    "scoreMin": 0,
    "scoreMax": 99999
  }
}
```

Games that need this (9 total — mini-arcade is the lobby, skip it):
`apple-catcher`, `art-of-war`, `bird-duty`, `blade-and-sphere`, `dodgeballs`, `paddle-battle`, `space-molestors`, `speed-demon`, `sumorai`

- `scoreMin` / `scoreMax` are set to `99999` for now — update per game later once real ranges are known

---

### Step 2 — Extend `patch_all_games.py`

**2a. Load `.env` file**
At startup, read `C:\Users\leoja\Desktop\Dad Games\full-games\.env` (one level above repo root) and populate `os.environ`. Manual line parsing — no new pip dependencies.

**2b. Read `game.json` in `patch_html()`**
Read each game's `game.json` to get the `leaderboard` block alongside the existing `GAME_CONFIGS` from `control_overrides.py`.

**2c. Inject leaderboard config into `JAY_GAME_CONFIG`**
When `leaderboard.enabled` is true, extend the injected config block:

```js
window.JAY_GAME_CONFIG = {
  // ...all existing mobile/keyOverrides fields unchanged...
  leaderboard: {
    url:    "https://leaderboard-server-production.up.railway.app",
    gameId: "apple-catcher",
    key:    "loaded_from_env_never_hardcoded"
  }
};
```

If the key env var is missing at build time, log a warning and skip leaderboard injection for that game — do not break the build.

**2d. Inject `JayLeaderboard` helper script**
After the config block, inject a new idempotent marker block:

```
<!-- JAY_LEADERBOARD_START -->
<script>
const JayLeaderboard = (() => {
  const cfg = (window.JAY_GAME_CONFIG || {}).leaderboard;

  function deviceType() {
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      window.matchMedia("(pointer: coarse)").matches;
    return mobile ? "mobile" : "desktop";
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
</script>
<!-- JAY_LEADERBOARD_END -->
```

Notes:
- `deviceType()` uses the same UA + pointer coarse check as `jay-mobile.js` — no dependency on any global
- The block is idempotent: re-running the patcher replaces it cleanly, same as the config block
- Games without leaderboard enabled get neither the config sub-object nor this script

---

### Step 3 — Dry Run + Visual Verify

```bash
python scripts/patch_all_games.py --dry-run
```

Inspect the output HTML of one leaderboard-enabled game and one non-enabled game to confirm:
- Config block contains the `leaderboard` sub-object where expected
- `JayLeaderboard` script is present and positioned correctly (after config, before jay-mobile.js)
- Non-leaderboard games are completely untouched

### Step 4 — Full Build, Commit, Push

```bash
python scripts/build_arcade.py --commit --push
```

---

## Architecture Note — How Games Call `JayLeaderboard`

Games do not call `window.JayLeaderboard` directly from Scratch blocks. The `factory-leaderboards` TurboWarp extension (in `turbowarp-extensions-js/canon/factory_extensions/`) is being extended with cloud sync blocks that call `window.JayLeaderboard` internally.

Flow:
```
Scratch block → factory-leaderboards extension → window.JayLeaderboard → Railway server
```

This means:
- `window.JayLeaderboard` is the interface this repo is responsible for injecting
- The extension is responsible for calling it from Scratch
- Extension changes take effect when Jay rebuilds and re-exports games through TurboWarp

---

## Leaderboard Server API Reference

**Submit:** `POST /scores`
- Header: `x-leaderboard-key: <key>`
- Body: `{ gameId, playerName, score, deviceType }`
- Valid deviceTypes: `"mobile"`, `"desktop"`, `"arcade"`

**Fetch:** `GET /scores/:gameId?device=<deviceType>&limit=<n>`
- `device` is required
- Returns: `{ gameId, device, scores: [{ rank, playerName, score, createdAt }] }`

**Health:** `GET /health` → `https://leaderboard-server-production.up.railway.app/health`

---

## Environment Variables

Per-game secret keys are loaded from `C:\Users\leoja\Desktop\Dad Games\full-games\.env` (never committed).

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
