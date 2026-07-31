import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from auth import hash_password, verify_password
from database import Base
from main import extract_diagnosed_plant, is_email_verified, valid_new_password
from models import EmailVerificationToken, User
from datetime import datetime, timedelta


class SecurityTests(unittest.TestCase):
    def test_password_hash_is_salted_and_verifiable(self):
        first = hash_password("Segura12345")
        second = hash_password("Segura12345")
        self.assertNotEqual(first, second)
        self.assertTrue(verify_password("Segura12345", first))
        self.assertFalse(verify_password("incorrecta", first))

    def test_public_password_policy(self):
        self.assertTrue(valid_new_password("Segura12345"))
        self.assertFalse(valid_new_password("solo-minusculas"))
        self.assertFalse(valid_new_password("Corta1"))


class DiagnosisParsingTests(unittest.TestCase):
    def test_extracts_common_and_scientific_name(self):
        response = "IDENTIFICACIÓN: Poto (Epipremnum aureum). Confianza: alta.\nLO QUE VEO: Hojas sanas."
        plant = extract_diagnosed_plant(response)
        self.assertEqual(plant["nombreComun"], "Poto")
        self.assertEqual(plant["nombreCientifico"], "Epipremnum aureum")

    def test_extracts_labelled_multiline_format(self):
        response = "IDENTIFICACIÓN\nNombre común: Costilla de Adán\nNombre científico: Monstera deliciosa\nLO QUE VEO: Sin daños."
        plant = extract_diagnosed_plant(response)
        self.assertEqual(plant["displayName"], "Costilla de Adán (Monstera deliciosa)")


class VerificationTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()
        self.user = User(name="Prueba", email="test@example.com", password_hash="hash")
        self.db.add(self.user); self.db.commit(); self.db.refresh(self.user)

    def tearDown(self):
        self.db.close()

    def test_existing_account_without_tokens_is_grandfathered(self):
        self.assertTrue(is_email_verified(self.db, self.user.id))

    def test_new_account_requires_used_verification(self):
        token = EmailVerificationToken(
            user_id=self.user.id,
            token_hash="a" * 64,
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        self.db.add(token); self.db.commit()
        self.assertFalse(is_email_verified(self.db, self.user.id))
        token.used = True; self.db.commit()
        self.assertTrue(is_email_verified(self.db, self.user.id))


if __name__ == "__main__":
    unittest.main()
