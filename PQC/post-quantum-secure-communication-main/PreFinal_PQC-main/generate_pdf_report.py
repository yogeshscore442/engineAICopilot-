# -*- coding: utf-8 -*-
import os
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
            self.drawString(44, 752, 'Post-Quantum Cryptography (PQC) Platform - Technical Architecture Report')
            self.setStrokeColor(colors.HexColor('#CBD5E1'))
            self.setLineWidth(0.5)
            self.line(44, 746, 568, 746)
        
        # Running Footer (all pages)
        self.setStrokeColor(colors.HexColor('#CBD5E1'))
        self.setLineWidth(0.5)
        self.line(44, 42, 568, 42)
        self.drawString(44, 30, 'CONFIDENTIAL | Post-Quantum Cryptography Platform Technical Specification')
        self.drawRightString(568, 30, f'Page {self._pageNumber} of {page_count}')
        self.restoreState()

pdf_path = os.path.abspath('Post_Quantum_Cryptography_Platform_Complete_Architecture_Report.pdf')
doc = SimpleDocTemplate(
    pdf_path,
    pagesize=letter,
    leftMargin=44,
    rightMargin=44,
    topMargin=54,
    bottomMargin=52
)

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'DocTitle',
    parent=styles['Heading1'],
    fontName='Helvetica-Bold',
    fontSize=18,
    leading=22,
    textColor=colors.HexColor('#0F172A'),
    spaceAfter=4
)

subtitle_style = ParagraphStyle(
    'DocSubtitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=9.5,
    leading=13,
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
    spaceAfter=10
)

h1_style = ParagraphStyle(
    'CustomH1',
    parent=styles['Heading2'],
    fontName='Helvetica-Bold',
    fontSize=11.5,
    leading=15,
    textColor=colors.HexColor('#0F172A'),
    spaceBefore=9,
    spaceAfter=4,
    keepWithNext=True
)

h2_style = ParagraphStyle(
    'CustomH2',
    parent=styles['Heading3'],
    fontName='Helvetica-Bold',
    fontSize=9.5,
    leading=12.5,
    textColor=colors.HexColor('#0369A1'),
    spaceBefore=6,
    spaceAfter=2,
    keepWithNext=True
)

body_style = ParagraphStyle(
    'CustomBody',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=8.5,
    leading=11.8,
    textColor=colors.HexColor('#1E293B'),
    spaceAfter=4
)

bullet_style = ParagraphStyle(
    'CustomBullet',
    parent=body_style,
    leftIndent=12,
    firstLineIndent=-8,
    spaceAfter=3
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

# Title & Metadata
story.append(Paragraph('POST-QUANTUM CRYPTOGRAPHY (PQC) PLATFORM', title_style))
story.append(Paragraph('Comprehensive Architecture, Cryptographic Algorithms, Security Workflow, Commercial Feasibility, and Comparative Industry Analysis', subtitle_style))
story.append(Paragraph('<b>Platform Version:</b> v2.5 | <b>Target Standards:</b> NIST FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA), RFC 8439 / FIPS 197 | <b>Scope:</b> Full Production Architecture', meta_style))
story.append(HRFlowable(width='100%', thickness=1.5, color=colors.HexColor('#0284C7'), spaceBefore=0, spaceAfter=8))

# SECTION 1
story.append(Paragraph('1. Executive Overview & Problem Context', h1_style))
story.append(Paragraph('The Post-Quantum Cryptography (PQC) Secure Communications Platform is an enterprise-grade communications ecosystem engineered to withstand classical cryptanalysis as well as attacks from cryptographically relevant quantum computers (CRQCs) executing Shor\'s and Grover\'s algorithms. Traditional asymmetric public-key systems (RSA, ECDH, ECDSA) rely on prime factorization and discrete logarithms, which will become mathematically obsolete upon quantum supremacy. This platform solves the immediate threat of <b>Harvest Now, Decrypt Later (HNDL)</b> espionage by utilizing hybrid lattice-based cryptography, stateless hash-based signatures, and quantum-resistant authenticated symmetric transport.', body_style))

# SECTION 2
story.append(Paragraph('2. Comprehensive Inventory of Cryptographic Algorithms', h1_style))
story.append(Paragraph('The platform integrates multiple cryptographic primitives, each serving a designated security role across authentication, key exchange, data-at-rest encryption, and transmission integrity:', body_style))

alg_data = [
    [Paragraph('Algorithm', table_header_style), Paragraph('Category &amp; Standard', table_header_style), Paragraph('Key Size / Overhead', table_header_style), Paragraph('Core Function &amp; Operational Role in System', table_header_style)],
    
    [Paragraph('<b>ML-KEM</b><br/>(Kyber-512 / 768 / 1024)', table_cell_style), 
     Paragraph('Post-Quantum Key Encapsulation (NIST FIPS 203)', table_cell_style), 
     Paragraph('Pub: 800 - 1568 B<br/>Cipher: 768 - 1568 B', table_cell_style), 
     Paragraph('Establishes quantum-safe ephemeral shared secret during 2-party chat handshakes and email exchanges based on Module-LWE lattices.', table_cell_style)],

    [Paragraph('<b>ML-DSA</b><br/>(Dilithium-44 / 65 / 87)', table_cell_style), 
     Paragraph('Post-Quantum Digital Signature (NIST FIPS 204)', table_cell_style), 
     Paragraph('Pub: 1312 - 2592 B<br/>Sig: 2420 - 4595 B', table_cell_style), 
     Paragraph('Signs ephemeral handshakes, chat packets, and emails to prevent Man-in-the-Middle (MITM) attacks and guarantee non-repudiation.', table_cell_style)],

    [Paragraph('<b>SLH-DSA</b><br/>(SPHINCS+)', table_cell_style), 
     Paragraph('Stateless Hash-Based Digital Signature (NIST FIPS 205)', table_cell_style), 
     Paragraph('Pub: 32 - 64 B<br/>Sig: 7.8 - 49 KB', table_cell_style), 
     Paragraph('Provides conservative, non-lattice fallback identity signing. Relies strictly on hash security (SHA-2/SHAKE), immune to lattice breakthroughs.', table_cell_style)],

    [Paragraph('<b>X25519</b><br/>(ECDH Curve25519)', table_cell_style), 
     Paragraph('Modern Classical Key Exchange (RFC 7748)', table_cell_style), 
     Paragraph('Pub: 32 B<br/>Secret: 32 B', table_cell_style), 
     Paragraph('Paired with ML-KEM in <b>Hybrid Mode</b>. Guarantees that even if future lattice attacks emerge, classical 128-bit elliptic-curve security remains unbroken.', table_cell_style)],

    [Paragraph('<b>AES-256-GCM</b>', table_cell_style), 
     Paragraph('Authenticated Symmetric Bulk Cipher (NIST SP 800-38D)', table_cell_style), 
     Paragraph('Key: 32 B (256-bit)<br/>Nonce: 12 B, Tag: 16 B', table_cell_style), 
     Paragraph('Encrypts all message bodies, email payloads, and uploaded files. Galois/Counter Mode guarantees confidentiality and hardware-accelerated integrity.', table_cell_style)],

    [Paragraph('<b>Ascon-128a</b>', table_cell_style), 
     Paragraph('NIST Lightweight Cryptography Standard', table_cell_style), 
     Paragraph('Key: 16 B (128-bit)<br/>Nonce: 16 B, Tag: 16 B', table_cell_style), 
     Paragraph('Lightweight authenticated encryption engine for IoT edge devices, microcontrollers, and resource-constrained environments.', table_cell_style)],

    [Paragraph('<b>HKDF-SHA256</b>', table_cell_style), 
     Paragraph('Key Derivation Function (RFC 5869)', table_cell_style), 
     Paragraph('Input: Variable<br/>Output: 32 B', table_cell_style), 
     Paragraph('Extracts and expands shared secrets from ML-KEM and X25519 with salt and context strings into cryptographic session keys.', table_cell_style)],

    [Paragraph('<b>RSA-2048</b>', table_cell_style), 
     Paragraph('Classical Baseline Benchmark', table_cell_style), 
     Paragraph('Key: 256 B (2048-bit)', table_cell_style), 
     Paragraph('Maintained strictly for baseline performance comparisons, legacy interoperability testing, and demonstrating quantum vulnerabilities in the Attack Lab.', table_cell_style)]
]

t_alg = Table(alg_data, colWidths=[105, 115, 95, 209])
t_alg.setStyle(TableStyle([
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
story.append(t_alg)

# SECTION 3
story.append(Spacer(1, 6))
story.append(Paragraph('3. End-to-End Cryptographic Execution Workflow', h1_style))
story.append(Paragraph('The platform strictly enforces mutual consent and end-to-end cryptographic integrity across five distinct execution phases:', body_style))

story.append(Paragraph('<b>Phase 1: Session Initiation &amp; Ephemeral Generation</b>', h2_style))
story.append(Paragraph('When User A selects User B and clicks <i>\"Execute Handshake\"</i>, the client generates an ephemeral keypair matching the selected security suite (e.g., Ephemeral X25519 private/public keys and ML-KEM-768 public/private keys). An <code>initiate_handshake</code> packet containing the selected mode and NIST security level is transmitted via WebSocket to the server.', bullet_style))

story.append(Paragraph('<b>Phase 2: Real-Time 2-Party Interactive Handshake (Mutual Consent)</b>', h2_style))
story.append(Paragraph('Rather than unilaterally generating keys, the server registers the pending request and transmits a <code>handshake_request_received</code> signal to User B\'s dedicated socket room (<code>user_{peer_id}</code>). User B receives an interactive modal showing User A\'s cryptographic identity, avatar, and requested mode (e.g., <i>Hybrid Level 3 - ML-KEM-768</i>). User B can either <b>Decline</b> (notifying User A and terminating session) or <b>Accept &amp; Connect</b>.', bullet_style))

story.append(Paragraph('<b>Phase 3: Key Derivation &amp; Identity Signature Verification</b>', h2_style))
story.append(Paragraph('Upon User B\'s acceptance, the 2-party cryptographic key exchange takes place:<br/>'
                       '&bull; <b>Hybrid Mode:</b> User B encapsulates a shared secret against User A\'s ML-KEM public key (yielding <code>kem_cipher</code> and <code>kem_secret</code>) and performs X25519 Diffie-Hellman (<code>dh_secret</code>).<br/>'
                       '&bull; <b>Identity Signing:</b> User B signs <code>(resp_x25519_pub || kem_cipher)</code> with their long-term private identity key (ML-DSA-65 or RSA).<br/>'
                       '&bull; <b>Verification:</b> User A verifies the digital signature using User B\'s verified public identity key before decapsulating. If signature verification fails, the handshake is aborted (MITM blocked).<br/>'
                       '&bull; <b>HKDF Derivation:</b> Both parties feed <code>dh_secret || kem_secret</code> into HKDF-SHA256 with info tag <code>\"pqc-secure-platform-hybrid-v1\"</code> to derive an identical 256-bit symmetric session key. The SHA-256 fingerprint of the key is saved for session authentication.', bullet_style))

story.append(Paragraph('<b>Phase 4: Application Layer Message Encryption &amp; Transport</b>', h2_style))
story.append(Paragraph('When a user types plaintext into the bottom chat box and clicks <i>\"Encrypt &amp; Send\"</i>:<br/>'
                       '&bull; The client increments a local monotonic sequence number (e.g., <code>seq=1, 2, ...</code>).<br/>'
                       '&bull; The client requests the cryptographic packet via <code>/api/crypto/encrypt_message</code>.<br/>'
                       '&bull; <b>AES-256-GCM Encryption:</b> A cryptographically secure 96-bit random IV is generated. The plaintext is encrypted using the 256-bit session key. Associated Data (AAD) is set to <code>\"{mode}-{sequence_number}\"</code>, binding the ciphertext to the exact transmission sequence and mode.<br/>'
                       '&bull; <b>Payload Signing:</b> The sender signs the ciphertext with their long-term private key.<br/>'
                       '&bull; The complete packet (Ciphertext, IV, Auth Tag, Signature, Sequence) is transmitted over WebSockets. Raw plaintext NEVER touches server logs or transport wiretaps.', bullet_style))

story.append(Paragraph('<b>Phase 5: Reception, Anti-Replay Verification &amp; Decryption</b>', h2_style))
story.append(Paragraph('Upon packet arrival at the receiver:<br/>'
                       '&bull; <b>Replay Check:</b> The receiver verifies that <code>sequence_number</code> has not been previously accepted. Duplicates trigger an instant <code>ATTACK_REPLAY</code> alert.<br/>'
                       '&bull; <b>Signature Check:</b> The sender\'s public key verifies the packet signature.<br/>'
                       '&bull; <b>GCM Authentication Tag:</b> AES-256-GCM computes the 128-bit authentication tag over the ciphertext and AAD. If even a single bit of the ciphertext or sequence was tampered with in transit, GCM decryption raises an immediate error, blocking ciphertext tampering.', bullet_style))

# SECTION 4
story.append(Spacer(1, 6))
story.append(Paragraph('4. Advantages (Pros) and Trade-offs (Cons)', h1_style))

pros_cons_data = [
    [Paragraph('Advantages (Pros)', table_header_style), Paragraph('Trade-offs &amp; Constraints (Cons)', table_header_style)],
    
    [Paragraph('&bull; <b>Quantum-Immunity:</b> Protected against Shor\'s algorithm executing on quantum hardware.<br/>'
               '&bull; <b>Hybrid Defense-in-Depth:</b> Dual X25519 + ML-KEM ensures security even if either primitive exhibits an unknown vulnerability.<br/>'
               '&bull; <b>NIST Standardization:</b> Aligns with NIST FIPS 203, 204, and 205 (released Aug 2024).<br/>'
               '&bull; <b>Zero-Trust Authentication:</b> Every handshake and message is signed by post-quantum digital signatures (ML-DSA / SLH-DSA).<br/>'
               '&bull; <b>Replay &amp; Tamper Hardening:</b> AES-GCM tags and monotonic sequence tracking prevent packet injection and wiretap manipulation.<br/>'
               '&bull; <b>Educational &amp; Audit Ready:</b> Integrated Attack Lab simulates real MITM, replay, tampering, and key-mismatch scenarios.', table_cell_style),
     Paragraph('&bull; <b>Public Key &amp; Ciphertext Overhead:</b> ML-KEM-768 public keys (1,184 B) and ML-DSA-65 signatures (3,309 B) are significantly larger than classical ECC (32 B / 64 B).<br/>'
               '&bull; <b>Bandwidth Consumption:</b> Multi-party group chats and heavy messaging require higher bandwidth compared to pure classical protocols.<br/>'
               '&bull; <b>Memory &amp; CPU Overhead:</b> Microcontrollers and legacy embedded hardware require optimized vector instructions (AVX2/NEON) to maintain sub-millisecond encryption speeds.<br/>'
               '&bull; <b>Stateless Signature Size:</b> SLH-DSA (SPHINCS+) signatures range from 7.8 KB to 49 KB, making them heavy for real-time live chat packets.', table_cell_style)]
]

t_pc = Table(pros_cons_data, colWidths=[262, 262])
t_pc.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white]),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ('LEFTPADDING', (0,0), (-1,-1), 7),
    ('RIGHTPADDING', (0,0), (-1,-1), 7),
]))
story.append(t_pc)

# SECTION 5
story.append(Spacer(1, 6))
story.append(Paragraph('5. Real-World Commercial Deployment Cost Estimation', h1_style))
story.append(Paragraph('To deploy this platform into an enterprise-grade production environment supporting 10,000 to 50,000 active concurrent users, the estimated commercial budget is structured as follows:', body_style))

budget_data = [
    [Paragraph('Infrastructure &amp; Service Component', table_header_style), Paragraph('Recommended Cloud Tier / Specification', table_header_style), Paragraph('Monthly (USD)', table_header_style), Paragraph('Annual (USD)', table_header_style)],
    
    [Paragraph('<b>Application &amp; WebSocket Cluster</b>', table_cell_style), Paragraph('3x AWS c6i.xlarge (Compute Optimized, 4 vCPU, 8 GB RAM) behind ALB', table_cell_style), Paragraph('$260 / mo', table_cell_style), Paragraph('$3,120 / yr', table_cell_style)],
    [Paragraph('<b>Managed Database Cluster</b>', table_cell_style), Paragraph('AWS RDS PostgreSQL (Multi-AZ, 2x db.r6g.large, Encrypted storage)', table_cell_style), Paragraph('$220 / mo', table_cell_style), Paragraph('$2,640 / yr', table_cell_style)],
    [Paragraph('<b>Hardware Security Module (HSM)</b>', table_cell_style), Paragraph('AWS CloudHSM / Azure Key Vault Managed HSM for Root PKI Authority', table_cell_style), Paragraph('$180 / mo', table_cell_style), Paragraph('$2,160 / yr', table_cell_style)],
    [Paragraph('<b>Encrypted Object Storage (Files)</b>', table_cell_style), Paragraph('AWS S3 (Multi-Region, SSE-KMS, 5 TB storage + Data Egress)', table_cell_style), Paragraph('$125 / mo', table_cell_style), Paragraph('$1,500 / yr', table_cell_style)],
    [Paragraph('<b>TURN / STUN Relays (VoIP/P2P)</b>', table_cell_style), Paragraph('2x Coturn edge nodes for NAT traversal and low-latency packet routing', table_cell_style), Paragraph('$60 / mo', table_cell_style), Paragraph('$720 / yr', table_cell_style)],
    [Paragraph('<b>CDN &amp; DDoS Defense Shield</b>', table_cell_style), Paragraph('Cloudflare Business / Enterprise with WAF and WebSocket rate limiting', table_cell_style), Paragraph('$200 / mo', table_cell_style), Paragraph('$2,400 / yr', table_cell_style)],
    [Paragraph('<b>Independent Cryptographic Audit</b>', table_cell_style), Paragraph('External security audit by NCC Group / Trail of Bits (One-Time)', table_cell_style), Paragraph('N/A', table_cell_style), Paragraph('$12,000 (Year 1)', table_cell_style)],
    [Paragraph('<b>TOTAL ESTIMATED BUDGET</b>', table_cell_bold), Paragraph('<b>Full Production Deployment (10k - 50k Concurrent Users)</b>', table_cell_bold), Paragraph('<b>~$1,045 / mo</b>', table_cell_bold), Paragraph('<b>~$24,540 (Year 1)</b>', table_cell_bold)]
]

t_b = Table(budget_data, colWidths=[140, 214, 85, 85])
t_b.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
    ('ROWBACKGROUNDS', (0,1), (-1,-2), [colors.white, colors.HexColor('#F8FAFC')]),
    ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#E0F2FE')),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ('LEFTPADDING', (0,0), (-1,-1), 5),
    ('RIGHTPADDING', (0,0), (-1,-1), 5),
]))
story.append(t_b)

# SECTION 6
story.append(Spacer(1, 6))
story.append(Paragraph('6. Industry Comparison Matrix', h1_style))
story.append(Paragraph('How this platform compares against global secure communication platforms:', body_style))

comp_data = [
    [Paragraph('Platform', table_header_style), Paragraph('Key Exchange Protocol', table_header_style), Paragraph('Digital Signatures', table_header_style), Paragraph('Symmetric Cipher', table_header_style), Paragraph('Post-Quantum Security Status', table_header_style)],
    
    [Paragraph('<b>Our PQC Platform</b>', table_cell_bold), 
     Paragraph('Hybrid X25519 + ML-KEM (Kyber-768 / 1024)', table_cell_style), 
     Paragraph('ML-DSA-65 &amp; SLH-DSA (SPHINCS+)', table_cell_style), 
     Paragraph('AES-256-GCM / Ascon-128a', table_cell_style), 
     Paragraph('<b>FULLY RESISTANT</b><br/>(FIPS 203, 204, 205, NIST LWC)', table_cell_style)],

    [Paragraph('<b>Signal</b>', table_cell_style), 
     Paragraph('PQXDH (X25519 + ML-KEM-768)', table_cell_style), 
     Paragraph('Ed25519 (Classical)', table_cell_style), 
     Paragraph('AES-256-CBC / HMAC', table_cell_style), 
     Paragraph('<b>PARTIALLY RESISTANT</b><br/>(KEM is PQC; Signatures are classical)', table_cell_style)],

    [Paragraph('<b>Apple iMessage (PQ3)</b>', table_cell_style), 
     Paragraph('Kyber-768 + P-256 Ratchet', table_cell_style), 
     Paragraph('ECDSA (Classical)', table_cell_style), 
     Paragraph('AES-256-GCM', table_cell_style), 
     Paragraph('<b>PARTIALLY RESISTANT</b><br/>(Post-quantum re-keying; classical signatures)', table_cell_style)],

    [Paragraph('<b>WhatsApp</b>', table_cell_style), 
     Paragraph('Signal Protocol (Curve25519)', table_cell_style), 
     Paragraph('Ed25519 (Classical)', table_cell_style), 
     Paragraph('AES-256-GCM', table_cell_style), 
     Paragraph('<b>VULNERABLE TO CRQC</b><br/>(No post-quantum exchange or signatures yet)', table_cell_style)],

    [Paragraph('<b>Telegram</b>', table_cell_style), 
     Paragraph('MTProto 2.0 (Diffie-Hellman)', table_cell_style), 
     Paragraph('RSA-2048 (Classical)', table_cell_style), 
     Paragraph('AES-256-IGE', table_cell_style), 
     Paragraph('<b>CRITICAL VULNERABILITY</b><br/>(Broken by Shor\'s algorithm; cloud chats unencrypted)', table_cell_style)]
]

t_c = Table(comp_data, colWidths=[90, 115, 105, 94, 120])
t_c.setStyle(TableStyle([
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
story.append(t_c)

# SECTION 7
story.append(Spacer(1, 6))
story.append(Paragraph('7. Practical Real-World Applications &amp; Sectors', h1_style))

story.append(Paragraph('<b>A. Defense &amp; Military Intelligence (NATO / DoD Compliance):</b> Military organizations require data secrecy that extends beyond 30 to 50 years. Any classified intercept recorded today will be decrypted once quantum hardware matures. This platform guarantees long-term secrecy compliance.', bullet_style))
story.append(Paragraph('<b>B. Financial Networks &amp; Interbank Communications (SWIFT / Fedwire):</b> Banking backbones handle trillions in high-value transactions. Deploying quantum-safe channels prevents catastrophic replay and spoofing of wire transfers.', bullet_style))
story.append(Paragraph('<b>C. Healthcare &amp; Genomic Data Repositories:</b> Under HIPAA and GDPR, personal medical records and genetic sequencing data have permanent sensitivity lifespans. This platform prevents retrospective decryption of sensitive clinical data.', bullet_style))
story.append(Paragraph('<b>D. Critical Infrastructure &amp; Industrial IoT (SCADA / Power Grids):</b> Using Ascon-128a and lightweight ML-KEM-512, utility power stations and smart grids can secure remote command-and-control telemetry against state-sponsored quantum cyberwarfare.', bullet_style))
story.append(Paragraph('<b>E. Executive Corporate Communications:</b> C-Suite executives, mergers and acquisitions (M&amp;A) teams, and intellectual property (IP) creators can transmit trade secrets and patent documentation without interception risk.', bullet_style))

doc.build(story, canvasmaker=NumberedCanvas)
print('PDF generated successfully at: ' + pdf_path)
