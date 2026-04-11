# Leaderboard Project Status
**Last updated: 2026-04-11**

---

## What's Done

### leaderboard-server
- [x] Full server built: Express + pg, POST /scores, GET /scores/:gameId, GET /health
- [x] Per-game auth middleware (x-leaderboard-key header)
- [x] Rate limiting (10 POST/IP/min, in-memory sliding window)
- [x] Score range validation via gameConfig.js (all set to 99999 for now — update per game later)
- [x] CORS: GET open, POST restricted to jayarcade.com
- [x] Deployed to Railway
- [x] PostgreSQL connected via DATABASE_URL
- [x] DB schema deployed: table `scores`, columns id/game_id/player_name/score/device_type/created_at (TIMESTAMPTZ)
- [x] Indexes deployed: idx_scores_game_id, idx_scores_game_device, idx_scores_game_device_score
- [x] 9 game secret keys deployed as Railway env vars (all except mini-arcade)
- [x] Health check confirmed: https://leaderboard-server-production.up.railway.app/health

### games-directory-page (this repo)
- [x] Step 1 — `.env` created at `C:\Users\leoja\Desktop\Dad Games\full-games\.env` (never committed)
- [x] Step 2 — `factory-leaderboards.js` cloud sync blocks implemented (done in separate session)
- [x] Step 3 — `game.json` leaderboard block added to all 9 games (enabled: true for apple-catcher, bird-duty, blade-and-sphere, space-molestors, speed-demon; false for art-of-war, dodgeballs, paddle-battle, sumorai)
- [x] Step 4 — `patch_all_games.py` extended: loads `.env`, reads `game.json`, injects `leaderboard` config into `JAY_GAME_CONFIG` + injects `JayLeaderboard` helper inline
- [x] Step 5 — Dry run confirmed correct (5 games patched with leaderboard, 4 skipped as expected)

- [x] Step 6 — Rebuilt apple-catcher in TurboWarp with leaderboard blocks wired up, re-exported
- [x] Step 7 — Full build, commit, push via `build_arcade.py --commit --push`
- [x] Step 8 — End-to-end test passed (2026-04-11): POST /scores → 201, GET /scores/apple-catcher returns ranked entries

---

## What's Left

- Wire up leaderboard blocks in remaining enabled games: bird-duty, blade-and-sphere, space-molestors, speed-demon
- Rebuild and re-export each, then full build + deploy

---

## Nice-to-Do Later
- Set accurate scoreMax per game in both gameConfig.js (server) and game.json files (pipeline)
- Confirm score ranges match what Railway has deployed
- Arcade cabinet device type (defined in spec, not in production yet)
