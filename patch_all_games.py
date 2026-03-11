from pathlib import Path
import json
import re

from control_overrides import GAME_OVERRIDES

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


def build_config_block(overrides):
    json_block = json.dumps({"keyOverrides": overrides}, indent=2)
    return f"""{CONFIG_START}
<script>
window.JAY_GAME_CONFIG = {json_block};
</script>
{CONFIG_END}"""


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


def patch_html(index_path: Path):
    html = index_path.read_text(encoding="utf-8")
    original_html = html
    folder_name = index_path.parent.name
    notes = []

    html, _ = patch_meta_tags(html, notes)
    html, _ = patch_shared_scripts(html, notes)
    html, _, override_status = patch_control_overrides(html, folder_name, notes)

    changed = html != original_html

    if changed:
        index_path.write_text(html, encoding="utf-8")
        status = "PATCHED"
    else:
        status = "UNCHANGED"

    if any(note.startswith("ERROR:") for note in notes):
        status = "ERROR"

    return {
        "folder": folder_name,
        "status": status,
        "details": notes,
        "override_status": override_status
    }


def main():
    root = Path.cwd()
    results = []

    for folder in sorted(root.iterdir(), key=lambda p: p.name.lower()):
        if not folder.is_dir():
            continue

        index_file = folder / "index.html"
        if index_file.exists():
            results.append(patch_html(index_file))

    print("\n=== PATCH RESULTS ===\n")

    patched_count = 0
    unchanged_count = 0
    error_count = 0

    overrides_applied = []
    overrides_updated = []
    overrides_orphaned = []

    for result in results:
        folder = result["folder"]
        status = result["status"]
        details = result["details"]
        override_status = result["override_status"]

        if status == "PATCHED":
            patched_count += 1
        elif status == "UNCHANGED":
            unchanged_count += 1
        elif status == "ERROR":
            error_count += 1

        if override_status == "applied":
            overrides_applied.append(folder)
        elif override_status == "updated":
            overrides_updated.append(folder)
        elif override_status == "orphaned":
            overrides_orphaned.append(folder)

        print(f"{folder}: {status}")
        for detail in details:
            print(f"  - {detail}")
        print()

    print("=== SUMMARY ===")
    print(f"Patched:   {patched_count}")
    print(f"Unchanged: {unchanged_count}")
    print(f"Errors:    {error_count}")

    print("\n=== CONTROL OVERRIDES SUMMARY ===")

    if overrides_applied:
        print("Applied:")
        for folder in overrides_applied:
            print(f"  - {folder}")
    else:
        print("Applied:")
        print("  - none")

    if overrides_updated:
        print("Updated:")
        for folder in overrides_updated:
            print(f"  - {folder}")
    else:
        print("Updated:")
        print("  - none")

    if overrides_orphaned:
        print("Orphaned blocks found:")
        for folder in overrides_orphaned:
            print(f"  - {folder}")
    else:
        print("Orphaned blocks found:")
        print("  - none")


if __name__ == "__main__":
    main()