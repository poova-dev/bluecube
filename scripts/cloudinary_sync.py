#!/usr/bin/env python3
"""
Cloudinary Sync & Optimizer for Blue Cube Architects
Uploads all images from assets/images to Cloudinary (cloud: jvdlk3j0, preset: bluecube)
and updates HTML references to serve auto-optimized, auto-formatted assets from Cloudinary CDN.
"""

import os
import sys
import re
import json
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed

CLOUD_NAME = "jvdlk3j0"
UPLOAD_PRESET = "bluecube"
CLOUDINARY_CDN_PREFIX = f"https://res.cloudinary.com/{CLOUD_NAME}/image/upload/f_auto,q_auto/bluecube"
MANIFEST_FILE = "cloudinary_manifest.json"
IMAGES_DIR = "assets/images"

def load_manifest():
    if os.path.exists(MANIFEST_FILE):
        try:
            with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_manifest(manifest):
    with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

def upload_image(rel_path, abs_path):
    # rel_path is e.g. "commercial/hero.jpg"
    no_ext, ext = os.path.splitext(rel_path)
    public_id = f"bluecube/{no_ext}"
    
    cmd = [
        "curl", "-s", "--max-time", "45", "-X", "POST",
        f"https://api.cloudinary.com/v1_1/{CLOUD_NAME}/image/upload",
        "-F", f"upload_preset={UPLOAD_PRESET}",
        "-F", f"public_id={public_id}",
        "-F", f"file=@{abs_path}"
    ]
    
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        return rel_path, None, f"Curl error (code {res.returncode}): {res.stderr}"
    
    try:
        data = json.loads(res.stdout)
        if "secure_url" in data:
            cdn_url = f"{CLOUDINARY_CDN_PREFIX}/{rel_path}"
            return rel_path, {
                "public_id": data.get("public_id"),
                "secure_url": data.get("secure_url"),
                "cdn_url": cdn_url,
                "bytes": data.get("bytes"),
                "format": data.get("format"),
                "width": data.get("width"),
                "height": data.get("height")
            }, None
        else:
            return rel_path, None, f"Cloudinary error: {data.get('error', {}).get('message', res.stdout)}"
    except Exception as e:
        return rel_path, None, f"JSON parse error: {e} ({res.stdout[:200]})"

def sync_images(max_workers=5):
    manifest = load_manifest()
    files_to_upload = []

    for root, _, files in os.walk(IMAGES_DIR):
        for f in files:
            if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, IMAGES_DIR)
                if rel_path not in manifest:
                    files_to_upload.append((rel_path, full_path))

    total = len(files_to_upload)
    print(f"Total images found in {IMAGES_DIR}: {total + len(manifest)}")
    print(f"Already tracked in manifest: {len(manifest)}")
    print(f"Pending upload: {total}")

    if total == 0:
        print("All images are already synced to Cloudinary!")
        return manifest

    completed = 0
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(upload_image, rel, full): rel for rel, full in files_to_upload}
        for future in as_completed(futures):
            rel_path, result, err = future.result()
            completed += 1
            if result:
                manifest[rel_path] = result
                save_manifest(manifest)
                print(f"[{completed}/{total}] [OK] {rel_path} -> {result['cdn_url']}")
            else:
                print(f"[{completed}/{total}] [FAILED] {rel_path}: {err}")

    print(f"Sync complete. Total tracked: {len(manifest)}")
    return manifest

def update_html_files():
    html_files = []
    for root, _, files in os.walk("."):
        if ".git" in root or "node_modules" in root:
            continue
        for f in files:
            if f.endswith(".html"):
                html_files.append(os.path.join(root, f))

    # Pattern matches any: assets/images/... or ../assets/images/... or ../../assets/images/...
    pattern = re.compile(r'((?:\.\./)*assets/images/([a-zA-Z0-9_\-/\.]+\.(?:jpg|jpeg|png|webp)))')
    
    total_replacements = 0
    for path in sorted(html_files):
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        def replacer(match):
            nonlocal total_replacements
            total_replacements += 1
            subpath = match.group(2)
            return f"{CLOUDINARY_CDN_PREFIX}/{subpath}"

        new_content, count = pattern.subn(replacer, content)
        if count > 0:
            with open(path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Updated {path} ({count} images replaced)")

    print(f"Total image references replaced in HTML: {total_replacements}")

def revert_html_files():
    html_files = []
    for root, _, files in os.walk("."):
        if ".git" in root:
            continue
        for f in files:
            if f.endswith(".html"):
                html_files.append(os.path.join(root, f))

    prefix_re = re.compile(rf'{re.escape(CLOUDINARY_CDN_PREFIX)}/([a-zA-Z0-9_\-/\.]+\.(?:jpg|jpeg|png|webp))')
    
    total_reverts = 0
    for path in sorted(html_files):
        # Calculate relative path from this html file to assets/images/
        dir_depth = path.count(os.sep) - 1 # e.g. ./index.html -> 0; ./projects/detail.html -> 1; ./projects/interior/index.html -> 2
        prefix = "../" * dir_depth if dir_depth > 0 else ""
        local_base = f"{prefix}assets/images"

        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        def replacer(match):
            nonlocal total_reverts
            total_reverts += 1
            subpath = match.group(1)
            return f"{local_base}/{subpath}"

        new_content, count = prefix_re.subn(replacer, content)
        if count > 0:
            with open(path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Reverted {path} ({count} images)")

    print(f"Total image references reverted: {total_reverts}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] in ("-h", "--help"):
        print("Usage:")
        print("  python3 scripts/cloudinary_sync.py             # Sync all images to Cloudinary and update HTML")
        print("  python3 scripts/cloudinary_sync.py --upload-only # Only upload newly added images")
        print("  python3 scripts/cloudinary_sync.py --update-html # Only update HTML references")
        print("  python3 scripts/cloudinary_sync.py --revert-html # Revert HTML references back to local paths")
    elif len(sys.argv) > 1 and sys.argv[1] == "--revert-html":
        revert_html_files()
    elif len(sys.argv) > 1 and sys.argv[1] == "--update-html":
        update_html_files()
    elif len(sys.argv) > 1 and sys.argv[1] == "--upload-only":
        sync_images()
    else:
        # Default: upload and update HTML
        sync_images()
        update_html_files()
