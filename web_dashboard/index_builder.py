import json
import os
import re
from datetime import datetime

OUTPUT_NAME = "index-data.js"


def human_title(filename):
    """Converts a stored filename into a readable title (fallback only)."""
    stem = os.path.splitext(filename)[0]
    stem = re.sub(r"^\d{8}\d{6}_[0-9a-f]{6}_", "", stem)
    stem = stem.replace("_", " ").replace("-", " ").strip()
    stem = re.sub(r"\s+", " ", stem)
    if not stem:
        stem = "Document"
    return stem[0].upper() + stem[1:]


def read_manifest(directory):
    """Lit le manifest.json d'un dossier et renvoie un dict filename → entry."""
    path = os.path.join(directory, "manifest.json")
    if not os.path.isfile(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {d["filename"]: d for d in data.get("documents", []) if "filename" in d}
    except (json.JSONDecodeError, OSError):
        return {}


def entry_for(directory, filename, prefix, manifest_entries):
    """Construit une entrée pour index-data.js.

    Utilise le titre du manifest.json (fourni par l'utilisateur lors de
    l'upload) s'il existe, sinon génère un titre à partir du nom de fichier.
    """
    path = os.path.join(directory, filename)
    try:
        size = os.path.getsize(path)
        modified = datetime.fromtimestamp(os.path.getmtime(path)).isoformat()
    except OSError:
        size = 0
        modified = ""

    # Use user-provided title from manifest if available
    manifest_entry = manifest_entries.get(filename)
    if manifest_entry and manifest_entry.get("title"):
        title = manifest_entry["title"]
    else:
        title = human_title(filename)

    entry = {
        "title": title,
        "filename": filename,
        "size": size,
        "modified": modified,
        "url": f"/static/files/{prefix}/{filename}",
    }
    stem = os.path.splitext(filename)[0]
    cover = os.path.join(directory, stem + "_cover.png")
    if os.path.isfile(cover):
        entry["cover"] = f"/static/files/{prefix}/{stem}_cover.png"
    return entry


def build_index(files_dir):
    # Try to generate any missing covers before building the index
    try:
        from covers import ensure_covers
        ensure_covers(files_dir)
    except Exception:
        pass

    lessons = {}
    books = {}
    for subject in ("math", "pc"):
        sdir = os.path.join(files_dir, subject)
        lessons[subject] = {}
        if os.path.isdir(sdir):
            for lesson in sorted(os.listdir(sdir)):
                ldir = os.path.join(sdir, lesson)
                if not os.path.isdir(ldir):
                    continue
                lessons[subject][lesson] = {}
                for t in ("c", "s"):
                    tdir = os.path.join(ldir, t)
                    docs = []
                    if os.path.isdir(tdir):
                        manifest_entries = read_manifest(tdir)
                        for filename in sorted(os.listdir(tdir)):
                            if filename.lower().endswith(".pdf"):
                                docs.append(
                                    entry_for(tdir, filename, f"{subject}/{lesson}/{t}", manifest_entries)
                                )
                    lessons[subject][lesson][t] = docs

        bdir = os.path.join(files_dir, "books", subject)
        books[subject] = []
        if os.path.isdir(bdir):
            manifest_entries = read_manifest(bdir)
            for filename in sorted(os.listdir(bdir)):
                if filename.lower().endswith(".pdf"):
                    books[subject].append(entry_for(bdir, filename, f"books/{subject}", manifest_entries))

    index = {"lessons": lessons, "books": books, "generated": datetime.now().isoformat()}
    js = "window.INDEX = " + json.dumps(index, ensure_ascii=False, indent=2) + ";\n"
    static_dir = os.path.dirname(files_dir)
    out = os.path.join(static_dir, OUTPUT_NAME)
    with open(out, "w", encoding="utf-8") as f:
        f.write(js)
    return out
