"""PDF report generation (FR-DASH-004)."""

from __future__ import annotations

import io
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models import Video


def _esc(value) -> str:
    """Escape dynamic/model/transcript text before it enters a ReportLab
    Paragraph, which parses an HTML-like markup subset. Prevents a stray '<' from
    breaking the build and blocks markup injection via generated/ingested text."""
    return escape("" if value is None else str(value))


def build_pdf(video: Video) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=LETTER, title=f"TruthLayer Report — {video.id}")
    styles = getSampleStyleSheet()
    flow = []

    flow.append(Paragraph("TruthLayer Analysis Report", styles["Title"]))
    flow.append(Paragraph(_esc(video.title or video.source_url or video.id), styles["Heading2"]))
    flow.append(Paragraph(f"Platform: {_esc(video.platform or 'n/a')} &nbsp;&nbsp; "
                          f"Mode: {_esc(video.mode.value)} &nbsp;&nbsp; "
                          f"Status: {_esc(video.processing_status.value)}", styles["Normal"]))
    flow.append(Spacer(1, 0.2 * inch))

    report = video.report
    if report:
        data = [
            ["Metric", "Score"],
            ["Trust", _fmt(report.trust_score)],
            ["Risk", _fmt(report.risk_score)],
            ["Compliance", _fmt(report.compliance_score)],
            ["Bias", _fmt(report.bias_score)],
            ["Sentiment", _fmt(report.sentiment_score)],
            ["Authenticity", _fmt(report.authenticity_score)],
            ["Narrative leaning", _esc(report.narrative_leaning) if report.narrative_leaning else "n/a"],
            ["Overall confidence", _fmt(report.overall_confidence, pct=False)],
        ]
        table = Table(data, colWidths=[2.5 * inch, 2.5 * inch])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1d4ed8")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#eef2ff")]),
                ]
            )
        )
        flow.append(table)
        flow.append(Spacer(1, 0.2 * inch))

        if report.summary:
            flow.append(Paragraph("Summary", styles["Heading3"]))
            flow.append(Paragraph(_esc(report.summary), styles["Normal"]))
            flow.append(Spacer(1, 0.2 * inch))

    if video.claims:
        flow.append(Paragraph("Fact-Check Claims", styles["Heading3"]))
        items = [
            ListItem(
                Paragraph(
                    f"<b>[{_esc(c.verdict or 'unverified')}]</b> {_esc(c.claim_text)} "
                    f"<i>({_esc(c.claim_type)}, conf {_fmt(c.confidence, pct=False)})</i>",
                    styles["Normal"],
                )
            )
            for c in video.claims
        ]
        flow.append(ListFlowable(items, bulletType="bullet"))
        flow.append(Spacer(1, 0.2 * inch))

    if video.compliance_issues:
        flow.append(Paragraph("Compliance Issues", styles["Heading3"]))
        items = [
            ListItem(
                Paragraph(
                    f"<b>[{_esc(i.severity)}] {_esc(i.issue_type)}</b>: {_esc(i.description)}",
                    styles["Normal"],
                )
            )
            for i in video.compliance_issues
        ]
        flow.append(ListFlowable(items, bulletType="bullet"))

    doc.build(flow)
    return buf.getvalue()


def _fmt(v, pct: bool = True) -> str:
    if v is None:
        return "n/a"
    return f"{v:.0f}/100" if pct else f"{v:.2f}"
