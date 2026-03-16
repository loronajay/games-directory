from pathlib import Path
import argparse
import json
import re
import subprocess
import sys

from control_overrides import GAME_CONFIGS

# -------------------------
# PROJECT PATHS
# -------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent
GAMES_DIR = ROOT_DIR / "games"

# -------------------------
# STANDARD META TAGS
# -------------------------

STANDARD_VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">'
APPLE_WEB_APP = '<meta name="apple-mobile-web-app-capable" content="yes">'
MOBILE_WEB_APP = '<meta name="mobile-web-app-capable" content="yes">'
SCREEN_ORIENTATION = '<meta name="screen-orientation" content="landscape">'

# -------------------------
# SHARED SCRIPTS
# -------------------------

# Correct path for games inside /games/
JAY_MOBILE_SCRIPT = '<script src="../../js/jay-mobile.js"></script>'

# Legacy path used before the folder migration
LEGACY_JAY_MOBILE_SCRIPTS = [
    '<script src="../js/jay-mobile.js"></script>',
    '<script src="././js/jay-mobile.js"></script>'
]

GOATCOUNTER_BLOCK = """<script>
window.goatcounter = {
  path: function(p) {
    return (p || location.pathname || "/")
     .replace(/^\/games-directory/, "")
     .replace(/index\.html$/, "")
     .replace(/\/?$/, "/")
     .split("?")[0];
  }
};
</script>"""

GOATCOUNTER_SCRIPT = '<script data-goatcounter="https://loronajay.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>'

# -------------------------
# CONFIG BLOCK MARKERS
# -------------------------

CONFIG_START = "<!-- JAY_GAME_CONFIG_START -->"
CONFIG_END = "<!-- JAY_GAME_CONFIG_END -->"

# -------------------------
# REGEX
# -------------------------

VIEWPORT_REGEX = re.compile(
    r'<meta\s+name=["\']viewport["\'][^>]*>',
    re.IGNORECASE
)

CHARSET_REGEX = re.compile(
    r'<meta\s+charset=["\'][^"\']+["\']\s*/?>',
    re.IGNORECASE
)

HEAD_REGEX = re.compile(
    r'<head[^>]*>',
    re.IGNORECASE
)

CONFIG_BLOCK_REGEX = re.compile(
    re.escape(CONFIG_START) + r'.*?' + re.escape(CONFIG_END),
    re.DOTALL
)

# -------------------------
# HELPERS
# -------------------------

def build_config_block(config):
    json_block = json.dumps(config, indent=2)
    return f"""{CONFIG_START}
<script>
window.JAY_GAME_CONFIG = {json_block};
</script>
{CONFIG_END}"""


def run_command(cmd, cwd, capture_output=False):
    return subprocess.run(
        cmd,
        cwd=cwd,
        check=True,
        text=True,
        capture_output=capture_output
    )


def is_git_repo(root: Path) -> bool:
    try:
        run_command(["git", "rev-parse", "--is-inside-work-tree"], cwd=root, capture_output=True)
        return True
    except Exception:
        return False


def build_commit_message(summary):
    if not summary["patched_games"]:
        return "Auto patch"

    subject = f"Auto patch: {', '.join(summary['patched_games'])}"

    body_lines = []

    if summary["patched_games"]:
        body_lines.append("Patched:")
        for game in summary["patched_games"]:
            body_lines.append(f"- {game}")

    if summary["overrides_applied"]:
        body_lines.append("")
        body_lines.append("Overrides applied:")
        for game in summary["overrides_applied"]:
            body_lines.append(f"- {game}")

    if summary["overrides_updated"]:
        body_lines.append("")
        body_lines.append("Overrides updated:")
        for game in summary["overrides_updated"]:
            body_lines.append(f"- {game}")

    return subject + "\n\n" + "\n".join(body_lines)

# -------------------------
# PATCH FUNCTIONS
# -------------------------

def patch_meta_tags(html, notes):

    original_html = html
    viewport_match = VIEWPORT_REGEX.search(html)

    if viewport_match:

        current_viewport = viewport_match.group(0).strip()

        if current_viewport == STANDARD_VIEWPORT:
            notes.append("viewport already correct")

        else:
            html = VIEWPORT_REGEX.sub(STANDARD_VIEWPORT, html, count=1)
            notes.append("replaced existing viewport meta")

    else:

        insert_block = "\n" + STANDARD_VIEWPORT + "\n\n" + "\n".join([
            APPLE_WEB_APP,
            MOBILE_WEB_APP,
            SCREEN_ORIENTATION
        ])

        charset_match = CHARSET_REGEX.search(html)

        if charset_match:

            insert_at = charset_match.end()
            html = html[:insert_at] + insert_block + html[insert_at:]
            notes.append("inserted viewport and mobile meta tags after charset")

            return html, (html != original_html)

        head_match = HEAD_REGEX.search(html)

        if head_match:

            insert_at = head_match.end()
            html = html[:insert_at] + insert_block + html[insert_at:]
            notes.append("inserted viewport and mobile meta tags after <head>")

            return html, (html != original_html)

        notes.append("ERROR: could not find <head> to insert meta tags")

    missing_meta = []

    if APPLE_WEB_APP not in html:
        missing_meta.append(APPLE_WEB_APP)

    if MOBILE_WEB_APP not in html:
        missing_meta.append(MOBILE_WEB_APP)

    if SCREEN_ORIENTATION not in html:
        missing_meta.append(SCREEN_ORIENTATION)

    if missing_meta:

        viewport_match = VIEWPORT_REGEX.search(html)

        if viewport_match:

            insert_at = viewport_match.end()

            html = html[:insert_at] + "\n\n" + "\n".join(missing_meta) + html[insert_at:]

            notes.append(f"added {len(missing_meta)} missing mobile meta tag(s)")

    else:

        notes.append("mobile meta tags already present")

    return html, (html != original_html)


def patch_shared_scripts(html, notes):

    original_html = html
    missing_blocks = []

    has_correct_script = JAY_MOBILE_SCRIPT in html
    legacy_found = False

    for legacy in LEGACY_JAY_MOBILE_SCRIPTS:

        if legacy in html:

            legacy_found = True

            if has_correct_script:

                html = html.replace(legacy, "")

            else:

                html = html.replace(legacy, JAY_MOBILE_SCRIPT)
                has_correct_script = True

    if legacy_found:
        notes.append("updated jay-mobile.js path")

    if not has_correct_script:

        missing_blocks.append(JAY_MOBILE_SCRIPT)
        notes.append("added jay-mobile.js")

    else:

        notes.append("jay-mobile.js already present")

    old_goatcounter_block_regex = re.compile(
        r'<script>\s*window\.goatcounter\s*=\s*\{.*?\};\s*</script>',
        re.DOTALL
    )

    if old_goatcounter_block_regex.search(html):

        html = old_goatcounter_block_regex.sub(GOATCOUNTER_BLOCK, html, count=1)
        notes.append("updated goatcounter block")

    else:

        missing_blocks.append(GOATCOUNTER_BLOCK)
        notes.append("added goatcounter block")

    if 'data-goatcounter="https://loronajay.goatcounter.com/count"' not in html:

        missing_blocks.append(GOATCOUNTER_SCRIPT)
        notes.append("added goatcounter count.js")

    else:

        notes.append("goatcounter count.js already present")

    if missing_blocks:

        if "</body>" in html:

            injection_block = "\n\n".join(missing_blocks) + "\n\n"

            html = html.replace("</body>", injection_block + "</body>", 1)

    return html, (html != original_html)


def patch_control_overrides(html, folder_name, notes):

    original_html = html
    has_config_block = CONFIG_START in html and CONFIG_END in html
    config = GAME_CONFIGS.get(folder_name)

    override_status = None

    if config:
        config_block = build_config_block(config)

        if has_config_block:
            html = CONFIG_BLOCK_REGEX.sub(config_block, html, count=1)
            notes.append("game config updated")
            override_status = "updated"
        else:
            if JAY_MOBILE_SCRIPT in html:
                html = html.replace(JAY_MOBILE_SCRIPT, config_block + "\n" + JAY_MOBILE_SCRIPT, 1)
                notes.append("game config applied")
                override_status = "applied"
            else:
                notes.append("ERROR: could not insert game config before jay-mobile.js")
                override_status = "error"
    else:
        # Inject a default config only if no block exists yet
        default_config = {
            "keyOverrides": {},
            "mobile": {
                "layout": "default"
            }
        }
        config_block = build_config_block(default_config)

        if has_config_block:
            notes.append("game config already present")
            override_status = "none"
        else:
            if JAY_MOBILE_SCRIPT in html:
                html = html.replace(JAY_MOBILE_SCRIPT, config_block + "\n" + JAY_MOBILE_SCRIPT, 1)
                notes.append("default game config applied")
                override_status = "applied"
            else:
                notes.append("ERROR: could not insert default game config before jay-mobile.js")
                override_status = "error"

    return html, (html != original_html), override_status


def patch_html(index_path: Path, dry_run=False):

    html = index_path.read_text(encoding="utf-8")

    original_html = html

    folder_name = index_path.parent.name

    notes = []

    html, _ = patch_meta_tags(html, notes)
    html, _ = patch_shared_scripts(html, notes)
    html, _, override_status = patch_control_overrides(html, folder_name, notes)

    changed = html != original_html

    if changed and not dry_run:

        index_path.write_text(html, encoding="utf-8")

    status = "PATCHED" if changed else "UNCHANGED"

    return {
        "folder": folder_name,
        "status": status,
        "details": notes,
        "override_status": override_status
    }


def main():

    parser = argparse.ArgumentParser()

    parser.add_argument("games", nargs="*")

    parser.add_argument("--dry-run", action="store_true")

    parser.add_argument("--commit", action="store_true")

    parser.add_argument("--push", action="store_true")

    args = parser.parse_args()

    if args.push:
        args.commit = True

    folders = [
        folder for folder in sorted(GAMES_DIR.iterdir())
        if folder.is_dir() and (folder / "index.html").exists()
    ]

    if args.games:
        folders = [f for f in folders if f.name in args.games]

    results = [patch_html(folder / "index.html", args.dry_run) for folder in folders]

    patched_games = [r["folder"] for r in results if r["status"] == "PATCHED"]

    print("\n=== PATCH RESULTS ===\n")

    for r in results:

        print(f"{r['folder']}: {r['status']}")

        for d in r["details"]:
            print(f"  - {d}")

        print()

    if args.dry_run:

        print("Dry run complete.")

        return

    if args.commit:

        if not is_git_repo(ROOT_DIR):

            print("Not a git repo.")

            return

        run_command(["git", "add", "-A"], cwd=ROOT_DIR)

        result = run_command(["git", "diff", "--cached", "--name-only"], cwd=ROOT_DIR, capture_output=True)

        if not result.stdout.strip():

            print("No changes to commit.")

            return

        commit_message = build_commit_message({
            "patched_games": patched_games,
            "overrides_applied": [],
            "overrides_updated": []
        })

        run_command(["git", "commit", "-m", commit_message], cwd=ROOT_DIR)

        print("\nGit commit created.")

        if args.push:

            run_command(["git", "push", "origin", "main"], cwd=ROOT_DIR)

            print("Git push completed.")


if __name__ == "__main__":
    main()