"""
reports_pdf.py — High-fidelity ReportLab PDF Generator for Urban Pulse AI.
Generates template-based operational reports matching Ministry of Road Transport
and Highways (MoRTH) and Pune Smart City surveillance standards.
"""

import io
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY


def _build_pdf_styles():
    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        'HeaderTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#0F172A'),
        alignment=TA_LEFT,
    )

    subtitle_style = ParagraphStyle(
        'HeaderSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#475569'),
        alignment=TA_LEFT,
    )

    doc_title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=colors.HexColor('#1E3A8A'),
        alignment=TA_LEFT,
        spaceAfter=6,
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=10,
        spaceAfter=4,
    )

    body_text = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12.5,
        textColor=colors.HexColor('#334155'),
        alignment=TA_JUSTIFY,
    )

    kpi_number = ParagraphStyle(
        'KPINumber',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=16,
        textColor=colors.HexColor('#2563EB'),
        alignment=TA_CENTER,
    )

    kpi_label = ParagraphStyle(
        'KPILabel',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor('#64748B'),
        alignment=TA_CENTER,
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=TA_LEFT,
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1E293B'),
        alignment=TA_LEFT,
    )

    footer_style = ParagraphStyle(
        'FooterText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor('#94A3B8'),
        alignment=TA_CENTER,
    )

    return {
        'header': header_style,
        'subtitle': subtitle_style,
        'title': doc_title_style,
        'section': section_heading,
        'body': body_text,
        'kpi_number': kpi_number,
        'kpi_label': kpi_label,
        'th': table_header,
        'td': table_cell,
        'footer': footer_style,
    }


REPORT_METADATA = {
    1: {
        "name": "Daily Traffic Report — Aug 31",
        "type": "Traffic",
        "date": "2026-08-31",
        "ref": "UP-RPT-2026-0831-TRF",
        "kpis": [
            ("14,820", "TOTAL VEHICLES"),
            ("1,840/hr", "PEAK FLOW (09:00)"),
            ("41.2 km/h", "AVG CITY SPEED"),
            ("34.6%", "CONGESTION INDEX"),
            ("99.4%", "SYSTEM UPTIME"),
        ],
        "summary": "This operational surveillance report analyzes traffic density, vehicular throughput, and arterial congestion throughout the Pune Metropolitan jurisdiction on 31 August 2026. Peak commute hours experienced optimal dispersal along the Hinjewadi-Wakad expressway, while minor queuing occurred near the Shivajinagar railway interchange.",
        "headers": ["Corridor Name", "Zone", "24h Volume", "Avg Speed", "Congestion", "State"],
        "rows": [
            ["Hinjewadi - Wakad Tech Expressway", "IT Hub", "3,420 veh", "44.5 km/h", "42.0%", "Optimal"],
            ["Wakad - Baner Bypass Corridor", "West Pune", "2,980 veh", "48.0 km/h", "38.5%", "Optimal"],
            ["Baner - Aundh Main Connector", "NW Pune", "2,150 veh", "41.0 km/h", "45.0%", "Moderate"],
            ["Shivajinagar - FC Road Signal", "Central", "2,890 veh", "28.5 km/h", "76.0%", "Congested"],
            ["Swargate - Katraj Ghat Highway", "South", "3,380 veh", "36.2 km/h", "58.0%", "Moderate"],
        ]
    },
    2: {
        "name": "Vehicle Activity Report — Week 35",
        "type": "Vehicles",
        "date": "2026-08-30",
        "ref": "UP-RPT-2026-W35-VEH",
        "kpis": [
            ("84,320", "UNIQUE VEHICLES"),
            ("61,400", "COMMUTERS (72.8%)"),
            ("14,210", "FLEET & BUS TRIPS"),
            ("4 Hits", "BLACKLIST INTERCEPTS"),
            ("99.1%", "PLATE MATCH RATE"),
        ],
        "summary": "Weekly audit of multi-class vehicular transit across Pune Metro corridors during Week 35. Over 84,000 unique registrations were logged across 20 optical camera locations. Four stolen/wanted vehicle alerts were successfully matched and routed to local police dispatch.",
        "headers": ["Vehicle Category", "Fleet Share", "7-Day Count", "Peak Hour Share", "Primary Corridor"],
        "rows": [
            ["Passenger Cars & Sedans", "50.0%", "42,160", "54.2%", "Baner - Hinjewadi"],
            ["Two-Wheelers & Scooters", "30.0%", "25,296", "32.0%", "FC Road - Deccan"],
            ["SUVs & Commercial MUVs", "12.0%", "10,118", "9.5%", "PCMC - Pimpri"],
            ["Light Commercial & Autos", "5.0%", "4,216", "2.8%", "Hadapsar - Magarpatta"],
            ["Heavy Cargo Trucks & Buses", "3.0%", "2,530", "1.5%", "Swargate Highway"],
        ]
    },
    3: {
        "name": "ANPR Summary — August 2026",
        "type": "ANPR",
        "date": "2026-08-29",
        "ref": "UP-RPT-2026-08-ANPR",
        "kpis": [
            ("428,500", "PLATES SCANNED"),
            ("98.6%", "READ ACCURACY"),
            ("96.2%", "MoRTH STRICT RATE"),
            ("64 ms", "AVG INFERENCE"),
            ("12,410", "OCR REPAIRED"),
        ],
        "summary": "Comprehensive performance analysis of the Qwen2.5-VL and ByteTrack optical recognition pipeline throughout August 2026. The zero-confusion MoRTH grammar auto-correction engine resolved over 12,000 ambiguous character readings with 98.6% validated accuracy.",
        "headers": ["State / Series Prefix", "State Name", "Monthly Scans", "Share %", "Read Confidence"],
        "rows": [
            ["MH (Maharashtra)", "Maharashtra State", "364,225", "85.0%", "98.9%"],
            ["KA (Karnataka)", "Karnataka State", "21,425", "5.0%", "98.2%"],
            ["DL (Delhi NCR)", "National Capital Territory", "12,855", "3.0%", "97.8%"],
            ["GJ (Gujarat)", "Gujarat State", "10,712", "2.5%", "98.1%"],
            ["BH Series (All-India)", "Bharat Defense / Central", "10,713", "2.5%", "99.4%"],
        ]
    },
    4: {
        "name": "Incident Analysis — Q3 2026",
        "type": "Incidents",
        "date": "2026-08-28",
        "ref": "UP-RPT-2026-Q3-INC",
        "kpis": [
            ("142", "TOTAL INCIDENTS"),
            ("28", "HIGH PRIORITY"),
            ("4.8 min", "AVG POLICE DISPATCH"),
            ("1,840", "E-CHALLANS ISSUED"),
            ("68.4%", "FINE RECOVERY RATE"),
        ],
        "summary": "Quarterly intelligence summary of traffic infractions, road safety hazards, and automated law enforcement incidents during Q3 2026. Red light violations and unauthorized BRTS corridor transit constituted the primary sources of citations.",
        "headers": ["Violation Category", "Quarterly Total", "Fine Revenue (INR)", "Primary Location", "Status"],
        "rows": [
            ["Red Light Jumping", "68 incidents", "₹ 68,000", "Shivajinagar Station", "Resolved"],
            ["Unauthorized BRTS Lane", "34 incidents", "₹ 68,000", "Swargate Junction", "Resolved"],
            ["Wrong-Way Driving", "22 incidents", "₹ 1,10,000", "Pimpri Chowk", "Investigating"],
            ["Excessive Speeding (>80km)", "18 incidents", "₹ 36,000", "Baner Bypass", "Resolved"],
        ]
    },
    5: {
        "name": "System Performance Report",
        "type": "System",
        "date": "2026-08-27",
        "ref": "UP-RPT-2026-0827-SYS",
        "kpis": [
            ("99.85%", "SURVEILLANCE UPTIME"),
            ("18 / 20", "CAMERAS ONLINE"),
            ("42 ms", "REST API LATENCY"),
            ("480 hrs", "DAILY FOOTAGE RUN"),
            ("0.02%", "NETWORK PACKET LOSS"),
        ],
        "summary": "Operational audit of the Urban Pulse AI compute cluster, edge perception units, and distributed database services. The platform maintained 99.85% operational availability with sub-50ms API response across all command consoles.",
        "headers": ["Subsystem Layer", "Assigned Node", "Status", "Latency / FPS", "Uptime %"],
        "rows": [
            ["Service B (Central API)", "Port 8000 · FastAPI", "Operational", "42 ms", "100.0%"],
            ["Service A (AI Perception)", "Port 8001 · YOLOv8", "Operational", "28.4 FPS", "99.8%"],
            ["Database (SQLite / WAL)", "urbanpulse.db", "Operational", "8 ms", "100.0%"],
            ["Edge Camera Network", "20 Camera Nodes", "Operational", "24.0 FPS", "99.2%"],
        ]
    },
    6: {
        "name": "Pedestrian Density Analysis",
        "type": "Pedestrians",
        "date": "2026-08-26",
        "ref": "UP-RPT-2026-0826-PED",
        "kpis": [
            ("34,200", "DAILY FOOTFALL"),
            ("4 Hubs", "HIGH DENSITY SITES"),
            ("0.08", "SAFETY RISK INDEX"),
            ("91.2%", "ZEBRA COMPLIANCE"),
            ("0", "FATAL HAZARDS"),
        ],
        "summary": "Pedestrian density and crosswalk safety assessment across major mass-transit interchanges in Pune Metro. Highest footfall density concentrated around Shivajinagar multimodal terminal and Swargate bus depot.",
        "headers": ["Transit Junction", "Zone", "Daily Pedestrians", "Peak Hour (PM)", "Crossing Safety"],
        "rows": [
            ["Shivajinagar Multimodal Hub", "North Pune", "11,800", "18:00 - 19:30", "Protected Zebra"],
            ["Swargate Bus Depot", "South Pune", "9,400", "17:30 - 19:00", "Grade Separated"],
            ["FC Road Shopping Boulevard", "Central Pune", "7,200", "18:30 - 20:30", "Mid-block Signal"],
            ["Pune Railway Station Rd", "Central Pune", "5,800", "08:00 - 10:00", "Foot Overbridge"],
        ]
    },
    7: {
        "name": "Traffic Report — Sept 1",
        "type": "Traffic",
        "date": "2026-09-01",
        "ref": "UP-RPT-2026-0901-TRF-DRAFT",
        "kpis": [
            ("11,200", "INTERIM VEHICLES"),
            ("1,450/hr", "CURRENT FLOW"),
            ("43.8 km/h", "AVG SPEED"),
            ("29.4%", "CONGESTION INDEX"),
            ("78%", "GENERATION PROGRESS"),
        ],
        "summary": "Preliminary daily traffic telemetry report currently being compiled from live camera streams. Over 11,200 vehicles have been registered in the database as of morning rush hours.",
        "headers": ["Corridor Name", "Zone", "Interim Flow", "Avg Speed", "Congestion State"],
        "rows": [
            ["Hinjewadi Phase 1 Gateway", "IT Hub", "2,840 veh", "46.2 km/h", "Optimal"],
            ["Baner Road Bypass Corridor", "West Pune", "2,310 veh", "48.5 km/h", "Optimal"],
            ["Swargate Transit Corridor", "South Pune", "2,450 veh", "37.0 km/h", "Moderate"],
            ["Viman Nagar IT Corridor", "East Pune", "2,100 veh", "41.5 km/h", "Optimal"],
        ]
    },
    8: {
        "name": "Zone B Analytics",
        "type": "Traffic",
        "date": "2026-09-02",
        "ref": "UP-RPT-2026-0902-ZONB",
        "kpis": [
            ("Scheduled", "GENERATION TIME (23:59)"),
            ("Zone B", "TARGET SECTOR"),
            ("4 Cams", "MONITORED SENSORS"),
            ("38.5 km/h", "HISTORICAL SPEED"),
            ("Automated", "SCHEDULING ENGINE"),
        ],
        "summary": "Scheduled micro-telemetry report designated for automated end-of-day generation for Zone B (Swargate & South Corridors). Will compile complete 24-hour speed radar and traffic flow records.",
        "headers": ["Camera Sensor", "Location", "Scheduled Window", "Target Metrics", "Status"],
        "rows": [
            ["CAM-003", "Swargate Junction", "00:00 - 23:59", "Volume, Speed, ANPR", "Scheduled"],
            ["CAM-010", "Katraj Chowk", "00:00 - 23:59", "Heavy Vehicle Transit", "Scheduled"],
            ["CAM-020", "Kondhwa Rd Junction", "00:00 - 23:59", "Peak Hour Bottlenecks", "Scheduled"],
        ]
    }
}


def generate_report_pdf(report_id: int) -> bytes:
    """Generates a complete, styled PDF byte string for the requested report ID."""
    meta = REPORT_METADATA.get(report_id, REPORT_METADATA[1])

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = _build_pdf_styles()
    story = []

    # 1. Official Government / Smart City Header
    header_data = [
        [
            Paragraph("<b>URBAN PULSE AI — SMART CITY PLATFORM</b><br/>Ministry of Road Transport and Highways (MoRTH) &middot; Pune Metropolitan Region", styles['header']),
            Paragraph(f"<b>CONFIDENTIAL</b><br/>Ref: {meta['ref']}<br/>Issued: {meta['date']}", styles['subtitle'])
        ]
    ]
    header_table = Table(header_data, colWidths=[360, 160])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#1E3A8A'), spaceBefore=2, spaceAfter=10))

    # 2. Document Title & Metadata Badge
    story.append(Paragraph(meta['name'].upper(), styles['title']))
    
    meta_bar_data = [
        [
            Paragraph(f"<b>Report Type:</b> {meta['type']}", styles['subtitle']),
            Paragraph(f"<b>Audit Date:</b> {meta['date']}", styles['subtitle']),
            Paragraph("<b>Classification:</b> Official Law Enforcement", styles['subtitle']),
            Paragraph("<b>Status:</b> VERIFIED & READY", styles['subtitle']),
        ]
    ]
    meta_table = Table(meta_bar_data, colWidths=[125, 125, 150, 120])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F1F5F9')),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # 3. Executive Summary
    story.append(Paragraph("1. Executive Intelligence Summary", styles['section']))
    story.append(Paragraph(meta['summary'], styles['body']))
    story.append(Spacer(1, 10))

    # 4. KPI Metric Cards
    story.append(Paragraph("2. Operational Key Performance Indicators", styles['section']))
    kpi_cols = []
    kpi_headers = []
    for val, lbl in meta['kpis']:
        kpi_headers.append(Paragraph(val, styles['kpi_number']))
        kpi_cols.append(Paragraph(lbl, styles['kpi_label']))

    kpi_table_data = [kpi_headers, kpi_cols]
    col_width = 520 / len(meta['kpis'])
    kpi_table = Table(kpi_table_data, colWidths=[col_width] * len(meta['kpis']))
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 12))

    # 5. Detailed Breakdown Table
    story.append(Paragraph("3. Detailed Corridor & Sensor Telemetry", styles['section']))
    th_cells = [Paragraph(h, styles['th']) for h in meta['headers']]
    tbl_data = [th_cells]

    for row in meta['rows']:
        row_cells = [Paragraph(str(c), styles['td']) for c in row]
        tbl_data.append(row_cells)

    num_cols = len(meta['headers'])
    col_w = [140] + [(520 - 140) / (num_cols - 1)] * (num_cols - 1) if num_cols > 1 else [520]

    content_table = Table(tbl_data, colWidths=col_w)
    content_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
    ]))
    story.append(content_table)
    story.append(Spacer(1, 16))

    # 6. Officer Authorization & Digital Stamp
    sig_data = [
        [
            Paragraph("<b>Automated Verification:</b><br/>Urban Pulse AI Core v2.1<br/>Digital Cryptographic Stamp: <code>SHA256:7f8a92...</code>", styles['subtitle']),
            Paragraph("<b>Authorizing Officer:</b><br/>Command Inspector (Operations)<br/>Pune Smart City Traffic Command Center", styles['subtitle']),
        ]
    ]
    sig_table = Table(sig_data, colWidths=[260, 260])
    sig_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(KeepTogether(sig_table))

    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceBefore=4, spaceAfter=6))
    story.append(Paragraph("Page 1 of 1 &middot; Urban Pulse AI Automated Surveillance Directorate &middot; All Rights Reserved", styles['footer']))

    doc.build(story)
    return buffer.getvalue()
