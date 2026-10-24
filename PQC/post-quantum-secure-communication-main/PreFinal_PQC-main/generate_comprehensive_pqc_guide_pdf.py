# -*- coding: utf-8 -*-
"""
QUANT Platform - Complete Post-Quantum Cryptography (PQC) Technical Handbook & Onboarding Guide
Comprehensive technical guide for new team members explaining Quantum Computing, PQC, Architecture, 
Algorithms, End-to-End Encryption Flow, Live Attack Defense, and Unique Innovations.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont('Helvetica', 8)
        self.setFillColor(colors.HexColor('#64748B'))
        
        # Running Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(44, 752, 'QUANT: Post-Quantum Cryptography Platform - Technical Handbook & Architecture Guide')
            self.setStrokeColor(colors.HexColor('#CBD5E1'))
            self.setLineWidth(0.5)
            self.line(44, 746, 568, 746)
        
        # Running Footer (all pages)
        self.setStrokeColor(colors.HexColor('#CBD5E1'))
        self.setLineWidth(0.5)
        self.line(44, 42, 568, 42)
        self.drawString(44, 30, 'CONFIDENTIAL | QUANT Technical Architecture & Onboarding Specification')
        self.drawRightString(568, 30, f'Page {self._pageNumber} of {page_count}')
        self.restoreState()

def build_pdf():
    pdf_filename = 'QUANT_Post_Quantum_Cryptography_Complete_Technical_Guide.pdf'
    pdf_path = os.path.abspath(pdf_filename)
    
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=44,
        rightMargin=44,
        topMargin=54,
        bottomMargin=52
    )

    styles = getSampleStyleSheet()

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#0284C7'),
        spaceAfter=6
    )

    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=8
    )

    h1_style = ParagraphStyle(
        'CustomH1',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=11,
        spaceAfter=5,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'CustomH2',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#0369A1'),
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=5
    )

    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    code_block_style = ParagraphStyle(
        'CodeBlock',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.2,
        leading=9.5,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=4
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=colors.HexColor('#0C4A6E')
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.5,
        textColor=colors.HexColor('#1E293B')
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold'
    )

    story = []

    # ==========================================
    # HEADER & DOCUMENT TITLE
    # ==========================================
    story.append(Paragraph('QUANT: POST-QUANTUM CRYPTOGRAPHY PLATFORM', title_style))
    story.append(Paragraph('The Complete Technical Handbook: Quantum Threat Model, NIST PQC Standards, End-to-End Encryption Mechanics, Cyber Attack Defense, and Unique Innovations', subtitle_style))
    story.append(Paragraph('<b>Platform Version:</b> v3.0 | <b>Standards Compliance:</b> NIST FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA), RFC 5869 (HKDF), NIST SP 800-232 (Ascon) | <b>Author:</b> QUANT Engineering Team', meta_style))
    story.append(HRFlowable(width='100%', thickness=1.5, color=colors.HexColor('#0284C7'), spaceBefore=0, spaceAfter=8))

    # ==========================================
    # SECTION 1: QUANTUM COMPUTING 101 FOR BEGINNERS
    # ==========================================
    story.append(Paragraph('1. Quantum Computing Fundamentals & The Cryptographic Threat Model', h1_style))
    story.append(Paragraph('To understand why the <b>QUANT Platform</b> was built, one must first understand the fundamental shift from classical computing to quantum computing, and how it completely dismantles the mathematical foundations of modern internet security.', body_style))
    
    story.append(Paragraph('<b>1.1 Classical Bits vs. Quantum Qubits</b>', h2_style))
    story.append(Paragraph('&bull; <b>Classical Computers:</b> Store and process information in binary <b>bits</b> (either a <code>0</code> or a <code>1</code>). Every calculation happens sequentially or in parallel threads across physical silicon transistors.<br/>'
                           '&bull; <b>Quantum Computers:</b> Exploit the laws of quantum mechanics using <b>qubits</b>. Due to <i>Superposition</i>, a qubit can exist as a linear combination of $\\alpha|0\\rangle + \\beta|1\\rangle$ simultaneously. Due to <i>Entanglement</i>, $N$ qubits can simultaneously represent $2^N$ states, allowing quantum algorithms to explore vast mathematical solution spaces exponentially faster than any classical supercomputer.', bullet_style))

    story.append(Paragraph('<b>1.2 How Quantum Computing Destroys Classical Cryptography</b>', h2_style))
    story.append(Paragraph('Virtually all modern secure protocols (HTTPS/TLS, RSA, SSH, ECC, Diffie-Hellman, Bitcoin, Apple iMessage, WhatsApp) rely on two specific mathematical problems that are hard for classical computers:', body_style))
    story.append(Paragraph('&bull; <b>Integer Factorization Problem (IFP):</b> Given a large number $N = p \\times q$ (e.g., RSA-2048), finding the prime factors $p$ and $q$ takes billions of years on classical computers.<br/>'
                           '&bull; <b>Discrete Logarithm Problem (DLP / ECDLP):</b> Given $g$ and $g^x \\pmod p$ or elliptic curve point $P = k \\cdot G$, finding the private scalar $x$ or $k$ is computationally infeasible classically.', bullet_style))

    story.append(Paragraph('In 1994, mathematician Peter Shor published <b>Shor\'s Algorithm</b>. On a Cryptographically Relevant Quantum Computer (CRQC), Shor\'s algorithm solves both Integer Factorization and Discrete Logarithms in <b>polynomial time</b> $\\mathcal{O}((\\log N)^3)$. An RSA-2048 key that requires $2^{112}$ operations (~billions of years) on classical supercomputers can be factored in approximately <b>10 to 30 seconds</b> on a CRQC with ~4,096 logical qubits.', body_style))

    story.append(Paragraph('<b>1.3 Shor\'s Algorithm vs. Grover\'s Algorithm</b>', h2_style))
    
    threat_data = [
        [Paragraph('Algorithm / Cipher', table_header_style), Paragraph('Classical Security', table_header_style), Paragraph('Quantum Attack & Impact', table_header_style), Paragraph('Quantum Posture / Status', table_header_style)],
        
        [Paragraph('<b>RSA-2048 / RSA-4096</b><br/>(Asymmetric / PKI)', table_cell_style), 
         Paragraph('112 / 128 bits<br/>(Secure classically)', table_cell_style), 
         Paragraph('<b>Shor\'s Algorithm:</b> Polynomial time reduction. Private keys completely recovered in seconds.', table_cell_style), 
         Paragraph('<b>COMPLETELY BROKEN</b><br/>(Must be replaced)', table_cell_style)],

        [Paragraph('<b>ECDH / ECDSA (Curve25519, P-256)</b><br/>(Asymmetric / Signatures)', table_cell_style), 
         Paragraph('128 bits<br/>(Secure classically)', table_cell_style), 
         Paragraph('<b>Shor\'s Algorithm:</b> Solves ECDLP in $\\mathcal{O}(n^3)$. Reconstructs private signing and exchange keys.', table_cell_style), 
         Paragraph('<b>COMPLETELY BROKEN</b><br/>(Must be replaced)', table_cell_style)],

        [Paragraph('<b>AES-128 Symmetric Cipher</b>', table_cell_style), 
         Paragraph('128 bits', table_cell_style), 
         Paragraph('<b>Grover\'s Algorithm:</b> Quadratic speedup $\\mathcal{O}(\\sqrt{N})$. Effective security reduced to 64 bits.', table_cell_style), 
         Paragraph('<b>POTENTIALLY VULNERABLE</b><br/>(Brute-forceable by nation-states)', table_cell_style)],

        [Paragraph('<b>AES-256 / ChaCha20-Poly1305</b>', table_cell_style), 
         Paragraph('256 bits', table_cell_style), 
         Paragraph('<b>Grover\'s Algorithm:</b> Effective security reduced from 256 to 128 bits ($3.4 \\times 10^{38}$ quantum ops).', table_cell_style), 
         Paragraph('<b>QUANTUM SECURE</b><br/>(Immune to brute force)', table_cell_style)],

        [Paragraph('<b>SHA3-256 / SHA3-512</b><br/>(Cryptographic Hashes)', table_cell_style), 
         Paragraph('256 / 512 bits', table_cell_style), 
         Paragraph('<b>Brassard-Høyer-Tapp (BHT):</b> Collision search takes $\\mathcal{O}(N^{1/3})$. SHA3-512 retains 170+ bits.', table_cell_style), 
         Paragraph('<b>QUANTUM SECURE</b><br/>(Zero practical collision risk)', table_cell_style)]
    ]

    t_threat = Table(threat_data, colWidths=[120, 95, 175, 134])
    t_threat.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#FEF2F2'), colors.HexColor('#FEF2F2'), colors.HexColor('#FFFBEB'), colors.HexColor('#F0FDF4'), colors.HexColor('#F0FDF4')]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_threat)

    story.append(Paragraph('<b>1.4 \"Harvest Now, Decrypt Later\" (HNDL) - Why We Must Act Now</b>', h2_style))
    story.append(Paragraph('Many people ask: <i>\"If quantum computers are still years away, why do we need QUANT today?\"</i><br/>'
                           'The answer is <b>HNDL Espionage</b>: Foreign intelligence agencies and cybercriminals are actively capturing and archiving encrypted emails, chat communications, military secrets, and financial transactions over internet cables today. Even though they cannot decrypt it today, the moment a quantum computer is activated (known as <b>Q-Day</b>), they will retroactively decrypt the entire historical archive. Any data with a secrecy lifespan over 5 to 10 years is already compromised if protected only by RSA or ECC. QUANT solves this immediately.', body_style))

    # ==========================================
    # SECTION 2: POST-QUANTUM CRYPTOGRAPHY (PQC) & NIST STANDARDS
    # ==========================================
    story.append(Spacer(1, 4))
    story.append(Paragraph('2. What is Post-Quantum Cryptography (PQC)?', h1_style))
    story.append(Paragraph('<b>Post-Quantum Cryptography (PQC)</b> refers to cryptographic algorithms engineered to run on existing, classical computers and microchips today, but whose mathematical security relies on problems so complex that even quantum computers cannot solve them.', body_style))

    story.append(Paragraph('<b>2.1 Module Learning with Errors (M-LWE) Lattice Mathematics</b>', h2_style))
    story.append(Paragraph('Instead of prime numbers, PQC algorithms like <b>ML-KEM</b> and <b>ML-DSA</b> are built on <b>High-Dimensional Lattice Grid Geometry</b>. In Module-LWE, an attacker is given a matrix equation with added random Gaussian noise: $\\mathbf{t} = \\mathbf{A}\\mathbf{s} + \\mathbf{e} \\pmod q$. Finding the secret vector $\\mathbf{s}$ requires finding the shortest vector in an $n$-dimensional lattice (the Shortest Vector Problem, or SVP). Shor\'s quantum algorithm cannot exploit this structure, making lattice cryptography completely quantum-proof.', body_style))

    story.append(Paragraph('<b>2.2 Official NIST PQC Standards (Standardized August 2024)</b>', h2_style))
    
    pqc_std_data = [
        [Paragraph('Standard & Algorithm', table_header_style), Paragraph('Type & Category', table_header_style), Paragraph('Mathematical Foundation', table_header_style), Paragraph('Role in QUANT Platform', table_header_style)],
        
        [Paragraph('<b>ML-KEM</b><br/>(NIST FIPS 203)<br/><i>Kyber-512 / 768 / 1024</i>', table_cell_bold),
         Paragraph('Key Encapsulation Mechanism (KEM)', table_cell_style),
         Paragraph('Module Learning With Errors (M-LWE) over polynomial rings.', table_cell_style),
         Paragraph('Securely establishes symmetric session keys between users during chat and mail handshakes without transmitting raw keys.', table_cell_style)],

        [Paragraph('<b>ML-DSA</b><br/>(NIST FIPS 204)<br/><i>Dilithium-44 / 65 / 87</i>', table_cell_bold),
         Paragraph('Digital Signature Algorithm', table_cell_style),
         Paragraph('Module Short Integer Solution (M-SIS) with Fiat-Shamir with Aborts.', table_cell_style),
         Paragraph('Digitally signs user identity, handshake tokens, and message packets. Prevents Man-in-the-Middle (MITM) forgery.', table_cell_style)],

        [Paragraph('<b>SLH-DSA</b><br/>(NIST FIPS 205)<br/><i>SPHINCS+</i>', table_cell_bold),
         Paragraph('Stateless Hash-Based Digital Signature', table_cell_style),
         Paragraph('W-OTS+ one-time signatures and Merkle authentication trees.', table_cell_style),
         Paragraph('Fallback ultra-conservative signature scheme. Relies strictly on SHA-2 / SHAKE hash security; immune to lattice breakthroughs.', table_cell_style)],

        [Paragraph('<b>Ascon-128a</b><br/>(NIST SP 800-232)', table_cell_bold),
         Paragraph('Lightweight AEAD Symmetric Cipher', table_cell_style),
         Paragraph('Permutation-based sponge duplex construction.', table_cell_style),
         Paragraph('Optimized authenticated encryption engine for resource-constrained IoT nodes and edge microcontrollers.', table_cell_style)]
    ]

    t_pqc = Table(pqc_std_data, colWidths=[110, 105, 140, 169])
    t_pqc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_pqc)

    # ==========================================
    # SECTION 3: SYSTEM ARCHITECTURE & COMPONENTS
    # ==========================================
    story.append(Spacer(1, 4))
    story.append(Paragraph('3. QUANT Platform Architecture & Technology Blueprint', h1_style))
    story.append(Paragraph('The QUANT platform is designed as an asynchronous, highly concurrent web application utilizing Flask, Eventlet, Flask-SocketIO, and native C-compiled post-quantum libraries (`liboqs`).', body_style))

    arch_box = [
        [Paragraph('<b>SYSTEM ARCHITECTURE TOPOLOGY & SUBSYSTEMS</b><br/>'
                   '<b>[ Client / Browser UI ]</b> &bull; Cyber Glassmorphism &bull; Three.js 3D WebGL Entangled Singularity &bull; Web Audio API Synthesizer &bull; Chart.js Telemetry<br/>'
                   '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│ (HTTP REST APIs &amp; Bidirectional WebSockets - WSS)<br/>'
                   '<b>[ Application Server ]</b> &bull; Flask 3.x WSGI &bull; Eventlet Async Green-Threads &bull; Flask-SocketIO Message Broker &bull; Bcrypt Auth<br/>'
                   '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│<br/>'
                   '<b>[ Cryptographic Engine ]</b> &bull; <code>liboqs</code> Native C (ML-KEM, ML-DSA, SLH-DSA) &bull; <code>cryptography</code> (AES-GCM, X25519, HKDF-SHA384, SHA3-512)<br/>'
                   '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│<br/>'
                   '<b>[ Persistence Layer ]</b> &bull; SQLite / SQLAlchemy ORM &bull; Ciphertext-Only Messages &bull; Encrypted Email &amp; Vault Files &bull; Security Audit Logs', code_block_style)]
    ]
    t_arch = Table(arch_box, colWidths=[524])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F1F5F9')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#0284C7')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_arch)

    story.append(Spacer(1, 4))
    story.append(Paragraph('<b>3.1 Key Modules in the Codebase</b>', h2_style))
    story.append(Paragraph('&bull; <code>app/crypto/</code>: Houses all classical, hybrid, PQC (<code>liboqs</code>), and symmetric algorithms with dynamic Windows/Linux DLL loaders.<br/>'
                           '&bull; <code>app/chat/events.py</code>: Manages real-time WebSockets, 2-party interactive handshake negotiation, and monotonic sequence anti-replay tracking.<br/>'
                           '&bull; <code>app/mail/mail_routes.py</code>: Encrypted asynchronous email system with context-bound HKDF key derivation and ML-DSA signatures.<br/>'
                           '&bull; <code>app/files/file_routes.py</code>: Zero-knowledge encrypted file vault with per-file AES-256-GCM and SHA3-512 / SHAKE-256 digests.<br/>'
                           '&bull; <code>app/api/routes.py</code>: Implements the Live Attack Simulation Lab and the Microsecond Benchmarking / Quantum Effort engine.<br/>'
                           '&bull; <code>app/keys/key_routes.py</code>: Manages identity key generation, public key directories, and instant key rotation with session revocation.', bullet_style))

    # ==========================================
    # SECTION 4: STEP-BY-STEP ENCRYPTION & DECRYPTION MECHANICS
    # ==========================================
    story.append(Spacer(1, 4))
    story.append(Paragraph('4. Deep-Dive: How Encryption & Decryption Works Step-by-Step', h1_style))
    story.append(Paragraph('Here is the exact mathematical and operational journey of a message sent through the QUANT Platform:', body_style))

    story.append(Paragraph('<b>Phase 1: Hybrid Ephemeral Key Generation</b>', h2_style))
    story.append(Paragraph('When User A selects User B and initiates a session, Alice generates an ephemeral keypair:<br/>'
                           '1. <b>Classical:</b> Ephemeral X25519 Private Key ($sk_{A}$) and Public Key ($pk_{A}$).<br/>'
                           '2. <b>Post-Quantum:</b> Ephemeral ML-KEM-768 Secret Key ($sk_{KEM,A}$) and Public Key ($pk_{KEM,A}$).<br/>'
                           'Alice sends an <code>initiate_handshake</code> packet with her public keys to Bob via WebSocket.', bullet_style))

    story.append(Paragraph('<b>Phase 2: Bob\'s Interactive Consent & Encapsulation</b>', h2_style))
    story.append(Paragraph('Bob receives an interactive UI modal showing Alice\'s cryptographic identity. When Bob clicks <i>\"Accept &amp; Connect\"</i>:<br/>'
                           '1. Bob generates his ephemeral X25519 keypair ($sk_{B}, pk_{B}$) and computes the Diffie-Hellman secret: $K_{\\text{classical}} = \\text{X25519}(sk_{B}, pk_{A})$.<br/>'
                           '2. Bob encapsulates a quantum secret against Alice\'s ML-KEM public key: $(c_{\\text{kem}}, K_{\\text{pqc}}) = \\text{ML-KEM-Encapsulate}(pk_{KEM,A})$.<br/>'
                           '3. <b>Identity Authentication:</b> Bob signs $(pk_{B} \\parallel c_{\\text{kem}})$ with his long-term <b>ML-DSA-65 Private Key</b> ($sk_{\\text{mldsa},B}$).<br/>'
                           'Bob transmits $(pk_{B}, c_{\\text{kem}}, \\text{Signature})$ back to Alice.', bullet_style))

    story.append(Paragraph('<b>Phase 3: Hybrid Key Derivation via HKDF-SHA-384</b>', h2_style))
    story.append(Paragraph('1. Alice receives Bob\'s payload and verifies Bob\'s ML-DSA-65 digital signature using Bob\'s verified public key. <i>(If signature fails, the handshake is instantly aborted!)</i><br/>'
                           '2. Alice computes $K_{\\text{classical}} = \\text{X25519}(sk_{A}, pk_{B})$ and decapsulates $K_{\\text{pqc}} = \\text{ML-KEM-Decapsulate}(c_{\\text{kem}}, sk_{KEM,A})$.<br/>'
                           '3. Both parties now possess identical secrets ($K_{\\text{classical}}$ and $K_{\\text{pqc}}$). They feed both into HKDF-SHA-384:<br/>'
                           '&nbsp;&nbsp;&nbsp;&nbsp;$$K_{\\text{session}} = \\text{HKDF-SHA-384}(K_{\\text{classical}} \\parallel K_{\\text{pqc}}, \\text{salt}=\\text{None}, \\text{info}=\\text{b\"pqc-secure-platform-hybrid-v1\"}, \\text{length}=32)$$<br/>'
                           '4. <b>The Result:</b> A 256-bit symmetric key that is dual-protected: unbreakable by classical computers (due to X25519) and unbreakable by quantum computers (due to ML-KEM).', bullet_style))

    story.append(Paragraph('<b>Phase 4: Message Encryption & Context-Bound Transport</b>', h2_style))
    story.append(Paragraph('When Alice types plaintext and clicks <i>\"Encrypt &amp; Send\"</i>:<br/>'
                           '1. <b>Monotonic Sequence Number:</b> Alice increments local counter $Seq = Seq + 1$.<br/>'
                           '2. <b>Random IV:</b> Generates a cryptographically secure 96-bit random Initial Vector ($IV$) via <code>os.urandom(12)</code>.<br/>'
                           '3. <b>Authenticated Data Binding (AAD):</b> Sets $\\text{AAD} = \\text{\"hybrid-\"} \\parallel Seq$. This cryptographically locks the message to its sequence number.<br/>'
                           '4. <b>AES-256-GCM Encryption:</b> Computes $(Ciphertext, Tag) = \\text{AES-GCM-Encrypt}(K_{\\text{session}}, IV, Plaintext, \\text{AAD})$.<br/>'
                           '5. <b>Digital Signature:</b> Alice signs the raw ciphertext bytes with her private ML-DSA-65 key.<br/>'
                           '6. The complete packet is sent over WebSockets. <b>Plaintext never touches the server or database!</b>', bullet_style))

    story.append(Paragraph('<b>Phase 5: 3-Tier Security Validation & Decryption</b>', h2_style))
    story.append(Paragraph('Upon receiving the packet, Bob\'s client performs 3 sequential security checks:<br/>'
                           '&bull; <b>Tier 1 (Anti-Replay Filter):</b> Checks if $Seq$ was already seen. If duplicate, packet is dropped immediately.<br/>'
                           '&bull; <b>Tier 2 (ML-DSA Signature Verification):</b> Verifies Alice\'s post-quantum signature against the ciphertext.<br/>'
                           '&bull; <b>Tier 3 (AES-GCM 128-bit Tag Check):</b> AES-256-GCM verifies the Galois polynomial tag over Ciphertext + AAD. If even a single bit was modified in transit, an <code>InvalidTag</code> exception is raised and data is discarded.', bullet_style))

    # ==========================================
    # SECTION 5: LIVE CYBER ATTACK SIMULATION LAB
    # ==========================================
    story.append(Spacer(1, 4))
    story.append(Paragraph('5. Live Cyber Attack Defense & Security Matrix', h1_style))
    story.append(Paragraph('QUANT includes a dedicated cyber laboratory demonstrating real-world attack vectors blocked by its cryptographic engine:', body_style))

    attack_data = [
        [Paragraph('Attack Vector', table_header_style), Paragraph('Simulated Adversary Action', table_header_style), Paragraph('QUANT Mathematical Defense', table_header_style), Paragraph('Defense Outcome', table_header_style)],
        
        [Paragraph('<b>Shor\'s Quantum Attack</b>', table_cell_bold),
         Paragraph('Adversary executes Shor\'s algorithm on a quantum computer to factor public keys.', table_cell_style),
         Paragraph('Module-LWE Lattice grid geometry (NIST FIPS 203 ML-KEM-768).', table_cell_style),
         Paragraph('<b>BLOCKED:</b> Immune to Shor\'s algorithm ($>10^{30}$ years).', table_cell_style)],

        [Paragraph('<b>Man-in-the-Middle (MITM)</b>', table_cell_bold),
         Paragraph('Attacker intercepts KEM exchange and injects rogue public keys.', table_cell_style),
         Paragraph('Handshake payloads are signed with ML-DSA-65 / SLH-DSA identity keys.', table_cell_style),
         Paragraph('<b>BLOCKED:</b> Signature verification fails; handshake terminates.', table_cell_style)],

        [Paragraph('<b>Ciphertext Bit Tampering</b>', table_cell_bold),
         Paragraph('Adversary flips bits in transit (e.g. changing \"Pay $10\" to \"Pay $90\").', table_cell_style),
         Paragraph('AES-256-GCM GHASH polynomial authentication tag verification.', table_cell_style),
         Paragraph('<b>BLOCKED:</b> <code>InvalidTag</code> exception raised; packet purged.', table_cell_style)],

        [Paragraph('<b>Packet Replay Attack</b>', table_cell_bold),
         Paragraph('Attacker captures valid encrypted packet and retransmits it repeatedly.', table_cell_style),
         Paragraph('Monotonic sequence tracker and AAD context binding in AEAD.', table_cell_style),
         Paragraph('<b>BLOCKED:</b> Duplicate sequence dropped; <code>ATTACK_REPLAY</code> alert.', table_cell_style)],

        [Paragraph('<b>Unauthorized Key Injection</b>', table_cell_bold),
         Paragraph('Attacker attempts to decrypt ciphertext using an unauthorized key.', table_cell_style),
         Paragraph('Galois Counter Mode cryptographic tag mismatch.', table_cell_style),
         Paragraph('<b>BLOCKED:</b> Decryption fails cleanly without leaking plaintext.', table_cell_style)]
    ]

    t_att = Table(attack_data, colWidths=[110, 140, 140, 134])
    t_att.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_att)

    # ==========================================
    # SECTION 6: UNIQUENESS & COMPETITIVE ADVANTAGE
    # ==========================================
    story.append(Spacer(1, 4))
    story.append(Paragraph('6. Project Uniqueness & Competitive Advantage', h1_style))
    story.append(Paragraph('Why does the QUANT Platform stand out in the global cybersecurity landscape?', body_style))

    comp_table_data = [
        [Paragraph('Platform', table_header_style), Paragraph('Key Exchange', table_header_style), Paragraph('Digital Signatures', table_header_style), Paragraph('Attack Simulation Lab', table_header_style), Paragraph('Post-Quantum Rating', table_header_style)],
        
        [Paragraph('<b>Our QUANT Platform</b>', table_cell_bold), 
         Paragraph('Hybrid X25519 + ML-KEM (512 / 768 / 1024)', table_cell_style), 
         Paragraph('ML-DSA-65 &amp; SLH-DSA (SPHINCS+)', table_cell_style), 
         Paragraph('<b>YES</b> (6 Live Attack Vectors + Telemetry)', table_cell_style), 
         Paragraph('<b>100% QUANTUM-PROOF</b><br/>(Full KEM + Signatures)', table_cell_style)],

        [Paragraph('<b>Signal (PQXDH)</b>', table_cell_style), 
         Paragraph('Hybrid X25519 + ML-KEM-768', table_cell_style), 
         Paragraph('Ed25519 (Classical - Broken by Shor)', table_cell_style), 
         Paragraph('No (Closed production app)', table_cell_style), 
         Paragraph('<b>PARTIAL</b><br/>(Vulnerable signatures)', table_cell_style)],

        [Paragraph('<b>Apple iMessage (PQ3)</b>', table_cell_style), 
         Paragraph('Kyber-768 + P-256 Ratchet', table_cell_style), 
         Paragraph('ECDSA (Classical - Broken by Shor)', table_cell_style), 
         Paragraph('No (Proprietary Apple ecosystem)', table_cell_style), 
         Paragraph('<b>PARTIAL</b><br/>(Vulnerable signatures)', table_cell_style)],

        [Paragraph('<b>WhatsApp</b>', table_cell_style), 
         Paragraph('Curve25519 (Classical)', table_cell_style), 
         Paragraph('Ed25519 (Classical)', table_cell_style), 
         Paragraph('No', table_cell_style), 
         Paragraph('<b>VULNERABLE</b><br/>(Broken on Q-Day)', table_cell_style)],

        [Paragraph('<b>Telegram</b>', table_cell_style), 
         Paragraph('RSA-2048 / Diffie-Hellman', table_cell_style), 
         Paragraph('RSA (Classical)', table_cell_style), 
         Paragraph('No', table_cell_style), 
         Paragraph('<b>CRITICAL RISK</b><br/>(Broken on Q-Day)', table_cell_style)]
    ]

    t_comp = Table(comp_table_data, colWidths=[95, 115, 110, 105, 99])
    t_comp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#ECFDF5'), colors.white, colors.HexColor('#F8FAFC'), colors.white, colors.HexColor('#FEF2F2')]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_comp)

    story.append(Paragraph('<b>6.1 The 5 Key Pillars of QUANT Uniqueness:</b>', h2_style))
    story.append(Paragraph('1. <b>True End-to-End Post-Quantum Security:</b> Unlike Signal or Apple PQ3 (which only upgraded key exchange but still use classical signatures vulnerable to quantum MITM attacks), QUANT implements <b>both Post-Quantum KEM and Post-Quantum Signatures (ML-DSA & SLH-DSA)</b>.<br/>'
                           '2. <b>Live Interactive Cyber Warfare Lab:</b> Built-in real-time demonstration engine that proves mathematical defense against 6 attack vectors with live packet inspector.<br/>'
                           '3. <b>Multi-NIST Algorithm Agility:</b> Users can dynamically switch between NIST Level 1 (512), Level 3 (768), Level 5 (1024), Stateless Hash SPHINCS+, and IoT Ascon-128a.<br/>'
                           '4. <b>Zero-Knowledge Encrypted Vault:</b> Files encrypted with per-file keys wrapped in master keys, authenticated by SHA3-512 quantum-proof digests.<br/>'
                           '5. <b>Three.js Hardware-Accelerated 3D Quantum Visualization:</b> Stunning WebGL visualizer depicting entangled photon dynamics and quantum tunneling with Web Audio API sound synthesis.', bullet_style))

    # ==========================================
    # SECTION 7: TEAMMATE ONBOARDING & RUN GUIDE
    # ==========================================
    story.append(Spacer(1, 4))
    story.append(Paragraph('7. Teammate Quick-Start & Development Workflow', h1_style))
    story.append(Paragraph('To start the platform and run verification tests on any operating system:', body_style))

    quick_run_box = [
        [Paragraph('<b>QUICK START COMMANDS (POWERSHELL / BASH)</b><br/>'
                   '1. Install Dependencies: <code>python -m pip install -r requirements.txt</code> (or run <code>INSTALL_DEPENDENCIES.bat</code>)<br/>'
                   '2. Launch Web Application: <code>python run.py</code> (or run <code>START_SERVER.bat</code>)<br/>'
                   '3. Access Portal: Open browser to <code>http://127.0.0.1:5000</code><br/>'
                   '4. Run Complete Automated Test Suite: <code>python -m pytest -q</code> (Runs all crypto, attack, and integration tests)', code_block_style)]
    ]
    t_run = Table(quick_run_box, colWidths=[524])
    t_run.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#0284C7')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_run)

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"SUCCESS: Master PDF generated at: {pdf_path}")
    return pdf_path

if __name__ == '__main__':
    build_pdf()
