from pathlib import Path
import argparse
import shutil
import subprocess
import sys
import tempfile
import zipfile

# -------------------------
# PROJECT PATHS
# -------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent
PARENT_DIR = ROOT_DIR.parent
GAMES_DIR = ROOT_DIR / "games"
EXPORTS_DIR = PARENT_DIR / "exports"
PATCHER_PATH = SCRIPT_DIR / "patch_all_games.py"

# -------------------------
# HELPERS
# -------------------------

def run_command(cmd, cwd):
    subprocess.run(cmd, cwd=cwd, check=True)


def find_export_zip(game_name: str) -> Path:
    exact = EXPORTS_DIR / f"{game_name}.zip"
    if exact.exists():
        return exact

    matches = sorted(EXPORTS_DIR.glob(f"{game_name}*.zip"))
    if len(matches) == 1:
        return matches[0]

    if len(matches) > 1:
        print(f"ERROR: multiple matching ZIP files found for '{game_name}':")
        for match in matches:
            print(f"  - {match.name}")
        print("Rename the ZIP or specify a clearer game name.")
        sys.exit(1)

    print(f"ERROR: no ZIP export found for '{game_name}' in:")
    print(f"  {EXPORTS_DIR}")
    sys.exit(1)


def clear_directory_contents(folder: Path):
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)
        return

    for item in folder.iterdir():
        if item.is_dir():
            shutil.rmtree(item)
        else:
            item.unlink()


def extract_zip_safely(zip_path: Path, target_dir: Path):
    with tempfile.TemporaryDirectory() as temp_dir_str:
        temp_dir = Path(temp_dir_str)

        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(temp_dir)

        extracted_items = list(temp_dir.iterdir())

        # If ZIP contains a single top-level folder, use its contents
        if len(extracted_items) == 1 and extracted_items[0].is_dir():
            source_dir = extracted_items[0]
        else:
            source_dir = temp_dir

        for item in source_dir.iterdir():
            destination = target_dir / item.name
            if item.is_dir():
                shutil.copytree(item, destination)
            else:
                shutil.copy2(item, destination)


def validate_imported_game(game_name: str):
    game_dir = GAMES_DIR / game_name
    index_path = game_dir / "index.html"

    if not game_dir.exists():
        print(f"ERROR: target game folder was not created: {game_dir}")
        sys.exit(1)

    if not index_path.exists():
        print(f"ERROR: imported game is missing index.html: {index_path}")
        sys.exit(1)


def run_patcher(game_name: str, dry_run=False, commit=False, push=False):
    cmd = [sys.executable, str(PATCHER_PATH), game_name]

    if dry_run:
        cmd.append("--dry-run")
    if commit:
        cmd.append("--commit")
    if push:
        cmd.append("--push")

    run_command(cmd, cwd=ROOT_DIR)

# -------------------------
# MAIN
# -------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description="Import a TurboWarp ZIP export into games/<game-name>/ and run the patcher."
    )
    parser.add_argument(
        "game",
        help="Game folder name, e.g. apple-catcher"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only show what would be imported and patched."
    )
    parser.add_argument(
        "--commit",
        action="store_true",
        help="Run patcher with --commit after import."
    )
    parser.add_argument(
        "--push",
        action="store_true",
        help="Run patcher with --push after import."
    )
    return parser.parse_args()


def main():
    args = parse_args()

    if args.push:
        args.commit = True

    if not EXPORTS_DIR.exists():
        print("ERROR: exports directory not found:")
        print(f"  {EXPORTS_DIR}")
        sys.exit(1)

    if not GAMES_DIR.exists():
        print("ERROR: games directory not found:")
        print(f"  {GAMES_DIR}")
        sys.exit(1)

    if not PATCHER_PATH.exists():
        print("ERROR: patch_all_games.py not found:")
        print(f"  {PATCHER_PATH}")
        sys.exit(1)

    game_name = args.game
    zip_path = find_export_zip(game_name)
    target_dir = GAMES_DIR / game_name

    print("\n=== IMPORT PLAN ===")
    print(f"Game:       {game_name}")
    print(f"ZIP:        {zip_path}")
    print(f"Target dir: {target_dir}")

    if args.dry_run:
        print("\nDry run complete. No files were changed.")
        return

    print("\nClearing old game contents...")
    clear_directory_contents(target_dir)

    print("Extracting ZIP...")
    extract_zip_safely(zip_path, target_dir)

    print("Validating imported files...")
    validate_imported_game(game_name)

    print("Running patcher...")
    run_patcher(
        game_name,
        dry_run=False,
        commit=args.commit,
        push=args.push
    )

    print("\nImport complete.")


if __name__ == "__main__":
    main()