"""Genera una pareja VAPID para PlantLive.

Ejecuta este archivo una sola vez y guarda cada valor en su plataforma.
No publiques la clave privada ni la añadas al repositorio.
"""
import base64

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat


def base64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


private_key = ec.generate_private_key(ec.SECP256R1())
private_number = private_key.private_numbers().private_value.to_bytes(32, "big")
public_bytes = private_key.public_key().public_bytes(
    Encoding.X962,
    PublicFormat.UncompressedPoint,
)

print("\nVAPID_PRIVATE_KEY (solo Render):")
print(base64url(private_number))
print("\nVITE_VAPID_PUBLIC_KEY (solo Vercel):")
print(base64url(public_bytes))
print("\nGuarda ambas claves. No publiques la privada.\n")
