import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from auth import hash_password, verify_password
from main import extract_diagnosed_plant, valid_new_password


class SecurityTests(unittest.TestCase):
    def test_password_hash_is_salted_and_verifiable(self):
        first = hash_password("Segura12345")
        second = hash_password("Segura12345")
        self.assertNotEqual(first, second)
        self.assertTrue(verify_password("Segura12345", first))
        self.assertFalse(verify_password("incorrecta", first))

    def test_public_password_policy(self):
        self.assertTrue(valid_new_password("Segura12345"))
        self.assertTrue(valid_new_password("solo-minusculas"))
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


if __name__ == "__main__":
    unittest.main()
