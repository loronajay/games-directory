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


def get_export_zips():
    return sorted(EXPORTS_DIR.glob("*.zip"), key=lambda p: p.name.lower())


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
        return False

    if not index_path.exists():
        print(f"ERROR: imported game is missing index.html: {index_path}")
        return False

    return True


def run_patcher(game_names, dry_run=False, commit=False, push=False):
    cmd = [sys.executable, str(PATCHER_PATH), *game_names]

    if dry_run:
        cmd.append("--dry-run")
    if commit:
        cmd.append("--commit")
    if push:
        cmd.append("--push")

    run_command(cmd, cwd=ROOT_DIR)


def import_one_zip(zip_path: Path, dry_run=False):
    game_name = zip_path.stem
    target_dir = GAMES_DIR / game_name

    print(f"\n=== IMPORTING: {game_name} ===")
    print(f"ZIP:        {zip_path}")
    print(f"Target dir: {target_dir}")

    if dry_run:
        return game_name, True

    print("Clearing old game contents...")
    clear_directory_contents(target_dir)

    print("Extracting ZIP...")
    extract_zip_safely(zip_path, target_dir)

    print("Validating imported files...")
    ok = validate_imported_game(game_name)

    if ok:
        print("Import OK.")
    else:
        print("Import FAILED.")

    return game_name, ok

# -------------------------
# MAIN
# -------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description="Import all TurboWarp ZIP exports from exports/ into games/ and run the patcher."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be imported without changing files."
    )
    parser.add_argument(
        "--commit",
        action="store_true",
        help="Run patcher with --commit after imports."
    )
    parser.add_argument(
        "--push",
        action="store_true",
        help="Run patcher with --push after imports."
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

    zip_files = get_export_zips()

    if not zip_files:
        print("ERROR: no ZIP files found in exports directory:")
        print(f"  {EXPORTS_DIR}")
        sys.exit(1)

    print("\n=== BATCH IMPORT PLAN ===")
    for zip_path in zip_files:
        print(f"  - {zip_path.name}  ->  games/{zip_path.stem}/")

    if args.dry_run:
        print("\nDry run complete. No files were changed.")
        return

    imported_games = []
    failed_games = []

    for zip_path in zip_files:
        game_name, ok = import_one_zip(zip_path, dry_run=False)
        if ok:
            imported_games.append(game_name)
        else:
            failed_games.append(game_name)

    print("\n=== IMPORT SUMMARY ===")
    print(f"Imported: {len(imported_games)}")
    print(f"Failed:   {len(failed_games)}")

    if imported_games:
        print("Successful imports:")
        for name in imported_games:
            print(f"  - {name}")

    if failed_games:
        print("Failed imports:")
        for name in failed_games:
            print(f"  - {name}")

    if failed_games:
        print("\nPatcher skipped because one or more imports failed.")
        sys.exit(1)

    print("\nRunning patcher for imported games...")
    run_patcher(
        imported_games,
        dry_run=False,
        commit=args.commit,
        push=args.push
    )

    print("\nBatch import complete.")


if __name__ == "__main__":
    main()