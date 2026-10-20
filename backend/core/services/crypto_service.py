"""
Enterprise Cryptographic Service.
Provides military-grade AES-256-GCM authenticated encryption and decryption for backup archives.
Protects sensitive student, employee, financial, and institutional data from unauthorized disclosure.
"""

import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional

from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag

logger = logging.getLogger("django")

MAGIC_HEADER = b"SPRENC01"  # 8-byte format identifier (SPR Encrypted Archive v1)
SALT_SIZE = 16              # 128-bit PBKDF2 salt
NONCE_SIZE = 12             # 96-bit AES-GCM standard nonce
KDF_ITERATIONS = 100_000    # OWASP recommended PBKDF2 iterations


class EnterpriseCryptoService:
    """
    Cryptographic vault engine implementing authenticated AES-256-GCM.
    Zero-knowledge architecture: decryption is mathematically impossible without the passphrase.
    """

    @classmethod
    def _derive_key(cls, passphrase: str, salt: bytes) -> bytes:
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,  # 256 bits
            salt=salt,
            iterations=KDF_ITERATIONS,
        )
        return kdf.derive(passphrase.encode("utf-8"))

    @classmethod
    def is_file_encrypted(cls, file_path: Path) -> bool:
        """
        Detects whether an archive is encrypted via its header or filename.
        """
        p = Path(file_path)
        if not p.exists() or p.stat().st_size < (len(MAGIC_HEADER) + SALT_SIZE + NONCE_SIZE):
            return False

        if p.name.endswith(".enc.tar.gz") or p.name.endswith(".tar.gz.enc"):
            return True

        try:
            with open(p, "rb") as f:
                header = f.read(len(MAGIC_HEADER))
                return header == MAGIC_HEADER
        except Exception:
            return False

    @classmethod
    def encrypt_file(
        cls,
        input_file: Path,
        output_file: Path,
        passphrase: str
    ) -> Dict[str, Any]:
        """
        Encrypts an uncompressed or compressed file into an AES-256-GCM authenticated vault.
        Writes binary: [MAGIC_HEADER(8)] + [SALT(16)] + [NONCE(12)] + [CIPHERTEXT + TAG(16)]
        """
        input_path = Path(input_file)
        output_path = Path(output_file)

        if not input_path.exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")
        if not passphrase or len(passphrase.strip()) < 4:
            raise ValueError("Passphrase must be at least 4 characters long.")

        salt = os.urandom(SALT_SIZE)
        nonce = os.urandom(NONCE_SIZE)
        key = cls._derive_key(passphrase.strip(), salt)
        aesgcm = AESGCM(key)

        with open(input_path, "rb") as f_in:
            plaintext = f_in.read()

        logger.info(f"[CryptoService] Encrypting {input_path.name} ({len(plaintext)} bytes) with AES-256-GCM...")
        ciphertext = aesgcm.encrypt(nonce, plaintext, None)

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f_out:
            f_out.write(MAGIC_HEADER)
            f_out.write(salt)
            f_out.write(nonce)
            f_out.write(ciphertext)

        encrypted_size = output_path.stat().st_size
        logger.info(f"[CryptoService] Encryption complete: {output_path.name} ({encrypted_size} bytes)")

        return {
            "success": True,
            "output_path": str(output_path),
            "file_name": output_path.name,
            "size_bytes": encrypted_size,
            "algorithm": "AES-256-GCM",
            "kdf": "PBKDF2-HMAC-SHA256 (100k rounds)",
        }

    @classmethod
    def decrypt_file(
        cls,
        input_file: Path,
        output_file: Path,
        passphrase: str
    ) -> Dict[str, Any]:
        """
        Decrypts an AES-256-GCM vault into the original plaintext file.
        Throws ValueError with clear message if authentication tag fails or passphrase is wrong.
        """
        input_path = Path(input_file)
        output_path = Path(output_file)

        if not input_path.exists():
            raise FileNotFoundError(f"Encrypted archive not found: {input_path}")
        if not passphrase:
            raise ValueError("Decryption passphrase is required.")

        min_size = len(MAGIC_HEADER) + SALT_SIZE + NONCE_SIZE + 16
        if input_path.stat().st_size < min_size:
            raise ValueError("Corrupted or incomplete encrypted archive file.")

        with open(input_path, "rb") as f_in:
            header = f_in.read(len(MAGIC_HEADER))
            if header != MAGIC_HEADER:
                raise ValueError("Invalid encrypted archive format. Magic header missing.")

            salt = f_in.read(SALT_SIZE)
            nonce = f_in.read(NONCE_SIZE)
            ciphertext = f_in.read()

        key = cls._derive_key(passphrase.strip(), salt)
        aesgcm = AESGCM(key)

        try:
            plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        except InvalidTag:
            logger.warning(f"[CryptoService] Decryption failed for {input_path.name}: Invalid authentication tag.")
            raise ValueError("Invalid decryption passphrase or corrupted archive. Authentication failed.")

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f_out:
            f_out.write(plaintext)

        logger.info(f"[CryptoService] Decryption successful: {output_path.name} ({len(plaintext)} bytes)")

        return {
            "success": True,
            "output_path": str(output_path),
            "file_name": output_path.name,
            "size_bytes": len(plaintext),
        }
