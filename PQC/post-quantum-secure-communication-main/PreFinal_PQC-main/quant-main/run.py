from app import create_app, socketio
import os
import socket

app = create_app()

def get_local_ip():
    """Detects the usable local IPv4 address for LAN/Wi-Fi devices."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    lan_ip = get_local_ip()
    
    print("\n" + "=" * 65)
    print("      POST-QUANTUM CRYPTOGRAPHY (PQC) PLATFORM SERVER      ")
    print("=" * 65)
    print(f"  [+] Local Access:  http://localhost:{port}")
    print(f"  [+] LAN/Wi-Fi IP:  http://{lan_ip}:{port} (Connect Phones/Tablets)")
    print(f"  [+] Crypto Mode:   PQC (ML-KEM-768 / ML-DSA-65 / AES-256-GCM)")
    print("=" * 65 + "\n")
    
    socketio.run(app, host='0.0.0.0', port=port, debug=True)
