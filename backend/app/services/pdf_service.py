"""
PDF generation for quotes and invoices.
Uses reportlab — pip install reportlab
Stores PDF in Supabase Storage under bucket 'documents'.
"""

import io
import re
from datetime import date

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame,
    Table, TableStyle, Paragraph, Spacer, HRFlowable,
)
from app.utils.supabase_client import supabase_service


# ── Palette ───────────────────────────────────────────────────────────────────
PRIMARY    = HexColor("#0f172a")
ACCENT     = HexColor("#f97316")
ACCENT_BG  = HexColor("#fff7ed")
LIGHT_GREY = HexColor("#f8fafc")
MID_GREY   = HexColor("#e2e8f0")
DARK_GREY  = HexColor("#64748b")
TEXT       = HexColor("#1e293b")

# ── Page geometry (letter) ────────────────────────────────────────────────────
PAGE_W, PAGE_H = letter
LM = RM = 0.65 * inch          # left / right margin
TM = 0.55 * inch               # top margin
BM = 0.75 * inch               # bottom margin (leaves room for footer)
TW = PAGE_W - LM - RM          # total usable width = 7.2 in


# ── Helpers ───────────────────────────────────────────────────────────────────

def _s(val) -> str:
    return str(val) if val is not None else ""


def _clean_name(name: str) -> str:
    return name.strip().rstrip(".,!;:")


def _next_doc_number(doc_type: str, business_id: str) -> str:
    prefix = "Q" if doc_type == "quote" else "INV"
    year   = date.today().year
    result = supabase_service.table("documents").select("doc_number").eq(
        "business_id", business_id
    ).like("doc_number", f"{prefix}-{year}-%").order("doc_number", desc=True).limit(1).execute()
    if result.data:
        try:
            seq = int(result.data[0]["doc_number"].split("-")[-1]) + 1
        except Exception:
            seq = 1
    else:
        seq = 1
    return f"{prefix}-{year}-{seq:03d}"


def _extract_payment_email(notes: str) -> str:
    if not notes:
        return ""
    m = re.search(r"e-?transfer[:\s]+([^\s,;]+@[^\s,;]+)", notes, re.I)
    if m:
        return m.group(1).strip()
    m = re.search(r"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", notes)
    if m:
        return m.group(1).strip()
    return ""


# ── Styles ────────────────────────────────────────────────────────────────────

def _styles():
    return {
        "biz_name": ParagraphStyle("bizname", fontSize=20, textColor=white,
                                   fontName="Helvetica-Bold", leading=24),
        "biz_sub":  ParagraphStyle("bizsub",  fontSize=9,  textColor=HexColor("#94a3b8"),
                                   leading=13),
        "doc_type": ParagraphStyle("doctype", fontSize=26, textColor=white,
                                   fontName="Helvetica-Bold", alignment=TA_RIGHT, leading=30),
        "doc_num":  ParagraphStyle("docnum",  fontSize=10, textColor=HexColor("#94a3b8"),
                                   alignment=TA_RIGHT, leading=14),
        "label":    ParagraphStyle("label",   fontSize=8,  textColor=DARK_GREY,
                                   fontName="Helvetica-Bold", leading=11, spaceAfter=3),
        "value":    ParagraphStyle("value",   fontSize=10, textColor=TEXT, leading=14),
        "value_b":  ParagraphStyle("valueb",  fontSize=11, textColor=TEXT,
                                   fontName="Helvetica-Bold", leading=15),
        "small":    ParagraphStyle("small",   fontSize=9,  textColor=DARK_GREY, leading=13),
        "r":        ParagraphStyle("r",       fontSize=10, textColor=TEXT,
                                   alignment=TA_RIGHT, leading=14),
        "total_l":  ParagraphStyle("totl",    fontSize=12, textColor=white,
                                   fontName="Helvetica-Bold", alignment=TA_RIGHT),
        "total_r":  ParagraphStyle("totr",    fontSize=14, textColor=white,
                                   fontName="Helvetica-Bold", alignment=TA_RIGHT),
        "pay_lbl":  ParagraphStyle("paylbl",  fontSize=8,  textColor=ACCENT,
                                   fontName="Helvetica-Bold"),
        "pay_val":  ParagraphStyle("payval",  fontSize=10, textColor=TEXT,
                                   fontName="Helvetica-Bold", leading=14),
        "note":     ParagraphStyle("note",    fontSize=9,  textColor=DARK_GREY, leading=14),
    }


# ── Footer drawn on every page via canvas callback ───────────────────────────

def _make_footer(biz_name: str, biz_phone: str):
    def _footer(canv, doc):
        canv.saveState()
        y = 0.35 * inch
        canv.setStrokeColor(MID_GREY)
        canv.setLineWidth(0.5)
        canv.line(LM, y + 11, PAGE_W - RM, y + 11)
        canv.setFont("Helvetica", 8)
        canv.setFillColor(DARK_GREY)
        canv.drawString(LM, y, f"Thank you for choosing {biz_name}!")
        if biz_phone:
            canv.drawRightString(PAGE_W - RM, y, biz_phone)
        canv.restoreState()
    return _footer


# ── PDF builder ───────────────────────────────────────────────────────────────

def _build_pdf(doc_data: dict) -> bytes:
    st = _styles()
    buffer = io.BytesIO()

    biz_raw   = doc_data["business"]
    biz_name  = _clean_name(_s(biz_raw.get("name")))
    biz_area  = _s(biz_raw.get("service_area"))
    biz_phone = _s(biz_raw.get("emergency_phone"))

    footer_cb = _make_footer(biz_name, biz_phone)

    frame = Frame(LM, BM, TW, PAGE_H - TM - BM, id="main",
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    tmpl  = PageTemplate(id="main", frames=[frame],
                         onPage=footer_cb)
    doc   = BaseDocTemplate(buffer, pagesize=letter,
                            leftMargin=LM, rightMargin=RM,
                            topMargin=TM,  bottomMargin=BM)
    doc.addPageTemplates([tmpl])

    # ── Data ─────────────────────────────────────────────────────────────────
    doc_type_label = "QUOTE" if doc_data["doc_type"] == "quote" else "INVOICE"
    customer   = doc_data["customer"]
    items      = doc_data["line_items"]
    doc_number = doc_data["doc_number"]
    issue_date = doc_data.get("issue_date", date.today().isoformat())
    due_date   = doc_data.get("due_date", "")
    notes      = doc_data.get("notes", "") or ""
    # Business e-transfer email takes priority; fall back to parsing from notes
    pay_email  = _s(biz_raw.get("etransfer_email")) or _extract_payment_email(notes)

    subtotal = sum(i["qty"] * i["unit_price"] for i in items)
    tax_rate = doc_data.get("tax_rate", 0.05)
    tax      = round(subtotal * tax_rate, 2)
    total    = round(subtotal + tax, 2)

    story = []

    # ── 1. Header band ────────────────────────────────────────────────────────
    # Left col ~55%, right col ~45% — both sum to TW
    lw, rw = TW * 0.55, TW * 0.45

    biz_cell = [Paragraph(biz_name, st["biz_name"])]
    if biz_area:
        biz_cell.append(Paragraph(biz_area, st["biz_sub"]))
    if biz_phone:
        biz_cell.append(Paragraph(biz_phone, st["biz_sub"]))

    doc_cell = [
        Paragraph(doc_type_label, st["doc_type"]),
        Paragraph(doc_number,     st["doc_num"]),
    ]

    header = Table([[biz_cell, doc_cell]], colWidths=[lw, rw])
    header.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), PRIMARY),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 20),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 20),
        ("LEFTPADDING",   (0, 0), (0,  -1), 18),
        ("RIGHTPADDING",  (1, 0), (1,  -1), 18),
        ("LEFTPADDING",   (1, 0), (1,  -1), 0),
    ]))
    story.append(header)
    story.append(Spacer(1, 14))

    # ── 2. Bill To / Date ────────────────────────────────────────────────────
    cname = _s(customer.get("name") or customer.get("phone") or "")
    cphone = _s(customer.get("phone") or "")
    caddr  = _s(customer.get("address") or "")

    bill_cell = [Paragraph("BILL TO", st["label"]),
                 Paragraph(cname, st["value_b"])]
    if cphone and cphone != cname:
        bill_cell.append(Paragraph(cphone, st["small"]))
    if caddr:
        bill_cell.append(Paragraph(caddr, st["small"]))

    date_cell = [Paragraph("DATE ISSUED", st["label"]),
                 Paragraph(issue_date, st["value"])]
    if due_date:
        date_cell += [Spacer(1, 6),
                      Paragraph("DUE DATE", st["label"]),
                      Paragraph(due_date, st["value"])]

    info = Table([[bill_cell, date_cell]], colWidths=[lw, rw])
    info.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), LIGHT_GREY),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("LEFTPADDING",   (0, 0), (0,  -1), 18),
        ("RIGHTPADDING",  (1, 0), (1,  -1), 18),
        ("LEFTPADDING",   (1, 0), (1,  -1), 0),
        ("LINEBELOW",     (0, 0), (-1, -1), 1, MID_GREY),
    ]))
    story.append(info)
    story.append(Spacer(1, 20))

    # ── 3. Line items ─────────────────────────────────────────────────────────
    # Columns sum to TW
    desc_w  = TW - (0.6 + 0.95 + 1.15) * inch
    col_w   = [desc_w, 0.6 * inch, 0.95 * inch, 1.15 * inch]

    rows = [["DESCRIPTION", "QTY", "UNIT PRICE", "AMOUNT"]]
    for item in items:
        amt = item["qty"] * item["unit_price"]
        rows.append([
            item["description"],
            str(item["qty"]),
            f"${item['unit_price']:.2f}",
            f"${amt:.2f}",
        ])

    items_table = Table(rows, colWidths=col_w, repeatRows=1)
    items_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  PRIMARY),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  white),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0),  9),
        ("TOPPADDING",    (0, 0), (-1, 0),  10),
        ("BOTTOMPADDING", (0, 0), (-1, 0),  10),
        ("LEFTPADDING",   (0, 0), (0,  0),  12),
        ("FONTSIZE",      (0, 1), (-1, -1), 10),
        ("TOPPADDING",    (0, 1), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 9),
        ("LEFTPADDING",   (0, 1), (0,  -1), 12),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [white, LIGHT_GREY]),
        ("ALIGN",         (1, 0), (-1, -1), "RIGHT"),
        ("GRID",          (0, 0), (-1, -1), 0.5, MID_GREY),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 12))

    # ── 4. Totals (right-aligned, subtotal col + amount col = TW) ────────────
    sc = TW - 1.15 * inch   # subtotal label col width
    ac = 1.15 * inch         # amount col width

    sub_rows = [
        [Paragraph("Subtotal:", st["r"]), Paragraph(f"${subtotal:.2f}", st["r"])],
        [Paragraph(f"GST ({int(tax_rate*100)}%):", st["r"]), Paragraph(f"${tax:.2f}", st["r"])],
    ]
    sub_table = Table(sub_rows, colWidths=[sc, ac])
    sub_table.setStyle(TableStyle([
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
    ]))
    story.append(sub_table)
    story.append(Spacer(1, 6))

    total_table = Table(
        [[Paragraph("TOTAL", st["total_l"]), Paragraph(f"${total:.2f}", st["total_r"])]],
        colWidths=[sc, ac],
    )
    total_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), ACCENT),
        ("ALIGN",         (0, 0), (-1, -1), "RIGHT"),
        ("TOPPADDING",    (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
    ]))
    story.append(total_table)

    # ── 5. Payment box ────────────────────────────────────────────────────────
    if pay_email:
        story.append(Spacer(1, 18))
        pw1, pw2 = TW * 0.6, TW * 0.4
        pay_table = Table([[
            [Paragraph("PAYMENT — E-TRANSFER", st["pay_lbl"]),
             Spacer(1, 4),
             Paragraph(pay_email, st["pay_val"])],
            [Paragraph("AMOUNT DUE", st["pay_lbl"]),
             Spacer(1, 4),
             Paragraph(f"${total:.2f} CAD", st["pay_val"])],
        ]], colWidths=[pw1, pw2])
        pay_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), ACCENT_BG),
            ("TOPPADDING",    (0, 0), (-1, -1), 14),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
            ("LEFTPADDING",   (0, 0), (0,  -1), 16),
            ("RIGHTPADDING",  (1, 0), (1,  -1), 16),
            ("LEFTPADDING",   (1, 0), (1,  -1), 16),
            ("LINEAFTER",     (0, 0), (0,  -1), 1, HexColor("#fed7aa")),
            ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(pay_table)

    # ── 6. Notes ──────────────────────────────────────────────────────────────
    display_notes = re.sub(
        r"e-?transfer[^@\n]*[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", "", notes, flags=re.I
    ).strip(" ,;.-") if notes else ""

    if display_notes:
        story.append(Spacer(1, 18))
        story.append(Paragraph("NOTES", _styles()["label"]))
        story.append(Paragraph(display_notes, st["note"]))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()


# ── Upload & store ─────────────────────────────────────────────────────────────

async def generate_and_store_document(doc_data: dict, business_id: str) -> dict:
    doc_number = _next_doc_number(doc_data["doc_type"], business_id)
    doc_data["doc_number"] = doc_number

    pdf_bytes = _build_pdf(doc_data)

    file_name = f"{business_id}/{doc_number}.pdf"
    try:
        supabase_service.storage.from_("documents").upload(
            path=file_name,
            file=pdf_bytes,
            file_options={"content-type": "application/pdf"},
        )
        url_response = supabase_service.storage.from_("documents").get_public_url(file_name)
        pdf_url = url_response if isinstance(url_response, str) else str(url_response)
    except Exception as e:
        pdf_url = ""
        print(f"Storage upload failed: {e}")

    customer = doc_data.get("customer", {})
    items    = doc_data.get("line_items", [])
    subtotal = sum(i["qty"] * i["unit_price"] for i in items)
    tax_rate = doc_data.get("tax_rate", 0.05)
    total    = round(subtotal * (1 + tax_rate), 2)

    record = {
        "business_id":     business_id,
        "doc_type":        doc_data["doc_type"],
        "doc_number":      doc_number,
        "customer_phone":  customer.get("phone", ""),
        "customer_name":   customer.get("name", ""),
        "customer_address":customer.get("address", ""),
        "line_items":      items,
        "subtotal":        subtotal,
        "tax_rate":        tax_rate,
        "total":           total,
        "notes":           doc_data.get("notes", ""),
        "pdf_url":         pdf_url,
        "status":          "draft",
        "conversation_id": doc_data.get("conversation_id"),
        "issue_date":      doc_data.get("issue_date", date.today().isoformat()),
        "due_date":        doc_data.get("due_date"),
    }

    result = supabase_service.table("documents").insert(record).execute()
    return result.data[0]
