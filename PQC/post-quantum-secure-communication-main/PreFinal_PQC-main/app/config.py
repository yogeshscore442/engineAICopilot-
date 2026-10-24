import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default-secure-chat-key')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///pqc_chat.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Path to bundle liboqs DLLs
    OQS_BIN_DIR = os.path.join(BASE_DIR, 'app', 'crypto', 'bin')
    
    # Configure environment variable so liboqs-python loader knows where to find the DLLs
    @classmethod
    def init_oqs_path(cls):
        # Set OQS_INSTALL_PATH environment variable for the loader.
        # Home dir wrapper checks for bin/ directory in Windows.
        # Our binary directory has liboqs.dll, so we point OQS_INSTALL_PATH to parent of bin/
        # which is cls.OQS_BIN_DIR's parent (cls.OQS_BIN_DIR is .../app/crypto/bin).
        # oqs.py loader will search: OQS_INSTALL_PATH / "bin" on Windows.
        os.environ["OQS_INSTALL_PATH"] = os.path.abspath(os.path.join(cls.OQS_BIN_DIR, ".."))
        # We also add the path to the OS environment PATH so ctypes can load dependencies if any.
        os.environ["PATH"] = os.path.abspath(cls.OQS_BIN_DIR) + os.pathsep + os.environ.get("PATH", "")
