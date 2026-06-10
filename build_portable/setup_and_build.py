#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DSP Core Surface - APK Builder (Portable)
==========================================
Geen admin rechten nodig. Werkt volledig portable.

Stappen:
  1. Detecteer nieuwste Node.js LTS versie via nodejs.org
  2. Download portable Node.js zip (als nog niet aanwezig)
  3. Pak uit naar build_portable/node/
  4. Voeg node + npm toe aan gebruikers-PATH (persistent, geen admin)
  5. Installeer npm packages (npm install)
  6. Installeer EAS CLI
  7. Start EAS cloud APK build

Gebruik:
  python setup_and_build.py              -- volledig (npm install + build)
  python setup_and_build.py --install    -- alleen node + npm install
  python setup_and_build.py --path-only  -- alleen PATH updaten
"""

import argparse
import json
import io
import os
import re
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path

# Forceer UTF-8 output op Windows (voorkomt cp1252 encoding errors)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ── Paden ────────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent
APP_DIR    = SCRIPT_DIR.parent          # android/
NODE_DIR   = SCRIPT_DIR / "node"
NODE_EXE   = NODE_DIR / "node.exe"
NPM_CMD    = NODE_DIR / "npm.cmd"
NPX_CMD    = NODE_DIR / "npx.cmd"

NODE_DIST_INDEX = "https://nodejs.org/dist/index.json"
NODE_ARCH       = "win-x64"   # download altijd x64, ongeacht Python arch

# ── Helpers ───────────────────────────────────────────────────────────────────

def banner(msg: str):
    print()
    print("=" * 62)
    print(f"  {msg}")
    print("=" * 62)

def step(n: int, total: int, msg: str):
    print(f"\n[{n}/{total}] {msg}")

def ok(msg: str):
    print(f"      OK  {msg}")

def info(msg: str):
    print(f"      ->  {msg}")

def err(msg: str):
    print(f"\n  FOUT: {msg}", file=sys.stderr)

def run(cmd: list[str], cwd: Path | None = None, env: dict | None = None) -> int:
    """Voer een commando uit en geef de returncode terug."""
    merged_env = {**os.environ, **(env or {})}
    result = subprocess.run(cmd, cwd=str(cwd or APP_DIR), env=merged_env)
    return result.returncode

# ── Stap 1: Detecteer nieuwste Node.js LTS ───────────────────────────────────

def fetch_latest_lts() -> tuple[str, str]:
    """Haal de nieuwste LTS versie en download-URL op van nodejs.org."""
    info("Ophalen Node.js versie index van nodejs.org...")
    try:
        with urllib.request.urlopen(NODE_DIST_INDEX, timeout=15) as resp:
            releases = json.loads(resp.read().decode())
    except Exception as e:
        raise RuntimeError(f"Kan versie index niet ophalen: {e}")

    # Zoek de nieuwste LTS (lts veld is versienaam string, niet False)
    lts_releases = [r for r in releases if r.get("lts") and "win-x64-zip" in r.get("files", [])]
    if not lts_releases:
        raise RuntimeError("Geen LTS release met win-x64-zip gevonden in index.")

    latest = lts_releases[0]
    version = latest["version"]          # bijv. "v22.3.0"
    filename = f"node-{version}-{NODE_ARCH}.zip"
    url = f"https://nodejs.org/dist/{version}/{filename}"  # altijd zip, geen installer
    ok(f"Nieuwste LTS: {version}")
    return version, url

# ── Stap 2: Download Node.js ─────────────────────────────────────────────────

def download_node(url: str, dest_zip: Path):
    """Download de Node.js zip met voortgangsindicator."""
    info(f"Downloaden: {url}")

    def report(count, block_size, total):
        if total > 0:
            pct = min(100, int(count * block_size * 100 / total))
            bar = "#" * (pct // 5) + "." * (20 - pct // 5)
            print(f"\r      [{bar}] {pct}%", end="", flush=True)

    urllib.request.urlretrieve(url, str(dest_zip), reporthook=report)
    print()  # newline na voortgangsbalk
    ok(f"Download klaar -> {dest_zip.name}")

# ── Stap 3: Uitpakken ─────────────────────────────────────────────────────────

def extract_node(zip_path: Path, version: str):
    """Pak de Node.js zip uit naar NODE_DIR."""
    info("Uitpakken...")
    extracted_name = f"node-{version}-{NODE_ARCH}"
    extracted_path = SCRIPT_DIR / extracted_name

    # Verwijder eventuele eerdere poging
    if extracted_path.exists():
        shutil.rmtree(extracted_path)
    if NODE_DIR.exists():
        shutil.rmtree(NODE_DIR)

    with zipfile.ZipFile(str(zip_path), "r") as zf:
        zf.extractall(str(SCRIPT_DIR))

    # Hernoem naar 'node'
    if extracted_path.exists():
        extracted_path.rename(NODE_DIR)
    elif NODE_DIR.exists():
        pass  # al goed
    else:
        raise RuntimeError(f"Uitpakken mislukt: map '{extracted_name}' niet gevonden.")

    zip_path.unlink(missing_ok=True)
    ok(f"Node.js staat in: {NODE_DIR}")

# ── Stap 4: PATH updaten (persistent, geen admin) ────────────────────────────

def add_to_user_path():
    """
    Voeg NODE_DIR toe aan de gebruikers-PATH omgevingsvariabele in het
    Windows register. Geen admin rechten nodig (HKCU).
    """
    node_dir_str = str(NODE_DIR)
    try:
        import winreg
        key_path = r"Environment"
        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER, key_path,
            0, winreg.KEY_READ | winreg.KEY_SET_VALUE
        ) as key:
            try:
                current_path, _ = winreg.QueryValueEx(key, "PATH")
            except FileNotFoundError:
                current_path = ""

            paths = [p for p in current_path.split(";") if p.strip()]

            if node_dir_str in paths:
                ok(f"NODE_DIR al in gebruikers-PATH: {node_dir_str}")
                return

            paths.insert(0, node_dir_str)
            new_path = ";".join(paths)
            winreg.SetValueEx(key, "PATH", 0, winreg.REG_EXPAND_SZ, new_path)

        ok(f"NODE_DIR toegevoegd aan gebruikers-PATH: {node_dir_str}")
        info("Herstart je terminal/IDE om de nieuwe PATH te activeren.")
        info("Voor de huidige sessie wordt PATH ook direct ingesteld.")

    except Exception as e:
        info(f"Kan PATH niet permanent opslaan ({e}), alleen sessie-PATH.")

    # Stel ook PATH in voor de huidige Python-sessie zodat subprocess het ziet
    os.environ["PATH"] = node_dir_str + os.pathsep + os.environ.get("PATH", "")

# ── Stap 5: Verifieer node + npm ─────────────────────────────────────────────

def verify_node() -> dict:
    """Controleer of node.exe en npm.cmd werken, geef paden terug."""
    if not NODE_EXE.exists():
        raise RuntimeError(f"node.exe niet gevonden: {NODE_EXE}")
    if not NPM_CMD.exists():
        raise RuntimeError(f"npm.cmd niet gevonden: {NPM_CMD}")

    result = subprocess.run(
        [str(NODE_EXE), "--version"],
        capture_output=True, text=True
    )
    ok(f"node {result.stdout.strip()}")

    result = subprocess.run(
        [str(NODE_EXE), str(NODE_DIR / "node_modules" / "npm" / "bin" / "npm-cli.js"), "--version"],
        capture_output=True, text=True
    )
    npm_ver = result.stdout.strip() or "?"
    ok(f"npm  {npm_ver}")

    return {"node": str(NODE_EXE), "npm_cli": str(NODE_DIR / "node_modules" / "npm" / "bin" / "npm-cli.js")}

def npm_run(paths: dict, args: list[str], cwd: Path | None = None) -> int:
    """Voer npm commando uit via node + npm-cli.js."""
    cmd = [paths["node"], paths["npm_cli"]] + args
    env = {**os.environ, "PATH": str(NODE_DIR) + os.pathsep + os.environ.get("PATH", "")}
    return subprocess.run(cmd, cwd=str(cwd or APP_DIR), env=env).returncode

def npx_run(paths: dict, args: list[str], cwd: Path | None = None) -> int:
    """Voer npx commando uit via node + npx-cli.js."""
    npx_cli = NODE_DIR / "node_modules" / "npm" / "bin" / "npx-cli.js"
    if not npx_cli.exists():
        # Fallback: gebruik npx.cmd als npx-cli.js niet bestaat
        cmd = [str(NPX_CMD)] + args
    else:
        cmd = [paths["node"], str(npx_cli)] + args
    env = {**os.environ, "PATH": str(NODE_DIR) + os.pathsep + os.environ.get("PATH", "")}
    return subprocess.run(cmd, cwd=str(cwd or APP_DIR), env=env).returncode

# ── Hoofdprogramma ────────────────────────────────────────────────────────────

GIT_DIR = SCRIPT_DIR / "git"
GIT_EXE = GIT_DIR / "bin" / "git.exe"
GIT_PORTABLE_FILE = SCRIPT_DIR / "PortableGit.exe"


def _get_git_portable_url() -> str:
    """Haal de nieuwste Git for Windows portable download URL op via GitHub API."""
    info("Nieuwste Git for Windows versie opzoeken...")
    try:
        req = urllib.request.Request(
            "https://api.github.com/repos/git-for-windows/git/releases/latest",
            headers={"User-Agent": "dsp-core-surface-builder"}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
        assets = data.get("assets", [])
        for asset in assets:
            name = asset.get("name", "")
            if "PortableGit" in name and "64-bit" in name and name.endswith(".7z.exe"):
                url = asset["browser_download_url"]
                ok(f"Git versie gevonden: {data['tag_name']} -> {name}")
                return url
    except Exception as e:
        info(f"GitHub API niet bereikbaar ({e}), gebruik fallback URL.")
    # Fallback naar bekende stabiele versie
    return "https://github.com/git-for-windows/git/releases/download/v2.45.2.windows.1/PortableGit-2.45.2-64-bit.7z.exe"


def _find_git() -> str | None:
    """Zoek git.exe op: portable map, vaste locaties, PATH."""
    # 1. Eigen portable map
    if GIT_EXE.exists():
        return str(GIT_EXE)
    # 2. Vaste installatiepaden
    candidates = [
        r"C:\Program Files\Git\bin\git.exe",
        r"C:\Program Files (x86)\Git\bin\git.exe",
        r"C:\Git\bin\git.exe",
    ]
    for c in candidates:
        if Path(c).exists():
            return c
    # 3. PATH
    found = shutil.which("git")
    return found if found else None


def ensure_git() -> str:
    """Zorg dat git beschikbaar is. Download portable versie indien nodig."""
    found = _find_git()
    if found:
        ok(f"Git gevonden: {found}")
        return found

    info("Git niet gevonden - portable versie downloaden (~50 MB)...")
    GIT_PORTABLE_URL = _get_git_portable_url()
    info(f"URL: {GIT_PORTABLE_URL}")

    def report(count, block_size, total):
        if total > 0:
            pct = min(100, int(count * block_size * 100 / total))
            bar = "#" * (pct // 5) + "." * (20 - pct // 5)
            print(f"\r      [{bar}] {pct}%", end="", flush=True)

    urllib.request.urlretrieve(GIT_PORTABLE_URL, str(GIT_PORTABLE_FILE), reporthook=report)
    print()

    # PortableGit .exe is een self-extracting 7z archief
    # Uitpakken met de stille vlag -o en -y
    GIT_DIR.mkdir(exist_ok=True)
    info("Uitpakken Git portable...")
    rc = subprocess.run(
        [str(GIT_PORTABLE_FILE), "-o", str(GIT_DIR), "-y"],
        capture_output=True
    ).returncode

    GIT_PORTABLE_FILE.unlink(missing_ok=True)

    if not GIT_EXE.exists():
        raise RuntimeError(f"Git uitpakken mislukt (rc={rc}). Probeer handmatig: {GIT_PORTABLE_URL}")

    ok(f"Git portable geinstalleerd: {GIT_EXE}")

    # Voeg git/bin toe aan gebruikers-PATH
    git_bin = str(GIT_DIR / "bin")
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment", 0,
                            winreg.KEY_READ | winreg.KEY_SET_VALUE) as key:
            try:
                current, _ = winreg.QueryValueEx(key, "PATH")
            except FileNotFoundError:
                current = ""
            paths = [p for p in current.split(";") if p.strip()]
            if git_bin not in paths:
                paths.insert(0, git_bin)
                winreg.SetValueEx(key, "PATH", 0, winreg.REG_EXPAND_SZ, ";".join(paths))
                ok(f"Git/bin toegevoegd aan gebruikers-PATH")
    except Exception as e:
        info(f"PATH update overgeslagen: {e}")

    os.environ["PATH"] = git_bin + os.pathsep + os.environ.get("PATH", "")
    return str(GIT_EXE)


def ensure_node() -> dict:
    """Zorg dat Node.js aanwezig is. Download indien nodig."""
    if NODE_EXE.exists() and NPM_CMD.exists():
        ok(f"Node.js al aanwezig: {NODE_DIR}")
        add_to_user_path()
        return verify_node()

    info("Node.js niet gevonden, ophalen...")
    version, url = fetch_latest_lts()
    zip_dest = SCRIPT_DIR / f"node-{version}-{NODE_ARCH}.zip"

    if not zip_dest.exists():
        download_node(url, zip_dest)
    else:
        ok(f"Zip al aanwezig: {zip_dest.name}")

    extract_node(zip_dest, version)
    add_to_user_path()
    return verify_node()


def main():
    banner("DSP Core Surface - APK Builder (Portable)")
    print("  Geen admin rechten nodig")

    parser = argparse.ArgumentParser(add_help=True)
    parser.add_argument("--install",   action="store_true", help="Alleen node setup + npm install, geen build")
    parser.add_argument("--path-only", action="store_true", help="Alleen PATH updaten voor bestaand node")
    args = parser.parse_args()

    TOTAL = 3 if args.install else (2 if args.path_only else 5)

    # ── Stap 1: Node.js ──────────────────────────────────────────────────────
    step(1, TOTAL, "Node.js controleren / downloaden...")
    try:
        paths = ensure_node()
    except RuntimeError as e:
        err(str(e))
        sys.exit(1)

    if args.path_only:
        step(2, TOTAL, "PATH bijgewerkt.")
        banner("Klaar! Herstart je terminal om de nieuwe PATH te gebruiken.")
        return

    # ── Stap 2: npm install ───────────────────────────────────────────────────
    step(2, TOTAL, "npm packages installeren...")
    node_modules = APP_DIR / "node_modules"

    if node_modules.exists():
        ok("node_modules al aanwezig, overgeslagen.")
        ok("(Verwijder node_modules map om opnieuw te installeren)")
    else:
        info("Dit kan 2-5 minuten duren...")
        rc = npm_run(paths, ["install"], cwd=APP_DIR)
        if rc != 0:
            err("npm install mislukt.")
            sys.exit(1)
        ok("npm install geslaagd.")

    if args.install:
        step(3, TOTAL, "Klaar met installatie.")
        banner("Installatie voltooid. Voer het script opnieuw uit zonder --install om de APK te bouwen.")
        return

    # ── Stap 3: EAS CLI ───────────────────────────────────────────────────────
    step(3, TOTAL, "EAS CLI controleren...")
    eas_bin = APP_DIR / "node_modules" / ".bin" / "eas.cmd"
    if not eas_bin.exists():
        info("EAS CLI installeren...")
        rc = npm_run(paths, ["install", "eas-cli", "--save-dev"], cwd=APP_DIR)
        if rc != 0:
            err("EAS CLI installatie mislukt.")
            sys.exit(1)
    ok("EAS CLI gereed.")

    # ── Stap 4: Expo inloggen ────────────────────────────────────────────────
    step(4, TOTAL, "Inloggen bij Expo...")
    print()
    print("  +-----------------------------------------------------+")
    print("  |  Je hebt een GRATIS Expo account nodig.              |")
    print("  |  Aanmaken: https://expo.dev/signup (in browser)      |")
    print("  +-----------------------------------------------------+")
    print()
    rc = npx_run(paths, ["eas-cli", "login"], cwd=APP_DIR)
    if rc != 0:
        err("Expo login mislukt.")
        sys.exit(1)

    # ── Stap 5: APK bouwen ───────────────────────────────────────────────────
    step(5, TOTAL, "APK bouwen via Expo EAS Cloud...")
    info("De bouw verloopt in de cloud bij Expo (~5–15 minuten).")
    info("Je krijgt een downloadlink als het klaar is.")
    print()

    # Assets aanmaken indien nodig
    make_assets = SCRIPT_DIR / "make_assets.py"
    if make_assets.exists():
        subprocess.run([sys.executable, str(make_assets)], capture_output=True)
        ok("Assets gecontroleerd.")

    # Git installeren indien nodig (vereist voor EAS build)
    try:
        git_exe = ensure_git()
    except RuntimeError as e:
        err(str(e))
        sys.exit(1)

    # Git configureren en repo voorbereiden
    subprocess.run([git_exe, "config", "--global", "--add", "safe.directory", str(APP_DIR)], capture_output=True)
    git_dir = APP_DIR / ".git"
    if not git_dir.exists():
        info("Git repo initialiseren...")
        subprocess.run([git_exe, "init"], cwd=str(APP_DIR), capture_output=True)
        subprocess.run([git_exe, "config", "user.email", "build@local"], cwd=str(APP_DIR), capture_output=True)
        subprocess.run([git_exe, "config", "user.name", "Build"], cwd=str(APP_DIR), capture_output=True)
    gi = APP_DIR / ".gitignore"
    if not gi.exists():
        gi.write_text("node_modules/\nbuild_portable/node/\n*.zip\n.expo/\ndist/\n")
    subprocess.run([git_exe, "add", "."], cwd=str(APP_DIR), capture_output=True)
    subprocess.run([git_exe, "commit", "-m", "build"], cwd=str(APP_DIR), capture_output=True)
    ok("Git repo gereed.")

    rc = npx_run(paths, [
        "eas-cli", "build",
        "--platform", "android",
        "--profile", "preview",
    ], cwd=APP_DIR)

    if rc != 0:
        err("APK build mislukt. Controleer de output hierboven.")
        sys.exit(1)

    banner("APK build gestart!")
    print("  Download de APK via de link die hierboven verscheen.")
    print()
    print("  Installeren op Android:")
    print("    1. Instellingen -> Beveiliging -> Onbekende bronnen: AAN")
    print("    2. Open de gedownloade .apk op je apparaat")
    print()


if __name__ == "__main__":
    main()
