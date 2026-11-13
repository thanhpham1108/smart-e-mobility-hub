"""Build the individual Submission 3 report from reviewed Markdown and UML exports."""
from pathlib import Path
import re
from html import escape
from collections import Counter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, A3, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    NextPageTemplate, Table, TableStyle, Image, KeepTogether,
)
from reportlab.platypus.tableofcontents import TableOfContents
from PIL import Image as PILImage
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / "docs/submission-3"
OUT = ROOT / "output/pdf/Submission3_Fleet_Incident_2452265.pdf"


def verify_operations():
    current = None
    operations = []
    for line in (BASE / "class-diagram/fleet-incident/04-fleet-incident.puml").read_text().splitlines():
        match = re.match(r"\s*class (\w+).*\{", line)
        if match:
            current = match.group(1)
        match = re.match(r"\s*\+ (\w+\(.*\): .+)", line)
        if match:
            operations.append(f"{current}.{match.group(1)}")
    catalogue = (BASE / "method-design/04-fleet-incident.md").read_text()
    described = re.findall(r"^\| `([^`]+)` \|", catalogue, re.M)
    if Counter(operations) != Counter(described) or any(v != 1 for v in Counter(operations).values()):
        raise ValueError(f"Operation mismatch: diagram-only={set(operations)-set(described)}; catalogue-only={set(described)-set(operations)}")
    tests = re.findall(r"^## (TC-FI-\d+)", (BASE / "test-cases/04-fleet-incident.md").read_text(), re.M)
    if len(tests) != len(set(tests)) or len(tests) != 14:
        raise ValueError("Expected 14 unique test cases")
    print(f"Verified {len(operations)} exact method signatures and {len(tests)} unique test cases")


font_dir = Path("/System/Library/Fonts/Supplemental")
FONT, BOLD = "Helvetica", "Helvetica-Bold"
if (font_dir / "Arial.ttf").exists():
    pdfmetrics.registerFont(TTFont("ReportArial", str(font_dir / "Arial.ttf")))
    pdfmetrics.registerFont(TTFont("ReportArialBold", str(font_dir / "Arial Bold.ttf")))
    pdfmetrics.registerFontFamily("ReportArial", normal="ReportArial", bold="ReportArialBold", italic="ReportArial", boldItalic="ReportArialBold")
    FONT, BOLD = "ReportArial", "ReportArialBold"

styles = getSampleStyleSheet()
styles.add(ParagraphStyle("BodyTextFI", fontName=FONT, fontSize=9.5, leading=14, spaceAfter=7, textColor=colors.HexColor("#243348")))
styles.add(ParagraphStyle("TitleFI", fontName=BOLD, fontSize=29, leading=35, spaceAfter=20, textColor=colors.HexColor("#065f46")))
styles.add(ParagraphStyle("H1FI", fontName=BOLD, fontSize=19, leading=24, spaceBefore=12, spaceAfter=12, keepWithNext=True, textColor=colors.HexColor("#065f46")))
styles.add(ParagraphStyle("H2FI", fontName=BOLD, fontSize=12, leading=17, spaceBefore=12, spaceAfter=7, keepWithNext=True))
styles.add(ParagraphStyle("H3FI", fontName=BOLD, fontSize=10, leading=14, spaceBefore=8, spaceAfter=5, keepWithNext=True))
styles.add(ParagraphStyle("CellFI", fontName=FONT, fontSize=8.5, leading=12, spaceAfter=0))
styles.add(ParagraphStyle("SignatureFI", fontName=BOLD, fontSize=9, leading=13, spaceBefore=10, spaceAfter=6, textColor=colors.HexColor("#065f46"), splitLongWords=True))
styles.add(ParagraphStyle("TOCFI", fontName=FONT, fontSize=11, leading=18, leftIndent=0, firstLineIndent=0, spaceBefore=8))


def inline(text):
    # Local links stay readable in print; editable source files retain hyperlinks.
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = escape(text)
    text = re.sub(r"`([^`]+)`", r"<font name='Courier'>\1</font>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    return text


def paragraph(text, style="BodyTextFI"):
    return Paragraph(inline(text), styles[style])


def markdown(path):
    lines = path.read_text().splitlines()
    story = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        if line.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                cells = [x.strip() for x in lines[i].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-+:?", x) for x in cells):
                    rows.append(cells)
                i += 1
            header, data = rows[0], rows[1:]
            if header[0] == "Class.method signature":
                for row in data:
                    block = [paragraph(row[0].strip("`"), "SignatureFI")]
                    for label, value in zip(header[1:], row[1:]):
                        block.append(paragraph(f"**{label}:** {value}"))
                    story.append(KeepTogether(block))
                    story.append(Spacer(1, 5))
            else:
                width = A4[0] - 92
                ratios = [0.28, 0.72] if len(header) == 2 else [0.27, 0.48, 0.25]
                table = Table([[paragraph(c, "CellFI") for c in row] for row in rows], colWidths=[width*r for r in ratios], repeatRows=1, hAlign="LEFT")
                table.setStyle(TableStyle([
                    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#e2f3ec")),
                    ("VALIGN", (0,0), (-1,-1), "TOP"),
                    ("GRID", (0,0), (-1,-1), .3, colors.HexColor("#cbd5e1")),
                    ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
                    ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
                ]))
                story.extend([table, Spacer(1, 9)])
            continue
        if line.startswith("# "):
            story.append(paragraph(line[2:], "H1FI"))
        elif line.startswith("## "):
            if line.startswith("## 7. Cross-module agreements"):
                story.append(PageBreak())
            story.append(paragraph(line[3:], "H2FI"))
        elif line.startswith("### "):
            story.append(paragraph(line[4:], "H3FI"))
        elif line.startswith("- "):
            story.append(paragraph("• " + line[2:]))
        else:
            story.append(paragraph(line))
        i += 1
    return story


def decorate(canvas, doc):
    w, h = canvas._pagesize
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#a7d7c5"))
    canvas.line(40, h-33, w-40, h-33)
    canvas.setFont(FONT, 8)
    canvas.setFillColor(colors.HexColor("#526274"))
    canvas.drawString(40, h-24, "SMART E-MOBILITY HUB  /  SUBMISSION 3")
    canvas.drawString(40, 22, "Fleet & Incident - Mai Hoang Phuong Dong - 2452265")
    canvas.drawRightString(w-40, 22, str(doc.page))
    canvas.restoreState()


class Report(BaseDocTemplate):
    def beforeDocument(self):
        self.seq.reset("section")

    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and flowable.style.name == "H1FI":
            title = flowable.getPlainText()
            key = f"section-{self.seq.nextf('section')}"
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(title, key, 0)
            self.notify("TOCEntry", (0, title, self.page, key))


def build():
    verify_operations()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = Report(str(OUT), pagesize=A4, title="Submission 3 - Fleet & Incident", author="Mai Hoang Phuong Dong - 2452265")
    for name, size in [("text", A4), ("wide", landscape(A3)), ("large", A3)]:
        w, h = size
        frame = Frame(40, 40, w-80, h-90, leftPadding=6, rightPadding=6, topPadding=6, bottomPadding=6)
        doc.addPageTemplates(PageTemplate(id=name, frames=[frame], onPage=decorate, pagesize=size))
    story = [Spacer(1, 85), paragraph("SOFTWARE ENGINEERING", "H2FI"), paragraph("Submission 3", "TitleFI"), paragraph("Operator Fleet & Incident", "TitleFI"),
             paragraph("Smart E-Mobility Hub / VNU-HCM Urban Area", "H2FI"), Spacer(1, 25),
             paragraph("Mai Hoàng Phương Đông — 2452265", "H2FI"), paragraph("Individual design contribution and shared architecture integration"),
             paragraph("8 November 2026"), Spacer(1, 30),
             paragraph("Includes deployment and implementation views, class design, 22 method descriptions and 14 bonus acceptance test specifications."),
             paragraph("Design submission for student and team review. The report does not claim a running integrated backend or executed backend tests."), PageBreak(), paragraph("Contents", "H2FI")]
    toc = TableOfContents()
    toc.levelStyles = [styles["TOCFI"]]
    story.extend([toc, PageBreak()])
    story.extend(markdown(BASE / "04-fleet-incident.md"))
    diagrams = [
        ("Deployment view", "deployment-view/Deployment_View.png", "large"),
        ("Development / Implementation view", "development-view/Implementation_View.png", "wide"),
        ("Fleet & Incident class diagram", "class-diagram/fleet-incident/04-fleet-incident.png", "wide"),
    ]
    for title, relative, template in diagrams:
        story.extend([NextPageTemplate(template), PageBreak(), paragraph(title, "H1FI")])
        w, h = A3 if template == "large" else landscape(A3)
        path = BASE / relative
        with PILImage.open(path) as im:
            iw, ih = im.size
        scale = min((w-100)/iw, (h-180)/ih)
        story.append(Image(str(path), width=iw*scale, height=ih*scale))
    story.extend([NextPageTemplate("text"), PageBreak()])
    story.extend(markdown(BASE / "method-design/04-fleet-incident.md"))
    story.append(PageBreak())
    story.extend(markdown(BASE / "test-cases/04-fleet-incident.md"))
    doc.multiBuild(story)
    reader = PdfReader(OUT)
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    for marker in ["TC-FI-14", "IncidentTicket.transition", "TelemetryAdapter.ingestChargingPoint"]:
        if marker not in text:
            raise ValueError(f"Missing exported content: {marker}")
    print(f"Exported {len(reader.pages)} pages: {OUT}")


if __name__ == "__main__":
    build()
