#!/usr/bin/env python3
"""
PQC Key Rotation Script.
Simulates or triggers 24-hour KEM key rotation on the running or local key manager.
Moves active KEM key to grace period, generates a new active KEM keypair,
and verifies signing key remains stable to preserve client trust pinning.
"""

import sys
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ENGINE_DIR))

from pqc_channel import PQCKeyManager
from pqc_provider import get_pqc_provider


def main():
    print("=" * 65)
    print("      POST-QUANTUM CRYPTOGRAPHY (PQC) KEY ROTATION")
    print("=" * 65)

    provider = get_pqc_provider()
    key_mgr = PQCKeyManager(provider, rotation_seconds=86400, grace_seconds=3600)

    initial_key_id = key_mgr.active_key_id
    initial_fp = key_mgr.signing_fingerprint

    print(f"\n[1] Current Active KEM Key ID:   {initial_key_id}")
    print(f"    Server Signing Fingerprint:  {initial_fp}")
    print(f"    Previous Key ID:             {key_mgr.prev_key_id or 'None'}")

    print("\n[*] Triggering 24-hour KEM rotation...")
    key_mgr.rotate_kem_key()

    new_key_id = key_mgr.active_key_id
    new_fp = key_mgr.signing_fingerprint

    print(f"\n[2] New Active KEM Key ID:       {new_key_id}")
    print(f"    Previous KEM Key (Grace):    {key_mgr.prev_key_id}")
    print(f"    Grace Expiration:            {key_mgr.prev_expires_at} (1 hour grace)")
    print(f"    Server Signing Fingerprint:  {new_fp} (Unchanged: Pinning intact)")

    assert initial_fp == new_fp, "Signing key should persist across KEM rotations!"
    assert key_mgr.prev_key_id == initial_key_id, "Old active key must become grace key!"

    print("\n[OK] Rotation test succeeded cleanly.")
    print("=" * 65)


if __name__ == "__main__":
    main()
