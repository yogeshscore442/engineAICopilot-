# -*- coding: utf-8 -*-
"""
QUANT Platform - Exact 1-to-1 Mirror of College Model Poster
Matches the exact phrasing style, bold sub-items, centered sub-bullets, and clean layout of the sample poster.
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class ExactPosterBorderCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(ExactPosterBorderCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_poster_frame()
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_poster_frame(self):
        self.saveState()
        # Outer Double Border matching exact model poster
        self.setStrokeColor(colors.HexColor('#0F172A'))
        self.setLineWidth(2.2)
        self.rect(20, 20, 572, 752)
        
        self.setLineWidth(0.8)
        self.rect(24, 24, 564, 744)
        
        self.restoreState()

def build_exact_model_poster():
    pdf_filename = 'QUANT_College_Project_Expo_Abstract_Poster.pdf'
    pdf_path = os.path.abspath(pdf_filename)
    
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=38,
        rightMargin=38,
        topMargin=32,
        bottomMargin=32
    )

    styles = getSampleStyleSheet()

    # Typography matching model poster
    clg_name_style = ParagraphStyle(
        'ClgName',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15.5,
        leading=19,
        alignment=1, # Center
        textColor=colors.HexColor('#0F172A')
    )

    clg_sub_style = ParagraphStyle(
        'ClgSub',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        alignment=1,
        textColor=colors.HexColor('#334155')
    )

    symposium_style = ParagraphStyle(
        'SympTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=15,
        alignment=1,
        textColor=colors.HexColor('#0284C7')
    )

    project_title_style = ParagraphStyle(
        'ProjTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        alignment=1, # Center
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=7,
        spaceAfter=7
    )

    heading_style = ParagraphStyle(
        'SecHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=6,
        spaceAfter=3,
        keepWithNext=True
    )

    bullet_style = ParagraphStyle(
        'PosterBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12.5,
        textColor=colors.HexColor('#1E293B'),
        leftIndent=14,
        firstLineIndent=-9,
        spaceAfter=3.5
    )

    # Centered sub-items like "KK2.15 / 30A ESC / FlySky" in the model
    centered_sub_style = ParagraphStyle(
        'CenteredSub',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12.5,
        alignment=1, # Center
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=1.5
    )

    footer_style = ParagraphStyle(
        'FooterText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#0F172A')
    )

    footer_sub = ParagraphStyle(
        'FooterSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1E293B')
    )

    image_placeholder_style = ParagraphStyle(
        'ImgPlaceholder',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        alignment=1,
        textColor=colors.HexColor('#0369A1')
    )

    image_caption_style = ParagraphStyle(
        'ImgCaption',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        alignment=1,
        textColor=colors.HexColor('#64748B')
    )

    story = []

    # ==========================================
    # 1. COLLEGE & SYMPOSIUM HEADER
    # ==========================================
    story.append(Paragraph('PAAVAI ENGINEERING COLLEGE', clg_name_style))
    story.append(Paragraph('(An Autonomous Institution)', clg_sub_style))
    story.append(Paragraph('A NATIONAL LEVEL TECHNICAL SYMPOSIUM', clg_sub_style))
    story.append(Paragraph('TECHFINIX’26', symposium_style))
    story.append(Paragraph('PROJECT EXPO', clg_sub_style))
    story.append(HRFlowable(width='100%', thickness=1.2, color=colors.HexColor('#0284C7'), spaceBefore=3, spaceAfter=4))

    # ==========================================
    # 2. PROJECT TITLE
    # ==========================================
    story.append(Paragraph('Post-Quantum Secure Communication Platform', project_title_style))

    # ==========================================
    # 3. OBJECTIVE
    # ==========================================
    story.append(Paragraph('OBJECTIVE:', heading_style))
    story.append(Paragraph('&bull; The main aim of this project is to protect digital communication from future quantum computer attacks.', bullet_style))
    story.append(Paragraph('&bull; The focus of this project is to eliminate "Harvest Now, Decrypt Later" data theft in chat, mail, and file storage.', bullet_style))

    # ==========================================
    # 4. ABSTRACT
    # ==========================================
    story.append(Paragraph('ABSTRACT:', heading_style))
    story.append(Paragraph('&bull; Digital communication platforms become essential for everyday data exchange.', bullet_style))
    story.append(Paragraph('&bull; The main drawback of current systems (RSA &amp; ECC) is that they can be easily broken by quantum computers.', bullet_style))
    story.append(Paragraph('&bull; The proposed system aims to provide quantum-safe encryption using NIST-standardized Post-Quantum Cryptography (PQC).', bullet_style))

    # ==========================================
    # 5. INNOVATION
    # ==========================================
    story.append(Paragraph('INNOVATION:', heading_style))
    story.append(Paragraph('&bull; The post-quantum cryptography concept is a recent development. We are enhancing the security by implementing true dual-PQC (both Quantum Key Exchange and Quantum Digital Signatures) for real-time chat, secure mail, and file vault.', bullet_style))

    # ==========================================
    # 6. TECHNOLOGY INVOLVED
    # ==========================================
    story.append(Paragraph('TECHNOLOGY INVOLVED:', heading_style))
    story.append(Paragraph('&bull; <b>Post-Quantum KEM:</b> In this project we have used ML-KEM-768 for quantum-safe key exchange.', bullet_style))
    story.append(Paragraph('&bull; <b>Post-Quantum Digital Signature:</b> ML-DSA-65 is used for sender authentication and message signing.', bullet_style))
    story.append(Paragraph('&bull; <b>Symmetric Encryption:</b> AES-256-GCM authenticated cipher with 512-bit SHA3 integrity check.', bullet_style))
    story.append(Spacer(1, 1))
    story.append(Paragraph('Flask-SocketIO WebSockets', centered_sub_style))
    story.append(Paragraph('liboqs Native C Library', centered_sub_style))
    story.append(Paragraph('Three.js 3D WebGL Interface', centered_sub_style))
    story.append(Spacer(1, 2))

    # ==========================================
    # 7. OUTCOMES
    # ==========================================
    story.append(Paragraph('OUTCOMES:', heading_style))
    story.append(Paragraph('&bull; 100% Quantum-Proof and enhanced communication security.', bullet_style))
    story.append(Paragraph('&bull; The total plaintext leakage is zero; no sensitive data is stored in plain text.', bullet_style))
    story.append(Paragraph('&bull; The cryptographic speed and reliability is very high.', bullet_style))

    # ==========================================
    # 8. THREE PROJECT IMAGES / SCREENSHOTS SLOTS
    # ==========================================
    story.append(Spacer(1, 6))
    
    img_box_1 = [
        Spacer(1, 8),
        Paragraph('<b>[ Image 1 ]</b>', image_placeholder_style),
        Spacer(1, 2),
        Paragraph('3D Quantum Portal', image_caption_style),
        Spacer(1, 8)
    ]
    img_box_2 = [
        Spacer(1, 8),
        Paragraph('<b>[ Image 2 ]</b>', image_placeholder_style),
        Spacer(1, 2),
        Paragraph('Encrypted Live Chat', image_caption_style),
        Spacer(1, 8)
    ]
    img_box_3 = [
        Spacer(1, 8),
        Paragraph('<b>[ Image 3 ]</b>', image_placeholder_style),
        Spacer(1, 2),
        Paragraph('Encrypted File Vault', image_caption_style),
        Spacer(1, 8)
    ]

    img_table_data = [
        [img_box_1, img_box_2, img_box_3]
    ]

    t_imgs = Table(img_table_data, colWidths=[168, 168, 168])
    t_imgs.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (0,0), 1, colors.HexColor('#0284C7')),
        ('BOX', (1,0), (1,0), 1, colors.HexColor('#0284C7')),
        ('BOX', (2,0), (2,0), 1, colors.HexColor('#0284C7')),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_imgs)

    # ==========================================
    # 9. FOOTER: PROJECT BY & GUIDED BY
    # ==========================================
    story.append(Spacer(1, 8))
    
    footer_left = [
        Paragraph('<b>Project By-</b>', footer_style),
        Paragraph('<b>[Student Names]</b>-Final Year, CSE', footer_sub)
    ]

    footer_right = [
        Paragraph('<b>Guided by-</b>', footer_style),
        Paragraph('<b>Staff name</b>', footer_sub)
    ]

    footer_table_data = [
        [footer_left, footer_right]
    ]

    t_footer = Table(footer_table_data, colWidths=[310, 204])
    t_footer.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_footer)

    doc.build(story, canvasmaker=ExactPosterBorderCanvas)
    print(f"SUCCESS: Exact Model-Matched Poster PDF generated at: {pdf_path}")
    return pdf_path

if __name__ == '__main__':
    build_exact_model_poster()
