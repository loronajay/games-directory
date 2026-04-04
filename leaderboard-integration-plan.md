# Leaderboard Integration Plan (Tailored)

## Status

**Waiting on Jay's answers** to the three open questions at the bottom of this file before any code work begins. No implementation has been done yet — only this plan has been written and committed.

Once those questions are answered, start at **Step 2** (update `game.json` files). Step 1 (`grid.html` `isMobile()`) can be done independently at any time.

## Scope

This plan covers only changes to this repo (`games-directory-page`). The Railway server setup
and the leaderboard server code (`leaderboard-server/`) are handled separately.

---

## Your Responsibilities (Before Any Code Work)

### 1. Railway Setup
- Create a Railway project
- Connect your GitHub account (`loronajay`) in Railway's dashboard
- Deploy the leaderboard server repo to Railway
- Add a PostgreSQL database service to the same project
- Note the public URL Railway assigns (e.g. `https://leaderboard-server.railway.app`)

### 2. Generate Per-Game Secret Keys

One secret key per game. These are arbitrary strings — use a password generator or
`openssl rand -hex 32`. **Never commit these.** Keep them somewhere safe (1Password,
a local `.env` file outside the repo).

Games that need keys:

| Game | Env Var Name |
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

### 3. Set Up Local Env Vars for the Build Script

Create a `.env` file at `C:\Users\leoja\Desktop\Dad Games\full-games\.env`
(one level above the repo root — never inside the repo, never committed). Format:

```
KEY_APPLE_CATCHER=your_secret_here
KEY_ART_OF_WAR=your_secret_here
KEY_BIRD_DUTY=your_secret_here
KEY_BLADE_AND_SPHERE=your_secret_here
KEY_DODGEBALLS=your_secret_here
KEY_PADDLE_BATTLE=your_secret_here
KEY_SPACE_MOLESTORS=your_secret_here
KEY_SPEED_DEMON=your_secret_here
KEY_SUMORAI=your_secret_here
```

The build script will load this automatically. You can add the Railway server URL here too:

```
LEADERBOARD_URL=https://your-project.railway.app
```

### 4. Confirm Score Ranges Per Game

Each game's `game.json` needs `scoreMin` / `scoreMax` for server-side anti-cheat validation.
These should reflect what is actually achievable in each game. If you are not sure yet,
we will set them to `null` and fill them in later — but the server will skip score
validation until they are set.

---

## Code Changes (Claude's Work, In Order)

### Step 1 — Add a Shared `isMobile()` to `grid.html`

`grid.html` currently has `isMobilePortraitMode()` which detects layout (viewport width +
portrait orientation) — not the same signal as device type. A proper `isMobile()` will be
added alongside it using the same UA + pointer coarse check that `jay-mobile.js` already uses:

```js
function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.matchMedia("(pointer: coarse)").matches;
}
```

This keeps device detection consistent across `grid.html`, `jay-mobile.js`, and
`JayLeaderboard`. No existing behavior changes — `isMobilePortraitMode()` stays for layout logic.

### Step 2 — Update Each `game.json`

Add leaderboard fields to every applicable game. Example:

```json
{
  "title": "Apple Catcher",
  "order": 1,
  "card_classes": [],
  "leaderboard": {
    "enabled": true,
    "scoreMin": 0,
    "scoreMax": 9999
  }
}
```

- `mini-arcade` gets no leaderboard field (it is the lobby, not a game)
- `scoreMin` / `scoreMax` come from your answers to Step 4 above — if unknown, set `null`

### Step 3 — Extend `patch_all_games.py`

Three additions to the patcher:

**3a. Load `.env` file**
At startup, read the `.env` file from one level above the repo root and populate
`os.environ`. Uses manual line parsing — no new pip dependencies required.

**3b. Read `game.json` in `patch_html()`**
Currently `patch_html()` only uses `GAME_CONFIGS` from `control_overrides.py`. It will
also read `game.json` from each game's folder to get the `leaderboard` block.

**3c. Inject leaderboard config into `JAY_GAME_CONFIG`**
When `leaderboard.enabled` is true, the injected config block includes a `leaderboard`
sub-object:

```js
window.JAY_GAME_CONFIG = {
  // ...all existing mobile/keyOverrides fields unchanged...
  leaderboard: {
    url:    "https://your-project.railway.app",
    gameId: "apple-catcher",
    key:    "loaded_from_env_never_hardcoded"
  }
};
```

If the key env var is missing at build time, the patcher logs a warning and skips
leaderboard injection for that game — it does not break the build.

**3d. Inject `JayLeaderboard` helper script**
After the config block and before `jay-mobile.js`, inject a new idempotent marker block:

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
- `deviceType()` uses the same UA + pointer coarse check as `jay-mobile.js` — no dependency
  on any global that doesn't exist
- The block is idempotent: re-running the patcher replaces it cleanly, same as the config block
- Games that don't have leaderboard enabled get neither the config sub-object nor this script

### Step 4 — Dry Run + Visual Verify

Run `python scripts/patch_all_games.py --dry-run` and inspect the output HTML of one
leaderboard-enabled game and one non-enabled game to confirm:

- Config block contains the `leaderboard` sub-object where expected
- `JayLeaderboard` script is present and positioned correctly (after config, before jay-mobile.js)
- Non-leaderboard games are completely untouched

### Step 5 — Full Build, Commit, Push

Run `python scripts/build_arcade.py --commit --push` after the dry run confirms clean output.

---

## Architecture Note — How Games Call `JayLeaderboard`

Games do not call `window.JayLeaderboard` directly from Scratch blocks. Instead, the
`factory-leaderboards` TurboWarp extension (in `turbowarp-extensions-js/canon/factory_extensions/`)
is being extended with cloud sync blocks that call `window.JayLeaderboard` internally.

Flow:
1. Scratch block → `factory-leaderboards` extension → `window.JayLeaderboard` → Railway server

This means:
- `window.JayLeaderboard` is the interface this repo is responsible for injecting
- The extension is responsible for calling it from Scratch
- Changes to the extension take effect when Jay rebuilds and re-exports games through TurboWarp

See `turbowarp-extensions-js/canon/factory_extensions/leaderboard-cloud-sync-plan.md`
for the extension implementation plan.

---

## Open Questions (Your Answers Go Here)

1. **Score ranges** — do you know the rough max achievable score for each game, or should
   we start with `null`?

2. **Railway URL** — do you have this yet, or is it TBD pending Railway setup?

3. **Which games get leaderboards at launch?** — all of them, or a subset to start?
