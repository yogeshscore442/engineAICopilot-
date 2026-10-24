from app import create_app, socketio
import os
import socket
import sys
import subprocess
import time

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

def ensure_port_free(port):
    """Ensures the target port is available. On Windows, terminates lingering orphan processes."""
    if os.name == 'nt':
        try:
            test_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            test_sock.settimeout(0.5)
            in_use = (test_sock.connect_ex(('127.0.0.1', port)) == 0)
            test_sock.close()
            
            if in_use:
                print(f"  [!] Port {port} is occupied by an existing process. Releasing port...")
                cmd = f'powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort {port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"'
                res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
                for line in res.stdout.strip().splitlines():
                    line = line.strip()
                    if line.isdigit():
                        pid = int(line)
                        if pid != os.getpid() and pid > 4:
                            print(f"  [*] Releasing lingering process PID {pid}...")
                            subprocess.run(f"taskkill /F /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                time.sleep(1)
        except Exception:
            pass

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    ensure_port_free(port)
    lan_ip = get_local_ip()
    
    print("\n" + "=" * 65)
    print("      POST-QUANTUM CRYPTOGRAPHY (PQC) PLATFORM SERVER      ")
    print("=" * 65)
    print(f"  [+] Local Access:  http://localhost:{port}")
    print(f"  [+] LAN/Wi-Fi IP:  http://{lan_ip}:{port} (Connect Phones/Tablets)")
    print(f"  [+] Crypto Mode:   PQC (ML-KEM-768 / ML-DSA-65 / AES-256-GCM)")
    print("=" * 65 + "\n")
    
    socketio.run(app, host='0.0.0.0', port=port, debug=True)
