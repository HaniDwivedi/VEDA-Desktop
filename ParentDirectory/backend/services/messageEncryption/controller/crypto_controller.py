from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import base64
import os
from dotenv import load_dotenv

# Load service-specific environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env'))

def get_aes_key():
    key_str = os.getenv("ENCRYPTION_SECRET_KEY", "fallback_32_byte_key_veda_system_1234")
    return key_str.ljust(32)[:32].encode('utf-8')

def encrypt_message(plain_text: str) -> dict:
    aesgcm = AESGCM(get_aes_key())
    nonce = os.urandom(12)  # 12-byte secure nonce
    ciphertext = aesgcm.encrypt(nonce, plain_text.encode('utf-8'), None)
    
    return {
        "ciphertext": base64.b64encode(ciphertext).decode('utf-8'),
        "nonce": base64.b64encode(nonce).decode('utf-8')
    }

def decrypt_message(encrypted_data: dict) -> str:
    try:
        aesgcm = AESGCM(get_aes_key())
        ciphertext = base64.b64decode(encrypted_data["ciphertext"])
        nonce = base64.b64decode(encrypted_data["nonce"])
        
        decrypted_bytes = aesgcm.decrypt(nonce, ciphertext, None)
        return decrypted_bytes.decode('utf-8')
    except Exception as e:
        return "[Decryption Failed: Invalid Key or Corrupted Ciphertext]"