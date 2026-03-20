from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
GAMES_DIR = ROOT / "games"
GRID_HTML = ROOT / "grid.html"

START_MARKER = "<!-- AUTO-GENERATED-GRID-PAGES-START -->"
END_MARKER = "<!-- AUTO-GENERATED-GRID-PAGES-END -->"

CARDS_PER_PAGE = 9


def slug_to_title(slug: str) -> str:
    parts = slug.replace("_", "-").split("-")
    return " ".join(part.capitalize() for part in parts if part)


def load_game_metadata(game_dir: Path) -> dict:
    metadata_file = game_dir / "game.json"
    if not metadata_file.exists():
        return {}

    try:
        raw = metadata_file.read_text(encoding="utf-8").strip()
        if not raw:
            return {}
        return json.loads(raw)
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

        title = metadata.get("title") or slug_to_title(slug)
        order = metadata.get("order", 9999)
        card_classes = metadata.get("card_classes") or []
        preview_filename = metadata.get("preview") or f"{slug}.mp4"

        if not isinstance(card_classes, list):
            card_classes = []

        games.append({
            "slug": slug,
            "title": title,
            "order": order,
            "card_classes": card_classes,
            "preview_filename": preview_filename,
        })

    games.sort(key=lambda g: (g["order"], g["title"].lower()))
    return games


def build_card_html(game: dict) -> str:
    card_classes = [
        cls for cls in (game.get("card_classes") or [])
        if isinstance(cls, str) and cls.strip()
    ]

    desktop_only = "desktop-only" in card_classes
    class_tokens = ["game-card", "arcade-link", *card_classes]
    class_attr = " ".join(class_tokens)

    preview_src = f"previews/{game['preview_filename']}"
    mobile_replacement_attr = "true" if desktop_only else "false"

    return f"""            <a class="{escape_html(class_attr)}" href="games/{escape_html(game['slug'])}/index.html" data-mobile-replacement="{mobile_replacement_attr}">
              <video muted loop preload="metadata">
                <source src="{escape_html(preview_src)}" type="video/mp4">
              </video>
              <div class="game-title">{escape_html(game['title'])}</div>
              <div class="game-play-count">
                PLAYS: <span class="playCount">000000</span>
              </div>
              <div class="mobile-card-replacement" aria-hidden="true">
                <div class="future-card-media">COMING SOON</div>
                <div class="game-title">Future Title</div>
                <div class="game-play-count">JAY ARCADE EXPANDING</div>
              </div>
            </a>"""


def build_future_card_html(extra_classes: str = "") -> str:
    class_attr = "game-card future-card"
    if extra_classes.strip():
        class_attr += f" {extra_classes.strip()}"

    return f"""            <div class="{escape_html(class_attr)}" aria-hidden="true">
              <div class="future-card-media">COMING SOON</div>
              <div class="game-title">Future Title</div>
              <div class="game-play-count">JAY ARCADE EXPANDING</div>
            </div>"""


def chunk_games(games: list[dict], chunk_size: int) -> list[list[dict]]:
    return [games[i:i + chunk_size] for i in range(0, len(games), chunk_size)]


def build_page_html(page_games: list[dict]) -> str:
    cards: list[str] = []

    for game in page_games:
        cards.append(build_card_html(game))

    visible_card_count = len(page_games)

    while visible_card_count < CARDS_PER_PAGE:
        cards.append(build_future_card_html())
        visible_card_count += 1

    cards_html = "\n\n".join(cards)

    return f"""        <div class="grid-page">
          <div class="game-grid">
{cards_html}
          </div>
        </div>"""


def render_grid_pages(games: list[dict]) -> str:
    pages = chunk_games(games, CARDS_PER_PAGE)

    if not pages:
        pages = [[]]

    while len(pages) < 2:
        pages.append([])

    rendered_pages = [build_page_html(page_games) for page_games in pages]
    return "\n\n".join(rendered_pages)


def inject_into_grid(pages_html: str) -> None:
    if not GRID_HTML.exists():
        raise FileNotFoundError(f"grid.html not found: {GRID_HTML}")

    html = GRID_HTML.read_text(encoding="utf-8")

    pattern = re.compile(
        rf"({re.escape(START_MARKER)})(.*)({re.escape(END_MARKER)})",
        re.DOTALL,
    )

    replacement = f"{START_MARKER}\n{pages_html}\n    {END_MARKER}"

    new_html, count = pattern.subn(replacement, html, count=1)

    if count == 0:
        raise ValueError(
            "Could not find auto-generation markers in grid.html. "
            f"Expected markers:\n{START_MARKER}\n{END_MARKER}"
        )

    GRID_HTML.write_text(new_html, encoding="utf-8")


def main() -> None:
    games = discover_games()
    pages_html = render_grid_pages(games)
    inject_into_grid(pages_html)

    print(f"[generate_grid] Generated {len(games)} game card(s) across paged grid.")
    print(f"[generate_grid] Cards per page: {CARDS_PER_PAGE}")
    print(f"[generate_grid] Total pages: {max(1, (len(games) + CARDS_PER_PAGE - 1) // CARDS_PER_PAGE)}")

    for game in games:
        print(f"  - {game['slug']} -> {game['title']}")


if __name__ == "__main__":
    main()