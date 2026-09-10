import json
import os
import re
import uuid
from datetime import datetime

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from covers import ensure_covers
from index_builder import build_index

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # 2BAC_web/
# Site statique publié sur GitHub Pages => dossier docs/ (déployé par GitHub Pages).
WEB_DIR = os.path.join(BASE_DIR, "docs")
FILES_DIR = os.path.join(WEB_DIR, "static", "files")

LEVELS = {
    "2bac": {"math": 13, "pc": 32},
    "1bac": {"math": 17, "pc": 29},
    "tc": {"math": 15, "pc": 23},
}
SUBJECT_NAMES = {"math": "Mathématiques", "pc": "Physique & Chimie"}
BOOK_SUBJECTS = {"math": "Mathématiques", "pc": "Physique & Chimie", "autres": "Autres"}
# Sections "General Books" : mot-clé -> (nom, langues optionnelles)
GENERAL_SECTIONS = {
    "islamic": {"name": "Islamic"},
    "dev": {"name": "Personal Development", "langs": ["en", "ar"]},
    "coding": {"name": "Coding", "langs": ["en", "ar"]},
}
TYPES = {"c", "s"}

app = FastAPI(title="2BAC SM Archive - Upload", version="3.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def lesson_dir(level: str, subject: str, lesson: str, type_: str):
    """Valide le niveau/leçon et renvoie le dossier cible + numéro normalisé (gestion os)."""
    subjects = LEVELS.get(level)
    if not subjects:
        raise HTTPException(status_code=400, detail="Niveau invalide")
    if subject not in subjects:
        raise HTTPException(status_code=400, detail="Matière invalide")
    if not re.fullmatch(r"\d{1,2}", lesson):
        raise HTTPException(status_code=400, detail="Leçon invalide")
    n = int(lesson)
    if not (1 <= n <= subjects[subject]):
        raise HTTPException(status_code=400, detail="Leçon hors limites")
    if type_ not in TYPES:
        raise HTTPException(status_code=400, detail="Type invalide")
    name = f"{n:02d}"
    return os.path.join(FILES_DIR, level, subject, name, type_), name


def manifest_path(directory: str) -> str:
    return os.path.join(directory, "manifest.json")


def read_manifest(directory: str) -> dict:
    """Les documents sont lus par le site statique via ce simple JSON."""
    path = manifest_path(directory)
    if os.path.isfile(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {"documents": []}
    return {"documents": []}


def write_manifest(directory: str, documents: list) -> None:
    with open(manifest_path(directory), "w", encoding="utf-8") as f:
        json.dump({"documents": documents}, f, ensure_ascii=False, indent=2)


def save_pdf(file: UploadFile, directory: str) -> str:
    """Écrit le PDF dans directory et renvoie le nom unique du fichier."""
    original = (file.filename or "fichier.pdf").lower()
    if not original.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés")

    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", os.path.splitext(original)[0])
    if not stem:
        stem = "document"
    filename = f"{datetime.now():%Y%m%d%H%M%S}_{uuid.uuid4().hex[:6]}_{stem}.pdf"
    destination = os.path.join(directory, filename)

    content = file.file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Fichier vide")
    with open(destination, "wb") as f:
        f.write(content)
    return filename


def register(directory: str, filename: str, title: str, url_prefix: str, kind: str = "document") -> dict:
    """Met à jour manifest.json du dossier et renvoie l'entrée."""
    entry = {
        "title": title.strip() or filename,
        "filename": filename,
        "size": os.path.getsize(os.path.join(directory, filename)),
        "modified": datetime.fromtimestamp(os.path.getmtime(os.path.join(directory, filename))).isoformat(),
        "url": f"/static/files/{url_prefix}{filename}",
        "kind": kind,
    }
    documents = [d for d in read_manifest(directory).get("documents", []) if d.get("filename") != filename]
    documents.insert(0, entry)
    write_manifest(directory, documents)
    return entry


def replace_in_manifest(
    directory: str,
    filename: str,
    title: str,
    new_file: UploadFile | None,
    not_found_detail: str = "Document non trouvé dans le manifest",
) -> str:
    """Met à jour l'entrée `filename` du manifest : change le titre et, si
    `new_file` est fourni, remplace le PDF (suppression de l'ancien fichier)
    en conservant la position de l'entrée dans le manifest."""
    filepath = os.path.join(directory, filename)
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    documents = read_manifest(directory).get("documents", [])

    new_filename = filename
    replaced = False
    if new_file is not None and new_file.filename:
        os.remove(filepath)
        cover = os.path.splitext(filepath)[0] + "_cover.png"
        if os.path.isfile(cover):
            os.remove(cover)
        new_filename = save_pdf(new_file, directory)
        replaced = True

    found = False
    for doc in documents:
        if doc.get("filename") == filename:
            doc["title"] = title.strip() or new_filename
            doc["filename"] = new_filename
            doc["size"] = os.path.getsize(os.path.join(directory, new_filename))
            doc["modified"] = datetime.fromtimestamp(os.path.getmtime(os.path.join(directory, new_filename))).isoformat()
            url_prefix = os.path.relpath(directory, FILES_DIR).replace(os.sep, "/") + "/"
            doc["url"] = f"/static/files/{url_prefix}{new_filename}"
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail=not_found_detail)
    write_manifest(directory, documents)
    if replaced:
        ensure_covers(FILES_DIR)
    return title.strip() or new_filename


@app.on_event("startup")
def generate_covers_on_startup():
    ensure_covers(FILES_DIR)


@app.post("/api/upload")
async def upload_lesson(
    level: str = Form(...),
    subject: str = Form(...),
    lesson: str = Form(...),
    type_: str = Form(..., alias="type"),
    title: str = Form(...),
    file: UploadFile = File(...),
):
    directory, name = lesson_dir(level, subject, lesson, type_)
    os.makedirs(directory, exist_ok=True)
    filename = save_pdf(file, directory)
    entry = register(directory, filename, title, f"{level}/{subject}/{name}/{type_}/", kind="lesson")
    ensure_covers(FILES_DIR)
    build_index(FILES_DIR)
    return {"ok": True, "file": filename, "title": entry["title"], "url": entry["url"]}


def book_dir(level: str, subject: str, section: str | None = None, lang: str | None = None) -> str:
    """Valide matière, puis renvoie books/{level}/{subject} (livres scolaires)
    ou books/general/{section}[/{lang}] (General Books, communs à tous les niveaux)."""
    if subject == "general":
        if section not in GENERAL_SECTIONS:
            raise HTTPException(status_code=400, detail="Section invalide")
        info = GENERAL_SECTIONS[section]
        base = os.path.join(FILES_DIR, "books", "general", section)
        if "langs" in info:
            if lang not in info["langs"]:
                raise HTTPException(status_code=400, detail="Langue invalide")
            return os.path.join(base, lang)
        return base
    if level not in LEVELS:
        raise HTTPException(status_code=400, detail="Niveau invalide")
    if subject in ("math", "pc", "autres"):
        if section or lang:
            raise HTTPException(status_code=400, detail="Section/langue inattendue pour cette matière")
        return os.path.join(FILES_DIR, "books", level, subject)
    raise HTTPException(status_code=400, detail="Matière invalide")


@app.post("/api/upload-book")
async def upload_book(
    level: str = Form(None),
    subject: str = Form(...),
    section: str = Form(None),
    lang: str = Form(None),
    title: str = Form(...),
    file: UploadFile = File(...),
):
    directory = book_dir(level, subject, section, lang)
    os.makedirs(directory, exist_ok=True)
    filename = save_pdf(file, directory)
    url_prefix = os.path.relpath(directory, FILES_DIR).replace("\\", "/") + "/"
    entry = register(directory, filename, title, url_prefix, kind="book")
    ensure_covers(FILES_DIR)
    build_index(FILES_DIR)
    return {"ok": True, "file": filename, "title": entry["title"], "url": entry["url"]}


@app.get("/api/files")
def list_files(level: str, subject: str, lesson: str, type: str):
    """Renvoie la liste des documents pour un niveau/leçon/type donné."""
    directory, name = lesson_dir(level, subject, lesson, type)
    manifest = read_manifest(directory)
    return {"ok": True, "documents": manifest.get("documents", [])}


@app.post("/api/delete")
async def delete_document(
    level: str = Form(...),
    subject: str = Form(...),
    lesson: str = Form(...),
    type_: str = Form(..., alias="type"),
    filename: str = Form(...),
):
    """Supprime un fichier PDF (et sa couverture) puis met à jour le manifest."""
    directory, _ = lesson_dir(level, subject, lesson, type_)
    # Valider que le fichier existe
    filepath = os.path.join(directory, filename)
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    # Supprimer le PDF
    os.remove(filepath)
    # Supprimer la couverture si elle existe
    cover = os.path.splitext(filepath)[0] + "_cover.png"
    if os.path.isfile(cover):
        os.remove(cover)
    # Mettre à jour le manifest
    documents = [d for d in read_manifest(directory).get("documents", []) if d.get("filename") != filename]
    write_manifest(directory, documents)
    build_index(FILES_DIR)
    return {"ok": True}


@app.post("/api/rename")
async def rename_document(
    level: str = Form(...),
    subject: str = Form(...),
    lesson: str = Form(...),
    type_: str = Form(..., alias="type"),
    filename: str = Form(...),
    title: str = Form(...),
    file: UploadFile = File(None),
):
    """Modifie le titre d'un document dans le manifest. Si un nouveau fichier
    est fourni, il remplace l'ancien (suppression + sauvegarde)."""
    directory, _ = lesson_dir(level, subject, lesson, type_)
    new_title = replace_in_manifest(directory, filename, title, file)
    build_index(FILES_DIR)
    return {"ok": True, "title": new_title}


@app.get("/api/books")
def list_books(level: str = None, subject: str = ..., section: str = None, lang: str = None):
    """Renvoie la liste des livres (manifest du dossier books correspondant)."""
    directory = book_dir(level, subject, section, lang)
    manifest = read_manifest(directory)
    return {"ok": True, "books": manifest.get("documents", [])}


@app.post("/api/books/delete")
async def delete_book(
    level: str = Form(None),
    subject: str = Form(...),
    section: str = Form(None),
    lang: str = Form(None),
    filename: str = Form(...),
):
    """Supprime un livre PDF (et sa couverture) puis met à jour le manifest."""
    directory = book_dir(level, subject, section, lang)
    filepath = os.path.join(directory, filename)
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    os.remove(filepath)
    cover = os.path.splitext(filepath)[0] + "_cover.png"
    if os.path.isfile(cover):
        os.remove(cover)
    documents = [d for d in read_manifest(directory).get("documents", []) if d.get("filename") != filename]
    write_manifest(directory, documents)
    build_index(FILES_DIR)
    return {"ok": True}


@app.post("/api/books/rename")
async def rename_book(
    level: str = Form(None),
    subject: str = Form(...),
    section: str = Form(None),
    lang: str = Form(None),
    filename: str = Form(...),
    title: str = Form(...),
    file: UploadFile = File(None),
):
    """Modifie le titre d'un livre dans le manifest. Si un nouveau fichier
    est fourni, il remplace l'ancien (suppression + sauvegarde)."""
    directory = book_dir(level, subject, section, lang)
    new_title = replace_in_manifest(
        directory,
        filename,
        title,
        file,
        not_found_detail="Livre non trouvé dans le manifest",
    )
    build_index(FILES_DIR)
    return {"ok": True, "title": new_title}


@app.post("/api/books/reorder")
async def reorder_books(
    level: str = Form(None),
    subject: str = Form(...),
    section: str = Form(None),
    lang: str = Form(None),
    filenames: list[str] = Form(...),
):
    """Réordonne les livres d'un dossier : réécrit le manifest dans le nouvel ordre."""
    directory = book_dir(level, subject, section, lang)
    manifest = read_manifest(directory).get("documents", [])
    valid = {d.get("filename") for d in manifest}
    if set(filenames) != valid:
        raise HTTPException(status_code=400, detail="Liste de livres incomplète ou invalide")
    by_name = {d.get("filename"): d for d in manifest}
    documents = [by_name[fn] for fn in filenames]
    write_manifest(directory, documents)
    build_index(FILES_DIR)
    return {"ok": True}


@app.get("/dashboard")
def dashboard():
    return FileResponse(os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html"))


# Public web (SPA + fichiers uploadés + manifest.json) servi à la racine. Doit rester en dernier.
app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
