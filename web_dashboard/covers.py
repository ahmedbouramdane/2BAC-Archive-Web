import os
import subprocess
import sys


def _load_fitz():
    try:
        import fitz  # PyMuPDF (ancien module)
        return fitz, True
    except ImportError:
        try:
            import pymupdf as fitz  # PyMuPDF >= 1.24
            return fitz, True
        except ImportError:
            return None, False


FITZ, HAVE_FITZ = _load_fitz()

COVER_SUFFIX = "_cover.png"


def _install_pymupdf() -> bool:
    """Tente d'installer PyMuPDF automatiquement si absent."""
    global FITZ, HAVE_FITZ
    if HAVE_FITZ:
        return True
    print("[covers] PyMuPDF absent, installation automatique en cours...")
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "--quiet", "pymupdf"],
            check=True,
            capture_output=True,
            timeout=300,
        )
        FITZ, HAVE_FITZ = _load_fitz()
        if HAVE_FITZ:
            print("[covers] PyMuPDF installé avec succès.")
            return True
    except Exception as exc:  # noqa: BLE001 - échec d'installation non bloquant
        print(f"[covers] Échec de l'installation automatique : {exc}")
    return False


def render_cover(pdf_path: str, out_path: str, width: int = 420) -> bool:
    """Rend la première page du PDF en PNG. Renvoie True si réussi."""
    if not HAVE_FITZ:
        return False
    try:
        doc = FITZ.open(pdf_path)
        if doc.page_count < 1:
            doc.close()
            return False
        page = doc[0]
        scale = width / page.rect.width
        pix = page.get_pixmap(matrix=FITZ.Matrix(scale, scale))
        pix.save(out_path)
        doc.close()
        return True
    except Exception:
        return False


def cover_for(pdf_path: str) -> str:
    return os.path.splitext(pdf_path)[0] + COVER_SUFFIX


def ensure_covers(files_dir: str) -> int:
    """Génère une miniature (1ère page, *_cover.png) pour chaque PDF sans couverture."""
    if not HAVE_FITZ and not _install_pymupdf():
        print("[covers] PyMuPDF indisponible - les miniatures ne seront pas générées. "
              "Installez-le manuellement avec : pip install pymupdf")
        return 0
    generated = 0
    pdfs = []

    # Chaque dossier de premier niveau (sauf "books") est un niveau: 2bac, 1bac, tc...
    if os.path.isdir(files_dir):
        for level in sorted(os.listdir(files_dir)):
            lvl = os.path.join(files_dir, level)
            if level == "books" or not os.path.isdir(lvl):
                continue
            for subject in ("math", "pc"):
                sdir = os.path.join(lvl, subject)
                if not os.path.isdir(sdir):
                    continue
                for lesson in sorted(os.listdir(sdir)):
                    ldir = os.path.join(sdir, lesson)
                    if not os.path.isdir(ldir):
                        continue
                    for t in ("c", "s"):
                        tdir = os.path.join(ldir, t)
                        if not os.path.isdir(tdir):
                            continue
                        for name in sorted(os.listdir(tdir)):
                            if name.lower().endswith(".pdf"):
                                pdfs.append(os.path.join(tdir, name))

    books_dir = os.path.join(files_dir, "books")
    if os.path.isdir(books_dir):
        for level in sorted(os.listdir(books_dir)):
            lvl = os.path.join(books_dir, level)
            if not os.path.isdir(lvl):
                continue
            for subject in ("math", "pc", "autres"):
                sdir = os.path.join(lvl, subject)
                if not os.path.isdir(sdir):
                    continue
                for name in sorted(os.listdir(sdir)):
                    if name.lower().endswith(".pdf"):
                        pdfs.append(os.path.join(sdir, name))

    for pdf_path in pdfs:
        cover_path = cover_for(pdf_path)
        if os.path.exists(cover_path):
            continue
        if render_cover(pdf_path, cover_path):
            generated += 1
    return generated


# Compatibilité avec l'ancien nom.
ensure_book_covers = ensure_covers