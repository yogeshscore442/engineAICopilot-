#!/usr/bin/env python3
"""
PQC Key Generation Script.
Generates initial ML-KEM-768 and ML-DSA-65 keypairs.
Optionally writes keys to a secure local file or displays environment variable format.
"""

import argparse
import base64
import os
import sys
from pathlib import Path

# Add engine directory to path
ENGINE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ENGINE_DIR))

from pqc_provider import get_pqc_provider


def main():
    parser = argparse.ArgumentParser(description="Generate PQC ML-KEM-768 & ML-DSA-65 Keypairs")
    parser.add_argument("--provider", default="my_file", choices=["my_file", "liboqs"], help="PQC provider to use")
    parser.add_argument("--out-dir", default=None, help="Directory to save raw key files (.bin)")
    args = parser.parse_args()

    provider = get_pqc_provider(args.provider)
    print("=" * 65)
    print(f"  Generating Post-Quantum Keypairs via {provider.name}")
    print("=" * 65)

    # 1. KEM Keypair
    kem_pk, kem_sk = provider.kem_keygen()
    print(f"\n[+] Algorithm:  {provider.kem_alg} (FIPS 203)")
    print(f"    Public Key: {len(kem_pk)} bytes (b64: {base64.b64encode(kem_pk)[:32].decode()}...)")
    print(f"    Secret Key: {len(kem_sk)} bytes (b64: {base64.b64encode(kem_sk)[:32].decode()}...)")

    # 2. Signing Keypair
    sig_pk, sig_sk = provider.sig_keygen()
    import hashlib
    h = hashlib.sha256(sig_pk).hexdigest().upper()
    fingerprint = f"SHA256:{':'.join([h[i:i+2] for i in range(0, 32, 2)])}"

    print(f"\n[+] Algorithm:  {provider.sig_alg} (FIPS 204)")
    print(f"    Public Key: {len(sig_pk)} bytes")
    print(f"    Secret Key: {len(sig_sk)} bytes")
    print(f"    Fingerprint: {fingerprint}")

    if args.out_dir:
        out_path = Path(args.out_dir)
        out_path.mkdir(parents=True, exist_ok=True)
        (out_path / "server_kem_pk.bin").write_bytes(kem_pk)
        (out_path / "server_kem_sk.bin").write_bytes(kem_sk)
        (out_path / "server_sig_pk.bin").write_bytes(sig_pk)
        (out_path / "server_sig_sk.bin").write_bytes(sig_sk)
        print(f"\n[OK] Keys successfully saved to {out_path.resolve()}")
    else:
        print("\n[i] Keys generated in memory. Use --out-dir <path> to save binary files.")
    print("=" * 65)


if __name__ == "__main__":
    main()
