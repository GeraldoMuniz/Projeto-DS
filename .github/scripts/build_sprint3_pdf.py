#!/usr/bin/env python3
"""Gera os dois PDFs da Sprint 3 a partir dos relatórios Markdown versionados."""
from pathlib import Path
import markdown
from weasyprint import CSS, HTML
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
REPORTS = [
    (ROOT / "docs/testes/relatorio-analise-critica.md", ROOT / "docs/testes/relatorio-analise-critica.pdf", 5),
    (ROOT / "docs/qualidade/relatorio-refatoracao.md", ROOT / "docs/qualidade/relatorio-refatoracao.pdf", 3),
]

BASE_STYLE = """
@page { size: A4; margin: 14mm 15mm 13mm 15mm;
  @bottom-center { content: "Sprint 3 | Gerinfra | " counter(page); font-size: 8px; color: #6b7280; }
}
body { font-family: DejaVu Sans, sans-serif; font-size: FONT_SIZE; line-height: 1.33; color: #14263b; }
h1 { font-size: 17px; color: #123c65; margin: 0 0 12px; }
h2 { font-size: 12px; color: #123c65; margin: 15px 0 6px; break-after: avoid; }
h3 { font-size: 10px; margin: 11px 0 5px; }
p, li { margin: 4px 0 6px; }
ul { padding-left: 18px; }
strong { color: #162b42; }
code { font-size: 0.9em; word-wrap: break-word; }
table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 0.84em; }
th { background: #e8eff6; }
th, td { padding: 5px 5px; border: 1px solid #cbd5e1; vertical-align: top; }
tr { break-inside: avoid; }
a { color: #2563a9; text-decoration: none; }
"""

def generate(source, target, max_pages):
    text = source.read_text(encoding="utf-8")
    html = markdown.markdown(text, extensions=["tables", "fenced_code"])
    target.parent.mkdir(parents=True, exist_ok=True)
    for font_size in ["9.3px", "8.7px", "8.1px", "7.5px"]:
        css = CSS(string=BASE_STYLE.replace("FONT_SIZE", font_size))
        HTML(string=f"<html lang='pt-BR'><meta charset='utf-8'><body>{html}</body></html>",
             base_url=str(ROOT)).write_pdf(str(target), stylesheets=[css])
        pages = len(PdfReader(str(target)).pages)
        if pages <= max_pages:
            print(f"{target.relative_to(ROOT)}: {pages} páginas (limite {max_pages})")
            return
    raise SystemExit(f"PDF ultrapassa {max_pages} páginas: {target}")

if __name__ == "__main__":
    for src, dst, max_pages in REPORTS:
        generate(src, dst, max_pages)
