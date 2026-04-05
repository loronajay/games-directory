#!/usr/bin/env python3
"""
build_physical_arcade.py

Builds the cabinet version of Jay Arcade into the cabinet/ directory.
Source files (index.html, grid.html) are never modified.
Run on the Pi after `git pull origin main`.

    python scripts/build_physical_arcade.py
    python scripts/build_physical_arcade.py --dry-run

What this does:
  - Reads index.html and grid.html from repo root (web versions, unchanged)
  - Strips <!-- CABINET-STRIP-START/END --> blocks from HTML
  - Strips /* CABINET-STRIP-START/END */ blocks from inline JS
  - Injects <base href="../"> so asset paths resolve correctly from cabinet/
  - Injects cabinet CSS (cursor: none, overflow: hidden)
  - Injects cabinet JS (scroll lock, null-safe fallbacks for stripped elements)
  - Removes hostname redirect scripts from index.html (not needed at localhost)
  - Writes cabinet/index.html and cabinet/grid.html
  - Writes network-status.json (online: false until subscription service exists)
"""

import re
import json
import argparse
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
CABINET_DIR = BASE_DIR / 'cabinet'

# ── Cabinet CSS injected into every patched page ───────────────────────────
CABINET_CSS = """\
<style id="cabinet-mode">
  * { cursor: none !important; }
  html, body { overflow: hidden !important; }
</style>"""

# ── Cabinet JS injected into grid.html only ────────────────────────────────
# - Null-safe fallbacks for popularBox/popularLink (stripped from HTML + JS)
# - Overrides window.scrollTo so centerOnTarget becomes a no-op
# - Blocks wheel scroll events
CABINET_GRID_JS = """\
<script id="cabinet-grid-overrides">
  const popularBox = null;
  const popularLink = null;
  window.scrollTo = () => {};
  window.addEventListener('wheel', e => e.preventDefault(), { passive: false });
</script>"""

# ── Strip patterns ─────────────────────────────────────────────────────────
HTML_STRIP_RE = re.compile(
    r'[ \t]*<!-- CABINET-STRIP-START -->.*?<!-- CABINET-STRIP-END -->[ \t]*\n?',
    re.DOTALL
)
JS_STRIP_RE = re.compile(
    r'[ \t]*/\* CABINET-STRIP-START \*/.*?/\* CABINET-STRIP-END \*/[ \t]*\n?',
    re.DOTALL
)

# Hostname redirect script blocks in index.html — pointless at localhost
REDIRECT_SCRIPT_RE = re.compile(
    r'<script>\s*(?:if\s*\(location\.hostname|const\s+host\s*=).*?</script>\s*',
    re.DOTALL
)


def strip_cabinet_markers(html):
    html = HTML_STRIP_RE.sub('', html)
    html = JS_STRIP_RE.sub('', html)
    return html


def transform_index(html):
    html = REDIRECT_SCRIPT_RE.sub('', html)
    # base href makes all asset paths resolve from repo root
    # so grid link needs the cabinet/ prefix to stay within the cabinet build
    html = html.replace('href="grid.html"', 'href="cabinet/grid.html"', 1)
    html = html.replace('<head>', '<head>\n<base href="../">', 1)
    html = html.replace('</head>', CABINET_CSS + '\n</head>', 1)
    return html


def transform_grid(html):
    html = strip_cabinet_markers(html)
    html = html.replace('<head>', '<head>\n<base href="../">', 1)
    html = html.replace('</head>', CABINET_CSS + '\n</head>', 1)
    html = html.replace('</body>', CABINET_GRID_JS + '\n</body>', 1)
    return html


def build_file(src_path, out_path, transform_fn, dry_run):
    original = src_path.read_text(encoding='utf-8')
    output = transform_fn(original)
    print(f'  {src_path.name} -> {out_path.name}')
    if not dry_run:
        out_path.write_text(output, encoding='utf-8')


def write_network_status(dry_run):
    path = CABINET_DIR / 'network-status.json'
    data = {'online': False}
    print(f'  Writing cabinet/network-status.json  (online: false)')
    if not dry_run:
        path.write_text(json.dumps(data, indent=2), encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description='Build cabinet version of Jay Arcade')
    parser.add_argument('--dry-run', action='store_true', help='Preview without writing files')
    args = parser.parse_args()

    if args.dry_run:
        print('=== DRY RUN — no files will be written ===\n')
    else:
        print('=== build_physical_arcade.py ===\n')
        CABINET_DIR.mkdir(exist_ok=True)

    write_network_status(args.dry_run)
    build_file(BASE_DIR / 'index.html', CABINET_DIR / 'index.html', transform_index, args.dry_run)
    build_file(BASE_DIR / 'grid.html',  CABINET_DIR / 'grid.html',  transform_grid,  args.dry_run)

    print('\nDone.')


if __name__ == '__main__':
    main()
