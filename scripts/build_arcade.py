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
GRID_GENERATOR_PATH = SCRIPT_DIR / "generate_grid.py"

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

        # If the ZIP has one wrapping folder, use its contents
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


def read_existing_game_json(game_dir: Path):
    game_json = game_dir / "game.json"
    if game_json.exists():
        return game_json.read_text(encoding="utf-8")
    return None


def restore_or_create_game_json(game_dir: Path, preserved_json_text: str | None):
    game_json = game_dir / "game.json"

    # If the imported ZIP already included one, leave it alone
    if game_json.exists():
        return

    # Restore previous manual metadata if it existed
    if preserved_json_text is not None:
        game_json.write_text(preserved_json_text, encoding="utf-8")
        print(f"Restored game.json for {game_dir.name}")
        return

    # Otherwise create a starter metadata file
    starter_json = """{
  "title": "",
  "order": 9999,
  "card_classes": []
}
"""
    game_json.write_text(starter_json, encoding="utf-8")
    print(f"Created starter game.json for {game_dir.name}")


def import_one_zip(zip_path: Path, dry_run=False):
    game_name = zip_path.stem
    target_dir = GAMES_DIR / game_name

    print(f"\n=== IMPORTING: {game_name} ===")
    print(f"ZIP:        {zip_path}")
    print(f"Target dir: {target_dir}")

    if dry_run:
        return game_name, True

    preserved_json_text = read_existing_game_json(target_dir)

    print("Clearing old game contents...")
    clear_directory_contents(target_dir)

    print("Extracting ZIP...")
    extract_zip_safely(zip_path, target_dir)

    restore_or_create_game_json(target_dir, preserved_json_text)

    print("Validating imported files...")
    ok = validate_imported_game(game_name)

    if ok:
        print("Import OK.")
    else:
        print("Import FAILED.")

    return game_name, ok


def run_patcher(game_names, dry_run=False, commit=False, push=False):
    cmd = [sys.executable, str(PATCHER_PATH), *game_names]

    if dry_run:
        cmd.append("--dry-run")
    if commit:
        cmd.append("--commit")
    if push:
        cmd.append("--push")

    run_command(cmd, cwd=ROOT_DIR)


def run_grid_generator(dry_run=False):
    if dry_run:
        print("\nDry run: would regenerate grid.")
        return

    cmd = [sys.executable, str(GRID_GENERATOR_PATH)]
    run_command(cmd, cwd=ROOT_DIR)


def delete_processed_zips(zip_files):
    print("\nCleaning processed ZIPs from exports...")
    for zip_path in zip_files:
        try:
            zip_path.unlink()
            print(f"  deleted: {zip_path.name}")
        except Exception as e:
            print(f"  ERROR deleting {zip_path.name}: {e}")
            raise


# -------------------------
# MAIN
# -------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description="Build arcade from exports/: import ZIPs into games/, patch imported games, regenerate grid, optionally commit/push."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be imported and patched without changing files."
    )
    parser.add_argument(
        "--commit",
        action="store_true",
        help="Commit after successful build."
    )
    parser.add_argument(
        "--push",
        action="store_true",
        help="Push after successful build. Implies --commit."
    )
    parser.add_argument(
        "--clean-exports",
        action="store_true",
        help="Delete successfully processed ZIPs from exports/ after a successful build."
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

    if not GRID_GENERATOR_PATH.exists():
        print("ERROR: generate_grid.py not found:")
        print(f"  {GRID_GENERATOR_PATH}")
        sys.exit(1)

    zip_files = get_export_zips()

    if not zip_files:
        print("ERROR: no ZIP files found in exports directory:")
        print(f"  {EXPORTS_DIR}")
        sys.exit(1)

    print("\n=== BUILD PLAN ===")
    for zip_path in zip_files:
        print(f"  - {zip_path.name}  ->  games/{zip_path.stem}/")

    if args.dry_run:
        print("\nDry run complete. No files were changed.")
        return

    imported_games = []
    failed_games = []
    successful_zip_files = []

    print("\nSTEP 1/4 — Import Games")

    for zip_path in zip_files:
        game_name, ok = import_one_zip(zip_path, dry_run=False)
        if ok:
            imported_games.append(game_name)
            successful_zip_files.append(zip_path)
        else:
            failed_games.append(game_name)

    # -------------------------
    # BUILD FAILURE GUARD
    # -------------------------

    if failed_games:
        print("\nBUILD FAILED")
        print("The following games failed to import:\n")

        for game in failed_games:
            print(f"  - {game}")

        print("\nFix the export files and run the build again.")
        sys.exit(1)

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

    print("\nSTEP 2/4 — Patch Games")
    run_patcher(
        [],
        dry_run=False,
        commit=False,
        push=False
    )

    print("\nSTEP 3/4 — Generate Grid")
    run_grid_generator(dry_run=False)

    print("\nSTEP 4/4 — Git Commit & Push")

    if args.commit:
        print("\nCommitting changes...")
        run_command(["git", "add", "."], cwd=ROOT_DIR)
        run_command(["git", "commit", "-m", "Build arcade update"], cwd=ROOT_DIR)

    if args.push:
        print("\nPushing changes...")
        run_command(["git", "push"], cwd=ROOT_DIR)

    if args.clean_exports:
        delete_processed_zips(successful_zip_files)

    # -------------------------
    # BUILD SUMMARY
    # -------------------------

    print("\n==============================")
    print("JAY ARCADE BUILD SUMMARY")
    print("==============================\n")

    print(f"Games imported: {len(imported_games)}")
    print(f"Games patched: {len(imported_games)}")
    print("Grid regenerated: YES")
    print(f"Commit: {'YES' if args.commit else 'NO'}")
    print(f"Push: {'YES' if args.push else 'NO'}")
    print(f"Clean exports: {'YES' if args.clean_exports else 'NO'}")

    print("\nBUILD SUCCESS\n")


if __name__ == "__main__":
    main()