from pathlib import Path
import argparse
import json
import re
import subprocess
import sys

from control_overrides import GAME_OVERRIDES

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

JAY_MOBILE_SCRIPT = '<script src="../js/jay-mobile.js"></script>'

GOATCOUNTER_BLOCK = """<script>
  window.goatcounter = {
    path: function() {
      return location.pathname;
    }
  };
</script>"""

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

def build_config_block(overrides):
    json_block = json.dumps({"keyOverrides": overrides}, indent=2)
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


def build_commit_message(summary, custom_message=None):
    if custom_message:
        return custom_message.strip()

    touched_games = summary["patched_games"]

    if not touched_games:
        return "Auto patch"

    subject = f"Auto patch: {', '.join(touched_games)}"

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


def stage_changed_files(root: Path, changed_files):
    for file_path in changed_files:
        rel_path = file_path.relative_to(root)
        run_command(["git", "add", str(rel_path)], cwd=root)


def validate_override_entries(existing_game_folders):
    existing_names = {folder.name for folder in existing_game_folders}
    missing_override_targets = sorted(
        name for name in GAME_OVERRIDES.keys()
        if name not in existing_names
    )
    return missing_override_targets

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
        return html, (html != original_html)

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
            notes.append("ERROR: viewport missing when adding supporting mobile meta tags")
    else:
        notes.append("mobile meta tags already present")

    return html, (html != original_html)


def patch_shared_scripts(html, notes):
    original_html = html
    missing_blocks = []

    if JAY_MOBILE_SCRIPT not in html:
        missing_blocks.append(JAY_MOBILE_SCRIPT)
        notes.append("added jay-mobile.js")
    else:
        notes.append("jay-mobile.js already present")

    if "window.goatcounter" not in html:
        missing_blocks.append(GOATCOUNTER_BLOCK)
        notes.append("added goatcounter block")
    else:
        notes.append("goatcounter already present")

    if missing_blocks:
        if "</body>" in html:
            injection_block = "\n\n".join(missing_blocks) + "\n\n"
            html = html.replace("</body>", injection_block + "</body>", 1)
        else:
            notes.append("ERROR: could not find </body>")

    return html, (html != original_html)


def patch_control_overrides(html, folder_name, notes):
    original_html = html
    has_config_block = CONFIG_START in html and CONFIG_END in html
    has_override_entry = folder_name in GAME_OVERRIDES
    override_status = None

    if has_override_entry:
        config_block = build_config_block(GAME_OVERRIDES[folder_name])

        if has_config_block:
            html = CONFIG_BLOCK_REGEX.sub(config_block, html, count=1)
            notes.append("control overrides updated")
            override_status = "updated"
        else:
            if JAY_MOBILE_SCRIPT in html:
                html = html.replace(JAY_MOBILE_SCRIPT, config_block + "\n" + JAY_MOBILE_SCRIPT, 1)
                notes.append("control overrides applied")
                override_status = "applied"
            else:
                notes.append("ERROR: jay-mobile.js missing when inserting control overrides")
                override_status = "error"
    else:
        if has_config_block:
            notes.append("control override block exists, but no entry in control_overrides.py")
            override_status = "orphaned"
        else:
            notes.append("no control overrides configured")
            override_status = "none"

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

    if changed:
        status = "PATCHED"
    else:
        status = "UNCHANGED"

    if any(note.startswith("ERROR:") for note in notes):
        status = "ERROR"

    return {
        "folder": folder_name,
        "status": status,
        "details": notes,
        "override_status": override_status,
        "changed": changed,
        "index_path": index_path
    }

# -------------------------
# SUMMARY / REPORTING
# -------------------------

def print_report(summary, dry_run=False):
    heading = "=== PATCH RESULTS (DRY RUN) ===" if dry_run else "=== PATCH RESULTS ==="
    print(f"\n{heading}\n")

    for result in summary["results"]:
        folder = result["folder"]
        status = result["status"]
        details = result["details"]

        print(f"{folder}: {status}")
        for detail in details:
            print(f"  - {detail}")
        print()

    print("=== SUMMARY ===")
    print(f"Patched:   {len(summary['patched_games'])}")
    print(f"Unchanged: {len(summary['unchanged_games'])}")
    print(f"Errors:    {len(summary['error_games'])}")

    print("\n=== CONTROL OVERRIDES SUMMARY ===")

    if summary["overrides_applied"]:
        print("Applied:")
        for folder in summary["overrides_applied"]:
            print(f"  - {folder}")
    else:
        print("Applied:")
        print("  - none")

    if summary["overrides_updated"]:
        print("Updated:")
        for folder in summary["overrides_updated"]:
            print(f"  - {folder}")
    else:
        print("Updated:")
        print("  - none")

    if summary["overrides_orphaned"]:
        print("Orphaned blocks found:")
        for folder in summary["overrides_orphaned"]:
            print(f"  - {folder}")
    else:
        print("Orphaned blocks found:")
        print("  - none")

    print("\n=== OVERRIDE ENTRY VALIDATION ===")
    if summary["override_entries_missing_folders"]:
        print("Override entries with no matching game folder:")
        for folder in summary["override_entries_missing_folders"]:
            print(f"  - {folder}")
    else:
        print("Override entries with no matching game folder:")
        print("  - none")


def build_summary(results, existing_game_folders):
    patched_games = []
    unchanged_games = []
    error_games = []

    overrides_applied = []
    overrides_updated = []
    overrides_orphaned = []
    changed_files = []

    for result in results:
        folder = result["folder"]
        status = result["status"]
        override_status = result["override_status"]

        if status == "PATCHED":
            patched_games.append(folder)
            changed_files.append(result["index_path"])
        elif status == "UNCHANGED":
            unchanged_games.append(folder)
        elif status == "ERROR":
            error_games.append(folder)
            if result["changed"]:
                changed_files.append(result["index_path"])

        if override_status == "applied":
            overrides_applied.append(folder)
        elif override_status == "updated":
            overrides_updated.append(folder)
        elif override_status == "orphaned":
            overrides_orphaned.append(folder)

    return {
        "results": results,
        "patched_games": patched_games,
        "unchanged_games": unchanged_games,
        "error_games": error_games,
        "overrides_applied": overrides_applied,
        "overrides_updated": overrides_updated,
        "overrides_orphaned": overrides_orphaned,
        "override_entries_missing_folders": validate_override_entries(existing_game_folders),
        "changed_files": changed_files
    }

# -------------------------
# MAIN
# -------------------------

def parse_args():
    parser = argparse.ArgumentParser(description="Patch TurboWarp game exports with mobile/meta/script automation.")
    parser.add_argument(
        "games",
        nargs="*",
        help="Optional list of specific game folder names to patch."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would change without writing files."
    )
    parser.add_argument(
        "--commit",
        action="store_true",
        help="Commit patched files after a successful patch run."
    )
    parser.add_argument(
        "--push",
        action="store_true",
        help="Push after commit. Implies --commit."
    )
    parser.add_argument(
        "--message",
        type=str,
        help="Custom git commit message."
    )
    return parser.parse_args()


def main():
    args = parse_args()
    if args.push:
        args.commit = True

    root = ROOT_DIR
    requested_games = set(args.games)

    if not GAMES_DIR.exists():
        print(f"ERROR: games directory not found: {GAMES_DIR}")
        sys.exit(1)

    all_folders = [
        folder for folder in sorted(GAMES_DIR.iterdir(), key=lambda p: p.name.lower())
        if folder.is_dir() and (folder / "index.html").exists()
    ]

    if requested_games:
        existing_names = {folder.name for folder in all_folders}
        missing_requested = sorted(requested_games - existing_names)
        if missing_requested:
            print("ERROR: requested game folder(s) not found:")
            for name in missing_requested:
                print(f"  - {name}")
            sys.exit(1)

        target_folders = [folder for folder in all_folders if folder.name in requested_games]
    else:
        target_folders = all_folders

    results = [patch_html(folder / "index.html", dry_run=args.dry_run) for folder in target_folders]
    summary = build_summary(results, all_folders)

    print_report(summary, dry_run=args.dry_run)

    if args.dry_run:
        print("\nDry run complete. No files were written.")
        return

    if args.commit:
        if summary["error_games"]:
            print("\nGit automation skipped because patch errors were detected.")
            print("Fix the patch errors first, then run again with --commit or --push.")
            return

        if not summary["changed_files"]:
            print("\nNo files changed. Nothing to commit.")
            return

        if not is_git_repo(root):
            print("\nGit automation skipped: this folder is not inside a git repository.")
            return

        try:
            stage_changed_files(root, summary["changed_files"])

            result = run_command(["git", "diff", "--cached", "--name-only"], cwd=root, capture_output=True)
            staged_files = [line.strip() for line in result.stdout.splitlines() if line.strip()]

            if not staged_files:
                print("\nNo staged changes found. Nothing to commit.")
                return

            commit_message = build_commit_message(summary, custom_message=args.message)
            run_command(["git", "commit", "-m", commit_message], cwd=root)
            print("\nGit commit created successfully.")

            if args.push:
                run_command(["git", "push"], cwd=root)
                print("Git push completed successfully.")

        except subprocess.CalledProcessError as e:
            print("\nGit automation failed.")
            print(f"Command: {' '.join(e.cmd)}")
            if e.stderr:
                print(e.stderr.strip())
            elif e.stdout:
                print(e.stdout.strip())
            else:
                print(str(e))


if __name__ == "__main__":
    main()