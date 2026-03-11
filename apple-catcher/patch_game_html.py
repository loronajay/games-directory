from pathlib import Path
import sys

OLD_VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">'

NEW_META_BLOCK = """<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">

<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="screen-orientation" content="landscape">"""

JAY_MOBILE_SCRIPT = '<script src="../js/jay-mobile.js"></script>'

GOATCOUNTER_BLOCK = """<script>
  window.goatcounter = {
    path: function() {
      return location.pathname;
    }
  };
</script>"""


def patch_html(index_path):
    html = Path(index_path).read_text(encoding="utf-8")

    # Replace viewport line
    if OLD_VIEWPORT in html:
        html = html.replace(OLD_VIEWPORT, NEW_META_BLOCK)

    # Insert jay-mobile and goatcounter before </body>
    if JAY_MOBILE_SCRIPT not in html:
        insertion = JAY_MOBILE_SCRIPT + "\n\n" + GOATCOUNTER_BLOCK + "\n"
        html = html.replace("</body>", insertion + "</body>")

    Path(index_path).write_text(html, encoding="utf-8")

    print("Patch complete.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python patch_game_html.py index.html")
    else:
        patch_html(sys.argv[1])