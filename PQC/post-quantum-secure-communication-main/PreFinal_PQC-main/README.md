# QUANT: Post-Quantum Secure Communication Platform

QUANT is a Flask-based secure communication platform for experimenting with post-quantum cryptography in real application workflows. It combines quantum-resistant algorithms with established classical cryptography to protect chat messages, email, and uploaded files.

> **Status:** Research and demonstration project. Cryptographic software should be independently reviewed and tested before production or high-value use. No security system can honestly guarantee that it is impossible to hack.

## What It Includes

- Real-time chat using Flask-SocketIO
- Secure email and attachment workflows
- Encrypted file vault with integrity verification
- Hybrid key exchange using X25519 and ML-KEM
- Post-quantum signatures using ML-DSA and SLH-DSA where supported
- Authenticated encryption with AES-256-GCM and ChaCha20-Poly1305
- HKDF-SHA-384 key derivation
- Authentication, sessions, user management, and audit routes
- Attack demonstrations for tampering and replay protection
- Browser UI with responsive desktop and mobile layouts

## Cryptography

The project uses the `liboqs-python` bindings and the Python `cryptography` package. The intended cryptographic building blocks are:

| Purpose | Algorithms and primitives |
| --- | --- |
| Key establishment | ML-KEM and X25519 hybrid exchange |
| Digital signatures | ML-DSA and SLH-DSA, depending on backend support |
| Symmetric encryption | AES-256-GCM and ChaCha20-Poly1305 |
| Key derivation | HKDF with SHA-384 |
| Integrity and hashing | Authenticated encryption and SHA3-based checks |

Algorithm availability can vary by installed `liboqs` version and platform. The application should be tested on the target machine after installation.

## Architecture

```text
Browser client
    |
    | HTTP + WebSocket
    v
Flask application
    |-- Authentication and API routes
    |-- Chat events and session handling
    |-- Mail and file workflows
    |-- Audit and key management routes
    v
Crypto services
    |-- Hybrid key exchange
    |-- Post-quantum primitives through liboqs
    |-- Classical primitives through cryptography
    v
SQLite / instance storage
```

## Requirements

- Windows 10/11, Linux, or macOS
- Python 3.10 through 3.13
- Internet access for Python package installation
- A platform-compatible `liboqs` installation or the bundled libraries where applicable

## Installation

### Windows quick start

1. Clone the repository:

   ```bash
   git clone https://github.com/yogeshscore442/PreFinal_PQC.git
   cd PreFinal_PQC
   ```

2. Create and activate a virtual environment:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

3. Install dependencies:

   ```powershell
   python -m pip install --upgrade pip
   python -m pip install -r requirements.txt
   ```

   Alternatively, run `INSTALL_DEPENDENCIES.bat` from the project folder.

4. Start the server:

   ```powershell
   python run.py
   ```

   Alternatively, run `START_SERVER.bat`.

5. Open `http://127.0.0.1:5000` in a browser.

### Linux or macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python run.py
```

The server prints the local network address when LAN access is available. Only expose the application on a trusted network during development.

## Configuration

1. Copy `.env.example` to `.env`.
2. Set application secrets and environment-specific values before deployment.
3. Never commit `.env`, private keys, uploaded files, or database files.

The repository ignores local runtime data under `instance/`, including uploads and temporary downloads.

## Testing

Run the test suite from the repository root:

```powershell
python -m pytest -q
```

The tests cover cryptographic operations, integration flows, chat behavior, group and deletion workflows, and attack scenarios.

## Project Layout

```text
app/
  api/          General API routes
  audit/        Audit endpoints
  auth/         Authentication routes
  chat/         Real-time chat events
  crypto/       Classical, hybrid, PQC, and symmetric crypto
  files/        Secure file workflows
  keys/         Key management routes
  mail/         Encrypted mail workflows
  static/       CSS, JavaScript, and image assets
  templates/    Web UI templates
tests/          Automated tests
run.py          Application entry point
requirements.txt
```

## Security Notes

- This project is intended for education, experimentation, and demonstration.
- Do not reuse development secrets in production.
- Do not expose the development server directly to the public internet.
- Review authentication, key lifecycle, logging, storage, and deployment configuration before handling sensitive data.
- PQC algorithm names and security levels should be verified against the exact installed backend version.
- Report suspected vulnerabilities privately to the repository owner instead of publishing exploit details first.

## License

See [git/LICENSE.txt](git/LICENSE.txt) for the repository license information.

## Repository

https://github.com/yogeshscore442/PreFinal_PQC
