from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
GAMES_DIR = ROOT / "games"
PREVIEWS_DIR = ROOT / "previews"
GRID_HTML = ROOT / "grid.html"

START_MARKER = "<!-- AUTO-GENERATED-GAME-CARDS-START -->"
END_MARKER = "<!-- AUTO-GENERATED-GAME-CARDS-END -->"


def slug_to_title(slug: str) -> str:
    parts = slug.replace("_", "-").split("-")
    return " ".join(part.capitalize() for part in parts if part)


def load_game_metadata(game_dir: Path) -> dict:
    metadata_file = game_dir / "game.json"
    if not metadata_file.exists():
        return {}

    try:
        return json.loads(metadata_file.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"[generate_grid] Warning: could not read {metadata_file}: {exc}")
        return {}


def escape_html(text: str) -> str:
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def discover_games() -> list[dict]:
    games = []

    if not GAMES_DIR.exists():
        print(f"[generate_grid] Warning: games directory not found: {GAMES_DIR}")
        return games

    for game_dir in sorted(GAMES_DIR.iterdir()):
        if not game_dir.is_dir():
            continue

        slug = game_dir.name
        
        if slug == "mini-arcade":
            continue
        index_file = game_dir / "index.html"

        if not index_file.exists():
            continue

        metadata = load_game_metadata(game_dir)

        title = metadata.get("title", slug_to_title(slug))
        order = metadata.get("order", 9999)
        card_classes = metadata.get("card_classes", [])

        if not isinstance(card_classes, list):
            card_classes = []

        preview_filename = metadata.get("preview", f"{slug}.mp4")
        preview_exists = (PREVIEWS_DIR / preview_filename).exists()

        games.append({
            "slug": slug,
            "title": title,
            "order": order,
            "card_classes": card_classes,
            "preview_filename": preview_filename,
            "preview_exists": preview_exists,
        })

    games.sort(key=lambda g: (g["order"], g["title"].lower()))
    return games


def build_card_html(game: dict) -> str:
    extra_classes = " ".join(
        cls for cls in game["card_classes"] if isinstance(cls, str) and cls.strip()
    )

    class_attr = "game-card arcade-link"
    if extra_classes:
        class_attr += f" {extra_classes}"

    preview_src = f"previews/{game['preview_filename']}"

    # Keep exact card structure/classes as current grid.html
    return f"""  <a class="{escape_html(class_attr)}" href="games/{escape_html(game['slug'])}/index.html">
    <video muted loop preload="metadata" style="background:black;">
      <source src="{escape_html(preview_src)}" type="video/mp4">
    </video>
    <div class="game-title">{escape_html(game['title'])}</div>
    <div class="game-play-count">
      PLAYS: <span class="playCount">000000</span>
    </div>
  </a>"""


def render_cards(games: list[dict]) -> str:
    if not games:
        return "  <!-- No games found -->"
    return "\n\n".join(build_card_html(game) for game in games)


def inject_into_grid(cards_html: str) -> None:
    if not GRID_HTML.exists():
        raise FileNotFoundError(f"grid.html not found: {GRID_HTML}")

    html = GRID_HTML.read_text(encoding="utf-8")

    pattern = re.compile(
        rf"({re.escape(START_MARKER)})(.*)({re.escape(END_MARKER)})",
        re.DOTALL,
    )

    replacement = f"{START_MARKER}\n{cards_html}\n  {END_MARKER}"

    new_html, count = pattern.subn(replacement, html, count=1)

    if count == 0:
        raise ValueError(
            "Could not find auto-generation markers in grid.html. "
            f"Expected markers:\n{START_MARKER}\n{END_MARKER}"
        )

    GRID_HTML.write_text(new_html, encoding="utf-8")


def main() -> None:
    games = discover_games()
    cards_html = render_cards(games)
    inject_into_grid(cards_html)

    print(f"[generate_grid] Generated {len(games)} game card(s).")
    for game in games:
        status = "preview" if game["preview_exists"] else "black-fallback"
        print(f"  - {game['slug']} -> {game['title']} [{status}]")


if __name__ == "__main__":
    main()