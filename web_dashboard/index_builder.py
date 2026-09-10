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
    """Lit le manifest.json d'un dossier et renvoie un dict filename → entry.
    L'ordre d'insertion est conservé (dict Python ordonné), ce qui permet au
    site de respecter l'ordre d'upload / réordonnancement opéré via le dashboard.
    """
    path = os.path.join(directory, "manifest.json")
    if not os.path.isfile(path):
        return {}
    ordered = {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        for d in data.get("documents", []):
            if "filename" in d:
                ordered[d["filename"]] = d
    except (json.JSONDecodeError, OSError):
        return {}
    return ordered


def ordered_entries(directory, folders, prefix, manifest_entries):
    """Construit la liste des documents d'un dossier :
    d'abord dans l'ordre du manifest, puis les PDF non référencés (triés)."""
    present = [f for f in folders if f.lower().endswith(".pdf")]
    present_set = set(present)
    ordered = [entry_for(directory, fn, prefix, manifest_entries)
               for fn in manifest_entries if fn in present_set]
    for fn in sorted(present_set - set(manifest_entries)):
        ordered.append(entry_for(directory, fn, prefix, manifest_entries))
    return ordered


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
    # Chaque dossier de premier niveau (sauf "books") est un niveau: 2bac, 1bac, tc...
    if os.path.isdir(files_dir):
        for level in sorted(os.listdir(files_dir)):
            lvl = os.path.join(files_dir, level)
            if level == "books" or not os.path.isdir(lvl):
                continue
            lessons[level] = {}
            for subject in sorted(os.listdir(lvl)):
                sdir = os.path.join(lvl, subject)
                if not os.path.isdir(sdir):
                    continue
                lessons[level][subject] = {}
                for lesson in sorted(os.listdir(sdir)):
                    ldir = os.path.join(sdir, lesson)
                    if not os.path.isdir(ldir):
                        continue
                    lessons[level][subject][lesson] = {}
                    for t in ("c", "s"):
                        tdir = os.path.join(ldir, t)
                        docs = []
                        if os.path.isdir(tdir):
                            manifest_entries = read_manifest(tdir)
                            for filename in sorted(os.listdir(tdir)):
                                if filename.lower().endswith(".pdf"):
                                    docs.append(
                                        entry_for(tdir, filename, f"{level}/{subject}/{lesson}/{t}", manifest_entries)
                                    )
                        lessons[level][subject][lesson][t] = docs

    bdir = os.path.join(files_dir, "books")
    for level in sorted(os.listdir(bdir)):
        lvl = os.path.join(bdir, level)
        if level == "general" or not os.path.isdir(lvl):  # general : dossier partagé, pas un niveau
            continue
        books[level] = {}
        # Parcours récursif : math, pc, autres (+ sous-dossiers éventuels).
        # Apparents au dossier "livres" par leur chemin relatif au niveau.
        for root, _dirs, files in os.walk(lvl):
            if os.path.abspath(root) == os.path.abspath(lvl):
                continue
            pdfs = [f for f in files if f.lower().endswith(".pdf")]
            if not pdfs:
                continue
            rel = os.path.relpath(root, lvl).replace("\\", "/")
            manifest_entries = read_manifest(root)
            books[level][rel] = ordered_entries(root, files, f"books/{level}/{rel}", manifest_entries)

    # General Books : dossier partagé books/general, stocké UNE seule fois.
    # Les documents ne sont jamais copiés ; les mêmes fichiers sont listés
    # pour tous les niveaux via la section "books_general" (site + dashboard).
    general_tree = {}
    general_dir = os.path.join(bdir, "general")
    if os.path.isdir(general_dir):
        for root, _dirs, files in os.walk(general_dir):
            if os.path.abspath(root) == os.path.abspath(general_dir):
                continue
            pdfs = [f for f in files if f.lower().endswith(".pdf")]
            if not pdfs:
                continue
            rel = "general/" + os.path.relpath(root, general_dir).replace("\\", "/")
            manifest_entries = read_manifest(root)
            general_tree[rel] = ordered_entries(root, files, f"books/{rel}", manifest_entries)

    index = {"lessons": lessons, "books": books, "books_general": general_tree, "generated": datetime.now().isoformat()}
    js = "window.INDEX = " + json.dumps(index, ensure_ascii=False, indent=2) + ";\n"
    static_dir = os.path.dirname(files_dir)
    out = os.path.join(static_dir, OUTPUT_NAME)
    with open(out, "w", encoding="utf-8") as f:
        f.write(js)
    return out
