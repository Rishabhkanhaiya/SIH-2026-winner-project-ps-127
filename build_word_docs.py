"""
build_word_docs.py — Professional Markdown to Word (.docx) Converter for Urban Pulse AI.

Converts DOCUMENTATION.md and ARCHITECTURE.md into publication-quality,
beautifully styled Microsoft Word (.docx) documents with:
  - Executive Cover Page with corporate styling & metadata
  - Elegant Typography (Navy Headings, Calibri/Segoe UI body, Consolas code)
  - Custom Formatted Tables (Navy header, zebra striping, subtle borders)
  - Code Blocks & Terminal Snippets (Shaded background box, monospace font)
  - Callout / Blockquote Panels (Left accent border, tinted background)
  - Headers & Footers with Document Title and Page Numbering
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from typing import List, Tuple

import docx
from docx import Document
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from docx.shared import Inches, Pt, RGBColor


# ─────────────────────────────────────────────────────────────────────────────
# Color Palette Constants
# ─────────────────────────────────────────────────────────────────────────────
COLOR_NAVY = RGBColor(15, 41, 66)        # #0F2942 - Primary Headings
COLOR_BLUE = RGBColor(30, 64, 175)       # #1E40AF - Secondary Headings
COLOR_SLATE = RGBColor(51, 65, 85)       # #334155 - Tertiary Headings & Captions
COLOR_BODY = RGBColor(30, 41, 59)        # #1E293B - Body Text
COLOR_MUTED = RGBColor(100, 116, 139)    # #64748B - Metadata & Footers
COLOR_CODE = RGBColor(15, 23, 42)        # #0F172A - Monospace Code
COLOR_ACCENT = RGBColor(37, 99, 235)     # #2563EB - Accent Elements

HEX_PRIMARY_NAVY = "1E3A8A"              # Table headers
HEX_ZEBRA_BG = "F8FAFC"                  # Alternating table rows
HEX_CODE_BG = "F1F5F9"                   # Code block background
HEX_CALLOUT_BG = "EFF6FF"                # Blockquote / Alert background
HEX_BORDER_GRAY = "CBD5E1"               # Subtle gray borders
HEX_ACCENT_BLUE = "2563EB"               # Callout left accent border


# ─────────────────────────────────────────────────────────────────────────────
# XML Styling Helpers
# ─────────────────────────────────────────────────────────────────────────────

def set_cell_background(cell, hex_color: str) -> None:
    """Apply background shading to a table cell."""
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)


def set_cell_margins(cell, top: int = 120, bottom: int = 120, left: int = 160, right: int = 160) -> None:
    """Set inner cell padding (in dxa: 20 dxa = 1 pt)."""
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)


def set_table_borders(table, color: str = HEX_BORDER_GRAY, sz: str = "4") -> None:
    """Apply elegant horizontal-only borders to a table."""
    tblPr = table._element.xpath("w:tblPr")
    if tblPr:
        borders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>'
            f'<w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:left w:val="none"/>'
            f'<w:right w:val="none"/>'
            f'<w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:insideV w:val="none"/>'
            f'</w:tblBorders>'
        )
        tblPr[0].append(borders)


def set_callout_borders(cell, border_color: str = HEX_ACCENT_BLUE) -> None:
    """Apply thick left accent border and clear other borders for callouts."""
    tcPr = cell._element.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="none"/>'
        f'<w:left w:val="single" w:sz="24" w:space="0" w:color="{border_color}"/>'
        f'<w:bottom w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)


def add_page_number(run):
    """Insert a dynamic PAGE field code into a run."""
    fldChar1 = parse_xml(r'<w:fldChar %s w:fldCharType="begin"/>' % nsdecls('w'))
    instrText = parse_xml(r'<w:instrText %s xml:space="preserve"> PAGE </w:instrText>' % nsdecls('w'))
    fldChar2 = parse_xml(r'<w:fldChar %s w:fldCharType="separate"/>' % nsdecls('w'))
    fldChar3 = parse_xml(r'<w:fldChar %s w:fldCharType="end"/>' % nsdecls('w'))
    run._r.append(fldChar1)
    run._r.append(instrText)
    run._r.append(fldChar2)
    run._r.append(fldChar3)


# ─────────────────────────────────────────────────────────────────────────────
# Inline Markdown Text Parser
# ─────────────────────────────────────────────────────────────────────────────

def add_inline_formatted_text(paragraph, text: str, default_font_size: Pt = Pt(10.5), is_blockquote: bool = False):
    """
    Parse inline markdown tokens:
      **bold**, *italic*, `code`, and plain text, appending styled runs.
    """
    # Tokenize by bold, inline code, and italic
    pattern = re.compile(r'(\*\*.*?\*\*|`.*?`|\*.*?\*|\[.*?\]\(.*?\))')
    tokens = pattern.split(text)

    for token in tokens:
        if not token:
            continue

        if token.startswith('**') and token.endswith('**') and len(token) >= 4:
            run = paragraph.add_run(token[2:-2])
            run.bold = True
            run.font.name = 'Calibri'
            run.font.size = default_font_size
            run.font.color.rgb = COLOR_NAVY if not is_blockquote else COLOR_BLUE

        elif token.startswith('*') and token.endswith('*') and len(token) >= 2:
            run = paragraph.add_run(token[1:-1])
            run.italic = True
            run.font.name = 'Calibri'
            run.font.size = default_font_size
            run.font.color.rgb = COLOR_BODY

        elif token.startswith('`') and token.endswith('`') and len(token) >= 2:
            run = paragraph.add_run(f" {token[1:-1]} ")
            run.font.name = 'Consolas'
            run.font.size = Pt(9.5)
            run.font.color.rgb = RGBColor(190, 24, 93)  # Rose / Wine accent for inline code
            # Add subtle light gray shading
            rPr = run._r.get_or_add_rPr()
            shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="F1F5F9"/>')
            rPr.append(shd)

        elif token.startswith('[') and '](' in token and token.endswith(')'):
            # Hyperlink text
            link_match = re.match(r'\[(.*?)\]\((.*?)\)', token)
            if link_match:
                label, url = link_match.groups()
                run = paragraph.add_run(label)
                run.font.name = 'Calibri'
                run.font.size = default_font_size
                run.font.color.rgb = COLOR_ACCENT
                run.underline = True
            else:
                run = paragraph.add_run(token)
                run.font.name = 'Calibri'
                run.font.size = default_font_size
        else:
            run = paragraph.add_run(token)
            run.font.name = 'Calibri'
            run.font.size = default_font_size
            run.font.color.rgb = COLOR_BODY


# ─────────────────────────────────────────────────────────────────────────────
# Document Builder Class
# ─────────────────────────────────────────────────────────────────────────────

class MarkdownToDocxConverter:
    def __init__(self, doc_title: str, doc_subtitle: str, doc_category: str):
        self.doc = Document()
        self.doc_title = doc_title
        self.doc_subtitle = doc_subtitle
        self.doc_category = doc_category

        self._configure_page_setup()
        self._configure_styles()

    def _configure_page_setup(self):
        """Configure 1-inch margins and letter page dimensions."""
        for section in self.doc.sections:
            section.top_margin = Inches(1.0)
            section.bottom_margin = Inches(1.0)
            section.left_margin = Inches(1.0)
            section.right_margin = Inches(1.0)
            section.page_width = Inches(8.5)
            section.page_height = Inches(11.0)

            # Header setup
            header = section.header
            hp = header.paragraphs[0]
            hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            hrun = hp.add_run(f"Urban Pulse AI | {self.doc_category}")
            hrun.font.name = "Calibri"
            hrun.font.size = Pt(8.5)
            hrun.font.color.rgb = COLOR_MUTED

            # Footer setup
            footer = section.footer
            fp = footer.paragraphs[0]
            fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            frun1 = fp.add_run("Confidential — Team Trace Forge (SIH 2026)          Page ")
            frun1.font.name = "Calibri"
            frun1.font.size = Pt(8.5)
            frun1.font.color.rgb = COLOR_MUTED
            add_page_number(frun1)

    def _configure_styles(self):
        """Set base document typography defaults."""
        style_normal = self.doc.styles['Normal']
        style_normal.font.name = 'Calibri'
        style_normal.font.size = Pt(10.5)
        style_normal.font.color.rgb = COLOR_BODY

    def add_cover_page(self):
        """Create an executive title and cover page."""
        # Top spacing
        for _ in range(3):
            self.doc.add_paragraph()

        # Category Pill / Tag
        p_cat = self.doc.add_paragraph()
        run_cat = p_cat.add_run(f"  {self.doc_category.upper()}  ")
        run_cat.font.name = "Calibri"
        run_cat.font.size = Pt(10)
        run_cat.bold = True
        run_cat.font.color.rgb = RGBColor(255, 255, 255)
        rPr = run_cat._r.get_or_add_rPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{HEX_ACCENT_BLUE}"/>')
        rPr.append(shd)

        # Title
        p_title = self.doc.add_paragraph()
        p_title.paragraph_format.space_before = Pt(18)
        p_title.paragraph_format.space_after = Pt(6)
        run_title = p_title.add_run(self.doc_title)
        run_title.font.name = "Calibri"
        run_title.font.size = Pt(28)
        run_title.bold = True
        run_title.font.color.rgb = COLOR_NAVY

        # Subtitle
        p_sub = self.doc.add_paragraph()
        p_sub.paragraph_format.space_before = Pt(0)
        p_sub.paragraph_format.space_after = Pt(24)
        run_sub = p_sub.add_run(self.doc_subtitle)
        run_sub.font.name = "Calibri"
        run_sub.font.size = Pt(14)
        run_sub.font.color.rgb = COLOR_BLUE

        # Horizontal accent rule
        p_rule = self.doc.add_paragraph()
        p_rule.paragraph_format.space_after = Pt(36)
        r_rule = p_rule.add_run("―" * 48)
        r_rule.font.color.rgb = RGBColor(203, 213, 225)

        # Metadata Table
        table = self.doc.add_table(rows=6, cols=2)
        table.alignment = WD_TABLE_ALIGNMENT.LEFT
        set_table_borders(table, color="FFFFFF", sz="0")  # Invisible borders

        metadata = [
            ("Problem Statement", "SIH26127 (Smart Urban Traffic Intelligence)"),
            ("Hackathon Initiative", "Smart India Hackathon 2026 (SIH 2026)"),
            ("Engineering Team", "Team Trace Forge"),
            ("Target Geographic Zone", "Pune Metropolitan Region (20 Corridors)"),
            ("Document Release", "Version 2.1 (Production Master Release)"),
            ("Release Date", "September 2026"),
        ]

        for i, (label, val) in enumerate(metadata):
            cell_lbl = table.rows[i].cells[0]
            cell_val = table.rows[i].cells[1]

            cell_lbl.width = Inches(2.2)
            cell_val.width = Inches(4.3)

            p_l = cell_lbl.paragraphs[0]
            p_l.paragraph_format.space_after = Pt(4)
            r_l = p_l.add_run(label)
            r_l.bold = True
            r_l.font.size = Pt(10)
            r_l.font.color.rgb = COLOR_NAVY

            p_v = cell_val.paragraphs[0]
            p_v.paragraph_format.space_after = Pt(4)
            r_v = p_v.add_run(val)
            r_v.font.size = Pt(10)
            r_v.font.color.rgb = COLOR_BODY

        # Page break after cover
        self.doc.add_page_break()

    def add_heading_1(self, text: str):
        """Add a styled Heading 1 with accent formatting."""
        p = self.doc.add_paragraph()
        p.paragraph_format.space_before = Pt(20)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.name = 'Calibri'
        run.font.size = Pt(17)
        run.font.color.rgb = COLOR_NAVY

        # Subtle bottom border line under H1
        pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="8" w:space="4" w:color="{HEX_PRIMARY_NAVY}"/></w:pBdr>')
        p._p.get_or_add_pPr().append(pBdr)

    def add_heading_2(self, text: str):
        """Add a styled Heading 2."""
        p = self.doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.name = 'Calibri'
        run.font.size = Pt(13.5)
        run.font.color.rgb = COLOR_BLUE

    def add_heading_3(self, text: str):
        """Add a styled Heading 3."""
        p = self.doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.name = 'Calibri'
        run.font.size = Pt(11.5)
        run.font.color.rgb = COLOR_SLATE

    def add_body_paragraph(self, text: str):
        """Add a standard body paragraph with inline markdown parsing."""
        p = self.doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.15
        add_inline_formatted_text(p, text)

    def add_bullet_item(self, text: str, level: int = 0):
        """Add a formatted bullet item."""
        p = self.doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.left_indent = Inches(0.25 * (level + 1))
        add_inline_formatted_text(p, text)

    def add_numbered_item(self, text: str, level: int = 0):
        """Add a formatted numbered item."""
        p = self.doc.add_paragraph(style='List Number')
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.left_indent = Inches(0.25 * (level + 1))
        add_inline_formatted_text(p, text)

    def add_blockquote(self, text: str):
        """Add an executive callout box with a colored left accent border."""
        table = self.doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False

        cell = table.rows[0].cells[0]
        cell.width = Inches(6.5)
        set_cell_background(cell, HEX_CALLOUT_BG)
        set_cell_margins(cell, top=100, bottom=100, left=200, right=160)
        set_callout_borders(cell, HEX_ACCENT_BLUE)

        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.15
        add_inline_formatted_text(p, text, default_font_size=Pt(10), is_blockquote=True)

        # Space after callout
        p_spacer = self.doc.add_paragraph()
        p_spacer.paragraph_format.space_after = Pt(4)

    def add_code_block(self, code_lines: List[str]):
        """Render multi-line code or ASCII diagrams in a shaded monospace container."""
        table = self.doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False

        cell = table.rows[0].cells[0]
        cell.width = Inches(6.5)
        set_cell_background(cell, HEX_CODE_BG)
        set_cell_margins(cell, top=100, bottom=100, left=160, right=160)
        set_table_borders(table, color=HEX_BORDER_GRAY, sz="4")

        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.05

        full_code = "\n".join(code_lines)
        run = p.add_run(full_code)
        run.font.name = 'Consolas'
        run.font.size = Pt(8.5)
        run.font.color.rgb = COLOR_CODE

        # Space after code block
        p_spacer = self.doc.add_paragraph()
        p_spacer.paragraph_format.space_after = Pt(4)

    def add_markdown_table(self, header_row: List[str], data_rows: List[List[str]]):
        """Render a markdown table with styled navy headers and alternating zebra rows."""
        num_cols = len(header_row)
        table = self.doc.add_table(rows=len(data_rows) + 1, cols=num_cols)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = True
        set_table_borders(table, color=HEX_BORDER_GRAY, sz="4")

        # Style Header Row
        for col_idx, heading in enumerate(header_row):
            cell = table.rows[0].cells[col_idx]
            set_cell_background(cell, HEX_PRIMARY_NAVY)
            set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.05
            run = p.add_run(heading.strip())
            run.bold = True
            run.font.name = 'Calibri'
            run.font.size = Pt(9.5)
            run.font.color.rgb = RGBColor(255, 255, 255)

        # Style Data Rows
        for row_idx, row_data in enumerate(data_rows):
            is_zebra = (row_idx % 2 == 1)
            row_cells = table.rows[row_idx + 1].cells

            for col_idx in range(num_cols):
                cell = row_cells[col_idx]
                if is_zebra:
                    set_cell_background(cell, HEX_ZEBRA_BG)
                set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
                cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

                val = row_data[col_idx].strip() if col_idx < len(row_data) else ""
                p = cell.paragraphs[0]
                p.paragraph_format.space_before = Pt(1)
                p.paragraph_format.space_after = Pt(1)
                p.paragraph_format.line_spacing = 1.1
                add_inline_formatted_text(p, val, default_font_size=Pt(9.0))

        # Space after table
        p_spacer = self.doc.add_paragraph()
        p_spacer.paragraph_format.space_after = Pt(6)


# ─────────────────────────────────────────────────────────────────────────────
# Markdown File Stream Parser
# ─────────────────────────────────────────────────────────────────────────────

def convert_markdown_file_to_docx(md_path: Path, docx_path: Path, title: str, subtitle: str, category: str):
    """Parse a markdown file line-by-line and generate a polished Word document."""
    print(f"[*] Reading Markdown from: {md_path}")
    raw_lines = md_path.read_text(encoding="utf-8").splitlines()

    converter = MarkdownToDocxConverter(
        doc_title=title,
        doc_subtitle=subtitle,
        doc_category=category,
    )
    converter.add_cover_page()

    in_code_block = False
    code_block_lines: List[str] = []

    in_table = False
    table_header: List[str] = []
    table_rows: List[List[str]] = []

    idx = 0
    total_lines = len(raw_lines)

    while idx < total_lines:
        line = raw_lines[idx]
        stripped = line.strip()

        # Handle Code Blocks
        if stripped.startswith("```"):
            if in_code_block:
                converter.add_code_block(code_block_lines)
                code_block_lines = []
                in_code_block = False
            else:
                in_code_block = True
                code_block_lines = []
            idx += 1
            continue

        if in_code_block:
            code_block_lines.append(line)
            idx += 1
            continue

        # Handle Markdown Tables
        if "|" in line and not in_code_block:
            parts = [c.strip() for c in line.split("|")]
            # Strip empty edges caused by leading/trailing pipes
            if parts and parts[0] == "":
                parts.pop(0)
            if parts and parts[-1] == "":
                parts.pop()

            if parts and all(re.match(r'^:?-+:?$', p) for p in parts):
                # Separator line: e.g. |---|---|
                idx += 1
                continue
            elif not in_table:
                # Table Header
                in_table = True
                table_header = parts
                table_rows = []
                idx += 1
                continue
            else:
                # Table Data Row
                table_rows.append(parts)
                idx += 1
                continue
        else:
            if in_table:
                # Flush Table
                converter.add_markdown_table(table_header, table_rows)
                in_table = False
                table_header = []
                table_rows = []

        # Empty lines
        if not stripped:
            idx += 1
            continue

        # Horizontal Divider
        if stripped in ("---", "***", "___"):
            idx += 1
            continue

        # Headings
        if stripped.startswith("### "):
            converter.add_heading_3(stripped[4:].strip())
        elif stripped.startswith("## "):
            converter.add_heading_2(stripped[3:].strip())
        elif stripped.startswith("# "):
            converter.add_heading_1(stripped[2:].strip())

        # Blockquotes
        elif stripped.startswith(">"):
            quote_text = stripped.lstrip("> ").strip()
            converter.add_blockquote(quote_text)

        # Bulleted Lists
        elif re.match(r'^[-*+]\s+', stripped):
            bullet_text = re.sub(r'^[-*+]\s+', '', stripped)
            converter.add_bullet_item(bullet_text)

        # Numbered Lists
        elif re.match(r'^\d+\.\s+', stripped):
            num_text = re.sub(r'^\d+\.\s+', '', stripped)
            converter.add_numbered_item(num_text)

        # Standard Paragraph
        else:
            converter.add_body_paragraph(stripped)

        idx += 1

    # Final table flush if EOF
    if in_table:
        converter.add_markdown_table(table_header, table_rows)

    # Save to disk
    docx_path.parent.mkdir(parents=True, exist_ok=True)
    converter.doc.save(str(docx_path))
    file_size_kb = docx_path.stat().st_size / 1024
    print(f"[+] Successfully generated: {docx_path} ({file_size_kb:.1f} KB)")


# ─────────────────────────────────────────────────────────────────────────────
# Main Entry Point
# ─────────────────────────────────────────────────────────────────────────────

def main():
    root_dir = Path(__file__).resolve().parent

    print("=" * 70)
    print("  Urban Pulse AI -- Document Conversion Engine (.md -> .docx)")
    print("=" * 70)

    # 1. Convert Master Documentation Handbook
    doc_md = root_dir / "DOCUMENTATION.md"
    doc_docx = root_dir / "Urban_Pulse_AI_Master_Documentation.docx"
    if doc_md.exists():
        convert_markdown_file_to_docx(
            md_path=doc_md,
            docx_path=doc_docx,
            title="Urban Pulse AI -- Master Operations Handbook",
            subtitle="Complete User Manual, Screen Guide, Multi-Camera Feeder & Demo Script",
            category="Operational & User Documentation",
        )

    # 2. Convert System Architecture Specification
    arch_md = root_dir / "ARCHITECTURE.md"
    arch_docx = root_dir / "Urban_Pulse_AI_System_Architecture.docx"
    if arch_md.exists():
        convert_markdown_file_to_docx(
            md_path=arch_md,
            docx_path=arch_docx,
            title="Urban Pulse AI -- System Architecture Specification",
            subtitle="Microservice Topology, Entity Models, M4b Anomaly Engine & Protocols",
            category="Technical Architecture Specification",
        )

    print("\n[+] All Word documents generated successfully.")


if __name__ == "__main__":
    main()
